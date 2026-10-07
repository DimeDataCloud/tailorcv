import { useState } from 'react';
import {
  View, Text, TextInput, StyleSheet,
  KeyboardAvoidingView, Platform, ScrollView,
} from 'react-native';
import { Pressable } from '../../components/Pressable';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import { HomeStackParamList } from '../../types/navigation';
import { startTailoring } from '../../lib/tailorResume';
import StepIndicator from '../../components/StepIndicator';
import { BRAND } from '../../lib/brand';

type Nav = StackNavigationProp<HomeStackParamList>;
type Route = RouteProp<HomeStackParamList, 'InsiderContext'>;

const MAX_CHARS = 1000;

export default function InsiderContextScreen() {
  const nav = useNavigation<Nav>();
  const { params } = useRoute<Route>();
  const { sessionId, jobTitle, companyName } = params;

  const [context, setContext] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(text: string) {
    setError('');
    setLoading(true);
    try {
      await startTailoring(sessionId, text);
      nav.navigate('Processing', { sessionId, companyName });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.');
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={s.safe}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView style={s.scroll} contentContainerStyle={s.container} keyboardShouldPersistTaps="handled">
          <Pressable onPress={() => nav.goBack()} style={s.back} activeOpacity={0.7}>
            <Ionicons name="chevron-back" size={20} color={BRAND.accent} />
            <Text style={s.backText}>Back</Text>
          </Pressable>

          <StepIndicator current={5} total={5} />

          <Text style={s.title}>Insider context</Text>
          <Text style={s.subtitle}>
            Spoke to anyone at <Text style={s.company}>{companyName}</Text>? Add what they said matters most — the AI will weight your resume toward it.
          </Text>
          <Text style={s.optional}>Optional — skip to build without it.</Text>

          {error ? (
            <View style={s.errorBanner}>
              <Ionicons name="alert-circle-outline" size={15} color={BRAND.error} />
              <Text style={s.errorText}>{error}</Text>
            </View>
          ) : null}

          <TextInput
            style={s.textarea}
            placeholder={`e.g. "The recruiter said they really care about enterprise sales experience and quota attainment numbers."`}
            placeholderTextColor={BRAND.muted}
            value={context}
            onChangeText={t => setContext(t.slice(0, MAX_CHARS))}
            multiline
            numberOfLines={6}
            textAlignVertical="top"
          />
          <Text style={s.charCount}>{context.length} / {MAX_CHARS}</Text>

          <Pressable
            style={[s.primary, loading && s.disabled]}
            onPress={() => handleSubmit(context.trim())}
            disabled={loading}
            activeOpacity={0.88}
          >
            <Ionicons name="sparkles" size={16} color="#fff" />
            <Text style={s.primaryText}>
              {loading ? 'Starting...' : 'Build My Resume'}
            </Text>
          </Pressable>

          <Pressable
            style={[s.skip, loading && s.disabled]}
            onPress={() => handleSubmit('')}
            disabled={loading}
          >
            <Text style={s.skipText}>Skip — build without context</Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#fff' },
  scroll: { flex: 1 },
  container: { padding: 24, paddingTop: 16, paddingBottom: 100 },
  back: { flexDirection: 'row', alignItems: 'center', marginBottom: 24 },
  backText: { color: BRAND.accent, fontSize: 15, fontWeight: '600', marginLeft: 2 },
  title: { fontSize: 26, fontWeight: '800', color: BRAND.ink, marginBottom: 10, letterSpacing: -0.5 },
  subtitle: { fontSize: 14, color: BRAND.inkSoft, lineHeight: 22, marginBottom: 6 },
  company: { fontWeight: '700', color: BRAND.ink },
  optional: { fontSize: 12, color: BRAND.muted, marginBottom: 24, fontWeight: '500' },
  errorBanner: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: BRAND.errorSoft, borderRadius: 10, padding: 12, marginBottom: 16, borderWidth: 1, borderColor: BRAND.error },
  errorText: { color: BRAND.error, fontSize: 13, flex: 1 },
  textarea: {
    borderWidth: 1.5, borderColor: BRAND.hairline, borderRadius: 14,
    padding: 16, fontSize: 14, color: BRAND.ink, height: 160,
    marginBottom: 8, backgroundColor: BRAND.surface, lineHeight: 22,
  },
  charCount: { fontSize: 11, color: BRAND.muted, textAlign: 'right', marginBottom: 24, fontWeight: '500' },
  primary: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: BRAND.accent, borderRadius: 14, paddingVertical: 17, marginBottom: 14,
    shadowColor: BRAND.accent, shadowOpacity: 0.08, shadowRadius: 4, shadowOffset: { width: 0, height: 4 }, elevation: 2,
  },
  disabled: { opacity: 0.55 },
  primaryText: { color: '#fff', fontSize: 16, fontWeight: '700', letterSpacing: 0.2 },
  skip: { paddingVertical: 14, alignItems: 'center' },
  skipText: { color: BRAND.muted, fontSize: 14, fontWeight: '500' },
});
