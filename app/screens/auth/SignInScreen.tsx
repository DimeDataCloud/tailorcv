import { useState } from 'react';
import { View, Text, TextInput, StyleSheet, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import { Pressable } from '../../components/Pressable';
import { SEO } from '../../components/SEO';
import { supabase } from '../../lib/supabase';
import { BRAND } from '../../lib/brand';

type Nav = StackNavigationProp<{ Welcome: undefined; SignUp: undefined; SignIn: undefined }>;

export default function SignInScreen() {
  const nav = useNavigation<Nav>();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [resetSent, setResetSent] = useState(false);

  async function handleSignIn() {
    setError('');
    if (!email || !password) { setError('Email and password required.'); return; }
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    setLoading(false);
    if (error) setError(error.message);
  }

  async function handleForgotPassword() {
    if (!email) { setError('Enter your email above first.'); return; }
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim());
    if (error) { setError(error.message); return; }
    setResetSent(true);
  }

  return (
    <>
    <SEO
      title="Sign In — TailorCV"
      description="Sign in to your TailorCV account to continue tailoring resumes for every job application."
      path="/signin"
    />
    <SafeAreaView style={s.safe}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={s.container} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <Pressable style={s.back} onPress={() => nav.goBack()} activeOpacity={0.7}>
            <Ionicons name="chevron-back" size={20} color={BRAND.accent} />
            <Text style={s.backText}>Back</Text>
          </Pressable>

          <Text style={s.title}>Welcome back</Text>
          <Text style={s.subtitle}>Sign in to your TailorCV account</Text>

          {error ? (
            <View style={s.errorBanner}>
              <Ionicons name="alert-circle-outline" size={16} color={BRAND.error} />
              <Text style={s.errorText}>{error}</Text>
            </View>
          ) : null}
          {resetSent ? (
            <View style={s.successBanner}>
              <Ionicons name="checkmark-circle-outline" size={16} color={BRAND.success} />
              <Text style={s.successText}>Reset email sent — check your inbox.</Text>
            </View>
          ) : null}

          <View style={s.fieldWrap}>
            <Text style={s.fieldLabel}>Email</Text>
            <TextInput
              style={s.input} placeholder="you@example.com" placeholderTextColor={BRAND.muted}
              value={email} onChangeText={setEmail}
              keyboardType="email-address" autoCapitalize="none" autoComplete="email"
            />
          </View>

          <View style={s.fieldWrap}>
            <Text style={s.fieldLabel}>Password</Text>
            <View style={s.pwWrap}>
              <TextInput
                style={s.pwInput} placeholder="Enter password" placeholderTextColor={BRAND.muted}
                value={password} onChangeText={setPassword}
                secureTextEntry={!showPw} autoComplete="current-password"
              />
              <Pressable onPress={() => setShowPw(p => !p)} style={s.eyeBtn}>
                <Ionicons name={showPw ? 'eye-off-outline' : 'eye-outline'} size={18} color={BRAND.muted} />
              </Pressable>
            </View>
          </View>

          <Pressable style={s.forgotLink} onPress={handleForgotPassword}>
            <Text style={s.forgotText}>Forgot password?</Text>
          </Pressable>

          <Pressable style={[s.primary, loading && s.disabled]} onPress={handleSignIn} disabled={loading} activeOpacity={0.88}>
            <Text style={s.primaryText}>{loading ? 'Signing in...' : 'Sign In'}</Text>
          </Pressable>

          <View style={s.footerRow}>
            <Text style={s.footerText}>No account? </Text>
            <Pressable onPress={() => nav.navigate('SignUp')}>
              <Text style={s.footerLink}>Create one</Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
    </>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#fff' },
  container: { padding: 28, paddingTop: 16, paddingBottom: 100 },
  back: { flexDirection: 'row', alignItems: 'center', marginBottom: 32 },
  backText: { color: BRAND.accent, fontSize: 15, fontWeight: '600', marginLeft: 2 },
  title: { fontSize: 30, fontWeight: '800', color: BRAND.ink, marginBottom: 6, letterSpacing: -0.5 },
  subtitle: { fontSize: 15, color: BRAND.inkSoft, marginBottom: 32 },
  errorBanner: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#FEE2E2', borderRadius: 12, padding: 14, marginBottom: 20, borderWidth: 2, borderColor: '#FCA5A5', borderLeftWidth: 6, borderLeftColor: '#DC2626', shadowColor: '#DC2626', shadowOpacity: 0.18, shadowRadius: 8, shadowOffset: { width: 0, height: 3 }, elevation: 3 },
  errorText: { color: '#991B1B', fontSize: 14, fontWeight: '700', flex: 1 },
  successBanner: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: BRAND.successSoft, borderRadius: 10, padding: 12, marginBottom: 20, borderWidth: 1, borderColor: BRAND.hairline },
  successText: { color: BRAND.success, fontSize: 13, flex: 1 },
  fieldWrap: { marginBottom: 18 },
  fieldLabel: { fontSize: 12, fontWeight: '700', color: BRAND.ink, marginBottom: 7, textTransform: 'uppercase', letterSpacing: 0.5 },
  input: { borderWidth: 1.5, borderColor: BRAND.hairline, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14, fontSize: 15, color: BRAND.ink, backgroundColor: BRAND.surface },
  pwWrap: { flexDirection: 'row', alignItems: 'center', borderWidth: 1.5, borderColor: BRAND.hairline, borderRadius: 12, backgroundColor: BRAND.surface },
  pwInput: { flex: 1, paddingHorizontal: 16, paddingVertical: 14, fontSize: 15, color: BRAND.ink },
  eyeBtn: { paddingHorizontal: 14 },
  forgotLink: { alignSelf: 'flex-end', marginBottom: 28, marginTop: 4 },
  forgotText: { color: BRAND.accent, fontSize: 13, fontWeight: '600' },
  primary: {
    backgroundColor: BRAND.accent, borderRadius: 14, paddingVertical: 17, alignItems: 'center', marginBottom: 24,
    shadowColor: BRAND.accent, shadowOpacity: 0.08, shadowRadius: 4, shadowOffset: { width: 0, height: 4 }, elevation: 2,
  },
  disabled: { opacity: 0.55 },
  primaryText: { color: '#fff', fontSize: 16, fontWeight: '700', letterSpacing: 0.2 },
  footerRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center' },
  footerText: { color: BRAND.inkSoft, fontSize: 14 },
  footerLink: { color: BRAND.accent, fontSize: 14, fontWeight: '700' },
});
