'use client';

import { useStore } from '@/lib/store';
import { useState, useEffect, useMemo } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Book, Dumbbell, Brain, ChevronRight, Target, Award } from 'lucide-react';
import { motion } from 'framer-motion';
import { format, parseISO, isSameDay } from 'date-fns';
import { cn } from '@/lib/utils';

export default function HomePage() {
  const { user, events, insights, goals, healthStats, addEvent, waterIntake } = useStore();
  const today = new Date();

  // Trigger Weekly Planning on load
  useEffect(() => {
    if (!user.isSetupComplete) return; // DON'T RUN AI DURING SETUP
    
    const hasWeeklyPlan = events.some(e => e.type === 'generated' && parseISO(e.startTime) > today);
    if (!hasWeeklyPlan) {
      generateWeeklyPlan();
    }
  }, [user.isSetupComplete]);

  async function generateWeeklyPlan() {
    try {
      const res = await fetch('/api/ai/weekly', {
        method: 'POST',
        body: JSON.stringify({ calendarEvents: events, userData: user, healthStats })
      });
      const data = await res.json();
      if (data.summary) {
        useStore.getState().setWeeklyPlanSnapshot(data.summary);
      }
      if (data.events) {
        data.events.forEach((ev: any) => addEvent({ ...ev, status: 'active', type: 'generated' }));
      }
    } catch (e) {
      console.error("Weekly plan failed", e);
    }
  }

  const todayEvents = useMemo(() => {
    return events
      .filter(e => {
        const eventStart = parseISO(e.startTime);
        return isSameDay(eventStart, today) && eventStart > today && e.status !== 'canceled';
      })
      .sort((a, b) => a.startTime.localeCompare(b.startTime));
  }, [events, today]);

  const studyHours = useMemo(() => {
    const studyKeywords = ['study', 'course', 'math', 'data', 'engineering', 'exam', 'homework'];
    const totalMinutes = todayEvents
      .filter(e => studyKeywords.some(kw => e.title.toLowerCase().includes(kw)))
      .reduce((acc, e) => {
        const start = parseISO(e.startTime);
        const end = parseISO(e.endTime);
        return acc + (end.getTime() - start.getTime()) / 60000;
      }, 0);
    return (totalMinutes / 60).toFixed(1);
  }, [todayEvents]);

  const activeInsights = useMemo(() => {
    return insights.filter(i => !i.done).slice(0, 2);
  }, [insights]);

  return (
    <div className="p-6 font-fredoka space-y-8">
      {/* Welcome Section */}
      <div className="flex flex-col items-center pt-4">
        <motion.div 
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="relative w-[80px] h-[80px]"
        >
          <Image 
            src="/images/welcome_leon_home_page.png" 
            alt="Welcome Leon" 
            fill
            className="object-contain"
          />
        </motion.div>
        <h1 className="text-[#39a62d] text-[30px] font-semibold mt-2">Hey {user.name}</h1>
        <div className="flex items-center gap-2 mt-1">
          <Award size={16} className="text-[#39a62d]" />
          <span className="text-sm font-poppins text-gray-500">Level {user.level} • {user.rank}</span>
        </div>
      </div>

      {/* Your Recap Section */}
      <section className="mt-8 px-2">
        <h2 className="text-[25px] font-medium text-black font-fredoka">Your recap</h2>
        <div className="flex justify-between items-start mt-6 px-4">
          <div className="flex flex-col items-center gap-2">
            <div className="border-3 border-[#39a62d] rounded-full overflow-hidden w-[69px] h-[69px] relative">
              <Image src="/images/sleeping_recap_left_leon_home_page.png" alt="Sleep" fill className="object-cover" />
            </div>
            <p className="font-poppins text-[25px] font-medium text-black">{healthStats.sleepHours ?? 0} h</p>
          </div>
          <div className="flex flex-col items-center gap-2">
            <div className="border-3 border-[#39a62d] rounded-full overflow-hidden w-[69px] h-[69px] relative">
              <Image src="/images/studying_recap_middle_leon_home_page.png" alt="Focus" fill className="object-cover" />
            </div>
            <p className="font-poppins text-[25px] font-medium text-black text-center">{studyHours ?? 0} h</p>
          </div>
          <div className="flex flex-col items-center gap-2">
            <div className="border-3 border-[#39a62d] rounded-full overflow-hidden w-[69px] h-[69px] relative">
              <Image src="/images/running_recap_right_leon_home_page.png" alt="Run" fill className="object-cover" />
            </div>
            <p className="font-poppins text-[25px] font-medium text-black text-center">{healthStats.activeMinutes ?? 0} min</p>
          </div>
        </div>
      </section>

      {/* Dynamic Insights Section */}
      <section>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-[25px] font-medium text-black">Insights</h2>
          <Link href="/insights" className="text-[#39a62d] text-sm font-bold flex items-center gap-1 hover:opacity-80 transition-opacity">
            All <ChevronRight size={16} />
          </Link>
        </div>
        
        <div className="space-y-3">
          {activeInsights.length > 0 ? activeInsights.map((insight) => (
            <motion.div 
              key={insight.id}
              className="border-2 border-[#39a62d] rounded-[20px] h-[60px] flex items-center px-4 justify-between bg-white shadow-sm"
            >
              <div className="flex items-center gap-3">
                <div className="w-[40px] h-[40px] rounded-full border border-gray-100 overflow-hidden">
                   <Image src={insight.image} alt={insight.title} width={40} height={40} className="object-cover" />
                </div>
                <div>
                  <p className="font-poppins font-medium text-sm">{insight.title}</p>
                  <p className="text-[10px] text-[#39a62d]">+{insight.xpValue} XP</p>
                </div>
              </div>
              <button className="bg-[#39a62d] text-white px-3 py-1 rounded-full text-xs font-bold">Done</button>
            </motion.div>
          )) : (
            <p className="text-sm text-gray-400 text-center py-4 italic">You're all caught up! Great job.</p>
          )}
        </div>
      </section>

      {/* Upcoming Events Section */}
      <section>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-[25px] font-medium text-black">Coming next</h2>
          <Link href="/calendar" className="text-[#39a62d] text-sm font-bold flex items-center gap-1 hover:opacity-80 transition-opacity">
            All <ChevronRight size={16} />
          </Link>
        </div>
        <div className="space-y-3">
          {todayEvents.length > 0 ? todayEvents.slice(0, 3).map((event) => (
            <div 
              key={event.id} 
              className={cn(
                "rounded-[20px] p-4 flex items-center gap-4 text-white shadow-md",
                event.type === 'generated' ? "bg-[#39a62d]" : "bg-[#483c32]"
              )}
            >
              <div className="bg-white/10 p-2 rounded-lg">
                {event.type === 'calendar' ? <Book size={20} /> : <Brain size={20} />}
              </div>
              <div>
                <p className="font-poppins font-medium text-[16px] leading-tight">{event.title}</p>
                <p className="font-poppins text-xs opacity-70">
                  {format(parseISO(event.startTime), 'HH:mm')} - {format(parseISO(event.endTime), 'HH:mm')}
                </p>
              </div>
            </div>
          )) : (
            <div className="text-center py-8 bg-gray-50 rounded-[25px] border-2 border-dashed border-gray-200">
              <p className="text-sm text-gray-400">Nothing on your schedule.</p>
            </div>
          )}
        </div>
      </section>

      {/* Goals Progress Section */}
      {goals.length > 0 && (
        <section className="bg-[#483c32] rounded-[30px] p-6 text-white shadow-xl mb-4">
          <div className="flex items-center gap-2 mb-4">
            <Target className="text-[#39a62d]" size={20} />
            <h2 className="text-xl font-medium">Daily Goals</h2>
          </div>
          <div className="space-y-4">
            {goals.map(goal => {
              // Dynamic Progress Calculation
              let currentVal = goal.current;
              const title = goal.title.toLowerCase();
              
              if (title.includes('steps')) currentVal = healthStats.steps;
              else if (title.includes('sleep')) currentVal = healthStats.sleepHours;
              else if (title.includes('water')) currentVal = waterIntake;

              const progress = Math.min(100, Math.round((currentVal / goal.target) * 100));

              return (
                <div key={goal.id}>
                  <div className="flex justify-between text-xs mb-1 font-poppins">
                    <span>{goal.title}</span>
                    <span>{progress}%</span>
                  </div>
                  <div className="w-full bg-white/10 h-1.5 rounded-full overflow-hidden">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${progress}%` }}
                      className="bg-[#39a62d] h-full"
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}
