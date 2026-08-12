import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

import { api } from '../src/api/client';
import { Card, Input, PrimaryButton, Screen, theme } from '../src/components/ui';
import { BrandHeader } from '../src/components/Logo';
import { store } from '../src/store/storage';
import type { WorkoutPlan } from '../src/types';

interface Msg {
  role: 'user' | 'assistant';
  text: string;
  streaming?: boolean;
}

const SUGGESTIONS = [
  'Give me a 10-minute core workout',
  'Create a 20-minute leg day with squats',
  'Design a quick cardio routine',
  'HIIT session for fat loss',
];

export default function Chat() {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [saveBtn, setSaveBtn] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const scrollRef = useRef<ScrollView>(null);

  // Abort any in-flight stream when the screen unmounts (avoids wasted requests).
  useEffect(() => {
    return () => abortRef.current?.abort();
  }, []);

  const push = (m: Msg) => setMessages((prev) => [...prev, m]);
  const patchLast = (patch: Partial<Msg>) =>
    setMessages((prev) => prev.map((m, i) => (i === prev.length - 1 ? { ...m, ...patch } : m)));

  // Append streaming tokens to the last assistant message.
  const appendToken = (token: string) =>
    setMessages((prev) =>
      prev.map((m, i) =>
        i === prev.length - 1 && m.role === 'assistant'
          ? { ...m, text: m.text + token }
          : m,
      ),
    );

  const send = async (text: string) => {
    if (!text.trim() || loading) return;
    const message = text.trim();
    push({ role: 'user', text: message });
    push({ role: 'assistant', text: '', streaming: true });
    setInput('');
    setLoading(true);
    setSaveBtn(null);

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      await api.chatStream(message, appendToken, controller.signal);
    } catch (err) {
      // fall back to non-streaming on error
      try {
        const res = await api.chat({ message });
        patchLast({ text: res.reply, streaming: false });
      } catch (e) {
        patchLast({ text: `Error: ${(e as Error).message}`, streaming: false });
      }
    }
    setMessages((prev) =>
      prev.map((m, i) => (i === prev.length - 1 ? { ...m, streaming: false } : m)),
    );
    setLoading(false);
    scrollRef.current?.scrollToEnd({ animated: true });
  };

  const saveLastPlan = async () => {
    const last = messages[messages.length - 1];
    if (!last) return;
    const plan: WorkoutPlan = {
      title: `AI Plan ${new Date().toLocaleDateString()}`,
      focus: 'AI generated',
      items: [{ name: last.text.slice(0, 100) }],
      safety_notes: ['AI plan for reference; consult a professional if unsure.'],
    };
    await store.savePlan(plan);
    setSaveBtn('Saved!');
  };

  return (
    <Screen>
      <BrandHeader title="AI Coach" subtitle="Ask for a personalized workout" />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          ref={scrollRef}
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingBottom: 12 }}
          onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}
        >
          {messages.length === 0 && (
            <View style={{ paddingVertical: 8 }}>
              <Text style={styles.hint}>Try one of these:</Text>
              {SUGGESTIONS.map((s) => (
                <TouchableOpacity key={s} onPress={() => send(s)}>
                  <Card style={styles.suggestion}>
                    <Text style={styles.suggestionText}>{s}</Text>
                  </Card>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {messages.map((m, i) => (
            <View
              key={i}
              style={[
                styles.bubble,
                m.role === 'user' ? styles.userBubble : styles.aiBubble,
              ]}
            >
              {m.streaming && !m.text ? (
                <ActivityIndicator size="small" color={theme.primary} />
              ) : (
                <Text style={m.role === 'user' ? styles.userText : styles.aiText}>
                  {m.text}
                </Text>
              )}
            </View>
          ))}

          {messages.length > 0 && !loading && (
            <TouchableOpacity onPress={saveLastPlan} style={styles.saveBtn}>
              <Text style={styles.saveBtnText}>{saveBtn ?? 'Save this plan'}</Text>
            </TouchableOpacity>
          )}
        </ScrollView>

        <View style={styles.inputRow}>
          <Input
            value={input}
            onChangeText={setInput}
            placeholder="Describe your workout goal..."
            style={[styles.input, { marginBottom: 0, flex: 1 }]}
            multiline
            maxLength={500}
          />
          <TouchableOpacity
            onPress={() => send(input)}
            disabled={loading || !input.trim()}
            style={[!input.trim() || loading ? styles.sendBtnDisabled : null]}
            activeOpacity={0.85}
          >
            <LinearGradient
              colors={[theme.primary, theme.secondary]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.sendBtn}
            >
              <Text style={styles.sendText}>{loading ? '…' : 'Send'}</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>

        <Text style={styles.disclaimer}>AI guidance is for reference only. Consult a professional for personal medical or fitness advice.</Text>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  hint: { fontSize: 14, fontWeight: '600', color: theme.subtext, marginBottom: 6 },
  suggestion: { backgroundColor: '#EFF6FF', borderColor: '#BFDBFE' },
  suggestionText: { fontSize: 14, color: theme.primary },
  bubble: { borderRadius: 12, padding: 12, marginBottom: 8, maxWidth: '85%' },
  userBubble: { alignSelf: 'flex-end', backgroundColor: theme.primary },
  aiBubble: { alignSelf: 'flex-start', backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: theme.border },
  userText: { color: '#FFFFFF', fontSize: 15 },
  aiText: { color: theme.text, fontSize: 15 },
  inputRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 8 },
  input: { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: theme.border, borderRadius: 12, padding: 10, maxHeight: 100, fontSize: 15, color: theme.text },
  sendBtn: { backgroundColor: theme.primary, borderRadius: 14, paddingHorizontal: 20, paddingVertical: 12, shadowColor: theme.primary, shadowOpacity: 0.3, shadowRadius: 6, shadowOffset: { width: 0, height: 3 }, elevation: 4 },
  sendBtnDisabled: { opacity: 0.4 },
  sendText: { color: '#FFFFFF', fontWeight: '800' },
  disclaimer: { fontSize: 11, color: theme.subtext, textAlign: 'center', marginTop: 8 },
  saveBtn: {
    alignSelf: 'center',
    backgroundColor: theme.accent,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 999,
    marginTop: 4,
  },
  saveBtnText: { color: '#FFFFFF', fontWeight: '600' },
});
