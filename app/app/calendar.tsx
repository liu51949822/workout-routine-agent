import { useCallback, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { Card, Screen, SectionTitle, theme } from '../src/components/ui';
import { BrandHeader } from '../src/components/Logo';
import { store } from '../src/store/storage';
import type { WorkoutPlan } from '../src/types';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function weekDates() {
  const now = new Date();
  const day = now.getDay();
  const monday = new Date(now);
  monday.setDate(now.getDate() - ((day + 6) % 7));
  return DAYS.map((label, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return { label, date: d, iso: d.toISOString().slice(0, 10) };
  });
}

export default function Calendar() {
  const [plans, setPlans] = useState<WorkoutPlan[]>([]);
  const [week] = useState(weekDates);

  useFocusEffect(
    useCallback(() => {
      store.getPlans().then(setPlans);
    }, []),
  );

  return (
    <Screen>
      <BrandHeader title="Weekly Calendar" subtitle="Plan your week" />
      <SectionTitle>This Week</SectionTitle>
      <View style={styles.weekRow}>
        {week.map((d) => {
          const isToday = d.iso === new Date().toISOString().slice(0, 10);
          return (
            <View key={d.iso} style={[styles.dayCell, isToday && styles.todayCell]}>
              <Text style={[styles.dayLabel, isToday && styles.todayText]}>{d.label}</Text>
              <Text style={[styles.dayNum, isToday && styles.todayText]}>{d.date.getDate()}</Text>
            </View>
          );
        })}
      </View>

      <SectionTitle>Suggested Weekly Split</SectionTitle>
      <Card>
        <Text style={styles.splitTitle}>Balanced 5-Day Split</Text>
        {[
          ['Mon', 'Strength: Push'],
          ['Tue', 'Mobility + Light Cardio'],
          ['Wed', 'Strength: Pull'],
          ['Thu', 'HIIT (15-20 min)'],
          ['Fri', 'Strength: Legs'],
          ['Sat', 'Active Recovery / Long Session'],
          ['Sun', 'Rest'],
        ].map(([day, plan]) => (
          <View key={day} style={styles.splitRow}>
            <Text style={styles.splitDay}>{day}</Text>
            <Text style={styles.splitPlan}>{plan}</Text>
          </View>
        ))}
      </Card>

      <SectionTitle>Plan for the Week</SectionTitle>
      {plans.length === 0 ? (
        <Text style={styles.empty}>No saved plans to schedule. Ask the AI Coach first.</Text>
      ) : (
        plans.map((p, i) => (
          <Card key={i}>
            <Text style={styles.name}>{p.title}</Text>
            {p.items.map((it, j) => (
              <Text key={j} style={styles.item}>
                • {it.name}
              </Text>
            ))}
          </Card>
        ))
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  weekRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  dayCell: { alignItems: 'center', width: '13%', paddingVertical: 8, borderRadius: 8, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: theme.border },
  todayCell: { backgroundColor: theme.primary, borderColor: theme.primary },
  dayLabel: { fontSize: 11, color: theme.subtext },
  dayNum: { fontSize: 15, fontWeight: '700', color: theme.text, marginTop: 2 },
  todayText: { color: '#FFFFFF' },
  splitTitle: { fontSize: 14, fontWeight: '700', color: theme.text, marginBottom: 6 },
  splitRow: { flexDirection: 'row', paddingVertical: 4 },
  splitDay: { width: 56, fontSize: 13, fontWeight: '700', color: theme.primary },
  splitPlan: { flex: 1, fontSize: 13, color: theme.text },
  name: { fontSize: 15, fontWeight: '700', color: theme.text },
  item: { fontSize: 13, color: theme.subtext, marginTop: 2 },
  empty: { color: theme.subtext, textAlign: 'center', marginTop: 20, fontSize: 14 },
});
