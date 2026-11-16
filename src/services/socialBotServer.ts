import { GoogleGenAI, Type } from '@google/genai';
import { SocialMediaMonthlyReport } from '../types/index.ts';

function getServerGenAI(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') return null;
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

export interface SocialBotApiStatus {
  instagramGraphConfigured: boolean;
  tiktokDisplayConfigured: boolean;
  rapidApiConfigured: boolean;
  geminiVisionConfigured: boolean;
}

export function getSocialBotApiStatus(): SocialBotApiStatus {
  return {
    instagramGraphConfigured: Boolean(
      process.env.IG_ACCESS_TOKEN?.trim() && process.env.IG_BUSINESS_ACCOUNT_ID?.trim()
    ),
    tiktokDisplayConfigured: Boolean(process.env.TIKTOK_ACCESS_TOKEN?.trim()),
    rapidApiConfigured: Boolean(process.env.RAPIDAPI_KEY?.trim()),
    geminiVisionConfigured: Boolean(
      process.env.GEMINI_API_KEY?.trim() && process.env.GEMINI_API_KEY !== 'MY_GEMINI_API_KEY'
    ),
  };
}

function parseCompactCount(raw: string): number {
  if (!raw) return 0;
  const cleaned = raw.trim().replace(/,/g, '.');
  const match = cleaned.match(/([\d.]+)\s*([KMBkmb]|rb|jt)?/);
  if (!match) return 0;
  const num = parseFloat(match[1]);
  if (isNaN(num)) return 0;
  const suffix = (match[2] || '').toLowerCase();
  if (suffix === 'k' || suffix === 'rb') return Math.round(num * 1000);
  if (suffix === 'm' || suffix === 'jt') return Math.round(num * 1000000);
  if (suffix === 'b') return Math.round(num * 1000000000);
  const digitsOnly = raw.replace(/[^\d]/g, '');
  return parseInt(digitsOnly, 10) || 0;
}

interface VerifiedPlatformMetrics {
  followers?: number;
  postsCount?: number;
  totalViews?: number;
  topContentTitle?: string;
  topContentViews?: number;
  topContentUrl?: string;
  sourceName?: string;
}

/**
 * 1. Official Instagram Graph API (Meta for Developers)
 * Membutuhkan IG_BUSINESS_ACCOUNT_ID dan IG_ACCESS_TOKEN di environment server
 */
async function fetchInstagramGraphApi(
  targetMonth: number,
  targetYear: number
): Promise<VerifiedPlatformMetrics | null> {
  const businessId = process.env.IG_BUSINESS_ACCOUNT_ID?.trim();
  const accessToken = process.env.IG_ACCESS_TOKEN?.trim();
  if (!businessId || !accessToken) return null;

  try {
    const fields =
      'username,followers_count,media_count,media.limit(50){caption,media_type,permalink,timestamp,like_count,comments_count}';
    const url = `https://graph.facebook.com/v20.0/${encodeURIComponent(
      businessId
    )}?fields=${encodeURIComponent(fields)}&access_token=${encodeURIComponent(accessToken)}`;
    const res = await fetch(url);
    if (!res.ok) return null;
    const data: any = await res.json();

    const mediaList: any[] = Array.isArray(data?.media?.data) ? data.media.data : [];
    const monthlyMedia = mediaList.filter((m) => {
      if (!m.timestamp) return true;
      const d = new Date(m.timestamp);
      return d.getMonth() === targetMonth && d.getFullYear() === targetYear;
    });

    const listToAnalyze = monthlyMedia.length > 0 ? monthlyMedia : mediaList;
    let topTitle = '-';
    let topUrl = data?.username ? `https://www.instagram.com/${data.username}` : undefined;
    let topScore = 0;

    for (const item of listToAnalyze) {
      const engagement = (Number(item.like_count) || 0) + (Number(item.comments_count) || 0);
      if (engagement >= topScore && item.caption) {
        topScore = engagement;
        topTitle = String(item.caption).split('\n')[0].slice(0, 90);
        if (item.permalink) topUrl = item.permalink;
      }
    }

    return {
      followers: typeof data.followers_count === 'number' ? data.followers_count : undefined,
      postsCount:
        monthlyMedia.length > 0
          ? monthlyMedia.length
          : typeof data.media_count === 'number'
          ? data.media_count
          : undefined,
      topContentTitle: topTitle !== '-' ? topTitle : undefined,
      topContentUrl: topUrl,
      sourceName: 'Instagram Graph API Resmi',
    };
  } catch (err) {
    console.warn('Instagram Graph API error:', err);
    return null;
  }
}

/**
 * 2. Official TikTok Display API (TikTok for Developers)
 * Membutuhkan TIKTOK_ACCESS_TOKEN di environment server
 */
async function fetchTikTokDisplayApi(
  targetMonth: number,
  targetYear: number
): Promise<VerifiedPlatformMetrics | null> {
  const accessToken = process.env.TIKTOK_ACCESS_TOKEN?.trim();
  if (!accessToken) return null;

  try {
    const userRes = await fetch(
      'https://open.tiktokapis.com/v2/user/info/?fields=follower_count,likes_count,video_count,display_name',
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );
    if (!userRes.ok) return null;
    const userJson: any = await userRes.json();
    const userData = userJson?.data?.user;

    let monthlyCount = userData?.video_count;
    let totalViews = 0;
    let topTitle = '-';
    let topViews = 0;
    let topUrl: string | undefined;

    try {
      const videoRes = await fetch(
        'https://open.tiktokapis.com/v2/video/list/?fields=id,title,video_description,view_count,create_time,share_url',
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ max_count: 20 }),
        }
      );
      if (videoRes.ok) {
        const videoJson: any = await videoRes.json();
        const videos: any[] = Array.isArray(videoJson?.data?.videos) ? videoJson.data.videos : [];
        const monthlyVideos = videos.filter((v) => {
          if (!v.create_time) return true;
          const d = new Date(Number(v.create_time) * 1000);
          return d.getMonth() === targetMonth && d.getFullYear() === targetYear;
        });
        const list = monthlyVideos.length > 0 ? monthlyVideos : videos;
        if (monthlyVideos.length > 0) {
          monthlyCount = monthlyVideos.length;
        }
        for (const v of list) {
          const views = Number(v.view_count) || 0;
          totalViews += views;
          if (views >= topViews) {
            topViews = views;
            topTitle = String(v.title || v.video_description || 'Video TikTok @pondokqq')
              .split('\n')[0]
              .slice(0, 90);
            if (v.share_url) topUrl = v.share_url;
          }
        }
      }
    } catch {
      // Ignore video list error if scope only covers user.info.stats
    }

    return {
      followers: typeof userData?.follower_count === 'number' ? userData.follower_count : undefined,
      postsCount: typeof monthlyCount === 'number' ? monthlyCount : undefined,
      totalViews: totalViews > 0 ? totalViews : undefined,
      topContentTitle: topTitle !== '-' ? topTitle : undefined,
      topContentViews: topViews > 0 ? topViews : undefined,
      topContentUrl: topUrl,
      sourceName: 'TikTok Display API Resmi',
    };
  } catch (err) {
    console.warn('TikTok Display API error:', err);
    return null;
  }
}

