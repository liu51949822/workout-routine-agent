import { useCallback, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import {
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import { Card, Pill, Screen, SectionTitle, theme } from '../src/components/ui';
import { BrandHeader } from '../src/components/Logo';
import { store } from '../src/store/storage';
import type { BodyMetric, CheckIn } from '../src/types';

export default function Progress() {
  const [checkins, setCheckins] = useState<CheckIn[]>([]);
  const [metrics, setMetrics] = useState<BodyMetric[]>([]);
  const [heightCm, setHeightCm] = useState<number | undefined>(undefined);
  const [planTitle, setPlanTitle] = useState('');
  const [duration, setDuration] = useState('30');
  const [weight, setWeight] = useState('');
  const [felt, setFelt] = useState<'easy' | 'ok' | 'hard'>('ok');

  useFocusEffect(
    useCallback(() => {
      store.getCheckIns().then(setCheckins);
      store.getMetrics().then(setMetrics);
      store.getProfile().then((p) => setHeightCm(p?.height_cm));
    }, []),
  );

  const addCheckIn = async () => {
    const ci: CheckIn = {
      date: new Date().toISOString().slice(0, 10),
      plan_title: planTitle || 'General workout',
      duration_minutes: parseInt(duration, 10) || 0,
      felt,
      notes: '',
    };
    setCheckins(await store.addCheckIn(ci));
    setPlanTitle('');
  };

  const addMetric = async () => {
    const w = weight ? parseFloat(weight) : undefined;
    // BMI uses the profile height if set (fallback: none → leave blank)
    const h = heightCm && heightCm > 0 ? heightCm / 100 : undefined;
    const m: BodyMetric = {
      date: new Date().toISOString().slice(0, 10),
      weight_kg: w,
      bmi: w && h ? Math.round((w / h ** 2) * 10) / 10 : undefined,
    };
    setMetrics(await store.addMetric(m));
    setWeight('');
  };

  const totalMin = checkins.reduce((sum, c) => sum + c.duration_minutes, 0);
  const latestWeight = metrics.length ? metrics[metrics.length - 1].weight_kg : undefined;

  return (
    <Screen>
      <BrandHeader title="Progress" subtitle="Check-ins and body metrics" />
      <ScrollView showsVerticalScrollIndicator={false}>
        <SectionTitle>Overview</SectionTitle>
        <Card style={styles.statsRow}>
          <View style={styles.stat}>
            <Text style={styles.statNum}>{checkins.length}</Text>
            <Text style={styles.statLabel}>Workouts</Text>
          </View>
          <View style={styles.stat}>
            <Text style={styles.statNum}>{totalMin}</Text>
            <Text style={styles.statLabel}>Minutes</Text>
          </View>
          <View style={styles.stat}>
            <Text style={styles.statNum}>{latestWeight ?? '—'}</Text>
            <Text style={styles.statLabel}>Weight kg</Text>
          </View>
        </Card>

        <SectionTitle>Log a Workout</SectionTitle>
        <Card>
          <TextInput
            value={planTitle}
            onChangeText={setPlanTitle}
            placeholder="Plan title (optional)"
            style={styles.input}
          />
          <View style={styles.row}>
            <TextInput
              value={duration}
              onChangeText={setDuration}
              keyboardType="numeric"
              style={[styles.input, { flex: 1 }]}
              placeholder="Minutes"
            />
            <View style={styles.feltRow}>
              {(['easy', 'ok', 'hard'] as const).map((f) => (
                <TouchableOpacity
                  key={f}
                  onPress={() => setFelt(f)}
                  style={[styles.feltBtn, felt === f && styles.feltActive]}
                >
                  <Text style={[styles.feltText, felt === f && styles.feltActiveText]}>{f}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
          <TouchableOpacity onPress={addCheckIn} style={styles.btn}>
            <Text style={styles.btnText}>Log Workout</Text>
          </TouchableOpacity>
        </Card>

        <SectionTitle>Body Metrics</SectionTitle>
        <Card>
          <View style={styles.row}>
            <TextInput
              value={weight}
              onChangeText={setWeight}
              keyboardType="numeric"
              placeholder="Weight (kg)"
              style={[styles.input, { flex: 1 }]}
            />
            <TouchableOpacity onPress={addMetric} style={styles.btnSmall}>
              <Text style={styles.btnText}>Add</Text>
            </TouchableOpacity>
          </View>
          {metrics.length > 0 && (
            <View style={{ marginTop: 8 }}>
              {metrics.slice(-7).map((m) => (
                <View key={m.date} style={styles.metricRow}>
                  <Text style={styles.metricDate}>{m.date}</Text>
                  <Text style={styles.metricVal}>
                    {m.weight_kg != null ? `${m.weight_kg} kg` : '—'}
                    {m.bmi != null ? ` · BMI ${m.bmi}` : ''}
                  </Text>
                </View>
              ))}
            </View>
          )}
        </Card>

        <SectionTitle>Recent Activity</SectionTitle>
        {checkins.length === 0 ? (
          <Text style={styles.empty}>No check-ins yet.</Text>
        ) : (
          checkins.slice(-10).map((c, i) => (
            <Card key={i}>
              <View style={styles.rowBetween}>
                <Text style={styles.name}>{c.plan_title}</Text>
                <Pill label={c.felt} color={c.felt === 'hard' ? '#D97706' : c.felt === 'ok' ? theme.primary : theme.accent} />
              </View>
              <Text style={styles.subtext}>
                {c.date} · {c.duration_minutes} min
              </Text>
            </Card>
          ))
        )}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  statsRow: { flexDirection: 'row', justifyContent: 'space-around' },
  stat: { alignItems: 'center' },
  statNum: { fontSize: 24, fontWeight: '800', color: theme.primary },
  statLabel: { fontSize: 12, color: theme.subtext, marginTop: 2 },
  input: { backgroundColor: '#F1F5F9', borderRadius: 10, padding: 10, fontSize: 14, marginBottom: 8 },
  row: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  feltRow: { flexDirection: 'row', gap: 4, marginBottom: 8 },
  feltBtn: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, backgroundColor: '#F1F5F9' },
  feltActive: { backgroundColor: theme.primary },
  feltText: { fontSize: 12, fontWeight: '600', color: theme.subtext, textTransform: 'capitalize' },
  feltActiveText: { color: '#FFFFFF' },
  btn: { backgroundColor: theme.primary, borderRadius: 10, paddingVertical: 10, alignItems: 'center' },
  btnSmall: { backgroundColor: theme.primary, borderRadius: 10, paddingHorizontal: 16, paddingVertical: 10, marginBottom: 8 },
  btnText: { color: '#FFFFFF', fontWeight: '700' },
  metricRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 },
  metricDate: { fontSize: 13, color: theme.subtext },
  metricVal: { fontSize: 13, fontWeight: '600', color: theme.text },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  name: { fontSize: 15, fontWeight: '700', color: theme.text },
  subtext: { fontSize: 13, color: theme.subtext, marginTop: 2 },
  empty: { color: theme.subtext, textAlign: 'center', marginTop: 20, fontSize: 14 },
});
