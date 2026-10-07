import { useEffect, useState, useRef } from 'react';
import {
  View, Text, StyleSheet, ActivityIndicator, Platform,
} from 'react-native';
import { Pressable } from '../../components/Pressable';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';
import { BRAND } from '../../lib/brand';

let WebView: any = null;
let FileSystem: any = null;
let Sharing: any = null;
if (Platform.OS !== 'web') {
  WebView = require('react-native-webview').WebView;
  FileSystem = require('expo-file-system');
  Sharing = require('expo-sharing');
}

function withViewport(rawHtml: string): string {
  if (rawHtml.includes('name="viewport"')) return rawHtml;
  return rawHtml.replace('<head>', '<head><meta name="viewport" content="width=816, initial-scale=1">');
}

const ENABLE_EDIT_JS = `
  document.designMode = 'on';
  document.body.style.outline = 'none';
  document.addEventListener('click', function(e) {
    if (e.target && e.target.style) {
      e.target.style.outline = '2px dashed BRAND.accent';
      setTimeout(() => { if(e.target.style) e.target.style.outline = ''; }, 1500);
    }
  });
  true;
`;
const DISABLE_EDIT_JS = `document.designMode = 'off'; true;`;
const GET_HTML_JS = `window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'html', content: document.documentElement.outerHTML })); true;`;

export default function ResultScreen() {
  const nav = useNavigation<any>();
  const route = useRoute<any>();
  const { sessionId } = route.params as { sessionId: string };

  const [html, setHtml] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [tailoredId, setTailoredId] = useState('');

  const iframeRef = useRef<any>(null);
  const webViewRef = useRef<any>(null);

  useEffect(() => {
    supabase
      .from('tailored_resumes')
      .select('id, html_content')
      .eq('session_id', sessionId)
      .single()
      .then(({ data }) => {
        if (data) { setHtml(data.html_content); setTailoredId(data.id); }
        setLoading(false);
      });
  }, [sessionId]);

  function toggleEditWeb() {
    if (!iframeRef.current) return;
    const doc = iframeRef.current.contentDocument;
    if (!doc) return;
    const next = !editMode;
    doc.designMode = next ? 'on' : 'off';
    setEditMode(next);
  }

  async function saveWeb() {
    if (!iframeRef.current) return;
    const doc = iframeRef.current.contentDocument;
    if (!doc) return;
    doc.designMode = 'off';
    setEditMode(false);
    const updated = doc.documentElement.outerHTML;
    setSaving(true);
    await supabase.from('tailored_resumes').update({ html_content: updated }).eq('id', tailoredId);
    setHtml(updated);
    setSaving(false);
  }

  function toggleEditNative() {
    if (!webViewRef.current) return;
    if (!editMode) {
      webViewRef.current.injectJavaScript(ENABLE_EDIT_JS);
      setEditMode(true);
    } else {
      webViewRef.current.injectJavaScript(GET_HTML_JS);
    }
  }

  async function onWebViewMessage(event: any) {
    try {
      const msg = JSON.parse(event.nativeEvent.data);
      if (msg.type === 'html' && msg.content) {
        webViewRef.current?.injectJavaScript(DISABLE_EDIT_JS);
        setEditMode(false);
        setSaving(true);
        await supabase.from('tailored_resumes').update({ html_content: msg.content }).eq('id', tailoredId);
        setHtml(msg.content);
        setSaving(false);
      }
    } catch (_) {}
  }

  function toggleEdit() {
    if (Platform.OS === 'web') toggleEditWeb();
    else toggleEditNative();
  }

  async function handleSave() {
    if (Platform.OS === 'web') await saveWeb();
  }

  async function handleShare() {
    if (!html) return;
    // Generate PDF and share it
    try {
      const { generateResumePDF, shareResumePDF } = require('../../lib/tailorOnDevice');
      const pdfUri = await generateResumePDF(html);
      if (pdfUri) {
        await shareResumePDF(pdfUri);
        return;
      }
    } catch (e) {
      console.warn('PDF generation failed, falling back to HTML:', e);
    }
    // Fallback: share as HTML
    if (Platform.OS === 'web') {
      window.open(URL.createObjectURL(new Blob([html], { type: 'text/html' })), '_blank');
      return;
    }
    try {
      const path = FileSystem.cacheDirectory + 'tailored-resume.html';
      await FileSystem.writeAsStringAsync(path, html, { encoding: FileSystem.EncodingType.UTF8 });
      await Sharing.shareAsync(path, { mimeType: 'text/html', UTI: 'public.html' });
    } catch (_) {}
  }

  function renderPreview() {
    if (loading) {
      return (
        <View style={s.loader}>
          <ActivityIndicator size="large" color={BRAND.accent} />
          <Text style={s.loaderText}>Loading resume...</Text>
        </View>
      );
    }
    if (Platform.OS === 'web') {
      // @ts-ignore
      return <iframe ref={iframeRef} srcDoc={html} style={webIframeStyle} title="Resume Preview" />;
    }
    return (
      <WebView
        ref={webViewRef}
        source={{ html: withViewport(html), baseUrl: 'https://fonts.googleapis.com' }}
        javaScriptEnabled
        domStorageEnabled
        originWhitelist={['*']}
        onMessage={onWebViewMessage}
        style={{ flex: 1 }}
      />
    );
  }

  const isEditing = editMode;

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <View style={s.header}>
        <Pressable onPress={() => nav.popToTop()} style={s.backBtn} activeOpacity={0.7}>
          <Ionicons name="chevron-back" size={20} color={BRAND.accent} />
          <Text style={s.backText}>Home</Text>
        </Pressable>

        <Text style={s.headerTitle}>Your Resume</Text>

        {!loading ? (
          <Pressable
            onPress={isEditing && Platform.OS === 'web' ? handleSave : toggleEdit}
            style={isEditing ? s.saveBtn : s.editBtn}
            disabled={saving}
            activeOpacity={0.8}
          >
            <Ionicons
              name={isEditing ? (saving ? 'hourglass-outline' : 'checkmark') : 'pencil-outline'}
              size={14}
              color={isEditing ? '#fff' : BRAND.accent}
            />
            <Text style={isEditing ? s.saveBtnText : s.editBtnText}>
              {isEditing ? (saving ? 'Saving' : 'Save') : 'Edit'}
            </Text>
          </Pressable>
        ) : (
          <View style={{ width: 64 }} />
        )}
      </View>

      {isEditing && (
        <View style={s.editBanner}>
          <Ionicons name="pencil" size={12} color="#92400E" />
          <Text style={s.editBannerText}>
            {Platform.OS === 'web' ? 'Click any text to edit. Tap Save when done.' : 'Tap any text to edit. Tap Save when done.'}
          </Text>
        </View>
      )}

      <View style={s.webviewContainer}>
        {renderPreview()}
      </View>

      <View style={s.footer}>
        <Pressable
          style={[s.shareBtn, loading && s.disabled]}
          onPress={handleShare}
          disabled={loading}
          activeOpacity={0.88}
        >
          <Ionicons name={Platform.OS === 'web' ? 'open-outline' : 'share-outline'} size={18} color="#fff" />
          <Text style={s.shareBtnText}>
            {Platform.OS === 'web' ? 'Open Full Resume' : 'Share / Export'}
          </Text>
        </Pressable>
        <Text style={s.instructions}>
          {Platform.OS === 'web'
            ? 'Opens in new tab → Ctrl+P → Margins: None → Background graphics on → Save PDF'
            : 'Open in Chrome → Print → Margins: None → Background graphics on → Save PDF'}
        </Text>
      </View>
    </SafeAreaView>
  );
}

