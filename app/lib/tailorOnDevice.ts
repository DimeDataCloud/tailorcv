// On-device resume tailoring + PDF generation.
//
// Instead of calling the tailor-resume Edge Function (which needs internet),
// this runs the Qwen2.5-1.5B model on-device to rewrite the resume content
// tailored to the job description, then renders it into a styled HTML template
// and converts to PDF via expo-print.
//
// Pipeline: resume profile + job description → AI (structured JSON) → HTML template → PDF

import { Platform } from 'react-native';
import type { ResumeProfile, WorkHistoryEntry } from '../types/navigation';

// --- AI tailoring (reuses aiParser infrastructure) ---

const SYSTEM_PROMPT = `You are a resume tailoring assistant. Rewrite the resume content to match the target job. Output ONLY valid JSON. No markdown, no explanation.

Schema:
{"title":"tailored professional headline","summary":"2-3 sentence summary aligned to the job","workHistory":[{"title":"","company":"","dates":"","bullets":"3-4 quantified bullet points separated by newlines, tailored to the job"}],"skills":["reordered/added skills matching the job"],"education":"education string"}

Rules:
- Keep the same job titles, companies, and dates — only rewrite the bullets and summary
- Make bullets specific and quantified where possible
- Reorder skills to put job-relevant ones first
- Add 1-2 skills from the job description if the resume doesn't have them
- Output ONLY the JSON`;

export interface TailoredResume {
  title: string;
  summary: string;
  workHistory: WorkHistoryEntry[];
  skills: string[];
  education: string;
}

/**
 * Tailor a resume on-device using the local LLM.
 * On web: uses Ollama. On native: uses llama.rn with the bundled GGUF model.
 * Falls back to passing through the original profile if AI is unavailable.
 */
export async function tailorResumeOnDevice(
  profile: ResumeProfile,
  jobDescription: string,
  jobTitle: string,
  companyName: string,
): Promise<TailoredResume> {
  const resumeContext = formatProfileForAI(profile);
  const prompt = `${SYSTEM_PROMPT}

Target Job:
${jobTitle} at ${companyName}
${jobDescription.slice(0, 1500)}

Current Resume:
${resumeContext.slice(0, 2500)}

Output ONLY the JSON:`;

  try {
    let output = '';

    if (Platform.OS === 'web') {
      // Web: use Ollama
      const resp = await fetch('http://localhost:11434/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'qwen2.5:1.5b',
          prompt,
          stream: false,
          options: { temperature: 0.3, num_predict: 1500 },
        }),
      });
      if (!resp.ok) throw new Error(`Ollama HTTP ${resp.status}`);
      const data = await resp.json();
      output = data.response || '';
    } else {
      // Native: use llama.rn
      const { getLlamaContext } = require('./modelManager');
      const ctx = await getLlamaContext();
      const result = await ctx.completion({
        prompt,
        n_predict: 1500,
        temperature: 0.3,
        stop: ['```', '</s>'],
      });
      output = result.text || result.content || '';
    }

    const tailored = extractJson(output);
    if (tailored) {
      return normalizeTailored(tailored, profile);
    }
  } catch (e) {
    console.warn('[OnDeviceTailor] AI tailoring failed, using original:', e);
  }

  // Fallback: return the original profile as-is (untailored)
  return {
    title: profile.title || '',
    summary: '',
    workHistory: profile.workHistory || [],
    skills: (profile.skills || '').split(',').map(s => s.trim()).filter(Boolean),
    education: profile.education || '',
  };
}

function formatProfileForAI(profile: ResumeProfile): string {
  const lines: string[] = [];
  lines.push(`Name: ${profile.name}`);
  lines.push(`Title: ${profile.title}`);
  lines.push(`Email: ${profile.email}`);
  lines.push(`Phone: ${profile.phone}`);
  lines.push(`LinkedIn: ${profile.linkedin}`);
  lines.push(`Location: ${profile.location}`);
  lines.push(`Skills: ${profile.skills}`);
  lines.push(`Tools: ${profile.tools}`);
  lines.push(`Education: ${profile.education}`);
  lines.push('');
  lines.push('Work History:');
  for (const w of profile.workHistory || []) {
    lines.push(`${w.title} at ${w.company} (${w.dates})`);
    lines.push(w.bullets);
    lines.push('');
  }
  return lines.join('\n');
}

