import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Event, Insight, UserProfile, Goal, HealthStats, ProposedChange } from '@/types';
import { parseISO, format, isSameDay, areIntervalsOverlapping } from 'date-fns';

interface AppState {
  user: UserProfile;
  events: Event[];
  insights: Insight[];
  goals: Goal[];
  healthStats: HealthStats;
  proposedChanges: ProposedChange[];
  waterIntake: number;
  setupStep: number; 
  weeklyPlanSnapshot: string; 
  lastDailyGeneration: Record<string, string>; 
  
  // Actions
  updateProfile: (updates: Partial<UserProfile>) => void;
  updateHealthStats: (updates: Partial<HealthStats>) => void;
  addXP: (amount: number) => void;
  
  addEvent: (event: Omit<Event, 'id'>) => void;
  updateEvent: (id: string, updates: Partial<Event>) => void;
  removeEvent: (id: string) => void;
  
  toggleInsight: (id: string) => void;
  pushInsights: (newInsights: Omit<Insight, 'id' | 'done' | 'createdAt'>[]) => void;
  
  addGoal: (goal: Omit<Goal, 'id'>) => void;
  updateGoal: (id: string, updates: Partial<Goal>) => void;
  removeGoal: (id: string) => void;
  removeCalendar: (url: string) => void;
  resetAll: () => void;
  completeSetup: () => void;
  setSetupStep: (step: number) => void;
  setWeeklyPlanSnapshot: (plan: string) => void;

  setProposedChanges: (changes: ProposedChange[]) => void;
  acceptProposal: (proposalId: string) => void;
  declineProposal: (proposalId: string) => void;
  setLastSyncedCalendar: (events: Event[]) => void;
  
  runDailyPlanning: (date: Date) => Promise<void>;
}

