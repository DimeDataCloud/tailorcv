import { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Pressable } from '../../components/Pressable';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import { HomeStackParamList } from '../../types/navigation';
import { supabase } from '../../lib/supabase';
import { BRAND } from '../../lib/brand';
import ProcessingDots from '../../components/ProcessingDots';
import { tailorResumeOnDevice, renderResumeHTML } from '../../lib/tailorOnDevice';
import AsyncStorage from '@react-native-async-storage/async-storage';

type Nav = StackNavigationProp<HomeStackParamList>;
type Route = RouteProp<HomeStackParamList, 'Processing'>;

const STEPS = [
  { icon: 'document-text-outline' as const, label: 'Reading job description' },
  { icon: 'search-outline' as const, label: 'Analyzing your resume' },
  { icon: 'sparkles' as const, label: 'Tailoring your content' },
  { icon: 'color-palette-outline' as const, label: 'Building your resume' },
];

export default function ProcessingScreen() {
  const nav = useNavigation<Nav>();
  const { params } = useRoute<Route>();
  const { sessionId, companyName } = params;

  const [errorMsg, setErrorMsg] = useState('');
  const [retryCount, setRetryCount] = useState(0);
  const [stepIdx, setStepIdx] = useState(0);

  // Cycle through visual steps every 8s while processing
  useEffect(() => {
    const t = setInterval(() => setStepIdx(i => Math.min(i + 1, STEPS.length - 1)), 8000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    setErrorMsg('');
    let cancelled = false;

    (async () => {
      try {
        // Load the profile + job data from the session
        const { data: session } = await supabase
          .from('sessions')
          .select('profile, job_title, company_name, job_raw_text')
          .eq('id', sessionId)
          .single();

        if (!session || cancelled) return;

        const profile = session.profile || {};
        const jobTitle = session.job_title || '';
        const companyName = session.company_name || '';
        const jobDesc = session.job_raw_text || '';

        // Run on-device tailoring
        const tailored = await tailorResumeOnDevice(profile, jobDesc, jobTitle, companyName);
        if (cancelled) return;

        // Render to HTML
        const html = renderResumeHTML(tailored, profile);
        if (cancelled) return;

        // Save the HTML to AsyncStorage for ResultScreen to pick up
        await AsyncStorage.setItem(`tailored-html-${sessionId}`, html);

        // Update session status
        await supabase.from('sessions').update({ status: 'complete' }).eq('id', sessionId);

        if (!cancelled) {
          nav.replace('Result', { sessionId });
        }
      } catch (e) {
        if (!cancelled) {
          setErrorMsg(e instanceof Error ? e.message : 'Tailoring failed. Please try again.');
        }
      }
    })();

    return () => { cancelled = true; };
  }, [sessionId, retryCount]);

  async function handleRetry() {
    setErrorMsg('');
    setStepIdx(0);
    setRetryCount(c => c + 1);
    // The useEffect will re-run because retryCount changed
  }

  if (errorMsg) {
    return (
      <SafeAreaView style={s.errSafe}>
        <View style={s.container}>
          <View style={s.errorIconWrap}>
            <Ionicons name="alert-circle" size={40} color={BRAND.error} />
          </View>
          <Text style={s.errorTitle}>Tailoring failed</Text>
          <Text style={s.errorMsg}>{errorMsg}</Text>
          <Pressable style={s.retryBtn} onPress={handleRetry} activeOpacity={0.88}>
            <Text style={s.retryBtnText}>Try Again</Text>
          </Pressable>
          <Pressable style={s.backBtn} onPress={() => nav.popToTop()}>
            <Text style={s.backBtnText}>Back to Home</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  const current = STEPS[stepIdx];

  return (
    <SafeAreaView style={s.safe}>
      <View style={s.container}>
        {/* Glow */}
        <View style={s.glow} />

        <View style={s.iconWrap}>
          <Ionicons name={current.icon} size={36} color={BRAND.accentSoft} />
        </View>

        <Text style={s.title}>
          {companyName ? `Tailoring for ${companyName}` : 'Building your resume'}
        </Text>
        <Text style={s.step}>{current.label}...</Text>

        {/* Step dots */}
        <View style={s.dots}>
          {STEPS.map((_, i) => (
            <View key={i} style={[s.dot, i <= stepIdx && s.dotActive]} />
          ))}
        </View>

        <Text style={s.hint}>Usually 20 – 40 seconds</Text>
      </View>
          <ProcessingDots />
</SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#080F1A' },
  errSafe: { flex: 1, backgroundColor: BRAND.surfaceAlt },
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
  glow: {
    position: 'absolute', width: 240, height: 240, borderRadius: 120,
    backgroundColor: BRAND.accent, opacity: 0.1,
  },
  iconWrap: {
    width: 80, height: 80, borderRadius: 24, backgroundColor: 'rgba(0,118,206,0.15)',
    justifyContent: 'center', alignItems: 'center', marginBottom: 28,
    borderWidth: 1, borderColor: 'rgba(96,165,250,0.2)',
  },
  title: { fontSize: 20, fontWeight: '800', color: '#fff', textAlign: 'center', marginBottom: 10, letterSpacing: -0.3 },
  step: { fontSize: 14, color: BRAND.muted, textAlign: 'center', marginBottom: 28 },
  dots: { flexDirection: 'row', gap: 8, marginBottom: 32 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.1)' },
  dotActive: { backgroundColor: BRAND.accent },
  hint: { fontSize: 12, color: BRAND.inkSoft, fontWeight: '500' },
  errorIconWrap: { width: 72, height: 72, borderRadius: 22, backgroundColor: BRAND.errorSoft, justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
  errorTitle: { fontSize: 22, fontWeight: '800', color: BRAND.ink, marginBottom: 10, letterSpacing: -0.3 },
  errorMsg: { fontSize: 14, color: BRAND.muted, textAlign: 'center', lineHeight: 22, marginBottom: 32 },
  retryBtn: {
    backgroundColor: BRAND.accent, borderRadius: 14, paddingVertical: 17, paddingHorizontal: 48,
    alignItems: 'center', marginBottom: 12,
    shadowColor: BRAND.accent, shadowOpacity: 0.08, shadowRadius: 4, shadowOffset: { width: 0, height: 4 }, elevation: 2,
  },
  retryBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  backBtn: { paddingVertical: 14 },
  backBtnText: { color: BRAND.muted, fontSize: 15 },
});
