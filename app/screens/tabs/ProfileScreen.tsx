import { useState, useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Pressable } from '../../components/Pressable';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';
import Constants from 'expo-constants';
import { BRAND } from '../../lib/brand';

export default function ProfileScreen() {
  const [email, setEmail] = useState('');

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user?.email) setEmail(user.email);
    });
  }, []);

  async function handleSignOut() {
    await supabase.auth.signOut();
  }

  const initial = email ? email[0].toUpperCase() : '?';

  return (
    <SafeAreaView style={s.safe}>
      <View style={s.header}>
        <Text style={s.title}>Profile</Text>
      </View>

      <View style={s.content}>
        {/* Avatar */}
        <View style={s.avatarSection}>
          <View style={s.avatar}>
            <Text style={s.avatarText}>{initial}</Text>
          </View>
          <Text style={s.avatarEmail} numberOfLines={1}>{email}</Text>
        </View>

        {/* Account card */}
        <View style={s.card}>
          <View style={s.cardRow}>
            <View style={s.cardIcon}>
              <Ionicons name="mail-outline" size={16} color={BRAND.accent} />
            </View>
            <View style={s.cardInfo}>
              <Text style={s.cardLabel}>Email</Text>
              <Text style={s.cardValue} numberOfLines={1}>{email}</Text>
            </View>
          </View>
        </View>

        {/* Sign out */}
        <Pressable style={s.signOut} onPress={handleSignOut} activeOpacity={0.8}>
          <Ionicons name="log-out-outline" size={18} color={BRAND.error} />
          <Text style={s.signOutText}>Sign Out</Text>
        </Pressable>
      </View>

      <Text style={s.version}>TailorCV v{Constants.expoConfig?.version}</Text>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: BRAND.surfaceAlt },
  header: {
    paddingHorizontal: 24, paddingTop: 20, paddingBottom: 16,
    backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: BRAND.hairline,
  },
  title: { fontSize: 22, fontWeight: '800', color: BRAND.ink, letterSpacing: -0.5 },
  content: { flex: 1, padding: 24 },
  avatarSection: { alignItems: 'center', paddingVertical: 28 },
  avatar: {
    width: 72, height: 72, borderRadius: 22, backgroundColor: BRAND.accent,
    justifyContent: 'center', alignItems: 'center', marginBottom: 14,
    shadowColor: BRAND.accent, shadowOpacity: 0.3, shadowRadius: 4,
    shadowOffset: { width: 0, height: 4 }, elevation: 2,
  },
  avatarText: { fontSize: 28, fontWeight: '800', color: '#fff' },
  avatarEmail: { fontSize: 14, color: BRAND.inkSoft, fontWeight: '500' },
  card: {
    backgroundColor: '#fff', borderRadius: 14, padding: 16, marginBottom: 16,
    shadowColor: BRAND.ink, shadowOpacity: 0.06, shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 }, elevation: 2,
  },
  cardRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  cardIcon: { width: 36, height: 36, borderRadius: 10, backgroundColor: BRAND.accentWash, justifyContent: 'center', alignItems: 'center' },
  cardInfo: { flex: 1 },
  cardLabel: { fontSize: 11, fontWeight: '700', color: BRAND.muted, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 3 },
  cardValue: { fontSize: 14, fontWeight: '600', color: BRAND.ink },
  signOut: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: '#fff', borderRadius: 14, padding: 17,
    borderWidth: 1.5, borderColor: BRAND.error,
    shadowColor: BRAND.error, shadowOpacity: 0.06, shadowRadius: 6, elevation: 1,
  },
  signOutText: { color: BRAND.error, fontSize: 15, fontWeight: '700' },
  version: { textAlign: 'center', color: BRAND.muted, fontSize: 11, paddingBottom: 20, fontWeight: '500' },
});