function extractJson(text: string): any | null {
  let clean = text.trim();
  if (clean.startsWith('```')) {
    clean = clean.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/, '');
  }
  const s = clean.indexOf('{');
  const e = clean.lastIndexOf('}');
  if (s < 0 || e <= s) return null;
  let jsonStr = clean.slice(s, e + 1);

  // Repair common small-model JSON issues:
  // 1. bullets as array instead of string → join with newlines
  jsonStr = jsonStr.replace(/"bullets"\s*:\s*\[([\s\S]*?)\]/g, (match, inner) => {
    const vals = [...inner.matchAll(/"([^"]*)"/g)].map((m: any) => m[1]);
    return `"bullets": "${vals.join('\\n').replace(/"/g, '\\"')}"`;
  });
  // 2. Truncated JSON — close unclosed arrays/objects
  const opens = (jsonStr.match(/{/g) || []).length - (jsonStr.match(/}/g) || []).length;
  const arrs = (jsonStr.match(/\[/g) || []).length - (jsonStr.match(/\]/g) || []).length;
  if (opens > 0 || arrs > 0) {
    jsonStr = jsonStr + ']'.repeat(Math.max(0, arrs)) + '}'.repeat(Math.max(0, opens));
  }

  try {
    return JSON.parse(jsonStr);
  } catch {
    return null;
  }
}

function normalizeTailored(json: any, original: ResumeProfile): TailoredResume {
  return {
    title: String(json.title || original.title || ''),
    summary: String(json.summary || ''),
    workHistory: Array.isArray(json.workHistory)
      ? json.workHistory.map((w: any, i: number) => ({
          title: String(w.title || original.workHistory?.[i]?.title || ''),
          company: String(w.company || original.workHistory?.[i]?.company || ''),
          dates: String(w.dates || original.workHistory?.[i]?.dates || ''),
          bullets: String(w.bullets || original.workHistory?.[i]?.bullets || ''),
        }))
      : original.workHistory || [],
    skills: Array.isArray(json.skills)
      ? json.skills.filter((s: any) => typeof s === 'string' && s.trim())
      : [],
    education: String(json.education || original.education || ''),
  };
}

// --- HTML rendering + PDF generation ---

import { BRAND } from './brand';

/**
 * Render a TailoredResume into a professional HTML resume with the TailorCV
 * brand styling (blood orange accent, clean typography, ATS-friendly).
 */
