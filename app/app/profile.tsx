import { useCallback, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

import { Card, Pill, PrimaryButton, Screen, SectionTitle, theme } from '../src/components/ui';
import { BrandHeader } from '../src/components/Logo';
import { store } from '../src/store/storage';
import type { Profile } from '../src/types';

const LEVELS = ['beginner', 'intermediate', 'advanced'] as const;
const GOAL_OPTIONS = ['Build strength', 'Lose fat', 'Improve mobility', 'Cardio fitness', 'Core stability'];
const EQUIPMENT_OPTIONS = ['Bodyweight', 'Kettlebell', 'Resistance bands', 'Pull-up bar', 'Dumbbells'];

export default function ProfileScreen() {
  const [profile, setProfile] = useState<Profile>({
    name: '',
    fitness_level: 'beginner',
    goals: [],
    time_available_minutes: 30,
    equipment: [],
    height_cm: undefined,
    notes: '',
  });

  useFocusEffect(
    useCallback(() => {
      store.getProfile().then((p) => p && setProfile(p));
    }, []),
  );

  const toggle = (list: 'goals' | 'equipment', value: string) => {
    setProfile((prev) => {
      const cur = prev[list];
      const next = cur.includes(value) ? cur.filter((x) => x !== value) : [...cur, value];
      return { ...prev, [list]: next };
    });
  };

  const save = async () => {
    await store.saveProfile(profile);
  };

  return (
    <Screen>
      <BrandHeader title="Profile" subtitle="Your fitness settings" />
      <ScrollView showsVerticalScrollIndicator={false}>
        <SectionTitle>Profile</SectionTitle>
        <Card>
          <TextInput
            value={profile.name}
            onChangeText={(name) => setProfile({ ...profile, name })}
            placeholder="Your name"
            style={styles.input}
          />
          <Text style={styles.label}>Fitness level</Text>
          <View style={styles.row}>
            {LEVELS.map((lvl) => (
              <TouchableOpacity
                key={lvl}
                onPress={() => setProfile({ ...profile, fitness_level: lvl })}
                style={[styles.chip, profile.fitness_level === lvl && styles.chipActive]}
              >
                <Text style={[styles.chipText, profile.fitness_level === lvl && styles.chipTextActive]}>
                  {lvl}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          <Text style={styles.label}>Minutes per session</Text>
          <TextInput
            value={String(profile.time_available_minutes)}
            onChangeText={(v) =>
              setProfile({ ...profile, time_available_minutes: parseInt(v, 10) || 30 })
            }
            keyboardType="numeric"
            style={styles.input}
          />
          <Text style={styles.label}>Height (cm) — used for BMI</Text>
          <TextInput
            value={profile.height_cm ? String(profile.height_cm) : ''}
            onChangeText={(v) =>
              setProfile({ ...profile, height_cm: parseFloat(v) || undefined })
            }
            keyboardType="numeric"
            placeholder="e.g. 175"
            style={styles.input}
          />
        </Card>

        <SectionTitle>Goals</SectionTitle>
        <Card>
          <View style={styles.wrap}>
            {GOAL_OPTIONS.map((g) => (
              <TouchableOpacity key={g} onPress={() => toggle('goals', g)}>
                <Pill label={g} color={profile.goals.includes(g) ? theme.primary : theme.subtext} />
              </TouchableOpacity>
            ))}
          </View>
        </Card>

        <SectionTitle>Equipment</SectionTitle>
        <Card>
          <View style={styles.wrap}>
            {EQUIPMENT_OPTIONS.map((e) => (
              <TouchableOpacity key={e} onPress={() => toggle('equipment', e)}>
                <Pill label={e} color={profile.equipment.includes(e) ? theme.accent : theme.subtext} />
              </TouchableOpacity>
            ))}
          </View>
        </Card>

        <SectionTitle>Notes</SectionTitle>
        <Card>
          <TextInput
            value={profile.notes}
            onChangeText={(notes) => setProfile({ ...profile, notes })}
            placeholder="Injuries, preferences, constraints..."
            style={[styles.input, { minHeight: 70 }]}
            multiline
          />
        </Card>

        <PrimaryButton title="Save Profile" onPress={save} style={{ marginTop: 8 }} />
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  input: { backgroundColor: '#F1F5F9', borderRadius: 10, padding: 10, fontSize: 14, marginBottom: 10 },
  label: { fontSize: 13, fontWeight: '600', color: theme.subtext, marginBottom: 6, marginTop: 4 },
  row: { flexDirection: 'row', gap: 6, marginBottom: 12 },
  chip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999, backgroundColor: '#F1F5F9' },
  chipActive: { backgroundColor: theme.primary },
  chipText: { fontSize: 13, fontWeight: '600', color: theme.subtext, textTransform: 'capitalize' },
  chipTextActive: { color: '#FFFFFF' },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  saveBtn: { backgroundColor: theme.accent, borderRadius: 12, paddingVertical: 14, alignItems: 'center', marginTop: 8 },
  saveText: { color: '#FFFFFF', fontWeight: '800', fontSize: 16 },
});