/**
 * 3. RapidAPI Scraper (Opsional: jika RAPIDAPI_KEY diisi di environment server)
 */
async function fetchRapidApiTikTok(handle: string): Promise<VerifiedPlatformMetrics | null> {
  const rapidKey = process.env.RAPIDAPI_KEY?.trim();
  if (!rapidKey) return null;
  const cleanHandle = handle.replace(/^@/, '').trim();
  try {
    const res = await fetch(
      `https://tiktok-scraper7.p.rapidapi.com/user/info?unique_id=${encodeURIComponent(cleanHandle)}`,
      {
        headers: {
          'x-rapidapi-key': rapidKey,
          'x-rapidapi-host': 'tiktok-scraper7.p.rapidapi.com',
        },
      }
    );
    if (!res.ok) return null;
    const json: any = await res.json();
    const stats = json?.data?.stats;
    if (!stats || typeof stats.followerCount !== 'number') return null;
    return {
      followers: stats.followerCount,
      postsCount: typeof stats.videoCount === 'number' ? stats.videoCount : undefined,
      sourceName: 'RapidAPI TikTok',
    };
  } catch {
    return null;
  }
}

/**
 * 4. Pembacaan HTML Publik (Hanya mengambil angka jika benar-benar lolos tanpa proteksi login)
 */
