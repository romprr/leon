export interface Event {
  id: string;
  title: string;
  startTime: string; // ISO string
  endTime: string;   // ISO string
  type: 'calendar' | 'generated';
  status: 'active' | 'canceled';
  sourceUrl?: string; // Track which iCal this came from
  description?: string;
  location?: string;
  icon?: string;
}

export interface Goal {
  id: string;
  title: string;
  target: number;
  current: number;
  unit: string;
  type: 'pre-made' | 'custom';
  timeframe: 'daily' | 'weekly' | 'semi-longterm' | 'longterm';
  deadline?: string; // ISO string for semi-longterm/longterm
  frequency?: number; // times per week
}

export interface Insight {
  id: string;
  title: string;
  image: string;
  done: boolean;
  xpValue: number;
  type: 'water' | 'meditation' | 'reading' | 'exercise' | 'study' | 'other';
  linkedGoalId?: string; // Goal to update when this insight is done
  impactValue?: number; // How much to add to the goal's 'current' value
  createdAt: string; // ISO string
  completedAt?: string; // ISO string
}

export interface HealthStats {
  steps: number;
  bpm: number;
  sleepHours: number;
  activeMinutes: number;
  kcal: number;
  liters: number;
  stress: string;
}

export interface ProposedChange {
  id: string;
  originalEventId: string;
  newStartTime: string;
  newEndTime: string;
  title: string;
  reason: string;
}

export interface UserProfile {
  name: string;
  level: number;
  xp: number;
  xpToNextLevel: number;
  rank: string;
  image: string;
  calendarUrls: string[];
  lastSyncedCalendar: Event[];
  isSetupComplete: boolean;
}
