import { useCallback, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { FlatList, StyleSheet, Text, View } from 'react-native';

import { Card, Screen, SectionTitle, theme } from '../src/components/ui';
import { BrandHeader } from '../src/components/Logo';
import { store } from '../src/store/storage';
import type { WorkoutPlan } from '../src/types';

function PlanCard({ plan }: { plan: WorkoutPlan }) {
  return (
    <Card>
      <View style={styles.headerRow}>
        <Text style={styles.title}>{plan.title}</Text>
        {plan.duration_minutes ? (
          <Text style={styles.duration}>{plan.duration_minutes} min</Text>
        ) : null}
      </View>
      {plan.focus ? <Text style={styles.focus}>{plan.focus}</Text> : null}
      {plan.items.map((item, i) => (
        <View key={i} style={styles.item}>
          <Text style={styles.itemName}>• {item.name}</Text>
          {item.sets || item.reps ? (
            <Text style={styles.itemMeta}>
              {item.sets ? `${item.sets} sets` : ''}
              {item.sets && item.reps ? ' · ' : ''}
              {item.reps ? `${item.reps}` : ''}
            </Text>
          ) : null}
        </View>
      ))}
      {plan.safety_notes?.length ? (
        <Text style={styles.safety}>{plan.safety_notes.join(' ')}</Text>
      ) : null}
    </Card>
  );
}

export default function Plan() {
  const [plans, setPlans] = useState<WorkoutPlan[]>([]);

  useFocusEffect(
    useCallback(() => {
      store.getPlans().then(setPlans);
    }, []),
  );

  return (
    <Screen>
      <BrandHeader title="My Plans" subtitle="Your saved workout routines" />
      <SectionTitle>Saved Plans ({plans.length})</SectionTitle>
      {plans.length === 0 ? (
        <Text style={styles.empty}>
          No plans yet. Ask the AI Coach for a workout and tap "Save this plan".
        </Text>
      ) : (
        <FlatList
          data={plans}
          keyExtractor={(_, i) => String(i)}
          renderItem={({ item }) => <PlanCard plan={item} />}
        />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { fontSize: 16, fontWeight: '700', color: theme.text },
  duration: { fontSize: 13, color: theme.primary, fontWeight: '600' },
  focus: { fontSize: 13, color: theme.subtext, marginTop: 2 },
  item: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 },
  itemName: { fontSize: 14, color: theme.text, flex: 1 },
  itemMeta: { fontSize: 13, color: theme.subtext },
  safety: { fontSize: 12, color: theme.accent, marginTop: 8 },
  empty: { color: theme.subtext, textAlign: 'center', marginTop: 40, fontSize: 14 },
});
