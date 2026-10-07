import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BRAND } from '../lib/brand';

export default function OfflineBanner({ visible }: { visible: boolean }) {
  if (!visible) return null;
  return (
    <View style={s.banner}>
      <Ionicons name="wifi-outline" size={14} color="#fff" />
      <Text style={s.text}>No internet connection</Text>
    </View>
  );
}

const s = StyleSheet.create({
  banner: { backgroundColor: BRAND.error, paddingVertical: 8, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  text: { color: '#fff', fontSize: 13, fontWeight: '600' },
});
