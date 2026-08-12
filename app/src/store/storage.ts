// Local persistence layer built on AsyncStorage.
// Stores profile, workout check-ins, favorites, and body metrics on-device.

import AsyncStorage from '@react-native-async-storage/async-storage';

import type { BodyMetric, CheckIn, Profile, WorkoutPlan } from '../types';

const KEYS = {
  profile: '@workout/profile',
  checkins: '@workout/checkins',
  favorites: '@workout/favorites',
  metrics: '@workout/metrics',
  plans: '@workout/plans',
} as const;

async function get<T>(key: string): Promise<T | null> {
  const raw = await AsyncStorage.getItem(key);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

async function set<T>(key: string, value: T): Promise<void> {
  await AsyncStorage.setItem(key, JSON.stringify(value));
}

export const store = {
  // ---- Profile ----
  async getProfile(): Promise<Profile | null> {
    return get<Profile>(KEYS.profile);
  },
  async saveProfile(profile: Profile): Promise<void> {
    await set(KEYS.profile, profile);
  },

  // ---- Check-ins ----
  async getCheckIns(): Promise<CheckIn[]> {
    return (await get<CheckIn[]>(KEYS.checkins)) ?? [];
  },
  async addCheckIn(checkIn: CheckIn): Promise<CheckIn[]> {
    const list = (await get<CheckIn[]>(KEYS.checkins)) ?? [];
    list.push(checkIn);
    await set(KEYS.checkins, list);
    return list;
  },
  async clearCheckIns(): Promise<void> {
    await AsyncStorage.removeItem(KEYS.checkins);
  },

  // ---- Favorites (saved exercises) ----
  async getFavorites(): Promise<string[]> {
    return (await get<string[]>(KEYS.favorites)) ?? [];
  },
  async toggleFavorite(name: string): Promise<string[]> {
    const list = (await get<string[]>(KEYS.favorites)) ?? [];
    const idx = list.indexOf(name);
    if (idx >= 0) list.splice(idx, 1);
    else list.push(name);
    await set(KEYS.favorites, list);
    return list;
  },

  // ---- Body metrics ----
  async getMetrics(): Promise<BodyMetric[]> {
    return (await get<BodyMetric[]>(KEYS.metrics)) ?? [];
  },
  async addMetric(metric: BodyMetric): Promise<BodyMetric[]> {
    const list = (await get<BodyMetric[]>(KEYS.metrics)) ?? [];
    // replace entry for the same date, else append
    const idx = list.findIndex((m) => m.date === metric.date);
    if (idx >= 0) list[idx] = metric;
    else list.push(metric);
    list.sort((a, b) => a.date.localeCompare(b.date));
    await set(KEYS.metrics, list);
    return list;
  },

  // ---- Saved workout plans ----
  async getPlans(): Promise<WorkoutPlan[]> {
    return (await get<WorkoutPlan[]>(KEYS.plans)) ?? [];
  },
  async savePlan(plan: WorkoutPlan): Promise<WorkoutPlan[]> {
    const list = (await get<WorkoutPlan[]>(KEYS.plans)) ?? [];
    list.push(plan);
    await set(KEYS.plans, list);
    return list;
  },
  async removePlan(title: string): Promise<WorkoutPlan[]> {
    const list = (await get<WorkoutPlan[]>(KEYS.plans)) ?? [];
    const next = list.filter((p) => p.title !== title);
    await set(KEYS.plans, next);
    return next;
  },
};
