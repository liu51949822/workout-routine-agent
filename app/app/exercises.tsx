import { useCallback, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import {
  FlatList,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import { api } from '../src/api/client';
import { Card, Pill, Screen, SectionTitle, theme } from '../src/components/ui';
import { BrandHeader } from '../src/components/Logo';
import { store } from '../src/store/storage';
import type { Exercise } from '../src/types';

function ExerciseCard({
  ex,
  fav,
  onToggle,
}: {
  ex: Exercise;
  fav: boolean;
  onToggle: () => void;
}) {
  return (
    <Card>
      <View style={styles.headerRow}>
        <Text style={styles.name}>{ex.name}</Text>
        <TouchableOpacity onPress={onToggle}>
          <Text style={{ fontSize: 20 }}>{fav ? '⭐' : '☆'}</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.tags}>
        <Pill label={ex.muscle_group} color={theme.primary} />
        <Pill label={ex.equipment === 'None' ? 'Bodyweight' : ex.equipment} color={theme.accent} />
        <Pill label={ex.difficulty} color="#D97706" />
      </View>
      {ex.instructions.map((ins, i) => (
        <Text key={i} style={styles.instruction}>
          {i + 1}. {ins}
        </Text>
      ))}
    </Card>
  );
}

export default function Exercises() {
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [query, setQuery] = useState('');
  const [favorites, setFavorites] = useState<string[]>([]);

  useFocusEffect(
    useCallback(() => {
      api
        .exercises()
        .then((lib) => setExercises(lib.exercises))
        .catch(() => {});
      store.getFavorites().then(setFavorites);
    }, []),
  );

  const onSearch = async () => {
    try {
      const lib = await api.searchExercises(query);
      setExercises(lib.exercises);
    } catch {
      // ignore
    }
  };

  const toggleFav = async (name: string) => {
    const next = await store.toggleFavorite(name);
    setFavorites(next);
  };

  return (
    <Screen>
      <BrandHeader title="Exercise Library" subtitle="Browse by muscle group or name" />
      <View style={styles.searchRow}>
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Search by name or muscle group..."
          style={styles.search}
        />
        <TouchableOpacity onPress={onSearch} style={styles.searchBtn}>
          <Text style={styles.searchBtnText}>Search</Text>
        </TouchableOpacity>
      </View>

      <SectionTitle>Library ({exercises.length})</SectionTitle>
      <FlatList
        data={exercises}
        keyExtractor={(e) => e.name}
        renderItem={({ item }) => (
          <ExerciseCard
            ex={item}
            fav={favorites.includes(item.name)}
            onToggle={() => toggleFav(item.name)}
          />
        )}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  searchRow: { flexDirection: 'row', gap: 8, marginBottom: 8 },
  search: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: 12,
    padding: 10,
    fontSize: 14,
  },
  searchBtn: { backgroundColor: theme.primary, borderRadius: 12, paddingHorizontal: 16, justifyContent: 'center' },
  searchBtnText: { color: '#FFFFFF', fontWeight: '700' },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  name: { fontSize: 16, fontWeight: '700', color: theme.text },
  tags: { flexDirection: 'row', gap: 6, marginTop: 6, marginBottom: 6 },
  instruction: { fontSize: 13, color: theme.subtext, marginTop: 2 },
});
