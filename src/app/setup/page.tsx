'use client';

import { useState, useEffect } from 'react';
import { useStore } from '@/lib/store';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, Plus, Calendar as CalendarIcon, Heart, User, Target, X, Camera } from 'lucide-react';
import Image from 'next/image';
import { signIn, useSession } from "next-auth/react";
import { cn } from '@/lib/utils';

const PREMADE_GOALS = [
  { title: 'Sleep 8h', target: 8, unit: 'hours', timeframe: 'daily' },
  { title: '10k Steps', target: 10000, unit: 'steps', timeframe: 'daily' },
  { title: 'Drink 2L Water', target: 2, unit: 'liters', timeframe: 'daily' },
  { title: 'Run 3x/Week', target: 3, unit: 'times', timeframe: 'weekly' },
];

export default function SetupPage() {
  const router = useRouter();
  const { user, goals, updateProfile, addGoal, removeGoal, completeSetup, addEvent, setupStep, setSetupStep, updateHealthStats } = useStore();
  const { data: session } = useSession();
  
  const [name, setName] = useState(user.name);
  const [newGoalTitle, setNewGoalTitle] = useState('');
  const [newGoalTarget, setNewGoalTarget] = useState('');
  const [newGoalTimeframe, setNewGoalTimeframe] = useState<'daily' | 'weekly' | 'semi-longterm' | 'longterm'>('daily');
  const [icalUrl, setIcalUrl] = useState('');
  const [loadingCalendar, setLoadingCalendar] = useState(false);
  const [isSyncingInitial, setIsSyncingInitial] = useState(false);

  const [suggestedTargets, setSuggestedTargets] = useState<Record<string, string>>({
    'Sleep 8h': '8',
    '10k Steps': '10000',
    'Drink 2L Water': '2',
    'Run 3x/Week': '3',
  });

  const nextStep = () => setSetupStep(setupStep + 1);
  const prevStep = () => setSetupStep(setupStep - 1);

  const handleFinish = async () => {
    setIsSyncingInitial(true);
    updateProfile({ name });

    try {
      // ENSURE INITIAL DATA IS FETCHED BEFORE FINISHING
      if (session) {
        const healthRes = await fetch('/api/health');
        const healthData = await healthRes.json();
        if (!healthData.error) updateHealthStats(healthData);

        const calRes = await fetch('/api/calendar/google');
        const calData = await calRes.json();
        if (calData.events) calData.events.forEach((ev: any) => addEvent(ev));
      }
    } catch (e) {
      console.error("Initial sync failed", e);
    } finally {
      completeSetup();
      router.push('/');
    }
  };

  const handleAddPremadeGoal = (title: string, target: any, unit: string, timeframe: any) => {
    addGoal({ 
      title, 
      target: isNaN(Number(target)) ? 1 : Number(target), 
      unit: isNaN(Number(target)) ? target : unit, 
      current: 0, 
      type: 'pre-made',
      timeframe
    });
  };

  const handleIcalSubmit = async () => {
    if (!icalUrl) return;
    setLoadingCalendar(true);
    try {
      const res = await fetch('/api/calendar', { method: 'POST', body: JSON.stringify({ url: icalUrl }) });
      const data = await res.json();
      if (data.events) {
        data.events.forEach((ev: any) => addEvent({ ...ev, sourceUrl: icalUrl }));
        updateProfile({ calendarUrls: [...(user.calendarUrls || []), icalUrl] });
        setIcalUrl('');
        alert('iCal successfully synced!');
      }
    } catch (e) { alert('Failed to import iCal.'); }
    finally { setLoadingCalendar(false); }
  };

  return (
    <div className="p-8 font-fredoka min-h-full flex flex-col bg-[#fffff0] overflow-y-auto">
      <div className="mb-12 text-center flex-shrink-0 pt-4">
        <div className="relative w-[120px] h-[120px] mx-auto mb-4">
          <Image src="/images/welcome_leon_home_page.png" alt="Leon" fill className="object-contain" />
        </div>
        <h1 className="text-3xl font-bold text-[#39a62d]">Welcome to Leon</h1>
        <p className="text-gray-400 mt-2">Let's set up your healthy life</p>
      </div>

      <div className="flex-1 pb-12">
        <AnimatePresence mode="wait">
          {setupStep === 1 && (
            <motion.div key="step1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6 text-black">
              <div className="space-y-2">
                <label className="text-sm font-bold text-gray-500 uppercase">Your Name</label>
                <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Antoine" className="w-full p-4 border-3 border-[#39a62d]/20 rounded-[20px] text-lg font-medium outline-none focus:border-[#39a62d] bg-white" />
              </div>

              <div className="space-y-4">
                <label className="text-sm font-bold text-gray-500 uppercase">Daily Goals</label>
                <div className="space-y-2">
                  {goals.map(goal => (
                    <div key={goal.id} className="flex justify-between items-center bg-white p-3 rounded-2xl border-2 border-[#39a62d]/10 shadow-sm">
                      <p className="font-medium text-sm">{goal.title} ({goal.timeframe})</p>
                      <button onClick={() => removeGoal(goal.id)} className="text-red-400 p-1"><X size={16} /></button>
                    </div>
                  ))}
                  {goals.length === 0 && <p className="text-xs text-gray-400 italic text-center py-2">No goals added yet.</p>}
                </div>
                
                <div className="p-4 bg-[#39a62d]/5 rounded-[20px] border-2 border-dashed border-[#39a62d]/20 space-y-3">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Custom Goal</p>
                  <input placeholder="Goal title" value={newGoalTitle} onChange={(e) => setNewGoalTitle(e.target.value)} className="w-full p-2 text-sm border-2 rounded-xl outline-none" />
                  <div className="flex gap-2">
                    <input placeholder="Target" value={newGoalTarget} onChange={(e) => setNewGoalTarget(e.target.value)} className="flex-1 p-2 text-sm border-2 rounded-xl outline-none" />
                    <select value={newGoalTimeframe} onChange={(e: any) => setNewGoalTimeframe(e.target.value)} className="p-2 border-2 rounded-xl text-[10px] bg-white">
                      <option value="daily">Daily</option>
                      <option value="weekly">Weekly</option>
                      <option value="semi-longterm">Semi-Long</option>
                      <option value="longterm">Longterm</option>
                    </select>
                  </div>
                  <button onClick={() => { if(newGoalTitle && newGoalTarget) { addGoal({ title: newGoalTitle, target: 1, unit: newGoalTarget, current: 0, type: 'custom', timeframe: newGoalTimeframe }); setNewGoalTitle(''); setNewGoalTarget(''); } }} className="w-full bg-[#39a62d] text-white py-2 rounded-xl font-bold">Add Custom</button>
                </div>

                <div className="space-y-2">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Suggested for you</p>
                  {PREMADE_GOALS.filter(pg => !goals.some(g => g.title === pg.title)).map((pg, i) => (
                    <div key={i} className="flex items-center gap-3 p-3 bg-white rounded-2xl border-2 border-gray-50 shadow-sm">
                      <div className="flex-1">
                        <p className="text-sm font-medium">{pg.title}</p>
                        <div className="flex items-center gap-1 mt-1">
                          <span className="text-[10px] text-gray-400">Target:</span>
                          <input value={suggestedTargets[pg.title] || pg.target} onChange={(e) => setSuggestedTargets({...suggestedTargets, [pg.title]: e.target.value})} className="bg-transparent border-b border-gray-100 text-[10px] w-10 outline-none focus:border-[#39a62d]" />
                          <span className="text-[10px] text-gray-400">{pg.unit} ({pg.timeframe})</span>
                        </div>
                      </div>
                      <button onClick={() => handleAddPremadeGoal(pg.title, suggestedTargets[pg.title] || pg.target, pg.unit, pg.timeframe)} className="bg-[#39a62d] text-white p-2 rounded-xl"><Plus size={16} /></button>
                    </div>
                  ))}
                </div>
              </div>
              
              <button onClick={nextStep} className="w-full bg-[#39a62d] text-white h-[60px] rounded-[20px] font-bold text-lg mt-4 shadow-lg shadow-[#39a62d]/20">Continue</button>
            </motion.div>
          )}

          {setupStep === 2 && (
            <motion.div key="step2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6 text-black">
              <div className="space-y-4">
                <h2 className="text-xl font-bold flex items-center gap-2 text-black"><CalendarIcon className="text-[#39a62d]" /> Connect Calendars</h2>
                <button onClick={() => signIn('google')} className="w-full flex items-center justify-between p-5 border-2 border-gray-100 rounded-[25px] bg-white transition-transform active:scale-95 shadow-sm">
                  <div className="flex items-center gap-3"><Image src="https://www.google.com/favicon.ico" alt="Google" width={32} height={32} /><div className="text-left"><p className="font-bold text-black">Google Calendar</p><p className="text-xs text-gray-400">Sync your agenda</p></div></div>
                  <div>{session ? <Check size={24} className="text-[#39a62d]" /> : <span className="text-xs font-bold text-gray-300">Connect</span>}</div>
                </button>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-widest ml-1">Add iCal URL</label>
                  <div className="flex gap-2">
                    <input placeholder="https://..." value={icalUrl} onChange={(e) => setIcalUrl(e.target.value)} className="flex-1 p-4 border-2 rounded-[20px] outline-none bg-white focus:border-[#39a62d] text-black" />
                    <button onClick={handleIcalSubmit} disabled={loadingCalendar} className="bg-[#39a62d] text-white px-6 rounded-[20px] font-bold disabled:bg-gray-200 shadow-md">{loadingCalendar ? '...' : 'Sync'}</button>
                  </div>
                </div>
              </div>
              <div className="flex gap-4 mt-12"><button onClick={prevStep} className="flex-1 text-gray-400 font-bold active:scale-95">Back</button><button onClick={nextStep} className="flex-[2] bg-[#39a62d] text-white h-[60px] rounded-[20px] font-bold text-lg shadow-lg shadow-[#39a62d]/20">Next Step</button></div>
            </motion.div>
          )}

          {setupStep === 3 && (
            <motion.div key="step3" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-8 text-black">
              <div className="space-y-6">
                <h2 className="text-xl font-bold flex items-center gap-2 text-black"><Heart className="text-[#39a62d]" /> Health Connection</h2>
                <p className="text-gray-500 text-sm leading-relaxed">Connect your Google Health / Fitbit account to let Leon see your real-time heart rate, steps, and sleep. This info is key for personalized recommendations!</p>
                <button onClick={() => signIn('google')} className="w-full flex items-center justify-between p-6 border-3 border-[#00B0B9]/20 rounded-[30px] bg-white transition-transform active:scale-95 shadow-sm">
                  <div className="flex items-center gap-4 text-black"><Image src="https://www.gstatic.com/images/branding/product/1x/health_connect_512dp.png" alt="Google Health" width={48} height={48} /><div className="text-left"><p className="font-bold text-lg">Google Health</p><p className="text-xs text-gray-400">Real-time vitals & fitness</p></div></div>
                  <div>{session ? <Check size={28} className="text-[#39a62d]" /> : <span className="text-sm font-bold text-[#00B0B9]">Link Account</span>}</div>
                </button>
              </div>
              <div className="flex gap-4 mt-12"><button onClick={prevStep} className="flex-1 text-gray-400 font-bold active:scale-95">Back</button><button onClick={handleFinish} disabled={isSyncingInitial} className="flex-[2] bg-[#39a62d] text-white h-[60px] rounded-[20px] font-bold text-lg shadow-lg disabled:bg-gray-200">{isSyncingInitial ? 'Sycing Data...' : 'Ready to Start!'}</button></div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
