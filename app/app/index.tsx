import { Link } from 'expo-router';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

import { BrandHeader, Logo } from '../src/components/Logo';
import { Card, Screen, SectionTitle, theme } from '../src/components/ui';

const MENU = [
  { href: '/chat' as const, icon: '💬', title: 'AI Coach', desc: 'Ask for a personalized workout plan', color: '#2563EB' },
  { href: '/plan' as const, icon: '📋', title: 'My Plans', desc: 'View and manage your workout plans', color: '#7C3AED' },
  { href: '/exercises' as const, icon: '🏋️', title: 'Exercise Library', desc: 'Browse exercises by muscle group', color: '#F59E0B' },
  { href: '/calendar' as const, icon: '📅', title: 'Weekly Calendar', desc: 'Plan your week', color: '#10B981' },
  { href: '/progress' as const, icon: '📈', title: 'Progress', desc: 'Check-ins and body metrics', color: '#EF4444' },
  { href: '/profile' as const, icon: '👤', title: 'Profile', desc: 'Your fitness profile', color: '#06B6D4' },
];

export default function Home() {
  return (
    <Screen>
      {/* Brand hero */}
      <LinearGradient
        colors={['#2563EB', '#7C3AED']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.hero}
      >
        <Logo size={72} />
        <Text style={styles.heroTitle}>Workout Routine Agent</Text>
        <Text style={styles.heroSubtitle}>Your AI-powered personal trainer</Text>
        <View style={styles.heroBadge}>
          <Text style={styles.heroBadgeText}>RAG · FastAPI · React Native</Text>
        </View>
      </LinearGradient>

      <View style={styles.disclaimer}>
        <Text style={styles.disclaimerText}>
          ⚠️ General fitness guidance only — consult a professional before starting any program.
        </Text>
      </View>

      <SectionTitle>Features</SectionTitle>
      {MENU.map((item) => (
        <Link key={item.href} href={item.href} asChild>
          <TouchableOpacity activeOpacity={0.85}>
            <Card style={styles.menuCard}>
              <View style={styles.menuRow}>
                <View style={[styles.iconWrap, { backgroundColor: item.color + '1A' }]}>
                  <Text style={styles.menuIcon}>{item.icon}</Text>
                </View>
                <View style={styles.menuText}>
                  <Text style={styles.menuTitle}>{item.title}</Text>
                  <Text style={styles.menuDesc}>{item.desc}</Text>
                </View>
                <Text style={styles.chevron}>›</Text>
              </View>
            </Card>
          </TouchableOpacity>
        </Link>
      ))}
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: {
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: theme.primary,
    shadowOpacity: 0.35,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
  heroTitle: { fontSize: 22, fontWeight: '800', color: '#FFFFFF', marginTop: 12 },
  heroSubtitle: { fontSize: 14, color: '#E0E7FF', marginTop: 4 },
  heroBadge: {
    marginTop: 12,
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 999,
  },
  heroBadgeText: { fontSize: 12, color: '#FFFFFF', fontWeight: '600' },
  disclaimer: {
    backgroundColor: '#FEF3C7',
    borderLeftWidth: 3,
    borderLeftColor: '#F59E0B',
    borderRadius: 8,
    padding: 10,
    marginBottom: 12,
  },
  disclaimerText: { fontSize: 12, color: '#92400E', lineHeight: 17 },
  menuCard: { marginBottom: 10 },
  menuRow: { flexDirection: 'row', alignItems: 'center' },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  menuIcon: { fontSize: 22 },
  menuText: { flex: 1 },
  menuTitle: { fontSize: 16, fontWeight: '700', color: theme.text },
  menuDesc: { fontSize: 13, color: theme.subtext, marginTop: 2 },
  chevron: { fontSize: 22, color: theme.subtext, opacity: 0.5 },
});
