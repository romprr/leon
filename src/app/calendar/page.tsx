'use client';

import { useStore } from '@/lib/store';
import { useState, useMemo, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Book, Dumbbell, Brain, Moon, X, Trash2, Ban, Plus, Calendar as CalendarIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format, addDays, isSameDay, parseISO, startOfDay, endOfDay } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';
import { Event } from '@/types';

export default function CalendarPage() {
  const { events, updateEvent, removeEvent, addEvent, user, goals, healthStats, removeCalendar, weeklyPlanSnapshot, runDailyPlanning } = useStore();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showManageCals, setShowManageCals] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  const days = useMemo(() => {
    return Array.from({ length: 5 }, (_, i) => addDays(addDays(currentDate, -2), i));
  }, [currentDate]);

  const filteredEvents = useMemo(() => {
    return events
      .filter(e => {
        const start = parseISO(e.startTime);
        const end = parseISO(e.endTime);
        const dayStart = startOfDay(currentDate);
        const dayEnd = endOfDay(currentDate);

        return (
          isSameDay(start, currentDate) || 
          isSameDay(end, currentDate) || 
          (start < dayStart && end > dayEnd)
        );
      })
      .sort((a, b) => parseISO(a.startTime).getTime() - parseISO(b.startTime).getTime());
  }, [events, currentDate]);

  useEffect(() => {
    if (!user.isSetupComplete) return; 
    
    const todayStart = startOfDay(new Date());
    const currentStart = startOfDay(currentDate);
    
    if (currentStart < todayStart) return;

    const hasGenerated = events.some(e => 
      e.type === 'generated' && 
      isSameDay(parseISO(e.startTime), currentDate)
    );

    if (!hasGenerated && !isGenerating) {
      setIsGenerating(true);
      runDailyPlanning(currentDate).finally(() => setIsGenerating(false));
    }
  }, [currentDate, events.length, user.isSetupComplete]);

  const handleAddManual = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const title = formData.get('title') as string;
    const startDate = formData.get('startDate') as string;
    const startTime = formData.get('startTime') as string;
    const endDate = formData.get('endDate') as string;
    const endTime = formData.get('endTime') as string;
    const description = formData.get('description') as string;

    addEvent({
      title,
      startTime: new Date(`${startDate}T${startTime}`).toISOString(),
      endTime: new Date(`${endDate}T${endTime}`).toISOString(),
      type: 'calendar',
      status: 'active',
      description
    });
    setShowAddModal(false);
  };

  return (
    <div className="p-6 font-fredoka min-h-full">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-[25px] font-medium text-black">Your calendar</h1>
        <div className="flex gap-2">
          <button 
            onClick={() => setShowAddModal(true)}
            className="border-3 border-[#39a62d] text-[#39a62d] p-2 rounded-full transition-transform active:scale-90"
          >
            <Plus size={24} />
          </button>
        </div>
      </div>

      <div className="flex justify-between items-center mb-6">
        <button onClick={() => setCurrentDate(addDays(currentDate, -1))}><ChevronLeft size={31} /></button>
        <p className="text-[25px] font-medium text-black">{format(currentDate, 'dd MMMM yyyy')}</p>
        <button onClick={() => setCurrentDate(addDays(currentDate, 1))}><ChevronRight size={31} /></button>
      </div>

      <div className="flex justify-between mb-8">
        {days.map((d) => {
          const active = isSameDay(d, currentDate);
          return (
            <div 
              key={d.toISOString()}
              onClick={() => setCurrentDate(d)}
              className={cn(
                "flex flex-col items-center justify-center w-[58px] h-[93px] rounded-[15px] border-2 cursor-pointer transition-all",
                active ? "bg-[#39a62d] border-[#fffff0] text-white scale-110" : "bg-white border-black text-black"
              )}
            >
              <p className="font-poppins text-[14px]">{format(d, 'EEE')}</p>
              <p className="font-poppins text-[22px] font-medium">{format(d, 'd')}</p>
            </div>
          );
        })}
      </div>

      <div className="flex flex-col gap-4">
        {filteredEvents.map((event) => (
          <motion.div 
            layoutId={event.id}
            key={event.id} 
            onClick={() => setSelectedEvent(event)}
            className={cn(
              "rounded-[20px] p-4 flex items-center gap-4 text-white cursor-pointer relative transition-opacity",
              event.type === 'generated' ? "bg-[#39a62d]" : "bg-[#483c32]",
              event.status === 'canceled' && "opacity-50 grayscale"
            )}
          >
            {event.type === 'calendar' ? <Book size={24} /> : <Brain size={24} />}
            <div>
              <p className="font-poppins font-medium text-[18px]">{event.title}</p>
              <p className="font-poppins text-[13px] opacity-80">
                {format(parseISO(event.startTime), 'HH:mm')} - {format(parseISO(event.endTime), 'HH:mm')}
              </p>
            </div>
            {event.status === 'canceled' && (
              <span className="absolute top-2 right-4 text-[10px] font-bold uppercase tracking-widest text-white/50">Canceled</span>
            )}
          </motion.div>
        ))}
      </div>

      {/* Event Details Modal */}
      <AnimatePresence>
        {selectedEvent && (
          <>
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setSelectedEvent(null)}
              className="fixed inset-0 bg-black/50 z-[60] flex items-end justify-center"
            >
              <motion.div 
                initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
                onClick={(e) => e.stopPropagation()}
                className="bg-[#fffff0] w-full max-w-[430px] rounded-t-[30px] p-8 pb-12 shadow-2xl relative text-black"
              >
                <div className="flex justify-between items-start mb-6">
                  <h2 className="text-2xl font-bold">{selectedEvent.title}</h2>
                  <button onClick={() => setSelectedEvent(null)}><X /></button>
                </div>
                
                <div className="space-y-4 mb-8">
                  <p className="text-gray-600">Time: {format(parseISO(selectedEvent.startTime), 'HH:mm')} - {format(parseISO(selectedEvent.endTime), 'HH:mm')}</p>
                  {selectedEvent.description && <p className="text-gray-600">{selectedEvent.description}</p>}
                </div>

                <div className="flex gap-4">
                  <button 
                    onClick={() => {
                      updateEvent(selectedEvent.id, { status: selectedEvent.status === 'canceled' ? 'active' : 'canceled' });
                      setSelectedEvent(null);
                    }}
                    className="flex-1 border-2 border-[#483c32] text-[#483c32] h-[52px] rounded-xl flex items-center justify-center gap-2 font-bold"
                  >
                    <Ban size={20} />
                    {selectedEvent.status === 'canceled' ? 'Restore' : 'Cancel'}
                  </button>
                  <button 
                    onClick={() => {
                      removeEvent(selectedEvent.id);
                      setSelectedEvent(null);
                    }}
                    className="flex-1 bg-red-600 text-white h-[52px] rounded-xl flex items-center justify-center gap-2 font-bold"
                  >
                    <Trash2 size={20} />
                    Delete
                  </button>
                </div>
              </motion.div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Add Modal */}
      <AnimatePresence>
        {showAddModal && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-[60] flex items-end justify-center"
            onClick={() => setShowAddModal(false)}
          >
            <motion.form 
              onSubmit={handleAddManual}
              onClick={(e) => e.stopPropagation()}
              initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
              className="bg-[#fffff0] w-full max-w-[430px] rounded-t-[30px] p-8 pb-12 space-y-6 shadow-2xl relative text-black"
            >
              <div className="flex justify-between items-center mb-2">
                <h2 className="text-2xl font-bold text-black">New Event</h2>
                <button type="button" onClick={() => setShowAddModal(false)} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                  <X size={24} className="text-gray-400" />
                </button>
              </div>

              <div className="space-y-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-[#39a62d] uppercase tracking-wider ml-1">Event Title</label>
                  <input name="title" placeholder="What are you doing?" required className="w-full p-4 border-2 rounded-2xl border-[#39a62d]/10 outline-none bg-white focus:border-[#39a62d] text-lg font-medium transition-all" />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-wider ml-1">Start Date</label>
                    <input name="startDate" type="date" defaultValue={format(currentDate, 'yyyy-MM-dd')} required className="w-full p-3 border-2 rounded-xl border-gray-100 outline-none bg-white focus:border-[#39a62d] text-sm" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-wider ml-1">Start Time</label>
                    <input name="startTime" type="time" defaultValue="09:00" required className="w-full p-3 border-2 rounded-xl border-gray-100 outline-none bg-white focus:border-[#39a62d] text-sm" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-wider ml-1">End Date</label>
                    <input name="endDate" type="date" defaultValue={format(currentDate, 'yyyy-MM-dd')} required className="w-full p-3 border-2 rounded-xl border-gray-100 outline-none bg-white focus:border-[#39a62d] text-sm" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-wider ml-1">End Time</label>
                    <input name="endTime" type="time" defaultValue="10:00" required className="w-full p-3 border-2 rounded-xl border-gray-100 outline-none bg-white focus:border-[#39a62d] text-sm" />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-wider ml-1">Notes (Optional)</label>
                  <textarea name="description" placeholder="Any details..." rows={2} className="w-full p-4 border-2 rounded-2xl border-gray-100 outline-none bg-white focus:border-[#39a62d] text-sm resize-none" />
                </div>
              </div>

              <div className="flex gap-4 pt-4">
                <button 
                  type="submit" 
                  className="w-full bg-[#39a62d] text-white h-[60px] rounded-[20px] font-bold text-lg shadow-[0_4px_15px_rgba(57,166,45,0.3)] transition-transform active:scale-95 flex items-center justify-center gap-2"
                >
                  <Plus size={24} /> Create Event
                </button>
              </div>
            </motion.form>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
