import { useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList } from 'react-native';
import { Pressable } from '../../components/Pressable';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import { HistoryStackParamList } from '../../types/navigation';
import { supabase } from '../../lib/supabase';
import { timeAgo } from '../../lib/utils';
import { useNetworkStatus } from '../../hooks/useNetworkStatus';
import OfflineBanner from '../../components/OfflineBanner';
import { BRAND } from '../../lib/brand';
import AnimatedListItem from '../../components/AnimatedListItem';

type Nav = StackNavigationProp<HistoryStackParamList>;

type SessionRow = {
  id: string;
  job_title: string;
  company_name: string;
  created_at: string;
};

const AVATAR_COLORS = [BRAND.accent, '#6366F1', '#10B981', '#F59E0B', BRAND.error, '#8B5CF6'];

function avatarColor(name: string) {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h);
  return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length];
}

export default function HistoryScreen() {
  const nav = useNavigation<Nav>();
  const isOffline = useNetworkStatus();
  const [sessions, setSessions] = useState<SessionRow[]>([]);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      async function load() {
        setLoading(true);
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        const { data } = await supabase
          .from('sessions')
          .select('id, job_title, company_name, created_at')
          .eq('user_id', user.id)
          .eq('status', 'complete')
          .order('created_at', { ascending: false });
        if (data) setSessions(data);
        setLoading(false);
      }
      load();
    }, [])
  );

  return (
    <SafeAreaView style={s.safe}>
      <OfflineBanner visible={isOffline} />
      <View style={s.header}>
        <Text style={s.title}>History</Text>
        {sessions.length > 0 && (
          <View style={s.countBadge}>
            <Text style={s.countText}>{sessions.length}</Text>
          </View>
        )}
      </View>

      {loading ? (
        <View style={s.list}>
          <View style={s.skeletonCard} />
          <View style={s.skeletonCard} />
          <View style={s.skeletonCard} />
        </View>
      ) : sessions.length === 0 ? (
        <View style={s.empty}>
          <View style={s.emptyIconWrap}>
            <Ionicons name="time-outline" size={36} color={BRAND.muted} />
          </View>
          <Text style={s.emptyText}>No tailored resumes yet</Text>
          <Text style={s.emptyHint}>Your completed resumes will appear here.</Text>
        </View>
      ) : (
        <FlatList
          data={sessions}
          keyExtractor={item => item.id}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={s.list}
          renderItem={({ item, index }) => {
            const initial = (item.company_name || item.job_title || '?')[0].toUpperCase();
            const bg = avatarColor(item.company_name || item.job_title);
            return (
              <AnimatedListItem index={index} direction="right">
                <Pressable
                  style={s.card}
                  onPress={() => nav.navigate('HistoryResult', { sessionId: item.id })}
                  activeOpacity={0.8}
                >
                  <View style={[s.avatar, { backgroundColor: bg }]}>
                    <Text style={s.avatarText}>{initial}</Text>
                  </View>
                  <View style={s.cardLeft}>
                    <Text style={s.cardTitle} numberOfLines={1}>{item.job_title}</Text>
                    <Text style={s.cardCompany} numberOfLines={1}>{item.company_name}</Text>
                  </View>
                  <View style={s.cardRight}>
                    <Text style={s.cardDate}>{timeAgo(item.created_at)}</Text>
                    <Ionicons name="chevron-forward" size={16} color={BRAND.muted} />
                  </View>
                </Pressable>
              </AnimatedListItem>
            );
          }}
        />
      )}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: BRAND.surfaceAlt },
  header: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 24, paddingTop: 20, paddingBottom: 16,
    backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: BRAND.hairline,
  },
  title: { fontSize: 22, fontWeight: '800', color: BRAND.ink, letterSpacing: -0.5 },
  countBadge: { backgroundColor: BRAND.accentWash, borderRadius: 10, paddingHorizontal: 8, paddingVertical: 3, borderWidth: 1, borderColor: BRAND.accentWash },
  countText: { fontSize: 12, fontWeight: '700', color: BRAND.accent },
  list: { padding: 20, paddingTop: 16 },
  skeletonCard: { height: 72, backgroundColor: BRAND.hairline, borderRadius: 14, marginBottom: 10 },
  card: {
    backgroundColor: '#fff', borderRadius: 14, padding: 14,
    flexDirection: 'row', alignItems: 'center', marginBottom: 10,
    shadowColor: BRAND.ink, shadowOpacity: 0.06, shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 }, elevation: 2,
  },
  avatar: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center', marginRight: 14 },
  avatarText: { fontSize: 16, fontWeight: '800', color: '#fff' },
  cardLeft: { flex: 1, marginRight: 8 },
  cardTitle: { fontSize: 14, fontWeight: '700', color: BRAND.ink },
  cardCompany: { fontSize: 12, color: BRAND.inkSoft, marginTop: 3 },
  cardRight: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  cardDate: { fontSize: 11, color: BRAND.muted },
  empty: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingBottom: 60 },
  emptyIconWrap: { width: 72, height: 72, borderRadius: 20, backgroundColor: BRAND.surfaceAlt, justifyContent: 'center', alignItems: 'center', marginBottom: 16, borderWidth: 1, borderColor: BRAND.hairline },
  emptyText: { fontSize: 16, fontWeight: '700', color: BRAND.ink, marginBottom: 6 },
  emptyHint: { fontSize: 13, color: BRAND.muted, textAlign: 'center' },
});
