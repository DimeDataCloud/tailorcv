import { useState } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { Pressable } from '../../components/Pressable';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import { HomeStackParamList } from '../../types/navigation';
import { PRESETS, DesignPreset } from '../../lib/designPresets';

type Nav = StackNavigationProp<HomeStackParamList>;

// Compact visual chip showing each detail the preset controls. Lets the user
// see at-a-glance what "Antique" or "Modern" actually means without checkboxes.
function DetailChip({ icon, label }: { icon: any; label: string }) {
  return (
    <View style={dc.chip}>
      <Ionicons name={icon} size={10} color="#475569" />
      <Text style={dc.chipText}>{label}</Text>
    </View>
  );
}

const dc = StyleSheet.create({
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    backgroundColor: '#F1F5F9', borderRadius: 999,
    paddingHorizontal: 7, paddingVertical: 3, marginRight: 4, marginBottom: 4},
  chipText: { fontSize: 9, fontWeight: '700', color: '#475569', textTransform: 'uppercase', letterSpacing: 0.3 }});

// Bullet-style mini swatch: shows the actual bullet glyph + accent + background
// + a hairline border treatment, so picking a preset feels visual, not abstract.
function MiniPreview({ p, active }: { p: DesignPreset; active: boolean }) {
  return (
    <View style={[mp.card, active && { borderColor: p.accent, borderWidth: 2 }]}>
      <View style={mp.canvas}>
        {p.sidebarWidth ? (
          <View style={[mp.sidebar, { width: `${p.sidebarWidth}%`, backgroundColor: p.sidebar }]}>
            <View style={[mp.sideAccent, { backgroundColor: p.accent }]} />
          </View>
        ) : null}
        <View style={[mp.body, { backgroundColor: p.background, borderColor: p.border === 'none' ? 'transparent' : p.accent + '40' }]}>
          <View style={[mp.headlineBar, { backgroundColor: p.accent, width: p.headerAlign === 'center' ? '60%' : '75%', alignSelf: p.headerAlign === 'center' ? 'center' : 'flex-start' }]} />
          {p.divider === 'rule' && <View style={[mp.rule, { backgroundColor: p.accent }]} />}
          {p.divider === 'dots' && (
            <View style={mp.dotsRow}>
              <View style={[mp.dot, { backgroundColor: p.accent }]} />
              <View style={[mp.dot, { backgroundColor: p.accent }]} />
              <View style={[mp.dot, { backgroundColor: p.accent }]} />
            </View>
          )}
          {p.divider === 'space' && <View style={{ height: 6 }} />}
          <View style={mp.lineA} />
          <View style={mp.lineB} />
        </View>
      </View>
      {active && (
        <View style={[mp.check, { backgroundColor: p.accent }]}>
          <Ionicons name="checkmark" size={10} color="#fff" />
        </View>
      )}
    </View>
  );
}

const mp = StyleSheet.create({
  card: { height: 80, borderRadius: 12, borderWidth: 1, borderColor: '#E4EAF0', overflow: 'hidden', backgroundColor: '#FAFBFC', position: 'relative' },
  canvas: { flex: 1, flexDirection: 'row' },
  sidebar: { justifyContent: 'center', alignItems: 'center' },
  sideAccent: { width: '40%', height: 3, borderRadius: 1 },
  body: { flex: 1, padding: 8, justifyContent: 'center', borderWidth: 1, borderRadius: 2, margin: 3 },
  headlineBar: { height: 3, borderRadius: 1, marginBottom: 4 },
  rule: { height: 1, width: '90%', marginBottom: 5 },
  dotsRow: { flexDirection: 'row', gap: 3, marginBottom: 5 },
  dot: { width: 3, height: 3, borderRadius: 1.5 },
  lineA: { height: 3, width: '85%', borderRadius: 1, backgroundColor: '#E4EAF0', marginBottom: 3 },
  lineB: { height: 3, width: '55%', borderRadius: 1, backgroundColor: '#EDF1F5' },
  check: { position: 'absolute', top: 4, right: 4, width: 16, height: 16, borderRadius: 8, justifyContent: 'center', alignItems: 'center' }});

