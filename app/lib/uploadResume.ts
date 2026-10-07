import * as DocumentPicker from 'expo-document-picker';
import { Platform } from 'react-native';
import { supabase } from './supabase';

const MAX_BYTES = 5 * 1024 * 1024; // 5MB

// crypto.randomUUID() only exists on the global `crypto` object in browsers
// and modern Node — not in React Native. Use a tiny portable UUID v4 so the
// same upload code works on web, iOS, and Android.
function randomUUID(): string {
  const hex = (n: number) => n.toString(16).padStart(2, '0');
  const bytes = new Array(16);
  for (let i = 0; i < 16; i++) bytes[i] = Math.floor(Math.random() * 256);
  bytes[6] = (bytes[6] & 0x0f) | 0x40; // version 4
  bytes[8] = (bytes[8] & 0x3f) | 0x80; // variant 10
  const b6 = hex(bytes[6]);
  const b8 = hex(bytes[8]);
  return (
    hex(bytes[0]) + hex(bytes[1]) + hex(bytes[2]) + hex(bytes[3]) + '-' +
    hex(bytes[4]) + hex(bytes[5]) + '-' +
    b6 + b6[1] + '-' +
    b8 + b8[1] + hex(bytes[9]) + '-' +
    hex(bytes[10]) + hex(bytes[11]) + hex(bytes[12]) + hex(bytes[13]) + hex(bytes[14]) + hex(bytes[15])
  );
}

// Browser-side PDF text extraction — loads pdfjs via script tag so Metro
// bundler never tries to resolve the external URL at build time.
const PDFJS_CDN = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174';

function loadPdfJs(): Promise<any> {
  // @ts-ignore
  if (typeof window !== 'undefined' && window.pdfjsLib) {
    // @ts-ignore
    return Promise.resolve(window.pdfjsLib);
  }
  return new Promise((resolve, reject) => {
    // Inject worker script first
    const worker = document.createElement('script');
    worker.src = `${PDFJS_CDN}/pdf.worker.min.js`;
    document.head.appendChild(worker);

    // Inject main library
    const script = document.createElement('script');
    script.src = `${PDFJS_CDN}/pdf.min.js`;
    script.onload = () => {
      // @ts-ignore
      const lib = window.pdfjsLib;
      if (lib) { lib.GlobalWorkerOptions.workerSrc = `${PDFJS_CDN}/pdf.worker.min.js`; resolve(lib); }
      else reject(new Error('pdfjsLib not found on window after load'));
    };
    script.onerror = () => reject(new Error('Failed to load pdf.js from CDN'));
    document.head.appendChild(script);
  });
}

async function extractPdfTextBrowser(file: File): Promise<string> {
  const pdfjsLib = await loadPdfJs();
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: new Uint8Array(arrayBuffer) }).promise;
  const parts: string[] = [];
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    // Detect line breaks from Y-position changes. pdfjs gives each text item
    // a transform matrix; transform[5] is the Y coordinate. When Y drops
    // significantly, we're on a new line. Items on the same line get joined
    // with a space; line changes get a newline.
    const items = content.items as any[];
    let lastY: number | null = null;
    let pageText = '';
    for (const item of items) {
      const y = item.transform ? item.transform[5] : null;
      if (lastY !== null && y !== null && Math.abs(y - lastY) > 2) {
        // New line — Y changed by more than 2px
        pageText += '\n';
      } else if (pageText && !pageText.endsWith('\n') && !pageText.endsWith(' ')) {
        pageText += ' ';
      }
      pageText += (item.str ?? '');
      lastY = y;
    }
    parts.push(pageText);
  }
  return parts.join('\n').replace(/[ \t]{3,}/g, '  ').trim();
}

export interface UploadResumeResult {
  sourceResumeId: string;
  filename: string;
  extractedText: string;
}

export async function pickAndUploadResume(userId: string): Promise<UploadResumeResult> {
  // 1. Pick PDF
  const picked = await DocumentPicker.getDocumentAsync({ type: 'application/pdf' });
  if (picked.canceled) throw new Error('cancelled');

  const asset = picked.assets[0];

  if (asset.size && asset.size > MAX_BYTES) {
    throw new Error('Resume file too large. Please upload a PDF under 5MB.');
  }
  if (asset.mimeType && asset.mimeType !== 'application/pdf') {
    throw new Error('Please upload a PDF file.');
  }

  // 2. Upload to Supabase Storage at resumes/{userId}/{uuid}.pdf
  const storagePath = `${userId}/${randomUUID()}.pdf`;

  // Web: expo-document-picker provides a native browser File object in asset.file
  // Native (iOS/Android): use React Native FormData with { uri, name, type }
  let uploadBody: Blob | FormData;
  if ((asset as any).file) {
    uploadBody = (asset as any).file as Blob;
  } else {
    const formData = new FormData();
    formData.append('file', { uri: asset.uri, name: asset.name, type: 'application/pdf' } as unknown as Blob);
    uploadBody = formData;
  }

  const { error: uploadError } = await supabase.storage
    .from('resumes')
    .upload(storagePath, uploadBody, { contentType: 'application/pdf', upsert: false });

  if (uploadError) throw new Error(`Upload failed: ${uploadError.message}`);

  // 3. Insert source_resumes row
  const { data: row, error: insertError } = await supabase
    .from('source_resumes')
    .insert({ user_id: userId, original_filename: asset.name, storage_path: storagePath })
    .select('id')
    .single();

  if (insertError || !row) throw new Error(`DB insert failed: ${insertError?.message}`);

  // 4. Extract resume text — client-side on web, Edge Function on native
  let extractedText = '';

  if (Platform.OS === 'web' && (asset as any).file) {
    // Web: extract directly in the browser using pdfjs-dist from CDN
    try {
      extractedText = await extractPdfTextBrowser((asset as any).file as File);
    } catch (e) {
      console.warn('Browser PDF extraction failed:', e);
    }
  } else {
    // Native: call Edge Function
    try {
      const { data: fnData } = await supabase.functions.invoke('extract-resume', {
        body: { storage_path: storagePath },
      });
      extractedText = fnData?.text ?? '';
      if (fnData?.extractionError) console.warn('PDF extraction warning:', fnData.extractionError);
    } catch (e) {
      console.warn('Edge Function PDF extraction failed:', e);
    }
  }

  // 5. Persist extracted text if we got any
  if (extractedText) {
    await supabase
      .from('source_resumes')
      .update({ extracted_text: extractedText })
      .eq('id', row.id);
  }

  return { sourceResumeId: row.id, filename: asset.name, extractedText };
}
