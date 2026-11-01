import React, { useState, useMemo } from 'react';
import { MediaEvent, EventCategory } from '../types';
import { 
  Calendar as CalendarIcon, Clock, MapPin, Users, 
  Wrench, Plus, ChevronLeft, ChevronRight, Edit3, 
  Trash2, Search, Eye, X, CalendarDays, List, Filter
} from 'lucide-react';

interface CalendarViewProps {
  events: MediaEvent[];
  isAdmin: boolean;
  onAddEvent: () => void;
  onEditEvent: (event: MediaEvent) => void;
  onDeleteEvent: (id: string) => void;
}

const CATEGORIES: ('Semua' | EventCategory)[] = [
  'Semua',
  'Liputan Santri',
  'Live Streaming',
  'Kajian / Tabligh',
  'Produksi Konten',
  'Internal Pesantren',
];

export const CalendarView: React.FC<CalendarViewProps> = ({
  events,
  isAdmin,
  onAddEvent,
  onEditEvent,
  onDeleteEvent,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<'Semua' | EventCategory>('Semua');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<'agenda' | 'month'>('agenda');
  const [selectedEventForDetail, setSelectedEventForDetail] = useState<MediaEvent | null>(null);

  // Month navigation
  const prevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };
  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const monthName = currentDate.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const firstDayOfWeek = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  // Filter events
  const filteredEvents = useMemo(() => {
    return events
      .filter((evt) => {
        const query = searchQuery.toLowerCase().trim();
        const matchSearch =
          !query ||
          evt.title.toLowerCase().includes(query) ||
          evt.location.toLowerCase().includes(query) ||
          evt.crewAssigned.some((c) => c.toLowerCase().includes(query)) ||
          evt.requiredGear.some((g) => g.toLowerCase().includes(query));

        const matchCat = selectedCategory === 'Semua' || evt.category === selectedCategory;
        return matchSearch && matchCat;
      })
      .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime());
  }, [events, searchQuery, selectedCategory]);

  // Color config per category: bold vibrant badge & row accents
  const getCategoryStyles = (cat: EventCategory) => {
    switch (cat) {
      case 'Liputan Santri':
        return {
          pill: 'bg-emerald-600 text-white font-bold',
          dateBadge: 'bg-emerald-100 text-emerald-900 border-l-4 border-emerald-600',
          borderAccent: 'border-l-4 border-l-emerald-600 hover:bg-emerald-50/60',
          dot: 'bg-emerald-600',
          tag: 'bg-emerald-100/90 text-emerald-800'
        };
      case 'Live Streaming':
        return {
          pill: 'bg-rose-600 text-white font-bold',
          dateBadge: 'bg-rose-100 text-rose-900 border-l-4 border-rose-600',
          borderAccent: 'border-l-4 border-l-rose-600 hover:bg-rose-50/60',
          dot: 'bg-rose-600',
          tag: 'bg-rose-100/90 text-rose-800'
        };
      case 'Kajian / Tabligh':
        return {
          pill: 'bg-amber-600 text-white font-bold',
          dateBadge: 'bg-amber-100 text-amber-900 border-l-4 border-amber-600',
          borderAccent: 'border-l-4 border-l-amber-600 hover:bg-amber-50/60',
          dot: 'bg-amber-600',
          tag: 'bg-amber-100/90 text-amber-800'
        };
      case 'Produksi Konten':
        return {
          pill: 'bg-purple-600 text-white font-bold',
          dateBadge: 'bg-purple-100 text-purple-900 border-l-4 border-purple-600',
          borderAccent: 'border-l-4 border-l-purple-600 hover:bg-purple-50/60',
          dot: 'bg-purple-600',
          tag: 'bg-purple-100/90 text-purple-800'
        };
      case 'Internal Pesantren':
        return {
          pill: 'bg-sky-600 text-white font-bold',
          dateBadge: 'bg-sky-100 text-sky-900 border-l-4 border-sky-600',
          borderAccent: 'border-l-4 border-l-sky-600 hover:bg-sky-50/60',
          dot: 'bg-sky-600',
          tag: 'bg-sky-100/90 text-sky-800'
        };
      default:
        return {
          pill: 'bg-slate-700 text-white font-bold',
          dateBadge: 'bg-slate-100 text-slate-800 border-l-4 border-slate-600',
          borderAccent: 'border-l-4 border-l-slate-600 hover:bg-slate-50',
          dot: 'bg-slate-600',
          tag: 'bg-slate-100 text-slate-800'
        };
    }
  };

  const formatShortDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      const day = d.getDate();
      const monthShort = d.toLocaleDateString('id-ID', { month: 'short' });
      const dayName = d.toLocaleDateString('id-ID', { weekday: 'short' });
      return { day, monthShort, dayName };
    } catch {
      return { day: '00', monthShort: '---', dayName: '---' };
    }
  };

  return (
    <div className="space-y-3 pb-8">
      {/* Compact Top Bar: Title, Count, View Mode Toggle & Add Button */}
      <div className="bg-white rounded-2xl p-3 sm:p-4 shadow-xs flex flex-wrap items-center justify-between gap-2.5">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-teal-600 text-white flex items-center justify-center shadow-xs shrink-0">
            <CalendarIcon className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-base sm:text-lg font-black text-slate-900 leading-none">
              Kalender Kegiatan
            </h1>
            <p className="text-[11px] text-slate-500 font-medium hidden sm:block mt-0.5">
              Jadwal liputan, live streaming, dan tugas tim media
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0 ml-auto">
          {/* Switch View Toggle */}
          <div className="flex items-center bg-slate-100 p-0.5 rounded-xl text-xs font-bold">
            <button
              onClick={() => setViewMode('agenda')}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg transition-all ${
                viewMode === 'agenda'
                  ? 'bg-white text-teal-800 shadow-2xs font-extrabold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              title="Daftar Padat 10-15 Kegiatan"
            >
              <List className="w-3.5 h-3.5" />
              <span>Daftar Agenda</span>
            </button>
            <button
              onClick={() => setViewMode('month')}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg transition-all ${
                viewMode === 'month'
                  ? 'bg-white text-teal-800 shadow-2xs font-extrabold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              title="Tampilan Kalender Bulanan"
            >
              <CalendarDays className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Bulan</span>
            </button>
          </div>

          {/* Add Event Button for Admin */}
          {isAdmin && (
            <button
              onClick={onAddEvent}
              className="px-3 py-1.5 text-xs font-bold text-slate-900 bg-amber-300 hover:bg-amber-200 rounded-xl transition-all flex items-center gap-1 shadow-2xs shrink-0"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Tambah</span>
            </button>
          )}
        </div>
      </div>

      {/* Ultra Compact Filter & Search Bar */}
      <div className="bg-white rounded-2xl p-2.5 sm:p-3 shadow-xs space-y-2">
        <div className="flex flex-col sm:flex-row gap-2 items-center">
          {/* Search Box */}
          <div className="relative w-full sm:w-72 shrink-0">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Cari kegiatan, lokasi, kru, alat..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-7 py-1.5 text-xs rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:ring-1 focus:ring-teal-600 text-slate-800 placeholder-slate-400"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          {/* Horizontal Category Chips */}
          <div className="flex items-center gap-1 overflow-x-auto w-full pb-0.5 scrollbar-none">
            {CATEGORIES.map((cat) => {
              const isSelected = selectedCategory === cat;
              return (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-2.5 py-1 text-[11px] font-bold rounded-lg transition-all whitespace-nowrap shrink-0 ${
                    isSelected
                      ? 'bg-teal-700 text-white shadow-2xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {cat}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      {viewMode === 'agenda' ? (
        /* High-Density 10-15 Items Layout: Clean, Compact, Immediate Scanning */
        <div className="bg-white rounded-2xl shadow-xs overflow-hidden">
          {filteredEvents.length === 0 ? (
            <div className="py-12 text-center">
              <CalendarIcon className="w-10 h-10 text-slate-300 mx-auto mb-2" />
              <h3 className="text-sm font-bold text-slate-800">Tidak ada agenda kegiatan</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Coba ubah kata kunci pencarian atau kategori filter.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {filteredEvents.map((evt, index) => {
                const styles = getCategoryStyles(evt.category);
                const { day, monthShort, dayName } = formatShortDate(evt.startDate);
                const crewCount = evt.crewAssigned?.length || 0;
                const gearCount = evt.requiredGear?.length || 0;

                return (
                  <div
                    key={evt.id}
                    onClick={() => setSelectedEventForDetail(evt)}
                    className={`flex flex-col sm:flex-row sm:items-center justify-between p-2.5 sm:px-4 sm:py-2.5 transition-colors cursor-pointer group ${styles.borderAccent} ${
                      index % 2 === 0 ? 'bg-white' : 'bg-slate-50/40'
                    }`}
                  >
                    {/* Left & Middle Info */}
                    <div className="flex items-start sm:items-center gap-2.5 sm:gap-3 flex-1 min-w-0">
                      {/* Compact Date Box */}
                      <div className="w-11 sm:w-12 h-11 rounded-xl bg-slate-100 flex flex-col items-center justify-center shrink-0 border border-slate-200/60 leading-none">
                        <span className="text-[9px] font-bold text-slate-500 uppercase">{dayName}</span>
                        <span className="text-sm sm:text-base font-black text-slate-900 my-0.5">{day}</span>
                        <span className="text-[9px] font-bold text-teal-800 uppercase">{monthShort}</span>
                      </div>

                      {/* Main Title, Badges, Time & Location */}
                      <div className="min-w-0 flex-1 space-y-1 sm:space-y-0.5">
                        <div className="flex flex-wrap items-center gap-1.5">
                          {/* Category Badge */}
                          <span className={`text-[10px] px-2 py-0.5 rounded-md leading-none ${styles.pill}`}>
                            {evt.category}
                          </span>
                          
                          {/* Time */}
                          <span className="text-[11px] font-bold text-slate-600 flex items-center gap-1">
                            <Clock className="w-3 h-3 text-slate-400" />
                            {evt.startTime} - {evt.endTime} WIB
                          </span>

                          {/* Crew Count Pill (Mobile) */}
                          {crewCount > 0 && (
                            <span className="inline-flex sm:hidden items-center gap-0.5 text-[10px] font-semibold text-teal-700 bg-teal-50 px-1.5 py-0.5 rounded">
                              <Users className="w-2.5 h-2.5" />
                              {crewCount} Kru
                            </span>
                          )}
                        </div>

                        {/* Title */}
                        <h2 className="text-xs sm:text-sm font-extrabold text-slate-900 truncate group-hover:text-teal-700 transition-colors">
                          {evt.title}
                        </h2>

                        {/* Sub-line: Location, Assigned Crew & Gear on larger screens */}
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] text-slate-500 font-medium">
                          <span className="flex items-center gap-1 truncate max-w-[200px] sm:max-w-xs">
                            <MapPin className="w-3 h-3 text-rose-500 shrink-0" />
                            <span className="truncate">{evt.location}</span>
                          </span>

                          {/* Crew list (Desktop/Tablet) */}
                          <span className="hidden md:flex items-center gap-1 text-slate-600 truncate max-w-[220px]">
                            <Users className="w-3 h-3 text-teal-600 shrink-0" />
                            <span className="truncate font-semibold text-slate-700">
                              {crewCount > 0 ? evt.crewAssigned.join(', ') : 'Belum ada kru'}
                            </span>
                          </span>

                          {/* Gear Count / Snippet */}
                          {gearCount > 0 && (
                            <span className="hidden lg:flex items-center gap-1 text-slate-600 truncate max-w-[180px]">
                              <Wrench className="w-3 h-3 text-amber-600 shrink-0" />
                              <span className="truncate">{gearCount} Alat: {evt.requiredGear[0]}</span>
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Right Action Buttons */}
                    <div className="flex items-center gap-1 shrink-0 mt-2 sm:mt-0 self-end sm:self-center">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedEventForDetail(evt);
                        }}
                        className="px-2 py-1 text-[11px] font-bold text-teal-800 bg-teal-50 hover:bg-teal-100 rounded-lg transition-colors flex items-center gap-1"
                        title="Lihat Detail Acara"
                      >
                        <Eye className="w-3 h-3" />
                        <span className="hidden sm:inline">Detail</span>
                      </button>

                      {isAdmin && (
                        <>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onEditEvent(evt);
                            }}
                            className="p-1 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
                            title="Edit Jadwal"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onDeleteEvent(evt.id);
                            }}
                            className="p-1 text-rose-600 hover:text-rose-900 hover:bg-rose-50 rounded-lg transition-colors"
                            title="Hapus Jadwal"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : (
        /* Month Calendar View */
        <div className="bg-white rounded-2xl p-3 sm:p-5 shadow-xs space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <h3 className="text-sm sm:text-base font-extrabold text-slate-900 capitalize">
              {monthName}
            </h3>
            <div className="flex items-center gap-1">
              <button
                onClick={prevMonth}
                className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => setCurrentDate(new Date())}
                className="px-2.5 py-1 text-xs font-bold text-emerald-950 bg-amber-300 hover:bg-amber-200 rounded-lg transition-colors"
              >
                Bulan Ini
              </button>
              <button
                onClick={nextMonth}
                className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Weekday Header */}
          <div className="grid grid-cols-7 gap-1 text-center font-bold text-[10px] text-slate-400 uppercase tracking-wider">
            <span>Min</span>
            <span>Sen</span>
            <span>Sel</span>
            <span>Rab</span>
            <span>Kam</span>
            <span>Jum</span>
            <span>Sab</span>
          </div>

          {/* Month Day Cells */}
          <div className="grid grid-cols-7 gap-1 text-xs">
            {Array.from({ length: firstDayOfWeek }).map((_, i) => (
              <div key={`empty-${i}`} className="min-h-[64px] sm:min-h-[80px] p-1 bg-slate-50/50 rounded-xl" />
            ))}

            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1;
              const dateKey = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
              const dayEvents = events.filter((e) => e.startDate === dateKey);

              const isToday =
                new Date().getDate() === day &&
                new Date().getMonth() === month &&
                new Date().getFullYear() === year;

              return (
                <div
                  key={day}
                  className={`min-h-[64px] sm:min-h-[80px] p-1.5 rounded-xl flex flex-col justify-between transition-colors border ${
                    isToday
                      ? 'bg-teal-50 border-teal-300 text-teal-950 shadow-2xs'
                      : 'bg-white border-slate-100 hover:bg-slate-50 text-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span
                      className={`text-[11px] font-extrabold font-mono ${
                        isToday
                          ? 'w-5 h-5 rounded-full bg-teal-600 text-white flex items-center justify-center text-[10px]'
                          : 'text-slate-700'
                      }`}
                    >
                      {day}
                    </span>
                    {dayEvents.length > 0 && (
                      <span className="text-[9px] font-black text-white bg-amber-500 px-1.5 py-0.2 rounded-full">
                        {dayEvents.length}
                      </span>
                    )}
                  </div>

                  <div className="space-y-0.5 mt-1 overflow-y-auto max-h-[46px] scrollbar-none">
                    {dayEvents.map((evt) => {
                      const styles = getCategoryStyles(evt.category);
                      return (
                        <div
                          key={evt.id}
                          onClick={() => setSelectedEventForDetail(evt)}
                          title={`${evt.title} (${evt.startTime})`}
                          className={`text-[9px] p-0.5 sm:px-1 rounded font-bold truncate cursor-pointer transition-transform hover:scale-102 ${styles.tag}`}
                        >
                          {evt.startTime} {evt.title}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Quick Detail Modal for Selected Event */}
      {selectedEventForDetail && (
        <div 
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-2xs flex items-center justify-center p-3 z-50 animate-in fade-in duration-150"
          onClick={() => setSelectedEventForDetail(null)}
        >
          <div 
            className="bg-white rounded-3xl max-w-lg w-full p-5 sm:p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-3">
              <div className="space-y-1">
                <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase ${getCategoryStyles(selectedEventForDetail.category).pill}`}>
                  {selectedEventForDetail.category}
                </span>
                <h2 className="text-base sm:text-lg font-black text-slate-900 leading-snug">
                  {selectedEventForDetail.title}
                </h2>
              </div>
              <button
                onClick={() => setSelectedEventForDetail(null)}
                className="p-1.5 text-slate-400 hover:text-slate-700 bg-slate-100 rounded-xl"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Event Timing & Location */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              <div className="p-3 bg-slate-50 rounded-2xl flex items-center gap-2.5">
                <CalendarIcon className="w-4 h-4 text-teal-600 shrink-0" />
                <div>
                  <div className="text-[10px] text-slate-400 font-bold uppercase">Tanggal</div>
                  <div className="font-bold text-slate-800">{selectedEventForDetail.startDate}</div>
                </div>
              </div>

              <div className="p-3 bg-slate-50 rounded-2xl flex items-center gap-2.5">
                <Clock className="w-4 h-4 text-amber-600 shrink-0" />
                <div>
                  <div className="text-[10px] text-slate-400 font-bold uppercase">Waktu</div>
                  <div className="font-bold text-slate-800">
                    {selectedEventForDetail.startTime} - {selectedEventForDetail.endTime} WIB
                  </div>
                </div>
              </div>

              <div className="p-3 bg-slate-50 rounded-2xl flex items-center gap-2.5 sm:col-span-2">
                <MapPin className="w-4 h-4 text-rose-600 shrink-0" />
                <div>
                  <div className="text-[10px] text-slate-400 font-bold uppercase">Lokasi Kegiatan</div>
                  <div className="font-bold text-slate-800">{selectedEventForDetail.location}</div>
                </div>
              </div>
            </div>

            {/* Description */}
            {selectedEventForDetail.description && (
              <div className="text-xs bg-slate-50 p-3 rounded-2xl text-slate-700 leading-relaxed">
                <span className="font-bold text-slate-900 block mb-1">Catatan Acara:</span>
                "{selectedEventForDetail.description}"
              </div>
            )}

            {/* Assigned Crew */}
            <div className="space-y-1.5">
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
                <Users className="w-4 h-4 text-teal-600" />
                <span>Kru Media yang Ditugaskan ({selectedEventForDetail.crewAssigned?.length || 0}):</span>
              </div>
              {selectedEventForDetail.crewAssigned && selectedEventForDetail.crewAssigned.length > 0 ? (
                <div className="flex flex-wrap gap-1.5">
                  {selectedEventForDetail.crewAssigned.map((crew, idx) => (
                    <span
                      key={idx}
                      className="bg-teal-50 text-teal-900 text-xs font-bold px-2.5 py-1 rounded-xl border border-teal-200/50"
                    >
                      {crew}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-400 italic">Belum ada kru yang ditugaskan</p>
              )}
            </div>

            {/* Equipment Gear */}
            <div className="space-y-1.5">
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
                <Wrench className="w-4 h-4 text-amber-600" />
                <span>Peralatan Multimedia yang Digunakan ({selectedEventForDetail.requiredGear?.length || 0}):</span>
              </div>
              {selectedEventForDetail.requiredGear && selectedEventForDetail.requiredGear.length > 0 ? (
                <div className="flex flex-wrap gap-1.5">
                  {selectedEventForDetail.requiredGear.map((gear, idx) => (
                    <span
                      key={idx}
                      className="bg-amber-50 text-amber-900 text-xs font-bold px-2.5 py-1 rounded-xl border border-amber-200/50"
                    >
                      {gear}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-400 italic">Tidak ada catatan peralatan khusus</p>
              )}
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              {isAdmin && (
                <>
                  <button
                    onClick={() => {
                      const evt = selectedEventForDetail;
                      setSelectedEventForDetail(null);
                      onEditEvent(evt);
                    }}
                    className="px-3.5 py-2 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors flex items-center gap-1.5"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    <span>Edit Acara</span>
                  </button>
                  <button
                    onClick={() => {
                      const id = selectedEventForDetail.id;
                      setSelectedEventForDetail(null);
                      onDeleteEvent(id);
                    }}
                    className="px-3.5 py-2 text-xs font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 rounded-xl transition-colors flex items-center gap-1.5"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Hapus</span>
                  </button>
                </>
              )}
              <button
                onClick={() => setSelectedEventForDetail(null)}
                className="px-4 py-2 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-xl transition-colors"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
