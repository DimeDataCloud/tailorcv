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

export default function SignUpScreen() {
  const nav = useNavigation<Nav>();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSignUp() {
    setError('');
    if (!email || !password || !confirm) { setError('All fields required.'); return; }
    if (password !== confirm) { setError('Passwords do not match.'); return; }
    if (password.length < 6) { setError('Password must be at least 6 characters.'); return; }
    setLoading(true);
    const { error } = await supabase.auth.signUp({ email: email.trim(), password });
    setLoading(false);
    if (error) setError(error.message);
  }

  return (
    <>
    <SEO
      title="Create Account — TailorCV"
      description="Create a free TailorCV account and start tailoring AI-optimized resumes for every job application in minutes."
      path="/signup"
    />
    <SafeAreaView style={s.safe}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={s.container} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <Pressable style={s.back} onPress={() => nav.goBack()} activeOpacity={0.7}>
            <Ionicons name="chevron-back" size={20} color={BRAND.accent} />
            <Text style={s.backText}>Back</Text>
          </Pressable>

          <Text style={s.title}>Create account</Text>
          <Text style={s.subtitle}>Start tailoring resumes in minutes</Text>

          {error ? (
            <View style={s.errorBanner}>
              <Ionicons name="alert-circle-outline" size={16} color={BRAND.error} />
              <Text style={s.errorText}>{error}</Text>
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
                style={s.pwInput} placeholder="At least 6 characters" placeholderTextColor={BRAND.muted}
                value={password} onChangeText={setPassword}
                secureTextEntry={!showPw} autoComplete="new-password"
              />
              <Pressable onPress={() => setShowPw(p => !p)} style={s.eyeBtn}>
                <Ionicons name={showPw ? 'eye-off-outline' : 'eye-outline'} size={18} color={BRAND.muted} />
              </Pressable>
            </View>
          </View>

          <View style={s.fieldWrap}>
            <Text style={s.fieldLabel}>Confirm Password</Text>
            <TextInput
              style={s.input} placeholder="Repeat your password" placeholderTextColor={BRAND.muted}
              value={confirm} onChangeText={setConfirm}
              secureTextEntry autoComplete="new-password"
            />
          </View>

          <Pressable style={[s.primary, loading && s.disabled]} onPress={handleSignUp} disabled={loading} activeOpacity={0.88}>
            <Text style={s.primaryText}>{loading ? 'Creating account...' : 'Create Account'}</Text>
          </Pressable>

          <View style={s.footerRow}>
            <Text style={s.footerText}>Already have an account? </Text>
            <Pressable onPress={() => nav.navigate('SignIn')}>
              <Text style={s.footerLink}>Sign In</Text>
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
  fieldWrap: { marginBottom: 18 },
  fieldLabel: { fontSize: 12, fontWeight: '700', color: BRAND.ink, marginBottom: 7, textTransform: 'uppercase', letterSpacing: 0.5 },
  input: { borderWidth: 1.5, borderColor: BRAND.hairline, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14, fontSize: 15, color: BRAND.ink, backgroundColor: BRAND.surface },
  pwWrap: { flexDirection: 'row', alignItems: 'center', borderWidth: 1.5, borderColor: BRAND.hairline, borderRadius: 12, backgroundColor: BRAND.surface },
  pwInput: { flex: 1, paddingHorizontal: 16, paddingVertical: 14, fontSize: 15, color: BRAND.ink },
  eyeBtn: { paddingHorizontal: 14 },
  primary: {
    backgroundColor: BRAND.accent, borderRadius: 14, paddingVertical: 17, alignItems: 'center', marginBottom: 24, marginTop: 8,
    shadowColor: BRAND.accent, shadowOpacity: 0.08, shadowRadius: 4, shadowOffset: { width: 0, height: 4 }, elevation: 2,
  },
  disabled: { opacity: 0.55 },
  primaryText: { color: '#fff', fontSize: 16, fontWeight: '700', letterSpacing: 0.2 },
  footerRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center' },
  footerText: { color: BRAND.inkSoft, fontSize: 14 },
  footerLink: { color: BRAND.accent, fontSize: 14, fontWeight: '700' },
});