export const useStore = create<AppState>()(
  persist(
    (set, get) => ({
      user: {
        name: 'Antoine',
        level: 67,
        xp: 250,
        xpToNextLevel: 1000,
        rank: 'top 10%',
        image: '/images/walking_leon_mascott_profile_page.png',
        calendarUrls: [],
        lastSyncedCalendar: [],
        isSetupComplete: true,
      },
      events: [],
      insights: [
        { id: 'i1', title: 'Drink water', image: '/images/water_character_insights_and_home_page.png', done: false, xpValue: 50, type: 'water', createdAt: new Date().toISOString() },
        { id: 'i2', title: 'Do meditation', image: '/images/meditating_leon_mascott_insights_and_home_page.png', done: false, xpValue: 100, type: 'meditation', createdAt: new Date().toISOString() },
        { id: 'i3', title: 'Read a book', image: '/images/reading_leon_mascott_insights_page.png', done: false, xpValue: 75, type: 'reading', createdAt: new Date().toISOString() },
      ],
      goals: [],
      healthStats: {
        steps: 0,
        bpm: 72,
        sleepHours: 0,
        activeMinutes: 0,
        kcal: 0,
        liters: 0,
        stress: 'Normal'
      },
      waterIntake: 0,
      setupStep: 1,
      weeklyPlanSnapshot: '',
      lastDailyGeneration: {},
      proposedChanges: [],

      updateProfile: (updates) => set((state) => ({ user: { ...state.user, ...updates } })),
      
      updateHealthStats: (updates) => set((state) => ({ 
        healthStats: { ...state.healthStats, ...updates } 
      })),

      addXP: (amount) => set((state) => {
        let newXP = state.user.xp + amount;
        let newLevel = state.user.level;
        if (newXP >= state.user.xpToNextLevel) {
          newXP -= state.user.xpToNextLevel;
          newLevel += 1;
        }
        return { user: { ...state.user, xp: newXP, level: newLevel } };
      }),

      addEvent: (event) => set((state) => {
        const start = parseISO(event.startTime);
        const end = parseISO(event.endTime);
        const hour = start.getHours();
        
        // APP ENFORCED: QUIET HOURS
        if (hour >= 22 || hour < 8) return state;

        // APP ENFORCED: MIN DURATION
        const durationMin = (end.getTime() - start.getTime()) / 60000;
        if (durationMin < 20) return state;

        // APP ENFORCED: OVERLAP DETECTION
        const hasOverlap = state.events.some(e => {
          if (e.status === 'canceled') return false;
          return areIntervalsOverlapping(
            { start, end },
            { start: parseISO(e.startTime), end: parseISO(e.endTime) }
          );
        });

        if (hasOverlap && event.type === 'generated') {
          console.log("Blocked overlapping AI event:", event.title);
          return state; 
        }

        return {
          events: [...state.events, { ...event, id: Math.random().toString(36).substr(2, 9) }]
        };
      }),

      updateEvent: (id, updates) => set((state) => ({
        events: state.events.map(e => e.id === id ? { ...e, ...updates } : e)
      })),

      removeEvent: (id) => set((state) => ({
        events: state.events.filter(e => e.id !== id)
      })),

      toggleInsight: (id) => set((state) => {
        const insightIndex = state.insights.findIndex(i => i.id === id);
        if (insightIndex === -1) return state;
        
        const insight = state.insights[insightIndex];
        const newDone = !insight.done;
        const now = new Date().toISOString();
        
        if (newDone) {
          setTimeout(() => get().addXP(insight.xpValue), 0);
          
          if (insight.linkedGoalId && insight.impactValue) {
            get().updateGoal(insight.linkedGoalId, { 
              current: get().goals.find(g => g.id === insight.linkedGoalId)!.current + insight.impactValue 
            });
          }

          if (insight.type === 'water' || insight.title.toLowerCase().includes('water')) {
            const newTotal = Number((state.waterIntake + 0.25).toFixed(2));
            set({ waterIntake: newTotal });
            
            setTimeout(() => {
              set((s) => ({
                insights: s.insights.map(i => i.id === id ? { ...i, done: false, completedAt: undefined } : i)
              }));
            }, 3600000);
          }
        }

        return {
          insights: state.insights.map(i => i.id === id ? { ...i, done: newDone, completedAt: newDone ? now : undefined } : i)
        };
      }),

      pushInsights: (newInsights) => set((state) => {
        const activeInsights = state.insights.filter(i => !i.done);
        const existingTitles = new Set(activeInsights.map(i => i.title.toLowerCase()));
        const now = new Date().toISOString();
        
        const remainingSlots = 5 - activeInsights.length;
        if (remainingSlots <= 0) return state;

        const uniqueNew = newInsights
          .filter(ni => !existingTitles.has(ni.title.toLowerCase()))
          .slice(0, remainingSlots) 
          .map(ni => ({
            ...ni,
            id: Math.random().toString(36).substr(2, 9),
            done: false,
            createdAt: now,
            type: ni.type || 'other'
          }));

        return {
          insights: [...state.insights.filter(i => i.done), ...activeInsights, ...uniqueNew]
        };
      }),

      runDailyPlanning: async (date) => {
        const state = get();
        const dateStr = format(date, 'yyyy-MM-dd');
        const nowIso = new Date().toISOString();
        
        if (state.lastDailyGeneration[dateStr]) return;

        try {
          const activeInsightsList = state.insights.filter(i => !i.done);
          const res = await fetch('/api/ai', {
            method: 'POST',
            body: JSON.stringify({ 
              calendarEvents: state.events.filter(e => isSameDay(parseISO(e.startTime), date)), 
              userData: state.user,
              healthStats: state.healthStats,
              targetDate: date.toISOString(),
              currentTime: nowIso,
              activeInsights: activeInsightsList.map(i => i.title),
              insightHistory: state.insights.map(i => ({ title: i.title, createdAt: i.createdAt, completedAt: i.completedAt })),
              weeklyPlanSnapshot: state.weeklyPlanSnapshot
            })
          });
          const data = await res.json();
          
          if (data.events) {
            data.events.forEach((ev: any) => get().addEvent({ ...ev, type: 'generated', status: 'active' }));
          }

          if (data.insights && data.insights.length > 0) {
            const remainingSlots = 5 - activeInsightsList.length;
            if (remainingSlots > 0) {
              const insightsToPush = data.insights.slice(0, remainingSlots).map((ai: any) => {
                let image = '/images/meditating_leon_mascott_insights_and_home_page.png';
                if (ai.title.toLowerCase().includes('walk') || ai.type === 'exercise') image = '/images/walking_leon_mascott_profile_page.png';
                else if (ai.title.toLowerCase().includes('read') || ai.type === 'reading') image = '/images/reading_leon_mascott_insights_page.png';
                else if (ai.type === 'study') image = '/images/studying_recap_middle_leon_home_page.png';

                return { title: ai.title, image, xpValue: 100, type: ai.type || 'other', linkedGoalId: ai.linkedGoalId, impactValue: ai.impactValue };
              });
              get().pushInsights(insightsToPush);
            }
          }

          set((s) => ({
            lastDailyGeneration: { ...s.lastDailyGeneration, [dateStr]: nowIso }
          }));
        } catch (e) {
          console.error("Daily planning failed", e);
        }
      },

      addGoal: (goal) => set((state) => ({
        goals: [...state.goals, { ...goal, id: Math.random().toString(36).substr(2, 9) }]
      })),

      updateGoal: (id, updates) => set((state) => ({
        goals: state.goals.map(g => g.id === id ? { ...g, ...updates } : g)
      })),

      removeGoal: (id) => set((state) => ({
        goals: state.goals.filter(g => g.id !== id)
      })),

      removeCalendar: (url) => set((state) => ({
        user: { 
          ...state.user, 
          calendarUrls: (state.user.calendarUrls || []).filter(u => u !== url) 
        },
        events: state.events.filter(e => e.sourceUrl !== url)
      })),

      setProposedChanges: (changes) => set({ proposedChanges: changes }),

      acceptProposal: (proposalId) => set((state) => {
        const proposal = state.proposedChanges.find(p => p.id === proposalId);
        if (!proposal) return state;

        return {
          events: state.events.map(e => e.id === proposal.originalEventId ? { 
            ...e, 
            startTime: proposal.newStartTime, 
            endTime: proposal.newEndTime 
          } : e),
          proposedChanges: state.proposedChanges.filter(p => p.id !== proposalId)
        };
      }),

      declineProposal: (proposalId) => set((state) => ({
        proposedChanges: state.proposedChanges.filter(p => p.id !== proposalId)
      })),

      setLastSyncedCalendar: (events) => set((state) => ({
        user: { ...state.user, lastSyncedCalendar: events }
      })),

      setWeeklyPlanSnapshot: (plan) => set({ weeklyPlanSnapshot: plan }),

      completeSetup: () => set((state) => ({
        user: { ...state.user, isSetupComplete: true },
        setupStep: 1
      })),

      setSetupStep: (step) => set({ setupStep: step }),

      resetAll: () => set({
        events: [],
        proposedChanges: [],
        waterIntake: 0,
        setupStep: 1,
        weeklyPlanSnapshot: '',
        lastDailyGeneration: {},
        user: {
          name: 'Antoine',
          level: 1,
          xp: 0,
          xpToNextLevel: 1000,
          rank: 'Beginner',
          image: '/images/walking_leon_mascott_profile_page.png',
          calendarUrls: [],
          lastSyncedCalendar: [],
          isSetupComplete: false,
        },
        insights: [
          { id: 'i1', title: 'Drink water', image: '/images/water_character_insights_and_home_page.png', done: false, xpValue: 50, type: 'water', createdAt: new Date().toISOString() },
          { id: 'i2', title: 'Do meditation', image: '/images/meditating_leon_mascott_insights_and_home_page.png', done: false, xpValue: 100, type: 'meditation', createdAt: new Date().toISOString() },
          { id: 'i3', title: 'Read a book', image: '/images/reading_leon_mascott_insights_page.png', done: false, xpValue: 75, type: 'reading', createdAt: new Date().toISOString() },
        ],
        goals: [],
        healthStats: {
          steps: 0,
          bpm: 72,
          sleepHours: 0,
          activeMinutes: 0,
          kcal: 0,
          liters: 0,
          stress: 'Normal'
        }
      }),
    }),
    {
      name: 'leon-storage',
    }
  )
);
