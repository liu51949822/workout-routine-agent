// TypeScript types for the Workout Routine Agent app.
// These mirror the Pydantic schemas in `backend/app/schemas.py` so the mobile
// client and backend share one data contract.

export interface ChatRequest {
  message: string;
}

export interface ChatResponse {
  reply: string;
  sources?: string[];
}

export interface Exercise {
  name: string;
  muscle_group: string;
  equipment: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  instructions: string[];
}

export interface ExerciseLibrary {
  total: number;
  exercises: Exercise[];
}

export interface WorkoutItem {
  name: string;
  sets?: string;
  reps?: string;
  rest?: string;
  notes?: string;
}

export interface WorkoutPlan {
  title: string;
  focus?: string;
  duration_minutes?: number;
  items: WorkoutItem[];
  warmup?: string[];
  cooldown?: string[];
  safety_notes?: string[];
}

export interface Profile {
  name: string;
  fitness_level: 'beginner' | 'intermediate' | 'advanced';
  goals: string[];
  time_available_minutes: number;
  equipment: string[];
  height_cm?: number;
  notes: string;
}

export interface BodyMetric {
  date: string; // ISO date
  weight_kg?: number;
  body_fat_pct?: number;
  bmi?: number;
}

export interface CheckIn {
  date: string; // ISO date
  plan_title: string;
  duration_minutes: number;
  felt: 'easy' | 'ok' | 'hard';
  notes: string;
}

export interface WeeklyPlan {
  week_start: string;
  days: Record<string, WorkoutItem[]>;
}
