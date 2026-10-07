import { useState, useMemo, useEffect } from 'react';
import {
  View, Text, TextInput, StyleSheet, ActivityIndicator,
  ScrollView, KeyboardAvoidingView, Platform,
} from 'react-native';
import { Pressable } from '../../components/Pressable';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import { HomeStackParamList, ResumeProfile, ExtraLink, WorkHistoryEntry } from '../../types/navigation';
import type { AIParseResult } from '../../lib/aiParser';
import { supabase } from '../../lib/supabase';
import StepIndicator from '../../components/StepIndicator';
import { BRAND } from '../../lib/brand';
import { parseResume } from '../../lib/resumeParser';
import { parseResumeBotMode } from '../../lib/aiParser';

type Nav = StackNavigationProp<HomeStackParamList>;
type Route = RouteProp<HomeStackParamList, 'ResumeProfile'>;

const BULLET_PLACEHOLDER = 'Bullets — one per line. e.g.\n- Closed $4.2M in new business\n- Grew territory 38% YoY';

function Field({
  label, value, onChange, placeholder, multiline, keyboardType, autoCapitalize,
}: {
  label: string; value: string; onChange: (v: string) => void;
  placeholder?: string; multiline?: boolean; keyboardType?: any; autoCapitalize?: any;
}) {
  return (
    <View style={f.wrap}>
      <Text style={f.label}>{label}</Text>
      <TextInput
        style={[f.input, multiline && f.multiline]}
        value={value}
        onChangeText={onChange}
        placeholder={placeholder ?? `Enter ${label.toLowerCase()}`}
        placeholderTextColor={BRAND.muted}
        multiline={multiline}
        numberOfLines={multiline ? 3 : 1}
        textAlignVertical={multiline ? 'top' : 'center'}
        keyboardType={keyboardType ?? 'default'}
        autoCapitalize={autoCapitalize ?? 'words'}
        autoCorrect={false}
      />
    </View>
  );
}

const f = StyleSheet.create({
  wrap: { marginBottom: 14 },
  label: { fontSize: 11, fontWeight: '700', color: BRAND.inkSoft, textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 6 },
  input: { borderWidth: 1.5, borderColor: BRAND.hairline, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14, color: BRAND.ink, backgroundColor: BRAND.surface },
  multiline: { height: 80, paddingTop: 12 },
});

function WorkRow({
  entry, onChange, onRemove,
}: {
  entry: WorkHistoryEntry;
  onChange: (next: WorkHistoryEntry) => void;
  onRemove: () => void;
}) {
  return (
    <View style={wr.card}>
      <View style={wr.header}>
        <View style={wr.iconWrap}>
          <Ionicons name="briefcase-outline" size={13} color={BRAND.accent} />
        </View>
        <Text style={wr.headerLabel}>Position</Text>
        <Pressable onPress={onRemove} style={wr.removeBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Ionicons name="close-circle-outline" size={18} color={BRAND.error} />
        </Pressable>
      </View>
      <TextInput
        style={wr.input}
        value={entry.title}
        onChangeText={t => onChange({ ...entry, title: t })}
        placeholder="Job title (e.g. Senior Account Executive)"
        placeholderTextColor={BRAND.muted}
        autoCapitalize="words"
      />
      <View style={wr.row2}>
        <TextInput
          style={[wr.input, wr.flex1]}
          value={entry.company}
          onChangeText={t => onChange({ ...entry, company: t })}
          placeholder="Company"
          placeholderTextColor={BRAND.muted}
          autoCapitalize="words"
        />
        <TextInput
          style={[wr.input, wr.flex1]}
          value={entry.dates}
          onChangeText={t => onChange({ ...entry, dates: t })}
          placeholder="Dates (e.g. 2022 - Present)"
          placeholderTextColor={BRAND.muted}
          autoCapitalize="none"
        />
      </View>
      <TextInput
        style={[wr.input, wr.bullets]}
        value={entry.bullets}
        onChangeText={t => onChange({ ...entry, bullets: t })}
        placeholder={BULLET_PLACEHOLDER}
        placeholderTextColor={BRAND.muted}
        multiline
        textAlignVertical="top"
        autoCapitalize="sentences"
      />
    </View>
  );
}

const wr = StyleSheet.create({
  card: {
    backgroundColor: BRAND.surface, borderRadius: 14, padding: 14, marginBottom: 12,
    borderWidth: 1, borderColor: BRAND.hairline,
    shadowColor: BRAND.ink, shadowOpacity: 0.04, shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 }, elevation: 1,
  },
  header: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  iconWrap: { width: 24, height: 24, borderRadius: 7, backgroundColor: BRAND.accentWash, justifyContent: 'center', alignItems: 'center' },
  headerLabel: { flex: 1, fontSize: 11, fontWeight: '800', color: BRAND.accent, textTransform: 'uppercase', letterSpacing: 0.6 },
  removeBtn: { padding: 2 },
  input: {
    borderWidth: 1.5, borderColor: BRAND.hairline, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10,
    fontSize: 14, color: BRAND.ink, backgroundColor: BRAND.surfaceAlt, marginBottom: 8,
  },
  row2: { flexDirection: 'row', gap: 8 },
  flex1: { flex: 1 },
  bullets: { height: 100, paddingTop: 10 },
});

