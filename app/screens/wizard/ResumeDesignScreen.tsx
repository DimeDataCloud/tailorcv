import { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet,
  ScrollView, TextInput, KeyboardAvoidingView, Platform,
} from 'react-native';
import { Pressable } from '../../components/Pressable';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import { HomeStackParamList, ResumeDesignPrefs } from '../../types/navigation';
import { supabase } from '../../lib/supabase';
import StepIndicator from '../../components/StepIndicator';
import { getPreset } from '../../lib/designPresets';

type Nav = StackNavigationProp<HomeStackParamList>;
type Route = RouteProp<HomeStackParamList, 'ResumeDesign'>;

function isHex(v: string) { return /^#[0-9A-Fa-f]{6}$/.test(v); }

const COLOR_FIELD_LABELS: Array<{ key: keyof ResumeDesignPrefs; label: string; help: string }> = [
  { key: 'accent',     label: 'Accent / Highlights', help: 'Names, section titles, links, dividers' },
  { key: 'sidebar',    label: 'Sidebar Panel',       help: 'Background of the left/right rail (if used)' },
  { key: 'background', label: 'Background',          help: 'Page color behind your resume content' },
  { key: 'text',       label: 'Text Color',          help: 'Body copy and headings' },
];

export default function ResumeDesignScreen() {
  const nav = useNavigation<Nav>();
  const { params } = useRoute<Route>();
  const { sessionId, sourceResumeId, jobTitle, companyName } = params;

  const [presetName, setPresetName] = useState('Modern');
  const [presetTagline, setPresetTagline] = useState('');
  const [presetIcon, setPresetIcon] = useState<any>('flash-outline');
  const [showCustom, setShowCustom] = useState(false);
  const [accent, setAccent] = useState('#0076CE');
  const [sidebar, setSidebar] = useState('#0F172A');
  const [background, setBackground] = useState('#FFFFFF');
  const [text, setText] = useState('#0F172A');
  const [saving, setSaving] = useState(false);

  // Load the preset chosen upstream (TemplateLibrary) — could come via params
  // (most common path) or fall back to DB row.
  useEffect(() => {
    async function load() {
      const seed: ResumeDesignPrefs | undefined = params.designPrefs;
      let prefs: ResumeDesignPrefs | null = seed ?? null;
      if (!prefs) {
        const { data } = await supabase.from('sessions').select('design').eq('id', sessionId).single();
        prefs = (data?.design as ResumeDesignPrefs | null) ?? null;
      }
      if (prefs) {
        setAccent(prefs.accent);
        setSidebar(prefs.sidebar);
        setBackground(prefs.background);
        setText(prefs.text);
        // Identify preset from accent color — useful when params didn't carry id
        const matched = require('../../lib/designPresets').PRESETS.find(
          (p: any) => p.accent.toUpperCase() === (prefs!.accent || '').toUpperCase(),
        );
        if (matched) {
          setPresetName(matched.name);
          setPresetTagline(matched.tagline);
          setPresetIcon(matched.icon);
        }
      }
    }
    load();
  }, [sessionId, params.designPrefs]);

  function markCustom(setter: (v: string) => void, val: string) {
    setter(val);
  }

  async function saveColors(override?: ResumeDesignPrefs) {
    setSaving(true);
    const design: ResumeDesignPrefs = override ?? {
      accent:     isHex(accent)     ? accent     : '#0076CE',
      sidebar:    isHex(sidebar)    ? sidebar    : '#0F172A',
      background: isHex(background) ? background : '#FFFFFF',
      text:       isHex(text)       ? text       : '#0F172A',
    };
    await supabase.from('sessions').update({ design }).eq('id', sessionId);
    setSaving(false);
    nav.navigate('InsiderContext', { sessionId, sourceResumeId, jobTitle, companyName });
  }

  function handleContinue() {
    saveColors();
  }

  // Read-only view of locked-in design details (bullet / divider / border / font)
  const detailChips: Array<{ icon: any; label: string }> = [
    { icon: 'ellipse-outline',     label: 'Bullets' },
    { icon: 'remove-outline',      label: 'Divider' },
    { icon: 'square-outline',      label: 'Border' },
    { icon: 'layers-outline',      label: 'Texture' },
    { icon: 'text-outline',        label: 'Typeface' },
    { icon: 'pricetag-outline',    label: 'Icons' },
  ];

  return (
    <SafeAreaView style={s.safe}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView style={s.scroll} contentContainerStyle={s.container} keyboardShouldPersistTaps="handled">
          <Pressable onPress={() => nav.goBack()} style={s.back} activeOpacity={0.7}>
            <Ionicons name="chevron-back" size={20} color={BRAND.accent} />
            <Text style={[s.backText, { color: BRAND.accent }]}>Back</Text>
          </Pressable>

          <StepIndicator current={4} total={5} />

          <Text style={s.title}>Customize the colors</Text>
          <Text style={s.subtitle}>
            Your <Text style={s.presetInline}>{presetName}</Text> style controls bullets, dividers, borders, texture, and typeface.
            Tweak the colors below — or skip to keep the default palette.
          </Text>

          {/* Locked-in preset card */}
          <View style={[s.presetCard, { borderColor: accent }]}>
            <View style={s.presetHeader}>
              <View style={[s.presetIconWrap, { backgroundColor: accent + '14', borderColor: accent + '33' }]}>
                <Ionicons name={presetIcon} size={22} color={accent} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.presetName}>{presetName} style</Text>
                <Text style={s.presetTagline}>{presetTagline}</Text>
              </View>
            </View>
            <View style={s.presetChips}>
              {detailChips.map(c => (
                <View key={c.label} style={[s.chip, { borderColor: accent + '33', backgroundColor: accent + '0A' }]}>
                  <Ionicons name={c.icon} size={11} color={accent} />
                  <Text style={[s.chipText, { color: accent }]}>{c.label}</Text>
                </View>
              ))}
            </View>
            <Text style={s.presetLock}>Change style on the previous screen</Text>
          </View>

          {/* Color swatch preview */}
          <View style={s.previewCard}>
            <View style={s.previewRow}>
              <View style={[s.swatchLarge, { backgroundColor: accent }]}>
                <Text style={s.swatchLabel}>Accent</Text>
              </View>
              <View style={[s.swatchLarge, { backgroundColor: sidebar }]}>
                <Text style={[s.swatchLabel, { color: background }]}>Sidebar</Text>
              </View>
            </View>
            <View style={[s.previewSurface, { backgroundColor: background, borderColor: sidebar }]}>
              <Text style={[s.previewHeadline, { color: text }]}>Your Name</Text>
              <View style={[s.previewRule, { backgroundColor: accent }]} />
              <Text style={[s.previewBody, { color: text }]}>
                This is how your resume will read. Body copy sits on the background tone; section titles and links carry the accent color.
              </Text>
              <View style={{ flexDirection: 'row', gap: 6, marginTop: 8 }}>
                <View style={[s.previewChip, { borderColor: accent + '66' }]}>
                  <Text style={[s.previewChipText, { color: accent }]}>Sales</Text>
                </View>
                <View style={[s.previewChip, { borderColor: accent + '66' }]}>
                  <Text style={[s.previewChipText, { color: accent }]}>CRM</Text>
                </View>
              </View>
            </View>
          </View>

          <Pressable
            style={s.customToggle}
            onPress={() => setShowCustom(p => !p)}
            activeOpacity={0.8}
          >
            <Ionicons name={showCustom ? 'chevron-down' : 'chevron-forward'} size={14} color={BRAND.accent} />
            <Text style={[s.customToggleText, { color: BRAND.accent }]}>
              {showCustom ? 'Hide color editing' : 'Edit colors manually'}
            </Text>
          </Pressable>

          {showCustom && (
            <View style={s.customSection}>
              {COLOR_FIELD_LABELS.map(({ key, label, help }) => {
                const value = key === 'accent' ? accent : key === 'sidebar' ? sidebar : key === 'background' ? background : text;
                const setter = key === 'accent' ? setAccent : key === 'sidebar' ? setSidebar : key === 'background' ? setBackground : setText;
                return (
                  <View key={key} style={s.colorRow}>
                    <View style={[s.swatch, { backgroundColor: isHex(value) ? value : '#ccc' }]} />
                    <View style={{ flex: 1 }}>
                      <Text style={s.colorLabel}>{label}</Text>
                      <Text style={s.colorHelp}>{help}</Text>
                      <TextInput
                        style={[s.hexInput, !isHex(value) && s.hexError]}
                        value={value}
                        onChangeText={v => markCustom(setter, v)}
                        autoCapitalize="characters"
                        autoCorrect={false}
                        maxLength={7}
                        placeholder="#000000"
                        placeholderTextColor="#94A3B8"
                      />
                    </View>
                  </View>
                );
              })}
            </View>
          )}

          <Pressable
            style={[s.primary, saving && s.disabled]}
            onPress={handleContinue}
            disabled={saving}
            activeOpacity={0.88}
          >
            <Text style={s.primaryText}>{saving ? 'Saving...' : 'Continue'}</Text>
          </Pressable>

          <Pressable style={s.skip} onPress={() => saveColors(null as any)} disabled={saving}>
            <Text style={s.skipText}>Skip — use default colors</Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// Brand palette — single source of truth for UI chrome (CTAs, focus rings).
// The resume body colors live in each preset and are user-customisable.
export const BRAND = {
  accent: '#C8360B',   // blood orange
  accentDark: '#9C2A07',
  accentSoft: '#FFE4D9',
  ink: '#1F2937',      // deep charcoal for text
  inkSoft: '#475569',
  muted: '#94A3B8',
  hairline: '#E4EAF0',
  surface: '#FFFFFF',
  page: '#F8FAFC',
};

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#fff' },
  scroll: { flex: 1 },
  container: { padding: 24, paddingTop: 16, paddingBottom: 100 },
  back: { flexDirection: 'row', alignItems: 'center', marginBottom: 24 },
  backText: { fontSize: 15, fontWeight: '600', marginLeft: 2 },
  title: { fontSize: 26, fontWeight: '800', color: '#0D2137', marginBottom: 6, letterSpacing: -0.5 },
  subtitle: { fontSize: 13, color: '#64748B', lineHeight: 20, marginBottom: 24 },
  presetInline: { fontWeight: '800', color: '#0D2137' },

  presetCard: {
    borderRadius: 16, borderWidth: 1, padding: 16, marginBottom: 20,
    backgroundColor: '#fff',
  },
  presetHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 12 },
  presetIconWrap: {
    width: 44, height: 44, borderRadius: 12, justifyContent: 'center', alignItems: 'center',
    borderWidth: 1,
  },
  presetName: { fontSize: 16, fontWeight: '800', color: '#0D2137', letterSpacing: -0.2, marginBottom: 2 },
  presetTagline: { fontSize: 12, color: '#64748B', lineHeight: 18 },
  presetChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 10 },
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    borderRadius: 999, borderWidth: 1, paddingHorizontal: 9, paddingVertical: 4,
  },
  chipText: { fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.4 },
  presetLock: { fontSize: 11, color: '#94A3B8', fontWeight: '500' },

  previewCard: {
    borderRadius: 16, borderWidth: 1, borderColor: '#E4EAF0',
    overflow: 'hidden', marginBottom: 20, backgroundColor: '#FAFBFC',
  },
  previewRow: { flexDirection: 'row', height: 60 },
  swatchLarge: { flex: 1, justifyContent: 'flex-end', padding: 10 },
  swatchLabel: { color: '#fff', fontSize: 10, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.6 },
  previewSurface: { padding: 16, borderTopWidth: 4 },
  previewHeadline: { fontSize: 16, fontWeight: '800', letterSpacing: -0.2, marginBottom: 6 },
  previewRule: { height: 2, width: 48, borderRadius: 1, marginBottom: 8 },
  previewBody: { fontSize: 11, lineHeight: 16 },
  previewChip: {
    borderRadius: 999, borderWidth: 1, paddingHorizontal: 8, paddingVertical: 3,
  },
  previewChipText: { fontSize: 10, fontWeight: '700' },

  customToggle: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 12 },
  customToggleText: { fontSize: 14, fontWeight: '600' },
  customSection: { backgroundColor: '#F8FAFC', borderRadius: 14, padding: 16, marginBottom: 24, gap: 16, borderWidth: 1, borderColor: '#E4EAF0' },
  colorRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  swatch: { width: 36, height: 36, borderRadius: 10, borderWidth: 1, borderColor: '#E4EAF0', marginTop: 16 },
  colorLabel: { fontSize: 11, fontWeight: '700', color: '#64748B', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 2 },
  colorHelp: { fontSize: 11, color: '#94A3B8', marginBottom: 6 },
  hexInput: {
    borderWidth: 1.5, borderColor: '#E4EAF0', borderRadius: 10, padding: 9,
    fontSize: 13, color: '#0D2137', backgroundColor: '#fff',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  hexError: { borderColor: '#EF4444' },
  primary: {
    backgroundColor: BRAND.accent, borderRadius: 14, paddingVertical: 17, alignItems: 'center', marginBottom: 14,
    shadowColor: BRAND.accent, shadowOpacity: 0.08, shadowRadius: 4, shadowOffset: { width: 0, height: 4 }, elevation: 2,
  },
  disabled: { opacity: 0.55 },
  primaryText: { color: '#fff', fontSize: 16, fontWeight: '700', letterSpacing: 0.2 },
  skip: { paddingVertical: 12, alignItems: 'center' },
  skipText: { color: '#94A3B8', fontSize: 14, fontWeight: '500' },
});
