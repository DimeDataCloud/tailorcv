import { useState } from 'react';
import {
  View, Text, StyleSheet, ActivityIndicator,
  TextInput, ScrollView, KeyboardAvoidingView, Platform} from 'react-native';
import { Pressable } from '../../components/Pressable';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import { HomeStackParamList } from '../../types/navigation';
import { pickAndUploadResume } from '../../lib/uploadResume';
import StepIndicator from '../../components/StepIndicator';
import { supabase } from '../../lib/supabase';
import { BRAND } from '../../lib/brand';

type Nav = StackNavigationProp<HomeStackParamList>;
type Route = RouteProp<HomeStackParamList, 'ResumeUpload'>;

export default function ResumeUploadScreen() {
  const nav = useNavigation<Nav>();
  const { params } = useRoute<Route>();
  const { sessionId, jobTitle, companyName, userId } = params;

  const [filename, setFilename] = useState('');
  const [sourceResumeId, setSourceResumeId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [needsPaste, setNeedsPaste] = useState(false);
  const [pastedResume, setPastedResume] = useState('');
  const [savingPaste, setSavingPaste] = useState(false);

  async function handleUpload() {
    setError('');
    setLoading(true);
    try {
      const result = await pickAndUploadResume(userId);
      setFilename(result.filename);
      setSourceResumeId(result.sourceResumeId);
      await supabase.from('sessions').update({ source_resume_id: result.sourceResumeId }).eq('id', sessionId);
      if (!result.extractedText) {
        setNeedsPaste(true);
      } else {
        nav.navigate('ResumeProfile', { sessionId, sourceResumeId: result.sourceResumeId, jobTitle, companyName, extractedText: result.extractedText });
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Upload failed.';
      if (msg === 'cancelled') { setLoading(false); return; }
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  async function handlePasteSubmit() {
    if (!pastedResume.trim()) { setError('Please paste your resume text.'); return; }
    setSavingPaste(true);
    await supabase.from('source_resumes').update({ extracted_text: pastedResume.trim() }).eq('id', sourceResumeId);
    setSavingPaste(false);
    nav.navigate('ResumeProfile', { sessionId, sourceResumeId, jobTitle, companyName, extractedText: pastedResume.trim() });
  }

  if (needsPaste) {
    return (
      <SafeAreaView style={s.safe}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScrollView contentContainerStyle={s.container} keyboardShouldPersistTaps="handled">
            <StepIndicator current={2} total={5} />
            <Text style={s.title}>Paste your resume</Text>
            <View style={s.fileConfirm}>
              <Ionicons name="checkmark-circle" size={18} color={BRAND.success} />
              <Text style={s.filename}>{filename} uploaded</Text>
            </View>
            <View style={s.pasteNote}>
              <Ionicons name="information-circle-outline" size={15} color={BRAND.inkSoft} />
              <Text style={s.pasteNoteText}>Couldn't auto-read your PDF. Paste your resume text below.</Text>
            </View>
            {error ? (
              <View style={s.errorBanner}>
                <Ionicons name="alert-circle-outline" size={15} color={BRAND.error} />
                <Text style={s.errorText}>{error}</Text>
              </View>
            ) : null}
            <TextInput
              style={s.pasteArea}
              placeholder="Paste your full resume text here..."
              placeholderTextColor={BRAND.muted}
              value={pastedResume}
              onChangeText={setPastedResume}
              multiline
              textAlignVertical="top"
            />
            <Pressable
              style={[s.primary, savingPaste && s.disabled]}
              onPress={handlePasteSubmit}
              disabled={savingPaste}
              activeOpacity={0.88}
            >
              <Text style={s.primaryText}>{savingPaste ? 'Saving...' : 'Continue'}</Text>
            </Pressable>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.safe}>
      <View style={s.container}>
        <Pressable onPress={() => nav.goBack()} style={s.back} activeOpacity={0.7}>
          <Ionicons name="chevron-back" size={20} color={BRAND.accent} />
          <Text style={s.backText}>Back</Text>
        </Pressable>

        <StepIndicator current={2} total={5} />

        <Text style={s.title}>Upload your resume</Text>

        {/* Job context card */}
        <View style={s.jobCard}>
          <View style={s.jobCardLeft} />
          <View style={s.jobCardBody}>
            <Text style={s.jobLabel}>Tailoring for</Text>
            <Text style={s.jobTitle}>{jobTitle}</Text>
            <Text style={s.jobCompany}>{companyName}</Text>
          </View>
        </View>

        {error ? (
          <View style={s.errorBanner}>
            <Ionicons name="alert-circle-outline" size={15} color={BRAND.error} />
            <Text style={s.errorText}>{error}</Text>
          </View>
        ) : null}

        {filename ? (
          <View style={s.fileConfirm}>
            <Ionicons name="checkmark-circle" size={18} color={BRAND.success} />
            <Text style={s.filename}>{filename}</Text>
          </View>
        ) : null}

        <Pressable
          style={[s.uploadBtn, loading && s.disabled]}
          onPress={handleUpload}
          disabled={loading}
          activeOpacity={0.85}
        >
          {loading ? (
            <>
              <ActivityIndicator color={BRAND.accent} style={{ marginBottom: 10 }} />
              <Text style={s.uploadHint}>Uploading and reading your resume...</Text>
            </>
          ) : (
            <>
              <View style={s.uploadIconWrap}>
                <Ionicons name="cloud-upload-outline" size={28} color={BRAND.accent} />
              </View>
              <Text style={s.uploadText}>
                {filename ? 'Upload a Different PDF' : 'Upload Resume PDF'}
              </Text>
              <Text style={s.uploadHint}>PDF only · max 5 MB</Text>
            </>
          )}
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#fff' },
  container: { flex: 1, padding: 24, paddingTop: 16 , paddingBottom: 100 },
  back: { flexDirection: 'row', alignItems: 'center', marginBottom: 24 },
  backText: { color: BRAND.accent, fontSize: 15, fontWeight: '600', marginLeft: 2 },
  title: { fontSize: 26, fontWeight: '800', color: BRAND.ink, marginBottom: 20, letterSpacing: -0.5 },
  jobCard: {
    flexDirection: 'row', borderRadius: 14, overflow: 'hidden',
    backgroundColor: BRAND.accentWash, marginBottom: 24, borderWidth: 1, borderColor: BRAND.accentWash},
  jobCardLeft: { width: 4, backgroundColor: BRAND.accent },
  jobCardBody: { flex: 1, padding: 14 },
  jobLabel: { fontSize: 11, color: BRAND.accent, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 },
  jobTitle: { fontSize: 15, fontWeight: '700', color: BRAND.ink },
  jobCompany: { fontSize: 13, color: BRAND.inkSoft, marginTop: 2 },
  errorBanner: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: BRAND.errorSoft, borderRadius: 10, padding: 12, marginBottom: 16, borderWidth: 1, borderColor: BRAND.error },
  errorText: { color: BRAND.error, fontSize: 13, flex: 1 },
  fileConfirm: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: BRAND.successSoft, padding: 12, borderRadius: 10, marginBottom: 16, borderWidth: 1, borderColor: BRAND.hairline },
  filename: { fontSize: 13, color: BRAND.success, fontWeight: '600', flex: 1 },
  uploadBtn: {
    borderWidth: 2, borderColor: BRAND.accentWash, borderRadius: 16, borderStyle: 'dashed',
    padding: 36, alignItems: 'center', marginTop: 8, backgroundColor: BRAND.surfaceAlt},
  uploadIconWrap: { width: 56, height: 56, borderRadius: 16, backgroundColor: BRAND.accentWash, justifyContent: 'center', alignItems: 'center', marginBottom: 14 },
  disabled: { opacity: 0.5 },
  uploadText: { fontSize: 16, fontWeight: '700', color: BRAND.accent, marginBottom: 6 },
  uploadHint: { fontSize: 12, color: BRAND.muted },
  pasteNote: { flexDirection: 'row', gap: 8, alignItems: 'flex-start', backgroundColor: BRAND.surfaceAlt, borderRadius: 10, padding: 12, marginBottom: 14, borderWidth: 1, borderColor: BRAND.hairline },
  pasteNoteText: { fontSize: 13, color: BRAND.inkSoft, lineHeight: 19, flex: 1 },
  pasteArea: { borderWidth: 1.5, borderColor: BRAND.hairline, borderRadius: 13, padding: 14, fontSize: 13, color: BRAND.ink, height: 280, marginBottom: 16, backgroundColor: BRAND.surface },
  primary: {
    backgroundColor: BRAND.accent, borderRadius: 14, paddingVertical: 17, alignItems: 'center',
    shadowColor: BRAND.accent, shadowOpacity: 0.08, shadowRadius: 4, shadowOffset: { width: 0, height: 4 }, elevation: 4},
  primaryText: { color: '#fff', fontSize: 16, fontWeight: '700', letterSpacing: 0.2 }});
