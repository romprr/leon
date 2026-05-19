'use client';

import { useStore } from '@/lib/store';
import { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import { Camera, X, Check, Trash2, Calendar as CalendarIcon, Target, Award, Plus, Clock } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { signIn, signOut, useSession } from "next-auth/react";
import { cn } from '@/lib/utils';
import { Goal } from '@/types';

const PREMADE_GOALS = [
  { title: 'Sleep 8h', target: 8, unit: 'hours', timeframe: 'daily' },
  { title: '10k Steps', target: 10000, unit: 'steps', timeframe: 'daily' },
  { title: 'Drink 2L Water', target: 2, unit: 'liters', timeframe: 'daily' },
  { title: 'Run 3x/Week', target: 3, unit: 'times', timeframe: 'weekly' },
  { title: 'Meditate Daily', target: 1, unit: 'times', timeframe: 'daily' },
];

export default function ProfilePage() {
  const { 
    user, goals, updateProfile, addGoal, removeGoal, updateGoal, addEvent, resetAll, 
    updateHealthStats, setProposedChanges, setLastSyncedCalendar, events: allEvents, removeCalendar 
  } = useStore();
  const { data: session } = useSession();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isEditing, setIsEditing] = useState(false);
  const [showGoals, setShowGoals] = useState(false);
  const [showCalendarConfig, setShowCalendarConfig] = useState(false);
  const [showApps, setShowApps] = useState(false);
  const [showLevel, setShowLevel] = useState(false);

  // Goal Editing State
  const [editingGoalId, setEditingGoalId] = useState<string | null>(null);
  const [editGoalTitle, setEditGoalTitle] = useState('');
  const [editGoalTarget, setEditGoalTarget] = useState('');
  const [editGoalTimeframe, setEditGoalTimeframe] = useState<'daily' | 'weekly' | 'semi-longterm' | 'longterm'>('daily');

  const [icalUrl, setIcalUrl] = useState('');
  const [loadingCalendar, setLoadingCalendar] = useState(false);
  const [newGoalTitle, setNewGoalTitle] = useState('');
  const [newGoalTarget, setNewGoalTarget] = useState('');
  const [newGoalTimeframe, setNewGoalTimeframe] = useState<'daily' | 'weekly' | 'semi-longterm' | 'longterm'>('daily');

  const [editName, setEditName] = useState(user.name);
  const [editImage, setEditImage] = useState(user.image);

  const [suggestedTargets, setSuggestedTargets] = useState<Record<string, string>>({
    'Sleep 8h': '8',
    '10k Steps': '10000',
    'Drink 2L Water': '2',
    'Run 3x/Week': '3',
    'Meditate Daily': '1',
  });

  // Sync real data when session is available
  useEffect(() => {
    if (session) syncGoogleData();
  }, [session]);

  const syncGoogleData = async () => {
    try {
      const healthRes = await fetch('/api/health');
      const healthData = await healthRes.json();
      if (!healthData.error) updateHealthStats(healthData);

      const calRes = await fetch('/api/calendar/google');
      const calData = await calRes.json();
      const newEvents = calData.events || [];

      if (newEvents.length > 0) {
        const lastSync = user.lastSyncedCalendar || [];
        const canceledEvents = lastSync.filter(oldEv => 
          !newEvents.find((newEv: any) => newEv.title === oldEv.title && newEv.startTime === oldEv.startTime)
        );

        if (canceledEvents.length > 0) {
          const aiEvents = allEvents.filter(e => e.type === 'generated');
          const replanRes = await fetch('/api/ai/replan', {
            method: 'POST',
            body: JSON.stringify({ canceledEvents, aiEvents })
          });
          const replanData = await replanRes.json();
          if (replanData.proposals) setProposedChanges(replanData.proposals);
        }

        newEvents.forEach((ev: any) => {
          const exists = allEvents.find(e => e.title === ev.title && e.startTime === ev.startTime);
          if (!exists) addEvent(ev);
        });
        setLastSyncedCalendar(newEvents);
      }
    } catch (e) { console.error("Sync failed", e); }
  };

  const handleSaveProfile = () => {
    updateProfile({ name: editName, image: editImage });
    setIsEditing(false);
  };

  const handleAddGoal = (title: string, target: any, unit: string, timeframe: any = 'daily') => {
    addGoal({ title, target: isNaN(Number(target)) ? 1 : Number(target), unit: isNaN(Number(target)) ? target : unit, current: 0, type: 'pre-made', timeframe });
  };

  const startEditingGoal = (goal: Goal) => {
    setEditingGoalId(goal.id);
    setEditGoalTitle(goal.title);
    setEditGoalTarget(goal.target.toString() === '1' ? goal.unit : goal.target.toString());
    setEditGoalTimeframe(goal.timeframe);
  };

  const saveEditedGoal = () => {
    if (editingGoalId) {
      updateGoal(editingGoalId, {
        title: editGoalTitle,
        target: isNaN(Number(editGoalTarget)) ? 1 : Number(editGoalTarget),
        unit: isNaN(Number(editGoalTarget)) ? editGoalTarget : 'units',
        timeframe: editGoalTimeframe
      });
      setEditingGoalId(null);
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result as string;
        setEditImage(base64);
        updateProfile({ image: base64 });
      };
      reader.readAsDataURL(file);
    }
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
        alert(`Synced ${data.events.length} events!`);
      }
    } catch (e) { alert('Failed to import iCal.'); }
    finally { setLoadingCalendar(false); }
  };

  const handleGoogleConnect = () => {
    signIn('google');
  };

  return (
    <div className="p-6 font-fredoka min-h-full">
      <h1 className="text-[25px] font-medium text-black mb-8">Your profile</h1>

      {/* Header */}
      <div className="flex flex-col items-center mb-8">
        <div className="relative w-[159px] h-[159px]">
          <div className="absolute inset-0 border-4 border-[#39a62d] rounded-full overflow-hidden">
            <Image src={user.image} alt="Avatar" fill className="object-cover" />
          </div>
          {isEditing && (
             <>
               <input type="file" ref={fileInputRef} onChange={handleImageUpload} className="hidden" accept="image/*" />
               <button onClick={() => fileInputRef.current?.click()} className="absolute bottom-0 right-0 bg-[#39a62d] text-white p-3 rounded-full shadow-lg active:scale-95 transition-transform">
                  <Camera size={20} />
               </button>
             </>
          )}
        </div>
        {isEditing ? (
          <div className="mt-4"><input value={editName} onChange={(e) => setEditName(e.target.value)} className="text-[#39a62d] text-[30px] font-semibold bg-white border-2 border-[#39a62d]/20 rounded-xl px-4 w-48 outline-none" /></div>
        ) : (
          <h2 className="text-[#39a62d] text-[30px] font-semibold mt-4">{user.name}</h2>
        )}
      </div>

      <div className="flex items-center gap-4 mb-8 bg-white/50 p-4 rounded-[20px] border-2 border-[#39a62d]/10">
        <div className="w-[100px] h-[100px] relative"><Image src="/images/walking_leon_mascott_profile_page.png" alt="Leon" fill className="object-contain" /></div>
        <div>
          <p className="font-poppins text-[18px]">Level <span className="text-[#39a62d] font-semibold">{user.level}</span></p>
          <div className="w-full bg-gray-200 h-2 rounded-full mt-1">
            <div className="bg-[#39a62d] h-full rounded-full transition-all duration-500" style={{ width: `${(user.xp / user.xpToNextLevel) * 100}%` }} />
          </div>
          <p className="font-poppins text-[14px] text-gray-500 mt-1">Ranked <span className="text-[#39a62d] font-semibold">{user.rank}</span></p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-8">
        <button className="bg-[#39a62d] text-[#fffff0] h-[52px] rounded-[20px] font-poppins text-[18px] font-medium transition-transform active:scale-95">Friends</button>
        <button className="bg-[#39a62d] text-[#fffff0] h-[52px] rounded-[20px] font-poppins text-[18px] font-medium transition-transform active:scale-95">Match</button>
      </div>

      <h3 className="text-[25px] font-medium text-black mb-4">Your parameters</h3>
      <div className="grid grid-cols-2 gap-4">
        <button onClick={() => isEditing ? handleSaveProfile() : setIsEditing(true)} className={cn("h-[52px] rounded-[20px] font-poppins text-[18px] font-medium transition-all flex items-center justify-center gap-2", isEditing ? "bg-[#39a62d] text-white" : "bg-[#483c32] text-white")}>
          {isEditing ? <Check size={20} /> : null}{isEditing ? 'Save' : 'Edit'}
        </button>
        <button onClick={() => setShowGoals(true)} className="bg-[#483c32] text-white h-[52px] rounded-[20px] font-poppins text-[18px] font-medium flex items-center justify-center gap-2"><Target size={20} /> Goals</button>
        <button onClick={() => setShowCalendarConfig(true)} className="bg-[#483c32] text-white h-[52px] rounded-[20px] font-poppins text-[18px] font-medium flex items-center justify-center gap-2"><CalendarIcon size={20} /> Calendar</button>
        <button onClick={() => setShowApps(true)} className="bg-[#483c32] text-white h-[52px] rounded-[20px] font-poppins text-[18px] font-medium flex items-center justify-center gap-2">Apps</button>
        <button onClick={() => setShowLevel(true)} className="bg-[#483c32] text-white h-[52px] rounded-[20px] font-poppins text-[18px] font-medium">Level</button>
        <button onClick={() => { if(confirm('Reset all data?')) { resetAll(); signOut({ callbackUrl: '/setup' }); } }} className="bg-red-900/20 text-red-900 h-[52px] rounded-[20px] font-poppins text-[18px] font-medium border-2 border-red-900/20">Delete</button>
      </div>

      {/* Level Modal */}
      <AnimatePresence>
        {showLevel && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-6 text-black">
            <motion.div className="bg-[#fffff0] w-full max-w-[400px] rounded-[30px] p-8 space-y-6 text-black overflow-y-auto max-h-[80vh]" onClick={(e) => e.stopPropagation()}>
              <div className="flex justify-between items-center"><h2 className="text-2xl font-bold">Level & Rank</h2><button onClick={() => setShowLevel(false)}><X /></button></div>
              <div className="text-center py-6 bg-white rounded-[25px] border-2 border-[#39a62d]/10 shadow-inner">
                <p className="text-gray-400 text-xs uppercase font-bold tracking-widest">Current Level</p>
                <p className="text-7xl font-bold text-[#39a62d] my-2">{user.level}</p>
                <div className="px-8 mt-4">
                  <div className="flex justify-between text-[10px] text-gray-500 mb-1 font-bold"><span>{user.xp} XP</span><span>{user.xpToNextLevel} XP</span></div>
                  <div className="w-full bg-gray-100 h-3 rounded-full overflow-hidden">
                    <motion.div initial={{ width: 0 }} animate={{ width: `${(user.xp / user.xpToNextLevel) * 100}%` }} className="bg-[#39a62d] h-full" />
                  </div>
                </div>
              </div>
              <div className="space-y-4">
                <p className="font-bold text-lg ml-1">Leaderboard</p>
                <div className="space-y-2">
                  {[
                    { name: 'Sarah', level: 72, xp: 850, isMe: false, rank: 1 },
                    { name: 'Marc', level: 69, xp: 120, isMe: false, rank: 2 },
                    { name: user.name, level: user.level, xp: user.xp, isMe: true, rank: 3 },
                    { name: 'Julie', level: 65, xp: 900, isMe: false, rank: 4 },
                    { name: 'Thomas', level: 62, xp: 450, isMe: false, rank: 5 },
                  ].map((player, i) => (
                    <div key={i} className={cn("flex items-center justify-between p-3 rounded-2xl border-2 transition-colors", player.isMe ? "bg-[#39a62d]/10 border-[#39a62d]" : "bg-white border-transparent")}>
                      <div className="flex items-center gap-3"><span className="text-xs font-bold text-gray-300 w-4">{player.rank}</span><div className="w-9 h-9 bg-gray-100 rounded-full flex items-center justify-center text-sm font-bold text-gray-400">{player.name[0]}</div><p className={cn("font-medium text-sm", player.isMe && "text-[#39a62d] font-bold")}>{player.isMe ? 'You' : player.name}</p></div>
                      <div className="text-right"><p className="text-sm font-bold">Lvl {player.level}</p><p className="text-[10px] text-gray-400 font-medium">{player.xp} XP</p></div>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Goals Modal */}
      <AnimatePresence>
        {showGoals && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-6">
            <motion.div className="bg-[#fffff0] w-full max-w-[400px] rounded-[30px] p-8 space-y-6 text-black overflow-y-auto max-h-[80vh]" onClick={(e) => e.stopPropagation()}>
              <div className="flex justify-between items-center"><h2 className="text-2xl font-bold">Goals</h2><button onClick={() => { setShowGoals(false); setEditingGoalId(null); }}><X /></button></div>
              <div className="space-y-4">
                <p className="font-semibold text-gray-500 uppercase text-xs">Active Goals</p>
                <div className="space-y-2">
                  {goals.map(goal => (
                    <div key={goal.id} className="bg-white p-3 rounded-xl border-2 border-[#39a62d]/10 shadow-sm overflow-hidden">
                      {editingGoalId === goal.id ? (
                        <div className="space-y-2 animate-in fade-in zoom-in-95 duration-200">
                          <input value={editGoalTitle} onChange={(e) => setEditGoalTitle(e.target.value)} className="w-full p-2 border-2 rounded-lg text-xs outline-none focus:border-[#39a62d]" />
                          <div className="flex gap-2">
                            <input value={editGoalTarget} onChange={(e) => setEditGoalTarget(e.target.value)} className="flex-1 p-2 border-2 rounded-lg text-xs outline-none" />
                            <select value={editGoalTimeframe} onChange={(e: any) => setEditGoalTimeframe(e.target.value)} className="p-2 border-2 rounded-lg text-[10px] bg-white">
                              <option value="daily">Daily</option>
                              <option value="weekly">Weekly</option>
                              <option value="semi-longterm">Semi-Long</option>
                              <option value="longterm">Longterm</option>
                            </select>
                          </div>
                          <div className="flex gap-2 pt-1">
                            <button onClick={saveEditedGoal} className="flex-1 bg-[#39a62d] text-white py-2 rounded-lg text-[10px] font-bold">Save</button>
                            <button onClick={() => setEditingGoalId(null)} className="flex-1 bg-gray-100 text-gray-400 py-2 rounded-lg text-[10px] font-bold">Cancel</button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex justify-between items-center cursor-pointer group" onClick={() => startEditingGoal(goal)}>
                          <div>
                            <p className="font-medium text-sm group-hover:text-[#39a62d] transition-colors">{goal.title}</p>
                            <p className="text-[10px] text-gray-400 uppercase font-bold">{goal.timeframe}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <Check size={14} className="text-gray-300 group-hover:text-[#39a62d]" />
                            <button onClick={(e) => { e.stopPropagation(); removeGoal(goal.id); }} className="text-red-300 hover:text-red-500"><Trash2 size={16} /></button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                  {goals.length === 0 && <p className="text-xs text-gray-400 italic text-center py-2">No active goals.</p>}
                </div>

                <p className="font-semibold text-gray-500 uppercase text-xs pt-4">Custom Goal</p>
                <div className="space-y-3 p-4 bg-[#39a62d]/5 rounded-2xl border-2 border-[#39a62d]/10">
                  <input placeholder="Goal title" value={newGoalTitle} onChange={(e) => setNewGoalTitle(e.target.value)} className="w-full p-2 border-2 rounded-xl text-sm outline-none" />
                  <div className="flex gap-2">
                    <input placeholder="Target" value={newGoalTarget} onChange={(e) => setNewGoalTarget(e.target.value)} className="flex-1 p-2 border-2 rounded-xl text-sm outline-none" />
                    <select value={newGoalTimeframe} onChange={(e: any) => setNewGoalTimeframe(e.target.value)} className="p-2 border-2 rounded-xl text-xs bg-white">
                      <option value="daily">Daily</option>
                      <option value="weekly">Weekly</option>
                      <option value="semi-longterm">Semi-Long</option>
                      <option value="longterm">Longterm</option>
                    </select>
                  </div>
                  <button onClick={() => { if(newGoalTitle && newGoalTarget) { addGoal({ title: newGoalTitle, target: isNaN(Number(newGoalTarget)) ? 1 : Number(newGoalTarget), unit: isNaN(Number(newGoalTarget)) ? newGoalTarget : 'times', current: 0, type: 'custom', timeframe: newGoalTimeframe }); setNewGoalTitle(''); setNewGoalTarget(''); } }} className="w-full bg-[#39a62d] text-white py-2 rounded-xl font-bold">Add Custom</button>
                </div>

                <p className="font-semibold text-gray-500 uppercase text-xs pt-4">Suggested Goals</p>
                <div className="space-y-2">
                  {PREMADE_GOALS.filter(pg => !goals.some(g => g.title === pg.title)).map((pg, i) => (
                    <div key={i} className="flex items-center gap-3 p-3 bg-white rounded-2xl border-2 border-gray-50 shadow-sm">
                      <div className="flex-1">
                        <p className="text-sm font-medium">{pg.title}</p>
                        <div className="flex items-center gap-1 mt-1">
                          <span className="text-[10px] text-gray-400">Target:</span>
                          <input value={suggestedTargets[pg.title] || pg.target} onChange={(e) => setSuggestedTargets({...suggestedTargets, [pg.title]: e.target.value})} className="bg-transparent border-b border-gray-100 text-[10px] w-12 outline-none" />
                          <span className="text-[10px] text-gray-400">{pg.unit} ({pg.timeframe})</span>
                        </div>
                      </div>
                      <button onClick={() => handleAddGoal(pg.title, suggestedTargets[pg.title] || pg.target, pg.unit, pg.timeframe)} className="bg-[#39a62d] text-white p-2 rounded-xl"><Plus size={16} /></button>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Calendar Config Modal */}
      <AnimatePresence>
        {showCalendarConfig && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-6 text-black">
            <motion.div className="bg-[#fffff0] w-full max-w-[400px] rounded-[30px] p-8 space-y-6" onClick={(e) => e.stopPropagation()}>
              <div className="flex justify-between items-center"><h2 className="text-2xl font-bold">Calendar</h2><button onClick={() => setShowCalendarConfig(false)}><X /></button></div>
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Add iCal URL</label>
                  <div className="flex gap-2">
                    <input placeholder="https://..." value={icalUrl} onChange={(e) => setIcalUrl(e.target.value)} disabled={loadingCalendar} className="flex-1 p-3 border-2 rounded-xl outline-none" />
                    <button onClick={handleIcalSubmit} disabled={loadingCalendar} className="bg-[#39a62d] text-white px-4 rounded-xl">{loadingCalendar ? '...' : 'Add'}</button>
                  </div>
                </div>
                <div className="pt-4 border-t"><button onClick={handleGoogleConnect} className="w-full flex items-center justify-center gap-3 p-4 border-2 rounded-2xl font-bold"><Image src="https://www.google.com/favicon.ico" alt="Google" width={20} height={20} />{session ? 'Google Connected' : 'Connect Google'}</button></div>
                <div className="pt-4 border-t space-y-2">
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Active Syncs</p>
                  {user.calendarUrls?.map((url, i) => (
                    <div key={i} className="bg-white p-3 rounded-xl border-2 border-gray-50 flex justify-between items-center gap-3 shadow-sm">
                      <p className="text-[10px] text-gray-500 truncate flex-1">{url}</p>
                      <button onClick={() => removeCalendar(url)} className="text-red-500"><Trash2 size={14} /></button>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Apps Modal */}
      <AnimatePresence>
        {showApps && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-6 text-black">
            <motion.div className="bg-[#fffff0] w-full max-w-[400px] rounded-[30px] p-8 space-y-6" onClick={(e) => e.stopPropagation()}>
              <div className="flex justify-between items-center"><h2 className="text-2xl font-bold">Connections</h2><button onClick={() => setShowApps(false)}><X /></button></div>
              <div className="space-y-4">
                <button onClick={handleGoogleConnect} className="w-full flex items-center justify-between p-4 border-2 rounded-2xl bg-white transition-transform active:scale-95">
                  <div className="flex items-center gap-3"><Image src="https://www.gstatic.com/images/branding/product/1x/health_connect_512dp.png" alt="Health" width={32} height={32} /><div><p className="font-bold">Google Health</p><p className="text-[10px] text-gray-400">Sync vitals</p></div></div>
                  <div className="text-xs font-bold text-[#39a62d]">{session ? 'Connected' : 'Connect'}</div>
                </button>
                <button onClick={handleGoogleConnect} className="w-full flex items-center justify-between p-4 border-2 border-gray-100 rounded-2xl bg-white transition-transform active:scale-95">
                  <div className="flex items-center gap-3"><Image src="https://www.google.com/favicon.ico" alt="Google" width={32} height={32} /><div><p className="font-bold">Google Calendar</p><p className="text-[10px] text-gray-400">Sync agenda</p></div></div>
                  <div className="text-xs font-bold text-[#39a62d]">{session ? 'Connected' : 'Connect'}</div>
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