async function scrapeTikTokPublicProfile(handle: string): Promise<VerifiedPlatformMetrics | null> {
  const cleanHandle = handle.replace(/^@/, '').trim();
  if (!cleanHandle) return null;
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5500);
    const res = await fetch(`https://www.tiktok.com/@${encodeURIComponent(cleanHandle)}`, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        Accept: 'text/html,application/xhtml+xml',
      },
      signal: controller.signal,
    });
    clearTimeout(timeout);
    if (!res.ok) return null;
    const html = await res.text();
    const followerMatch = html.match(/"followerCount"\s*:\s*(\d+)/);
    const videoMatch = html.match(/"videoCount"\s*:\s*(\d+)/);

    if (followerMatch) {
      return {
        followers: parseInt(followerMatch[1], 10),
        postsCount: videoMatch ? parseInt(videoMatch[1], 10) : undefined,
        sourceName: 'Profil Publik TikTok',
      };
    }
    return null;
  } catch {
    return null;
  }
}

async function scrapeInstagramPublicProfile(handle: string): Promise<VerifiedPlatformMetrics | null> {
  const cleanHandle = handle.replace(/^@/, '').trim();
  if (!cleanHandle) return null;
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5500);
    const res = await fetch(`https://www.instagram.com/${encodeURIComponent(cleanHandle)}/`, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        Accept: 'text/html,application/xhtml+xml',
      },
      signal: controller.signal,
    });
    clearTimeout(timeout);
    if (!res.ok) return null;
    const html = await res.text();
    const ogMatch = html.match(/content="([^"]*Followers[^"]*Posts[^"]*)"/i);
    if (ogMatch && ogMatch[1]) {
      const desc = ogMatch[1];
      const fMatch = desc.match(/([\d.,]+\s*[KMBkmb]?)\s*Followers/i);
      const pMatch = desc.match(/([\d.,]+\s*[KMBkmb]?)\s*Posts/i);
      if (fMatch) {
        return {
          followers: parseCompactCount(fMatch[1]),
          postsCount: pMatch ? parseCompactCount(pMatch[1]) : undefined,
          sourceName: 'Profil Publik Instagram',
        };
      }
    }
    return null;
  } catch {
    return null;
  }
}

export interface BotFetchRequest {
  id: string;
  month: number;
  year: number;
  igAccount: string;
  ttAccount: string;
  currentReport?: Partial<SocialMediaMonthlyReport>;
  prevReport?: Partial<SocialMediaMonthlyReport>;
}

export interface BotFetchResponse {
  report: SocialMediaMonthlyReport;
  botMessage: string;
  verified: boolean;
  apiStatus: SocialBotApiStatus;
}

/**
 * Bot 1: Menarik data akun Instagram & TikTok (@pondokqq) TANPA mengarang/mengestimasi angka palsu.
 * Hanya mengupdate angka yang benar-benar terverifikasi dari API Resmi / RapidAPI / HTML Publik.
 */
