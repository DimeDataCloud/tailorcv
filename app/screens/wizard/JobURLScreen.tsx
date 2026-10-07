import { useState } from 'react';
import {
  View, Text, TextInput, StyleSheet,
  ActivityIndicator, ScrollView, KeyboardAvoidingView, Platform,
} from 'react-native';
import { Pressable } from '../../components/Pressable';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import { HomeStackParamList } from '../../types/navigation';
import { supabase } from '../../lib/supabase';
import { fetchJobFromUrl, createSessionFromDescription } from '../../lib/fetchJob';
import StepIndicator from '../../components/StepIndicator';
import { useNetworkStatus } from '../../hooks/useNetworkStatus';
import OfflineBanner from '../../components/OfflineBanner';
import { BRAND } from '../../lib/brand';

type Nav = StackNavigationProp<HomeStackParamList>;
type Route = RouteProp<HomeStackParamList, 'JobURL'>;

const URL_RE = /^https?:\/\/\S+\.\S+/i;

export default function JobURLScreen() {
  const nav = useNavigation<Nav>();
  const { params } = useRoute<Route>();
  const isOffline = useNetworkStatus();
  const [url, setUrl] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function getUserId(): Promise<string> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not signed in');
    return user.id;
  }

  async function persistDesignAndNavigate(sessionId: string, jobTitle: string, companyName: string, userId: string) {
    if (params?.designPrefs) {
      await supabase.from('sessions').update({ design: params.designPrefs }).eq('id', sessionId);
    }
    nav.navigate('ResumeUpload', { sessionId, jobTitle, companyName, userId });
  }

  // Single Continue handler. Decision tree:
  //   - URL valid AND description empty     -> fetchJobFromUrl
  //   - URL valid AND description non-empty -> fetchJobFromUrl + layer description
  //   - URL empty/invalid AND description   -> createSessionFromDescription
  //   - both empty                          -> error
  async function handleContinue() {
    setError('');
    const trimmedUrl = url.trim();
    const trimmedDesc = description.trim();
    const hasUrl = URL_RE.test(trimmedUrl);
    const hasDesc = trimmedDesc.length > 0;

    if (!hasUrl && !hasDesc) {
      setError('Add a job URL, paste a description, or both to continue.');
      return;
    }

    setLoading(true);
    try {
      const userId = await getUserId();
      if (hasUrl) {
        try {
          const result = await fetchJobFromUrl(userId, trimmedUrl, hasDesc ? trimmedDesc : undefined);
          await persistDesignAndNavigate(result.sessionId, result.jobTitle, result.companyName, userId);
          return;
        } catch (err) {
          // URL fetch failed but we have a description - fall back gracefully
          if (hasDesc) {
            const fallback = await createSessionFromDescription(userId, trimmedUrl, trimmedDesc);
            await persistDesignAndNavigate(fallback.sessionId, fallback.jobTitle, fallback.companyName, userId);
            return;
          }
          throw err;
        }
      } else {
        const result = await createSessionFromDescription(userId, '', trimmedDesc);
        await persistDesignAndNavigate(result.sessionId, result.jobTitle, result.companyName, userId);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  }

  const hasUrl = URL_RE.test(url.trim());
  const hasDesc = description.trim().length > 0;
  const ctaLabel = !hasUrl && !hasDesc
    ? 'Continue'
    : hasUrl && hasDesc
      ? 'Continue with URL + Description'
      : hasUrl
        ? 'Fetch Job Details'
        : 'Continue with Description';

  return (
    <SafeAreaView style={s.safe}>
      <OfflineBanner visible={isOffline} />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView style={s.scroll} contentContainerStyle={s.container} keyboardShouldPersistTaps="handled">
          <Pressable onPress={() => nav.goBack()} style={s.back} activeOpacity={0.7}>
            <Ionicons name="chevron-back" size={20} color={BRAND.accent} />
            <Text style={s.backText}>Back</Text>
          </Pressable>

          <StepIndicator current={1} total={5} />

          <Text style={s.title}>Add the job</Text>
          <Text style={s.subtitle}>Paste the job posting URL (preferred) and any role notes. The URL is the primary signal; your notes are weighted on top.</Text>

          {error ? (
            <View style={s.errorBanner}>
              <Ionicons name="alert-circle-outline" size={15} color={BRAND.error} />
              <Text style={s.errorText}>{error}</Text>
            </View>
          ) : null}

          {/* URL field - optional */}
          <View style={s.fieldWrap}>
            <View style={s.labelRow}>
              <Text style={s.label}>Job URL</Text>
              <Text style={s.optional}>Optional</Text>
            </View>
            <View style={s.inputWrap}>
              <Ionicons name="link-outline" size={18} color={BRAND.muted} style={s.inputIcon} />
              <TextInput
                style={s.input}
                placeholder="https://..."
                placeholderTextColor={BRAND.muted}
                value={url}
                onChangeText={setUrl}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="url"
              />
            </View>
            <Text style={s.helpText}>
              {hasUrl
                ? 'Will be fetched automatically. The job title and company come from here.'
                : 'Add a public job posting (Indeed, Greenhouse, Lever, etc.) for the best result.'}
            </Text>
          </View>

          {/* Divider */}
          <View style={s.dividerRow}>
            <View style={s.dividerLine} />
            <Text style={s.dividerText}>AND / OR</Text>
            <View style={s.dividerLine} />
          </View>

          {/* Role description - recommended but technically optional too */}
          <View style={s.fieldWrap}>
            <View style={s.labelRow}>
              <Text style={s.label}>Role description</Text>
              <Text style={s.optional}>Recommended</Text>
            </View>
            <TextInput
              style={s.textarea}
              placeholder="Paste the job description, your own notes about the role, key requirements, or anything else that should shape the tailored resume..."
              placeholderTextColor={BRAND.muted}
              value={description}
              onChangeText={setDescription}
              multiline
              textAlignVertical="top"
            />
            <Text style={s.helpText}>
              {hasDesc
                ? `${description.trim().split(/\s+/).filter(Boolean).length} words. Will be weighted alongside the URL.`
                : 'If no URL is given, this becomes the primary signal.'}
            </Text>
          </View>

          {/* Source weight preview */}
          {(hasUrl || hasDesc) ? (
            <View style={s.weightCard}>
              <Text style={s.weightTitle}>How this will be weighted</Text>
              <View style={s.weightRow}>
                <View style={[s.weightBar, { flex: hasUrl ? 3 : 0 }]} />
                <View style={[s.weightBarSecondary, { flex: hasDesc ? 2 : 0 }]} />
              </View>
              <View style={s.weightLabels}>
                <Text style={[s.weightLabel, hasUrl && { color: BRAND.accent }]}>
                  {hasUrl ? 'URL: primary signal' : 'URL: skipped'}
                </Text>
                <Text style={[s.weightLabel, hasDesc && { color: BRAND.accent, fontWeight: '700' }]}>
                  {hasDesc ? 'Description: layered on top' : 'Description: skipped'}
                </Text>
              </View>
            </View>
          ) : null}

          <Pressable
            style={[s.primary, (loading || (!hasUrl && !hasDesc)) && s.disabled]}
            onPress={handleContinue}
            disabled={loading || (!hasUrl && !hasDesc)}
            activeOpacity={0.88}
          >
            {loading
              ? <ActivityIndicator color="#fff" />
              : <Text style={s.primaryText}>{ctaLabel}</Text>}
          </Pressable>

          <Text style={s.footnote}>
            At least one source is required. URL is preferred because it gives the AI the full original posting; description is great for adding insider context.
          </Text>
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
  title: { fontSize: 26, fontWeight: '800', color: BRAND.ink, marginBottom: 8, letterSpacing: -0.5 },
  subtitle: { fontSize: 13, color: BRAND.inkSoft, lineHeight: 20, marginBottom: 24 },
  errorBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: '#FEE2E2', borderRadius: 12, padding: 14, marginBottom: 18,
    borderWidth: 2, borderColor: '#FCA5A5', borderLeftWidth: 6, borderLeftColor: '#DC2626',
  },
  errorText: { color: '#991B1B', fontSize: 14, fontWeight: '700', flex: 1 },

  fieldWrap: { marginBottom: 8 },
  labelRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  label: { fontSize: 12, fontWeight: '800', color: BRAND.ink, textTransform: 'uppercase', letterSpacing: 0.6 },
  optional: { fontSize: 10, fontWeight: '700', color: BRAND.muted, textTransform: 'uppercase', letterSpacing: 0.6 },
  helpText: { fontSize: 11, color: BRAND.muted, marginTop: 6, lineHeight: 16 },

  inputWrap: { flexDirection: 'row', alignItems: 'center', borderWidth: 1.5, borderColor: BRAND.hairline, borderRadius: 13, backgroundColor: BRAND.surface },
  inputIcon: { paddingLeft: 14 },
  input: { flex: 1, paddingHorizontal: 12, paddingVertical: 14, fontSize: 15, color: BRAND.ink },
  textarea: {
    borderWidth: 1.5, borderColor: BRAND.hairline, borderRadius: 13, paddingHorizontal: 16, paddingVertical: 14,
    fontSize: 14, color: BRAND.ink, backgroundColor: BRAND.surface, minHeight: 140, textAlignVertical: 'top',
  },

  dividerRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginVertical: 20 },
  dividerLine: { flex: 1, height: 1, backgroundColor: BRAND.hairline },
  dividerText: { fontSize: 10, fontWeight: '800', color: BRAND.muted, letterSpacing: 1.5 },

  weightCard: {
    backgroundColor: BRAND.accentWash, borderRadius: 14, padding: 14, marginVertical: 16,
    borderWidth: 1, borderColor: BRAND.accentWash,
  },
  weightTitle: { fontSize: 11, fontWeight: '800', color: BRAND.accent, textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 10 },
  weightRow: { flexDirection: 'row', height: 8, borderRadius: 4, overflow: 'hidden', backgroundColor: BRAND.surface, marginBottom: 8 },
  weightBar: { backgroundColor: BRAND.accent },
  weightBarSecondary: { backgroundColor: BRAND.accentSoft },
  weightLabels: { flexDirection: 'row', justifyContent: 'space-between' },
  weightLabel: { fontSize: 11, color: BRAND.muted, fontWeight: '600' },

  primary: {
    backgroundColor: BRAND.accent, borderRadius: 14, paddingVertical: 17, alignItems: 'center',
    shadowColor: BRAND.accent, shadowOpacity: 0.08, shadowRadius: 4, shadowOffset: { width: 0, height: 4 }, elevation: 2,
  },
  disabled: { opacity: 0.55 },
  primaryText: { color: '#fff', fontSize: 16, fontWeight: '700', letterSpacing: 0.2 },
  footnote: { fontSize: 11, color: BRAND.muted, textAlign: 'center', marginTop: 14, lineHeight: 16 },
});