export function renderResumeHTML(
  tailored: TailoredResume,
  profile: ResumeProfile,
): string {
  const skills = tailored.skills.length > 0
    ? tailored.skills
    : (profile.skills || '').split(',').map(s => s.trim()).filter(Boolean);

  const workHtml = tailored.workHistory
    .filter(w => w.title || w.company || w.bullets)
    .map(w => `
      <div class="job">
        <div class="job-header">
          <div class="job-title">${esc(w.title)}</div>
          <div class="job-meta">${esc(w.company)} ${w.dates ? '&middot; ' + esc(w.dates) : ''}</div>
        </div>
        <div class="bullets">
          ${(w.bullets || '').split('\n').filter(b => b.trim()).map(b => `<div class="bullet">${esc(b.replace(/^[\-•▸]\s*/, ''))}</div>`).join('')}
        </div>
      </div>`)
    .join('');

  const tools = (profile.tools || '').split(',').map(t => t.trim()).filter(Boolean);
  const toolsHtml = tools.length > 0
    ? `<div class="section"><div class="section-title">Tools &amp; Technology</div><div class="skill-list">${tools.map(t => `<span class="skill-tag">${esc(t)}</span>`).join('')}</div></div>`
    : '';

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(tailored.title || profile.name || 'Resume')}</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; color: #1F2937; background: #fff; padding: 48px 56px; line-height: 1.5; }
  .header { border-bottom: 3px solid #C8360B; padding-bottom: 20px; margin-bottom: 28px; }
  .name { font-size: 28px; font-weight: 800; color: #1F2937; letter-spacing: -0.5px; }
  .title { font-size: 16px; font-weight: 600; color: #C8360B; margin-top: 4px; }
  .contact { display: flex; flex-wrap: wrap; gap: 16px; margin-top: 12px; font-size: 13px; color: #6B7280; }
  .contact span { white-space: nowrap; }
  .section { margin-bottom: 22px; }
  .section-title { font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 1.5px; color: #C8360B; margin-bottom: 10px; padding-bottom: 6px; border-bottom: 1px solid #E5E1DC; }
  .summary { font-size: 14px; color: #4B5563; line-height: 1.6; }
  .job { margin-bottom: 18px; }
  .job-header { display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 8px; }
  .job-title { font-size: 15px; font-weight: 700; color: #1F2937; }
  .job-meta { font-size: 13px; color: #6B7280; }
  .bullets { padding-left: 0; }
  .bullet { font-size: 14px; color: #374151; line-height: 1.6; padding-left: 16px; position: relative; margin-bottom: 4px; }
  .bullet::before { content: '\\2022'; position: absolute; left: 4px; color: #C8360B; font-weight: bold; }
  .skill-list { display: flex; flex-wrap: wrap; gap: 8px; }
  .skill-tag { font-size: 13px; color: #1F2937; background: #FFF5F2; border: 1px solid #FDE7E2; border-radius: 6px; padding: 4px 10px; }
  .education { font-size: 14px; color: #374151; }
  @media print { body { padding: 32px 40px; } }
</style>
</head>
<body>
  <div class="header">
    <div class="name">${esc(profile.name || '')}</div>
    <div class="title">${esc(tailored.title || profile.title || '')}</div>
    <div class="contact">
      ${profile.email ? `<span>${esc(profile.email)}</span>` : ''}
      ${profile.phone ? `<span>${esc(profile.phone)}</span>` : ''}
      ${profile.location ? `<span>${esc(profile.location)}</span>` : ''}
      ${profile.linkedin ? `<span>${esc(profile.linkedin)}</span>` : ''}
    </div>
  </div>
  ${tailored.summary ? `<div class="section"><div class="section-title">Summary</div><div class="summary">${esc(tailored.summary)}</div></div>` : ''}
  ${skills.length > 0 ? `<div class="section"><div class="section-title">Core Skills</div><div class="skill-list">${skills.map(s => `<span class="skill-tag">${esc(s)}</span>`).join('')}</div></div>` : ''}
  ${workHtml ? `<div class="section"><div class="section-title">Professional Experience</div>${workHtml}</div>` : ''}
  ${toolsHtml}
  ${tailored.education ? `<div class="section"><div class="section-title">Education</div><div class="education">${esc(tailored.education)}</div></div>` : ''}
</body>
</html>`;
}

function esc(text: string): string {
  return (text || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// --- PDF generation via expo-print ---

/**
 * Generate a PDF from the tailored resume HTML and return the file URI.
 * On web: opens the print dialog. On native: generates a PDF file.
 */
export async function generateResumePDF(html: string): Promise<string | null> {
  if (Platform.OS === 'web') {
    // Web: open print dialog (browser handles PDF generation)
    if (typeof window !== 'undefined') {
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(html);
        printWindow.document.close();
        printWindow.print();
      }
    }
    return null;
  }

  // Native: use expo-print
  try {
    const { printToFileAsync } = require('expo-print');
    const { printAsync } = require('expo-print');

    // Generate PDF file
    const result = await printToFileAsync({
      html,
      width: 612,  // 8.5" at 72dpi (US Letter)
      height: 792, // 11" at 72dpi
    });

    return result.uri;
  } catch (e) {
    console.warn('[PDF] expo-print failed:', e);
    return null;
  }
}

/**
 * Share the generated PDF (uses expo-sharing).
 */
export async function shareResumePDF(pdfUri: string): Promise<void> {
  if (Platform.OS === 'web') return;
  try {
    const { shareAsync } = require('expo-sharing');
    await shareAsync(pdfUri, {
      mimeType: 'application/pdf',
      UTI: 'com.adobe.pdf',
      dialogTitle: 'Share your tailored resume',
    });
  } catch (e) {
    console.warn('[PDF] sharing failed:', e);
  }
}
