// Shared UI primitives for the app — upgraded with gradient background,
// shadow cards, and brand colors.

import { StyleSheet, Text, TouchableOpacity, View, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import type { ReactNode } from 'react';

import { BRAND } from './Logo';

const palette = {
  primary: BRAND.primary,
  secondary: BRAND.secondary,
  accent: BRAND.accent,
  bg: '#F1F5F9',
  card: '#FFFFFF',
  border: '#E2E8F0',
  text: '#0F172A',
  subtext: '#64748B',
  success: '#16A34A',
  danger: '#DC2626',
};

export function Screen({ children, scroll }: { children: ReactNode; scroll?: boolean }) {
  return (
    <SafeAreaView style={styles.safe}>
      <LinearGradient
        colors={['#EEF2FF', palette.bg, palette.bg]}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 0.35 }}
        style={styles.gradient}
      >
        <View style={styles.screen}>{children}</View>
      </LinearGradient>
    </SafeAreaView>
  );
}

export function Card({ children, style }: { children: ReactNode; style?: object }) {
  return (
    <View style={[styles.card, style]}>
      <View style={styles.cardInner}>{children}</View>
    </View>
  );
}

export function SectionTitle({ children }: { children: ReactNode }) {
  return <Text style={styles.sectionTitle}>{children}</Text>;
}

export function Pill({ label, color = palette.primary }: { label: string; color?: string }) {
  return (
    <View style={[styles.pill, { backgroundColor: color + '22' }]}>
      <Text style={[styles.pillText, { color }]}>{label}</Text>
    </View>
  );
}

export function PrimaryButton({
  title,
  onPress,
  disabled,
  style,
}: {
  title: string;
  onPress?: () => void;
  disabled?: boolean;
  style?: object;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled}
      style={[disabled && styles.btnDisabled, style]}
      activeOpacity={0.85}
    >
      <LinearGradient
        colors={[palette.primary, palette.secondary]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.btn}
      >
        <Text style={styles.btnText}>{title}</Text>
      </LinearGradient>
    </TouchableOpacity>
  );
}

export function Input({
  value,
  onChangeText,
  placeholder,
  style,
  ...rest
}: {
  value: string;
  onChangeText: (t: string) => void;
  placeholder?: string;
  style?: object;
  [k: string]: unknown;
}) {
  return (
    <TextInput
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder}
      placeholderTextColor={palette.subtext}
      style={[styles.input, style]}
      {...rest}
    />
  );
}

export const theme = palette;

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: palette.bg },
  gradient: { flex: 1 },
  screen: { flex: 1, padding: 16 },
  card: {
    backgroundColor: palette.card,
    borderRadius: 16,
    marginBottom: 12,
    shadowColor: '#0F172A',
    shadowOpacity: 0.06,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  cardInner: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: palette.border,
    padding: 14,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: palette.text,
    marginBottom: 8,
    marginTop: 6,
    letterSpacing: 0.2,
  },
  pill: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 999,
    alignSelf: 'flex-start',
  },
  pillText: { fontSize: 12, fontWeight: '700' },
  btn: {
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: palette.primary,
    shadowOpacity: 0.3,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  btnDisabled: { opacity: 0.4 },
  btnText: { color: '#FFFFFF', fontWeight: '800', fontSize: 16 },
  input: {
    backgroundColor: '#F1F5F9',
    borderRadius: 12,
    padding: 12,
    fontSize: 15,
    color: palette.text,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: palette.border,
  },
});
