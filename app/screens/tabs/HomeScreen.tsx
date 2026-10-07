import { useState, useCallback } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Pressable } from '../../components/Pressable';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import { HomeStackParamList } from '../../types/navigation';
import { supabase } from '../../lib/supabase';
import { timeAgo } from '../../lib/utils';
import { useNetworkStatus } from '../../hooks/useNetworkStatus';
import OfflineBanner from '../../components/OfflineBanner';
import { BRAND } from '../../lib/brand';

type Nav = StackNavigationProp<HomeStackParamList>;

type RecentSession = {
  id: string;
  job_title: string;
  company_name: string;
  created_at: string;
};

export default function HomeScreen() {
  const nav = useNavigation<Nav>();
  const isOffline = useNetworkStatus();
  const [recent, setRecent] = useState<RecentSession[]>([]);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      async function loadRecent() {
        setLoading(true);
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { setLoading(false); return; }
        const { data } = await supabase
          .from('sessions')
          .select('id, job_title, company_name, created_at')
          .eq('user_id', user.id)
          .eq('status', 'complete')
          .order('created_at', { ascending: false })
          .limit(3);
        if (data) setRecent(data);
        setLoading(false);
      }
      loadRecent();
    }, [])
  );

  return (
    <SafeAreaView style={s.safe}>
      <OfflineBanner visible={isOffline} />

      {/* Header */}
      <View style={s.header}>
        <View>
          <Text style={s.brandName}>TailorCV</Text>
          <Text style={s.brandSub}>AI-powered resume tailoring</Text>
        </View>
        <View style={s.logoMark}>
          <Ionicons name="sparkles" size={18} color={BRAND.accent} />
        </View>
      </View>

      <View style={s.content}>
        {/* CTA Card */}
        <Pressable
          style={[s.ctaCard, isOffline && s.disabled]}
          onPress={() => nav.navigate('TemplateLibrary')}
          disabled={isOffline}
          activeOpacity={0.88}
        >
          <View style={s.ctaIconWrap}>
            <Ionicons name="add" size={26} color="#fff" />
          </View>
          <View style={s.ctaText}>
            <Text style={s.ctaTitle}>Tailor a Resume</Text>
            <Text style={s.ctaSub}>Paste a job URL and get hired faster</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="rgba(255,255,255,0.6)" />
        </Pressable>

        {/* Recent section */}
        {loading ? (
          <View style={s.section}>
            <View style={s.skeletonLabel} />
            <View style={s.skeletonCard} />
            <View style={s.skeletonCard} />
          </View>
        ) : recent.length > 0 ? (
          <View style={s.section}>
            <Text style={s.sectionLabel}>Recent</Text>
            {recent.map(item => (
              <Pressable
                key={item.id}
                style={s.card}
                onPress={() => nav.navigate('Result', { sessionId: item.id })}
                activeOpacity={0.8}
              >
                <View style={s.cardDot} />
                <View style={s.cardLeft}>
                  <Text style={s.cardTitle} numberOfLines={1}>{item.job_title}</Text>
                  <Text style={s.cardCompany} numberOfLines={1}>{item.company_name}</Text>
                </View>
                <View style={s.cardRight}>
                  <Text style={s.cardDate}>{timeAgo(item.created_at)}</Text>
                  <Ionicons name="chevron-forward" size={16} color={BRAND.muted} />
                </View>
              </Pressable>
            ))}
          </View>
        ) : (
          <View style={s.empty}>
            <View style={s.emptyIconWrap}>
              <Ionicons name="document-text-outline" size={36} color={BRAND.muted} />
            </View>
            <Text style={s.emptyText}>No resumes yet</Text>
            <Text style={s.emptyHint}>Tap above to tailor your first resume for a job.</Text>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: BRAND.surfaceAlt },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 24, paddingTop: 16, paddingBottom: 20,
    backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: BRAND.hairline,
  },
  brandName: { fontSize: 22, fontWeight: '800', color: BRAND.ink, letterSpacing: -0.5 },
  brandSub: { fontSize: 12, color: BRAND.muted, marginTop: 1, fontWeight: '500' },
  logoMark: {
    width: 40, height: 40, borderRadius: 12, backgroundColor: BRAND.accentWash,
    justifyContent: 'center', alignItems: 'center',
  },
  content: { flex: 1, padding: 20 },
  ctaCard: {
    backgroundColor: BRAND.accent, borderRadius: 18, padding: 20,
    flexDirection: 'row', alignItems: 'center', gap: 16, marginBottom: 28,
    shadowColor: BRAND.accent, shadowOpacity: 0.3, shadowRadius: 4,
    shadowOffset: { width: 0, height: 6 }, elevation: 2,
  },
  ctaIconWrap: {
    width: 46, height: 46, borderRadius: 13,
    backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center',
  },
  ctaText: { flex: 1 },
  ctaTitle: { fontSize: 16, fontWeight: '800', color: '#fff', letterSpacing: -0.2 },
  ctaSub: { fontSize: 12, color: 'rgba(255,255,255,0.75)', marginTop: 2 },
  disabled: { opacity: 0.5 },
  section: {},
  sectionLabel: { fontSize: 11, fontWeight: '700', color: BRAND.muted, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 12 },
  card: {
    backgroundColor: '#fff', borderRadius: 14, padding: 16,
    flexDirection: 'row', alignItems: 'center', marginBottom: 10,
    shadowColor: BRAND.ink, shadowOpacity: 0.06, shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 }, elevation: 2,
  },
  cardDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: BRAND.accent, marginRight: 14 },
  cardLeft: { flex: 1 },
  cardTitle: { fontSize: 14, fontWeight: '700', color: BRAND.ink },
  cardCompany: { fontSize: 12, color: BRAND.inkSoft, marginTop: 3 },
  cardRight: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  cardDate: { fontSize: 11, color: BRAND.muted },
  skeletonLabel: { height: 10, width: 56, backgroundColor: BRAND.hairline, borderRadius: 5, marginBottom: 14 },
  skeletonCard: { height: 68, backgroundColor: BRAND.hairline, borderRadius: 14, marginBottom: 10 },
  empty: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingBottom: 60 },
  emptyIconWrap: { width: 72, height: 72, borderRadius: 20, backgroundColor: BRAND.surfaceAlt, justifyContent: 'center', alignItems: 'center', marginBottom: 16, borderWidth: 1, borderColor: BRAND.hairline },
  emptyText: { fontSize: 16, fontWeight: '700', color: BRAND.ink, marginBottom: 6 },
  emptyHint: { fontSize: 13, color: BRAND.muted, textAlign: 'center', lineHeight: 20 },
});
