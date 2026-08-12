// Brand Logo component — a gradient badge with a fitness glyph.
// Pure-JS drawing (no native deps) so it works on web and native.

import { StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

export const BRAND = {
  primary: '#2563EB',
  secondary: '#7C3AED',
  accent: '#F59E0B',
  light: '#EFF6FF',
};

export function Logo({ size = 56 }: { size?: number }) {
  return (
    <LinearGradient
      colors={[BRAND.primary, BRAND.secondary]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[
        styles.badge,
        {
          width: size,
          height: size,
          borderRadius: size / 2.6,
        },
      ]}
    >
      <Text style={[styles.glyph, { fontSize: size * 0.5 }]}>🏋️</Text>
    </LinearGradient>
  );
}

export function BrandHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <View style={styles.headerWrap}>
      <Logo size={48} />
      <View style={styles.headerText}>
        <Text style={styles.title}>{title}</Text>
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: BRAND.primary,
    shadowOpacity: 0.35,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  glyph: { fontWeight: '800' },
  headerWrap: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  headerText: { marginLeft: 12, flex: 1 },
  title: { fontSize: 20, fontWeight: '800', color: '#0F172A' },
  subtitle: { fontSize: 13, color: '#64748B', marginTop: 2 },
});