export default function TemplateLibraryScreen() {
  const nav = useNavigation<Nav>();
  const [activeId, setActiveId] = useState<string | null>(null);

  function handleUsePreset() {
    const preset = PRESETS.find(p => p.id === activeId);
    if (!preset) return;
    const { id, name, tagline, icon, ...designPrefs } = preset;
    nav.navigate('JobURL', { designPrefs });
  }

  // ── Phase 2: detail confirmation for the chosen preset ────────────────────
  if (activeId) {
    const preset = PRESETS.find(p => p.id === activeId)!;
    return (
      <SafeAreaView style={s.safe}>
        <ScrollView contentContainerStyle={s.container} showsVerticalScrollIndicator={false}>
          <Pressable onPress={() => setActiveId(null)} style={s.back} activeOpacity={0.7}>
            <Ionicons name="chevron-back" size={20} color={BRAND.accent} />
            <Text style={[s.backText, { color: BRAND.accent }]}>{preset.name}</Text>
          </Pressable>

          <View style={[s.detailHeader, { backgroundColor: preset.accent + '0A', borderColor: preset.accent + '33' }]}>
            <View style={[s.detailIconWrap, { backgroundColor: '#fff', borderColor: preset.accent + '33' }]}>
              <Ionicons name={preset.icon} size={22} color={preset.accent} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.detailName}>{preset.name}</Text>
              <Text style={s.detailTagline}>{preset.tagline}</Text>
            </View>
          </View>

          <Text style={s.sectionLabel}>Visual preview</Text>
          <View style={s.previewWrap}>
            <MiniPreview p={preset} active />
          </View>

          <Text style={s.sectionLabel}>What's included</Text>
          <View style={s.detailGrid}>
            <DetailRow icon="ellipse-outline"  label="Bullet style"  value={preset.bullet} />
            <DetailRow icon="remove-outline"   label="Divider"       value={preset.divider === 'none' ? 'No divider' : preset.divider} />
            <DetailRow icon="square-outline"   label="Border"        value={preset.border} />
            <DetailRow icon="layers-outline"   label="Texture"       value={preset.texture} />
            <DetailRow icon="text-outline"     label="Typeface"      value={preset.font} />
            <DetailRow icon="pricetag-outline" label="Iconography"   value={preset.icons} />
            <DetailRow icon="resize-outline"   label="Sidebar"       value={preset.sidebarWidth ? `${preset.sidebarWidth}% width` : 'No sidebar'} />
            <DetailRow icon="code-working-outline" label="Alignment" value={preset.headerAlign} />
          </View>

          <Text style={s.sectionLabel}>Color palette</Text>
          <View style={s.paletteRow}>
            <ColorChip label="Accent"     color={preset.accent} />
            <ColorChip label="Sidebar"    color={preset.sidebar} />
            <ColorChip label="Background" color={preset.background} />
            <ColorChip label="Text"       color={preset.text} />
          </View>
          <Text style={s.paletteNote}>You can fine-tune these colors on the next screen.</Text>

          <Pressable style={[s.primary, { backgroundColor: BRAND.accent, shadowColor: BRAND.accent }]} onPress={handleUsePreset} activeOpacity={0.88}>
            <Text style={s.primaryText}>Use This Style</Text>
            <Ionicons name="arrow-forward" size={16} color="#fff" />
          </Pressable>

          <Pressable style={s.skip} onPress={() => setActiveId(null)}>
            <Text style={s.skipText}>← Back to styles</Text>
          </Pressable>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // ── Phase 1: style preset picker ──────────────────────────────────────────
  return (
    <SafeAreaView style={s.safe}>
      <ScrollView contentContainerStyle={s.container} showsVerticalScrollIndicator={false}>
        <Pressable onPress={() => nav.goBack()} style={s.back} activeOpacity={0.7}>
          <Ionicons name="chevron-back" size={20} color={BRAND.accent} />
          <Text style={[s.backText, { color: BRAND.accent }]}>Back</Text>
        </Pressable>

        <Text style={s.title}>Pick your style</Text>
        <Text style={s.subtitle}>
          Each style bundles everything — bullets, dividers, borders, texture, and typeface.
          Pick a vibe; you can fine-tune colors after.
        </Text>

        {PRESETS.map(preset => (
          <Pressable
            key={preset.id}
            style={[s.presetCard, { borderColor: '#E4EAF0' }]}
            onPress={() => setActiveId(preset.id)}
            activeOpacity={0.85}
          >
            <View style={s.presetTopRow}>
              <View style={[s.presetIconWrap, { backgroundColor: preset.accent + '14' }]}>
                <Ionicons name={preset.icon} size={20} color={preset.accent} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.presetName}>{preset.name}</Text>
                <Text style={s.presetTagline}>{preset.tagline}</Text>
              </View>
              <View style={s.swatchGroup}>
                {[preset.accent, preset.sidebar, preset.background, preset.text].map((c, i) => (
                  <View key={i} style={[s.swatch, { backgroundColor: c }]} />
                ))}
              </View>
            </View>

            <View style={s.presetPreviewRow}>
              <MiniPreview p={preset} active={false} />
              <View style={s.chipsCol}>
                <DetailChip icon="ellipse-outline"  label={preset.bullet} />
                <DetailChip icon="square-outline"   label={preset.border} />
                <DetailChip icon="text-outline"     label={preset.font} />
                <DetailChip icon="layers-outline"   label={preset.texture} />
              </View>
            </View>
          </Pressable>
        ))}

        <Pressable style={s.skipMain} onPress={() => nav.navigate('JobURL', {})}>
          <Text style={s.skipText}>Skip — start without a style</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

function DetailRow({ icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <View style={row.wrap}>
      <View style={row.iconWrap}>
        <Ionicons name={icon} size={13} color="#475569" />
      </View>
      <Text style={row.label}>{label}</Text>
      <Text style={row.value}>{value}</Text>
    </View>
  );
}

function ColorChip({ label, color }: { label: string; color: string }) {
  return (
    <View style={cc.wrap}>
      <View style={[cc.swatch, { backgroundColor: color }]} />
      <Text style={cc.label}>{label}</Text>
    </View>
  );
}

// Brand palette mirror — exported from ResumeDesignScreen. Local copy so we
// don't create a circular import between this screen and the design one.
export const BRAND = {
  accent: '#C8360B',
  accentDark: '#9C2A07',
  accentSoft: '#FFE4D9',
  ink: '#1F2937',
  inkSoft: '#475569',
  muted: '#94A3B8',
  hairline: '#E4EAF0',
  surface: '#FFFFFF',
  page: '#F8FAFC'};

const row = StyleSheet.create({
  wrap: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  iconWrap: { width: 26, height: 26, borderRadius: 8, backgroundColor: '#F1F5F9', justifyContent: 'center', alignItems: 'center', marginRight: 10 },
  label: { fontSize: 12, color: '#64748B', fontWeight: '600', flex: 1 },
  value: { fontSize: 13, color: '#0D2137', fontWeight: '700', textTransform: 'capitalize' }});

const cc = StyleSheet.create({
  wrap: { alignItems: 'center', gap: 6 },
  swatch: { width: 44, height: 44, borderRadius: 12, borderWidth: 1, borderColor: '#E4EAF0' },
  label: { fontSize: 10, color: '#64748B', fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.4 }});

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#fff' },
  container: { padding: 24, paddingTop: 16, paddingBottom: 100 },
  back: { flexDirection: 'row', alignItems: 'center', marginBottom: 24 },
  backText: { fontSize: 15, fontWeight: '600', marginLeft: 2 },

  // Phase 1
  title: { fontSize: 26, fontWeight: '800', color: '#0D2137', marginBottom: 6, letterSpacing: -0.5 },
  subtitle: { fontSize: 13, color: '#64748B', lineHeight: 20, marginBottom: 24 },
  presetCard: {
    backgroundColor: '#FAFBFC', borderRadius: 16, padding: 16,
    marginBottom: 12, borderWidth: 1},
  presetTopRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
  presetIconWrap: { width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  presetName: { fontSize: 16, fontWeight: '800', color: '#0D2137', letterSpacing: -0.2 },
  presetTagline: { fontSize: 11, color: '#64748B', lineHeight: 16, marginTop: 2 },
  swatchGroup: { flexDirection: 'row', gap: 3 },
  swatch: { width: 10, height: 22, borderRadius: 3 },
  presetPreviewRow: { flexDirection: 'row', gap: 10, alignItems: 'stretch' },
  chipsCol: { flex: 1, flexDirection: 'row', flexWrap: 'wrap', alignContent: 'flex-start' },

  // Phase 2
  detailHeader: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 14, marginBottom: 24,
    borderRadius: 16, padding: 16, borderWidth: 1},
  detailIconWrap: {
    width: 48, height: 48, borderRadius: 14, justifyContent: 'center', alignItems: 'center',
    borderWidth: 1},
  detailName: { fontSize: 22, fontWeight: '800', color: '#0D2137', letterSpacing: -0.3, marginBottom: 4 },
  detailTagline: { fontSize: 13, color: '#64748B', lineHeight: 19 },
  previewWrap: { marginBottom: 24 },
  sectionLabel: {
    fontSize: 11, fontWeight: '800', color: '#0D2137', textTransform: 'uppercase', letterSpacing: 0.8,
    marginBottom: 12},
  detailGrid: {
    backgroundColor: '#fff', borderRadius: 14, paddingHorizontal: 14, marginBottom: 24,
    borderWidth: 1, borderColor: '#E4EAF0'},
  paletteRow: { flexDirection: 'row', gap: 12, marginBottom: 8, justifyContent: 'space-between' },
  paletteNote: { fontSize: 11, color: '#94A3B8', marginBottom: 24, fontWeight: '500' },

  primary: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    borderRadius: 14, paddingVertical: 17, marginBottom: 12,
    shadowOpacity: 0.08, shadowRadius: 4, shadowOffset: { width: 0, height: 4 }, elevation: 4},
  primaryText: { color: '#fff', fontSize: 16, fontWeight: '700', letterSpacing: 0.2 },
  skip: { paddingVertical: 12, alignItems: 'center' },
  skipMain: { marginTop: 8, paddingVertical: 14, alignItems: 'center' },
  skipText: { color: '#94A3B8', fontSize: 14, fontWeight: '500' }});