export async function runSocialProfileBotFetch(req: BotFetchRequest): Promise<BotFetchResponse> {
  const igHandle = (req.igAccount || '@pondokqq').startsWith('@')
    ? req.igAccount.trim()
    : `@${req.igAccount.trim()}`;
  const ttHandle = (req.ttAccount || '@pondokqq').startsWith('@')
    ? req.ttAccount.trim()
    : `@${req.ttAccount.trim()}`;

  const apiStatus = getSocialBotApiStatus();

  const [igOfficial, ttOfficial, ttRapid, igPublic, ttPublic] = await Promise.all([
    fetchInstagramGraphApi(req.month, req.year),
    fetchTikTokDisplayApi(req.month, req.year),
    fetchRapidApiTikTok(ttHandle),
    scrapeInstagramPublicProfile(igHandle),
    scrapeTikTokPublicProfile(ttHandle),
  ]);

  const igData = igOfficial || igPublic;
  const ttData = ttOfficial || ttRapid || ttPublic;

  const verifiedSources: string[] = [];
  if (igData?.sourceName && igData.followers !== undefined) {
    verifiedSources.push(`${igData.sourceName} (${igData.followers.toLocaleString('id-ID')} followers)`);
  }
  if (ttData?.sourceName && ttData.followers !== undefined) {
    verifiedSources.push(`${ttData.sourceName} (${ttData.followers.toLocaleString('id-ID')} followers)`);
  }

  const prevIgFollowers = req.prevReport?.igFollowers || 0;
  const prevTtFollowers = req.prevReport?.ttFollowers || 0;

  // Jangan pernah mengisi angka karangan: gunakan data terverifikasi, atau pertahankan nilai saat ini (default 0)
  const finalIgFollowers = igData?.followers ?? req.currentReport?.igFollowers ?? 0;
  const finalTtFollowers = ttData?.followers ?? req.currentReport?.ttFollowers ?? 0;

  const igGrowth =
    igData?.followers !== undefined && prevIgFollowers > 0
      ? finalIgFollowers - prevIgFollowers
      : req.currentReport?.igFollowersGrowth ?? 0;

  const ttGrowth =
    ttData?.followers !== undefined && prevTtFollowers > 0
      ? finalTtFollowers - prevTtFollowers
      : req.currentReport?.ttFollowersGrowth ?? 0;

  const unUploadedFlyers = req.currentReport?.unUploadedFlyersCount ?? 0;
  const producedVideos = req.currentReport?.producedVideosCount ?? 0;
  const producedFlyers = req.currentReport?.producedFlyersCount ?? 0;

  const report: SocialMediaMonthlyReport = {
    id: req.id,
    month: req.month,
    year: req.year,
    producedVideosCount: producedVideos,
    producedFlyersCount: producedFlyers,
    unUploadedFlyersCount: unUploadedFlyers,
    productionNotes:
      req.currentReport?.productionNotes ||
      (unUploadedFlyers > 0
        ? `Termasuk ${unUploadedFlyers} flyer internal/cetak yang tidak diupload ke medsos.`
        : 'Belum ada catatan tambahan.'),
    igAccount: igHandle,
    igFollowers: finalIgFollowers,
    igFollowersGrowth: igGrowth,
    igPostsCount: igData?.postsCount ?? req.currentReport?.igPostsCount ?? 0,
    igTotalViews: igData?.totalViews ?? req.currentReport?.igTotalViews ?? 0,
    igTopContentTitle: igData?.topContentTitle ?? req.currentReport?.igTopContentTitle ?? '-',
    igTopContentViews: igData?.topContentViews ?? req.currentReport?.igTopContentViews ?? 0,
    igTopContentUrl:
      igData?.topContentUrl ||
      req.currentReport?.igTopContentUrl ||
      `https://www.instagram.com/${igHandle.replace(/^@/, '')}`,
    ttAccount: ttHandle,
    ttFollowers: finalTtFollowers,
    ttFollowersGrowth: ttGrowth,
    ttPostsCount: ttData?.postsCount ?? req.currentReport?.ttPostsCount ?? 0,
    ttTotalViews: ttData?.totalViews ?? req.currentReport?.ttTotalViews ?? 0,
    ttTopContentTitle: ttData?.topContentTitle ?? req.currentReport?.ttTopContentTitle ?? '-',
    ttTopContentViews: ttData?.topContentViews ?? req.currentReport?.ttTopContentViews ?? 0,
    ttTopContentUrl:
      ttData?.topContentUrl ||
      req.currentReport?.ttTopContentUrl ||
      `https://www.tiktok.com/@${ttHandle.replace(/^@/, '')}`,
    updatedAt: new Date().toISOString(),
    source: verifiedSources.length > 0 ? 'bot-username' : req.currentReport?.source || 'manual',
  };

  if (verifiedSources.length > 0) {
    return {
      report,
      verified: true,
      apiStatus,
      botMessage: `Berhasil menarik data riil dari ${verifiedSources.join(' & ')} untuk akun ${igHandle} / ${ttHandle}.`,
    };
  }

  return {
    report,
    verified: false,
    apiStatus,
    botMessage: `Proteksi anti-bot Instagram & TikTok memblokir akses tanpa API Key untuk ${igHandle}. Bot TIDAK mengarang angka palsu. Silakan gunakan tombol "Scan Screenshot Insight (Bot AI)" atau hubungkan Token API Resmi (lihat tombol "Panduan & Status API").`,
  };
}