export default function ResumeProfileScreen() {
  const nav = useNavigation<Nav>();
  const { params } = useRoute<Route>();
  const { sessionId, sourceResumeId, jobTitle, companyName, extractedText } = params;

  // BOT MODE: Try AI parser first (async), fall back to code mode (instant).
  // Start with code mode so the screen isn't empty during AI inference.
  const codeParsed = useMemo(() => parseResume(extractedText), [extractedText]);
  const [aiParsed, setAiParsed] = useState<AIParseResult | null>(null);
  const [aiLoading, setAiLoading] = useState(true);
  const [parseMode, setParseMode] = useState<'ai' | 'code'>('code');

  useEffect(() => {
    let cancelled = false;
    setAiLoading(true);
    parseResumeBotMode(extractedText).then(result => {
      if (cancelled) return;
      setAiParsed(result);
      setParseMode(result.mode);
      setAiLoading(false);
    }).catch(() => {
      if (cancelled) return;
      setAiLoading(false);
    });
    return () => { cancelled = true; };
  }, [extractedText]);

  // Use AI result if available, otherwise fall back to code mode
  const parsed = aiParsed || codeParsed;

  const [name, setName] = useState(parsed.profile.name ?? '');
  const [title, setTitle] = useState('');
  const [email, setEmail] = useState(parsed.profile.email ?? '');
  const [phone, setPhone] = useState(parsed.profile.phone ?? '');
  const [linkedin, setLinkedin] = useState(parsed.profile.linkedin ?? '');
  const [location, setLocation] = useState(parsed.profile.location ?? '');
  const [skills, setSkills] = useState(parsed.profile.skills ?? '');
  const [tools, setTools] = useState(parsed.profile.tools ?? '');
  const [education, setEducation] = useState(parsed.profile.education ?? '');
  const [workHistory, setWorkHistory] = useState<WorkHistoryEntry[]>(parsed.workHistory);
  const [extraLinks, setExtraLinks] = useState<ExtraLink[]>([]);
  const [saving, setSaving] = useState(false);

  const stats = useMemo(() => ({
    workCount: workHistory.filter(w => w.title || w.company).length,
    skillsCount: skills.split(',').map(s => s.trim()).filter(Boolean).length,
    toolsCount: tools.split(',').map(s => s.trim()).filter(Boolean).length,
  }), [workHistory, skills, tools]);

  function addWork() {
    setWorkHistory(prev => [...prev, { title: '', company: '', dates: '', bullets: '' }]);
  }
  function updateWork(i: number, next: WorkHistoryEntry) {
    setWorkHistory(prev => prev.map((w, idx) => idx === i ? next : w));
  }
  function removeWork(i: number) {
    setWorkHistory(prev => prev.filter((_, idx) => idx !== i));
  }

  function addLink() { setExtraLinks(prev => [...prev, { label: '', url: '' }]); }
  function updateLink(i: number, field: keyof ExtraLink, val: string) {
    setExtraLinks(prev => prev.map((l, idx) => idx === i ? { ...l, [field]: val } : l));
  }
  function removeLink(i: number) { setExtraLinks(prev => prev.filter((_, idx) => idx !== i)); }

  async function fetchDesignPrefs() {
    const { data } = await supabase.from('sessions').select('design').eq('id', sessionId).single();
    return data?.design as any;
  }

  async function handleContinue() {
    setSaving(true);
    const cleanWork = workHistory.filter(w => (w.title + w.company + w.bullets).trim().length > 0);
    const profile: ResumeProfile = {
      name, title, email, phone, linkedin, location, skills, tools, education,
      workHistory: cleanWork,
      extraLinks: extraLinks.filter(l => l.url.trim()),
    };
    await supabase.from('sessions').update({ profile }).eq('id', sessionId);
    const designPrefs = await fetchDesignPrefs();
    setSaving(false);
    nav.navigate('ResumeDesign', { sessionId, sourceResumeId, jobTitle, companyName, designPrefs });
  }

  const chips = [
    { label: `${stats.workCount} ${stats.workCount === 1 ? 'role' : 'roles'}`, ok: stats.workCount > 0 },
    { label: `${stats.skillsCount} skills`, ok: stats.skillsCount > 0 },
    { label: `${stats.toolsCount} tools`,   ok: stats.toolsCount > 0 },
    { label: 'Education',                   ok: !!education.trim() },
  ];

  return (
    <SafeAreaView style={s.safe}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView style={s.scroll} contentContainerStyle={s.container} keyboardShouldPersistTaps="handled">
          <Pressable onPress={() => nav.goBack()} style={s.back} activeOpacity={0.7}>
            <Ionicons name="chevron-back" size={20} color={BRAND.accent} />
            <Text style={s.backText}>Back</Text>
          </Pressable>

          <StepIndicator current={3} total={5} />

          <Text style={s.title}>Your profile</Text>
          <Text style={s.subtitle}>We scanned your resume and prefilled what we found. Edit anything that is wrong or missing.</Text>
          {aiLoading ? (
            <View style={s.modeBadge}>
              <ActivityIndicator size="small" color={BRAND.accent} />
              <Text style={s.modeBadgeText}>AI scanning resume...</Text>
            </View>
          ) : parseMode === 'ai' ? (
            <View style={[s.modeBadge, s.modeBadgeAI]}>
              <Ionicons name="sparkles" size={12} color={BRAND.accent} />
              <Text style={[s.modeBadgeText, { color: BRAND.accent }]}>Bot Mode</Text>
            </View>
          ) : (
            <View style={s.modeBadge}>
              <Ionicons name="code-slash-outline" size={12} color={BRAND.muted} />
              <Text style={s.modeBadgeText}>Code Mode</Text>
            </View>
          )}

          <View style={s.statsRow}>
            {chips.map(c => (
              <View key={c.label} style={[s.statChip, c.ok && s.statChipOk]}>
                <Ionicons
                  name={c.ok ? 'checkmark-circle' : 'ellipse-outline'}
                  size={12}
                  color={c.ok ? BRAND.success : BRAND.muted}
                />
                <Text style={[s.statChipText, c.ok && { color: BRAND.success }]}>{c.label}</Text>
              </View>
            ))}
          </View>

          <Text style={s.section}>Header</Text>
          <Field label="Full Name" value={name} onChange={setName} />
          <Field label="Professional Title" value={title} onChange={setTitle} placeholder="e.g. Tech Sales Professional" />

          <Text style={s.section}>Contact</Text>
          <Field label="Email" value={email} onChange={setEmail} keyboardType="email-address" autoCapitalize="none" />
          <Field label="Phone" value={phone} onChange={setPhone} keyboardType="phone-pad" autoCapitalize="none" />
          <Field label="LinkedIn URL" value={linkedin} onChange={setLinkedin} placeholder="https://linkedin.com/in/yourname" autoCapitalize="none" />
          <Field label="Location" value={location} onChange={setLocation} placeholder="e.g. Denver, CO" />

          <Text style={s.section}>Work History</Text>
          {workHistory.length === 0 ? (
            <View style={s.emptyHint}>
              <Ionicons name="briefcase-outline" size={16} color={BRAND.muted} />
              <Text style={s.emptyHintText}>No roles found. Add one below.</Text>
            </View>
          ) : null}
          {workHistory.map((w, i) => (
            <WorkRow
              key={i}
              entry={w}
              onChange={next => updateWork(i, next)}
              onRemove={() => removeWork(i)}
            />
          ))}
          <Pressable style={s.addLink} onPress={addWork} activeOpacity={0.8}>
            <Ionicons name="add" size={16} color={BRAND.accent} />
            <Text style={s.addLinkText}>Add role</Text>
          </Pressable>

          <Text style={s.section}>Skills & Tools</Text>
          <Field label="Skills" value={skills} onChange={setSkills} placeholder="e.g. Cold Calling, Objection Handling, CRM" multiline />
          <Field label="Tools" value={tools} onChange={setTools} placeholder="e.g. Salesforce, HubSpot, Zoom, MS Office" multiline />

          <Text style={s.section}>Education</Text>
          <Field label="Education" value={education} onChange={setEducation} placeholder="e.g. B.S. Business Administration, Parkland College, 2024" multiline />

          <Text style={s.section}>Links</Text>
          {extraLinks.map((link, i) => (
            <View key={i} style={s.linkRow}>
              <View style={{ flex: 1 }}>
                <TextInput
                  style={[f.input, { marginBottom: 6 }]}
                  value={link.label}
                  onChangeText={v => updateLink(i, 'label', v)}
                  placeholder="Label (e.g. Portfolio, GitHub)"
                  placeholderTextColor={BRAND.muted}
                  autoCapitalize="words"
                />
                <TextInput
                  style={f.input}
                  value={link.url}
                  onChangeText={v => updateLink(i, 'url', v)}
                  placeholder="URL"
                  placeholderTextColor={BRAND.muted}
                  autoCapitalize="none"
                  autoCorrect={false}
                  keyboardType="url"
                />
              </View>
              <Pressable onPress={() => removeLink(i)} style={s.removeBtn}>
                <Ionicons name="close-circle-outline" size={20} color={BRAND.error} />
              </Pressable>
            </View>
          ))}
          <Pressable style={s.addLink} onPress={addLink} activeOpacity={0.8}>
            <Ionicons name="add" size={16} color={BRAND.accent} />
            <Text style={s.addLinkText}>Add link</Text>
          </Pressable>

          <Pressable
            style={[s.primary, saving && s.disabled]}
            onPress={handleContinue}
            disabled={saving}
            activeOpacity={0.88}
          >
            <Text style={s.primaryText}>{saving ? 'Saving...' : 'Continue'}</Text>
          </Pressable>

          <Pressable style={s.skip} onPress={async () => { const designPrefs = await fetchDesignPrefs(); nav.navigate('ResumeDesign', { sessionId, sourceResumeId, jobTitle, companyName, designPrefs }); }}>
            <Text style={s.skipText}>Skip - use resume as-is</Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#fff' },
  scroll: { flex: 1 },
  container: { padding: 24, paddingTop: 16, paddingBottom: 100 },
  back: { flexDirection: 'row', alignItems: 'center', marginBottom: 24 },
  backText: { color: BRAND.accent, fontSize: 15, fontWeight: '600', marginLeft: 2 },
  title: { fontSize: 26, fontWeight: '800', color: BRAND.ink, marginBottom: 6, letterSpacing: -0.5 },
  subtitle: { fontSize: 13, color: BRAND.inkSoft, lineHeight: 20, marginBottom: 16 },
  statsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 24 },
  statChip: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: BRAND.surfaceAlt, borderRadius: 999,
    paddingHorizontal: 10, paddingVertical: 5,
    borderWidth: 1, borderColor: BRAND.hairline,
  },
  statChipOk: { backgroundColor: BRAND.successSoft, borderColor: BRAND.success + '40' },
  statChipText: { fontSize: 11, fontWeight: '700', color: BRAND.muted, letterSpacing: 0.2 },
  section: {
    fontSize: 11, fontWeight: '800', color: BRAND.ink, textTransform: 'uppercase', letterSpacing: 1,
    marginBottom: 14, marginTop: 10, paddingBottom: 8,
    borderBottomWidth: 1, borderBottomColor: BRAND.hairline,
  },
  linkRow: { flexDirection: 'row', gap: 10, alignItems: 'flex-start', marginBottom: 12 },
  removeBtn: { paddingTop: 10 },
  addLink: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    borderWidth: 1.5, borderColor: BRAND.accentWash, borderRadius: 12, borderStyle: 'dashed',
    padding: 12, justifyContent: 'center', marginBottom: 24, backgroundColor: BRAND.surfaceAlt,
  },
  addLinkText: { color: BRAND.accent, fontSize: 14, fontWeight: '600' },
  emptyHint: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: BRAND.surfaceAlt, borderRadius: 12, padding: 14, marginBottom: 12,
    borderWidth: 1, borderColor: BRAND.hairline, borderStyle: 'dashed',
  },
  emptyHintText: { color: BRAND.muted, fontSize: 13, fontStyle: 'italic' },
  primary: {
    backgroundColor: BRAND.accent, borderRadius: 14, paddingVertical: 17, alignItems: 'center', marginTop: 8, marginBottom: 14,
    shadowColor: BRAND.accent, shadowOpacity: 0.08, shadowRadius: 4, shadowOffset: { width: 0, height: 4 }, elevation: 2,
  },
  disabled: { opacity: 0.55 },
  primaryText: { color: '#fff', fontSize: 16, fontWeight: '700', letterSpacing: 0.2 },
  skip: { paddingVertical: 12, alignItems: 'center' },
  skipText: { color: BRAND.muted, fontSize: 14, fontWeight: '500' },
  modeBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: BRAND.surfaceAlt, borderRadius: 20,
    paddingHorizontal: 10, paddingVertical: 5,
    borderWidth: 1, borderColor: BRAND.hairline,
    alignSelf: 'flex-start', marginBottom: 16,
  },
  modeBadgeAI: {
    backgroundColor: BRAND.accentWash,
    borderColor: BRAND.accentWash,
  },
  modeBadgeText: {
    fontSize: 11, fontWeight: '700', color: BRAND.muted,
    textTransform: 'uppercase', letterSpacing: 0.5,
  },
});
