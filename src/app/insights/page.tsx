'use client';
import { useStore } from '@/lib/store';
import { useState, useEffect } from 'react';
import Image from 'next/image';
import { CheckCircle2, Footprints, Heart, Moon, Flame, Droplets, Brain as BrainIcon, BookOpen, Dumbbell } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

const statsConfig = [
  { label: 'Steps', key: 'steps', icon: Footprints },
  { label: 'BPM', key: 'bpm', icon: Heart },
  { label: 'Hours', key: 'sleepHours', icon: Moon },
  { label: 'kCal', key: 'kcal', icon: Flame },
  { label: 'Liters', key: 'liters', icon: Droplets },
  { label: 'Stress', key: 'stress', icon: BrainIcon },
];

export default function InsightsPage() {
  const { insights, toggleInsight, user, healthStats, events, pushInsights, waterIntake, runDailyPlanning } = useStore();
  const [showXP, setShowXP] = useState<number | null>(null);
  const [isSyncingAI, setIsSyncingAI] = useState(false);

  // Unified AI Generation for today (Events + Insights)
  useEffect(() => {
    if (!user.isSetupComplete) return; 
    setIsSyncingAI(true);
    runDailyPlanning(new Date()).finally(() => setIsSyncingAI(false));
  }, [healthStats.stress, user.isSetupComplete]);

  const handleToggle = (id: string, xp: number) => {
    const wasDone = insights.find(i => i.id === id)?.done;
    toggleInsight(id);
    if (!wasDone) {
      setShowXP(xp);
      setTimeout(() => setShowXP(null), 2000);
    }
  };

  return (
    <div className="p-6 font-fredoka">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-[25px] font-medium text-black">Your insights</h1>
        <div className="bg-[#39a62d] text-white px-3 py-1 rounded-full text-sm">
          Level {user.level} • {user.xp}/{user.xpToNextLevel} XP
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-3 gap-y-10 gap-x-4 mb-12">
        {statsConfig.map((stat, i) => {
          const value = stat.key === 'liters' ? waterIntake : healthStats[stat.key as keyof typeof healthStats];
          const displayValue = stat.key === 'liters' ? Number(value).toFixed(2) : value;
          return (
            <div key={i} className="flex flex-col items-center text-center">
              <stat.icon size={40} className="text-[#39a62d] mb-2" strokeWidth={1.5} />
              <p className="font-poppins font-semibold text-[30px] leading-tight">{displayValue}</p>
              <p className="font-poppins text-[20px] text-black opacity-60">{stat.label}</p>
            </div>
          );
        })}
      </div>

      <div className="flex flex-col gap-4">
        <AnimatePresence mode="popLayout">
          {insights.filter(i => !i.done).slice(0, 5).map((insight) => (
            <motion.div 
              key={insight.id}
              layout
              initial={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8, x: 20 }}
              whileTap={{ scale: 0.98 }}
              className="border-3 rounded-[20px] min-h-[54px] flex items-center px-4 justify-between transition-colors bg-white border-[#39a62d]"
            >
              <div className="flex items-center gap-4 py-2">
                <div className="w-[42px] h-[42px] rounded-[20px] overflow-hidden flex-shrink-0 relative">
                  <Image src={insight.image} alt={insight.title} fill className="object-cover" />
                </div>
                <div className="flex-1">
                  <p className="font-poppins text-[18px] leading-tight">{insight.title}</p>
                  <div className="flex items-center gap-2">
                    <p className="text-[10px] text-gray-500">+{insight.xpValue} XP</p>
                    {insight.linkedGoalId && <span className="text-[8px] bg-[#39a62d]/10 text-[#39a62d] px-1 rounded uppercase font-bold tracking-tighter">Goal Sync</span>}
                  </div>
                </div>
              </div>
              <button 
                onClick={() => handleToggle(insight.id, insight.xpValue)}
                className="bg-[#39a62d] text-white px-4 py-1 rounded-[15px] font-medium text-[16px] active:scale-90 transition-transform"
              >
                Done
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
        
        {insights.filter(i => !i.done).length === 0 && (
          <motion.p 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            className="text-center text-gray-400 py-10 italic"
          >
            All insights completed! Leon is proud.
          </motion.p>
        )}
      </div>

      <AnimatePresence>
        {showXP && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-1/2 left-1/2 -translate-x-1/2 bg-[#39a62d] text-white px-6 py-3 rounded-full shadow-lg z-[100] font-bold"
          >
            +{showXP} XP gained!
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