export interface BotParseInsightRequest {
  imageBase64?: string;
  mimeType?: string;
  rawText?: string;
  currentReport: SocialMediaMonthlyReport;
}

/**
 * Bot 2: Membaca gambar Screenshot Insight IG/TikTok Studio (@pondokqq) atau teks laporan kru via Gemini Vision/Text.
 * Hanya menyalin angka yang benar-benar tertulis di gambar/teks tanpa mengarang.
 */
export async function runSocialInsightParserBot(
  req: BotParseInsightRequest
): Promise<{ report: SocialMediaMonthlyReport; botMessage: string }> {
  const ai = getServerGenAI();

  if (!ai) {
    if (req.rawText && req.rawText.trim()) {
      const txt = req.rawText;
      const extractNum = (pattern: RegExp, fallback: number): number => {
        const m = txt.match(pattern);
        return m && m[1] ? parseCompactCount(m[1]) : fallback;
      };
      const updated: SocialMediaMonthlyReport = {
        ...req.currentReport,
        producedVideosCount: extractNum(
          /video\s*[:=-]\s*([\d.,]+)/i,
          req.currentReport.producedVideosCount
        ),
        producedFlyersCount: extractNum(
          /flyer\s*[:=-]\s*([\d.,]+)/i,
          req.currentReport.producedFlyersCount
        ),
        igFollowers: extractNum(
          /(?:ig|instagram)\s*followers?\s*[:=-]?\s*([\d.,]+\s*[KMBkmb]?)/i,
          req.currentReport.igFollowers
        ),
        igTotalViews: extractNum(
          /(?:ig|instagram)\s*views?\s*[:=-]?\s*([\d.,]+\s*[KMBkmb]?)/i,
          req.currentReport.igTotalViews
        ),
        ttFollowers: extractNum(
          /(?:tt|tiktok)\s*followers?\s*[:=-]?\s*([\d.,]+\s*[KMBkmb]?)/i,
          req.currentReport.ttFollowers
        ),
        ttTotalViews: extractNum(
          /(?:tt|tiktok)\s*views?\s*[:=-]?\s*([\d.,]+\s*[KMBkmb]?)/i,
          req.currentReport.ttTotalViews
        ),
        updatedAt: new Date().toISOString(),
        source: 'bot-screenshot',
      };
      return {
        report: updated,
        botMessage: 'Bot berhasil mengekstrak angka dari teks laporan yang ditempel.',
      };
    }
    throw new Error(
      'Kunci GEMINI_API_KEY belum aktif di server untuk memindai gambar screenshot.'
    );
  }

  const parts: any[] = [];
  if (req.imageBase64) {
    const cleanBase64 = req.imageBase64.replace(/^data:[^;]+;base64,/, '');
    parts.push({
      inlineData: {
        mimeType: req.mimeType || 'image/png',
        data: cleanBase64,
      },
    });
  }

  parts.push({
    text: `Kamu adalah pembaca data presisi untuk laporan media sosial @pondokqq (Instagram & TikTok).
ATURAN KERAS (ANTI-HALUSINASI):
1. Hanya ekstrak angka yang TERTULIS JELAS pada gambar screenshot atau teks dari admin.
2. JANGAN PERNAH mengarang, menebak, atau mengestimasi angka yang tidak ada di gambar/teks!
3. Jika sebuah metrik TIDAK terlihat di gambar/teks (misalnya gambar hanya menampilkan Instagram, sedangkan TikTok tidak ada di gambar), WAJIB isi dengan nilai dari "Data saat ini" di bawah ini tanpa mengubahnya.

Data saat ini: ${JSON.stringify(req.currentReport)}
Teks tambahan dari admin: ${req.rawText || '(tidak ada)'}`,
  });

  const response = await ai.models.generateContent({
    model: 'gemini-4-hydrogen',
    contents: { parts },
    config: {
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          producedVideosCount: { type: Type.INTEGER },
          producedFlyersCount: { type: Type.INTEGER },
          unUploadedFlyersCount: { type: Type.INTEGER },
          igFollowers: { type: Type.INTEGER },
          igFollowersGrowth: { type: Type.INTEGER },
          igPostsCount: { type: Type.INTEGER },
          igTotalViews: { type: Type.INTEGER },
          igTopContentTitle: { type: Type.STRING },
          igTopContentViews: { type: Type.INTEGER },
          ttFollowers: { type: Type.INTEGER },
          ttFollowersGrowth: { type: Type.INTEGER },
          ttPostsCount: { type: Type.INTEGER },
          ttTotalViews: { type: Type.INTEGER },
          ttTopContentTitle: { type: Type.STRING },
          ttTopContentViews: { type: Type.INTEGER },
          summaryNote: { type: Type.STRING },
        },
        required: [
          'producedVideosCount',
          'producedFlyersCount',
          'igFollowers',
          'igTotalViews',
          'ttFollowers',
          'ttTotalViews',
        ],
      },
    },
  });

  const extracted = JSON.parse((response.text ?? '{}').trim());

  const merged: SocialMediaMonthlyReport = {
    ...req.currentReport,
    producedVideosCount: extracted.producedVideosCount ?? req.currentReport.producedVideosCount,
    producedFlyersCount: extracted.producedFlyersCount ?? req.currentReport.producedFlyersCount,
    unUploadedFlyersCount:
      extracted.unUploadedFlyersCount ?? req.currentReport.unUploadedFlyersCount,
    igFollowers: extracted.igFollowers ?? req.currentReport.igFollowers,
    igFollowersGrowth: extracted.igFollowersGrowth ?? req.currentReport.igFollowersGrowth,
    igPostsCount: extracted.igPostsCount ?? req.currentReport.igPostsCount,
    igTotalViews: extracted.igTotalViews ?? req.currentReport.igTotalViews,
    igTopContentTitle: extracted.igTopContentTitle || req.currentReport.igTopContentTitle,
    igTopContentViews: extracted.igTopContentViews ?? req.currentReport.igTopContentViews,
    ttFollowers: extracted.ttFollowers ?? req.currentReport.ttFollowers,
    ttFollowersGrowth: extracted.ttFollowersGrowth ?? req.currentReport.ttFollowersGrowth,
    ttPostsCount: extracted.ttPostsCount ?? req.currentReport.ttPostsCount,
    ttTotalViews: extracted.ttTotalViews ?? req.currentReport.ttTotalViews,
    ttTopContentTitle: extracted.ttTopContentTitle || req.currentReport.ttTopContentTitle,
    ttTopContentViews: extracted.ttTopContentViews ?? req.currentReport.ttTopContentViews,
    updatedAt: new Date().toISOString(),
    source: 'bot-screenshot',
  };

  return {
    report: merged,
    botMessage:
      extracted.summaryNote ||
      'Bot AI berhasil menyalin angka persis dari Screenshot Insight ke laporan @pondokqq!',
  };
}