const webIframeStyle = { border: 'none', width: 816, height: 1128, display: 'block' };

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#fff' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: BRAND.hairline, backgroundColor: '#fff',
  },
  backBtn: { flexDirection: 'row', alignItems: 'center', minWidth: 64 },
  backText: { color: BRAND.accent, fontSize: 14, fontWeight: '600', marginLeft: 2 },
  headerTitle: { fontSize: 16, fontWeight: '700', color: BRAND.ink, letterSpacing: -0.2 },
  editBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: BRAND.accentWash, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 7,
    borderWidth: 1, borderColor: BRAND.accentWash,
  },
  editBtnText: { color: BRAND.accent, fontSize: 13, fontWeight: '700' },
  saveBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: BRAND.accent, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 7,
  },
  saveBtnText: { color: '#fff', fontSize: 13, fontWeight: '700' },
  editBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#FFFBEB', paddingVertical: 8, paddingHorizontal: 16,
    borderBottomWidth: 1, borderBottomColor: '#FDE68A', justifyContent: 'center',
  },
  editBannerText: { fontSize: 12, color: '#92400E' },
  webviewContainer: { flex: 1, backgroundColor: '#DDE3EB', alignItems: 'center', overflow: 'scroll' as any },
  loader: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
  loaderText: { color: BRAND.muted, fontSize: 14 },
  footer: { paddingHorizontal: 20, paddingTop: 14, paddingBottom: 28, borderTopWidth: 1, borderTopColor: BRAND.hairline, backgroundColor: '#fff' },
  shareBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: BRAND.accent, borderRadius: 14, paddingVertical: 16, marginBottom: 10,
    shadowColor: BRAND.accent, shadowOpacity: 0.2, shadowRadius: 8, shadowOffset: { width: 0, height: 3 }, elevation: 2,
  },
  disabled: { opacity: 0.6 },
  shareBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  instructions: { fontSize: 11, color: BRAND.muted, textAlign: 'center', lineHeight: 17 },
});
