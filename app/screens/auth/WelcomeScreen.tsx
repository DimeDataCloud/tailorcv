import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import { Pressable } from '../../components/Pressable';
import { SEO } from '../../components/SEO';
import { BRAND } from '../../lib/brand';

type Nav = StackNavigationProp<{ Welcome: undefined; SignUp: undefined; SignIn: undefined }>;

const ORG_JSONLD = {
  "@context": "https://schema.org",
  "@type": "Organization",
  "name": "TailorCV",
  "description": "AI-powered resume tailoring tool that adapts your resume to any job description in seconds.",
  "url": "https://tailorcv.app",
  "logo": "https://tailorcv.app/og-image.png",
};

const SOFTWAREAPP_JSONLD = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  "name": "TailorCV",
  "applicationCategory": "BusinessApplication",
  "operatingSystem": "Web, iOS, Android",
  "description": "AI-powered resume tailoring tool that adapts your resume to any job description in seconds.",
  "offers": { "@type": "Offer", "price": "0", "priceCurrency": "USD" },
};

const FEATURES = [
  { icon: 'flash-outline' as const, text: 'AI-powered tailoring' },
  { icon: 'checkmark-circle-outline' as const, text: 'ATS optimized output' },
  { icon: 'color-palette-outline' as const, text: '20 professional templates' },
];

export default function WelcomeScreen() {
  const nav = useNavigation<Nav>();

  return (
    <>
    <SEO
      title="TailorCV — AI Resume Tailoring for Job Seekers"
      description="Tailor your resume to any job in 60 seconds. AI-powered resume tailoring that optimizes for ATS and recruiters. Free to start."
      path="/"
      keywords="AI resume builder, resume tailoring, ATS resume optimizer, job application tool"
      jsonLd={{ ...ORG_JSONLD, ...SOFTWAREAPP_JSONLD }}
    />
    <SafeAreaView style={s.safe}>
      <View style={s.container}>
        <View style={s.glow1} />
        <View style={s.glow2} />

        <View style={s.hero}>
          <View style={s.badge}>
            <Ionicons name="sparkles" size={11} color={BRAND.accentSoft} />
            <Text style={s.badgeText}>AI Resume Builder</Text>
          </View>
          <Text style={s.logo}>TailorCV</Text>
          <Text style={s.tagline}>Your resume, rebuilt{'\n'}for every job.</Text>
          <View style={s.features}>
            {FEATURES.map(f => (
              <View key={f.text} style={s.pill}>
                <Ionicons name={f.icon} size={13} color={BRAND.accentSoft} />
                <Text style={s.pillText}>{f.text}</Text>
              </View>
            ))}
          </View>
        </View>

        <View style={s.buttons}>
          <Pressable style={s.primary} onPress={() => nav.navigate('SignUp')} activeOpacity={0.88}>
            <Text style={s.primaryText}>Get Started — It's Free</Text>
            <Ionicons name="arrow-forward" size={16} color="#fff" />
          </Pressable>
          <Pressable style={s.secondary} onPress={() => nav.navigate('SignIn')} activeOpacity={0.88}>
            <Text style={s.secondaryText}>Sign In</Text>
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
    </>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#080F1A' },
  container: { flex: 1, padding: 32, paddingBottom: 48, overflow: 'hidden' },
  glow1: {
    position: 'absolute', width: 300, height: 300, borderRadius: 150,
    backgroundColor: BRAND.accent, opacity: 0.12, top: -100, right: -80,
  },
  glow2: {
    position: 'absolute', width: 200, height: 200, borderRadius: 100,
    backgroundColor: BRAND.accentDark, opacity: 0.08, top: 80, right: 60,
  },
  hero: { flex: 1, justifyContent: 'center' },
  badge: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(200,54,11,0.18)',
    borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6,
    borderWidth: 1, borderColor: 'rgba(255,228,217,0.35)',
    marginBottom: 24,
  },
  badgeText: { fontSize: 11, fontWeight: '700', color: BRAND.accentSoft, letterSpacing: 1, textTransform: 'uppercase' },
  logo: { fontSize: 48, fontWeight: '800', color: '#fff', letterSpacing: -1.5, marginBottom: 14 },
  tagline: { fontSize: 22, color: BRAND.muted, lineHeight: 34, marginBottom: 40, fontWeight: '300', letterSpacing: 0.2 },
  features: { gap: 10 },
  pill: {
    flexDirection: 'row', alignItems: 'center', gap: 7, alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,228,217,0.06)',
    borderRadius: 20, paddingHorizontal: 14, paddingVertical: 7,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.18)',
  },
  pillText: { fontSize: 13, color: BRAND.muted, fontWeight: '500' },
  buttons: { gap: 12 },
  primary: {
    backgroundColor: BRAND.accent, borderRadius: 14, paddingVertical: 18, paddingHorizontal: 24,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    shadowColor: BRAND.accent, shadowOpacity: 0.08, shadowRadius: 4,
    shadowOffset: { width: 0, height: 6 }, elevation: 2,
  },
  primaryText: { color: '#fff', fontSize: 16, fontWeight: '700', letterSpacing: 0.2 },
  secondary: {
    borderRadius: 14, paddingVertical: 18, alignItems: 'center',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)',
  },
  secondaryText: { color: BRAND.muted, fontSize: 16, fontWeight: '600' },
});
