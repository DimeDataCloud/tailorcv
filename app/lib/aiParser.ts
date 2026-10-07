// BOT MODE — AI-powered resume parser using a local LLM via Ollama.
//
// Instead of regex patterns (CODE MODE in resumeParser.ts), this sends the
// extracted PDF text to a small local model (Qwen2.5-1.5B) running via
// Ollama, asks it to extract structured profile data, and returns the
// parsed JSON.
//
// On-device: The model runs locally via llama.rn in the EAS preview build.
// In dev/web: Falls back to Ollama running on localhost:11434.
// If neither is available, falls back to CODE MODE (resumeParser.ts).

import { Platform } from 'react-native';
import type { ResumeProfile, WorkHistoryEntry } from '../types/navigation';
import { parseResume } from './resumeParser';

// Model config — Qwen2.5-1.5B-Instruct, ~1GB GGUF
const MODEL_NAME = 'qwen2.5:1.5b';
const OLLAMA_URL = 'http://localhost:11434/api/generate';
const MAX_TEXT_CHARS = 3500; // Truncate to fit context window of small model

// Timeout for Ollama calls — small models on CPU can take 30-60s
const OLLAMA_TIMEOUT_MS = 120_000;

export interface AIParseResult {
  profile: Partial<ResumeProfile>;
  workHistory: WorkHistoryEntry[];
  rawText: string;
  mode: 'ai' | 'code'; // Which mode actually produced the result
}

const SYSTEM_PROMPT = `You are a resume parser. Extract information from the resume text and output ONLY a valid JSON object. No markdown, no code fences, no explanation.

The JSON must match this schema exactly:
{"name":"string","title":"string","email":"string","phone":"string","linkedin":"string","location":"string","skills":["string"],"tools":["string"],"education":"string","workHistory":[{"title":"string","company":"string","dates":"string","bullets":"string"}]}

Rules:
- skills and tools are arrays of short strings (max 40 chars each)
- education is a single string, not an object
- workHistory bullets is a single string with newlines between bullet points, not an array
- If a field is not found, use empty string "" or empty array []
- Output ONLY the JSON object, nothing else`;

/**
 * Parse resume text using a local LLM via Ollama.
 * Returns structured profile data or null if the model is unavailable.
 */
export async function parseResumeWithAI(rawText: string): Promise<AIParseResult | null> {
  if (!rawText || !rawText.trim()) {
    return null;
  }

  // Web: use Ollama on localhost. Native: use llama.rn on-device.
  if (Platform.OS !== 'web') {
    return await parseResumeWithLlamaRN(rawText);
  }

  const truncated = rawText.slice(0, MAX_TEXT_CHARS);

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), OLLAMA_TIMEOUT_MS);

    const resp = await fetch(OLLAMA_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: MODEL_NAME,
        prompt: `${SYSTEM_PROMPT}\n\nResume:\n${truncated}\n\nOutput ONLY the JSON:`,
        stream: false,
        options: { temperature: 0, num_predict: 800 },
      }),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!resp.ok) {
      console.warn('[BotMode] Ollama request failed:', resp.status);
      return null;
    }

    const data = await resp.json();
    const output: string = data.response || '';

    // Extract JSON from the response (model may wrap in ```json fences)
    const json = extractJson(output);
    if (!json) {
      console.warn('[BotMode] No JSON found in model output');
      return null;
    }

    return normalizeAIResult(json, rawText);
  } catch (e) {
    console.warn('[BotMode] AI parse failed, will fall back to code mode:', e);
    return null;
  }
}

/**
 * On-device inference via llama.rn (native only).
 * Loads the Qwen2.5-1.5B GGUF model and runs completion.
 */
async function parseResumeWithLlamaRN(rawText: string): Promise<AIParseResult | null> {
  try {
    const { getLlamaContext, isModelDownloaded } = require('./modelManager');
    
    // Check if model is downloaded
    const downloaded = await isModelDownloaded();
    if (!downloaded) {
      console.warn('[BotMode] Model not downloaded — skipping AI parse');
      return null;
    }

    // Get the loaded model context (singleton)
    const ctx = await getLlamaContext();
    
    // Build the prompt — same as the Ollama prompt
    const prompt = `${SYSTEM_PROMPT}\n\nResume:\n${rawText.slice(0, MAX_TEXT_CHARS)}\n\nOutput ONLY the JSON:`;
    
    // Run completion
    const result = await ctx.completion({
      prompt,
      n_predict: 800,
      temperature: 0,
      stop: ['```', '</s>'],
    });
    
    const output: string = result.text || result.content || '';
    const json = extractJson(output);
    if (!json) {
      console.warn('[BotMode] No JSON found in llama.rn output');
      return null;
    }
    
    return normalizeAIResult(json, rawText);
  } catch (e) {
    console.warn('[BotMode] llama.rn parse failed:', e);
    return null;
  }
}

/**
 * Try to extract a JSON object from the model's text output.
 * Handles markdown fences, leading/trailing text, and partial JSON.
 */
function extractJson(text: string): any | null {
  let clean = text.trim();

  // Strip markdown code fences
  if (clean.startsWith('```')) {
    clean = clean.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/, '');
  }

  // Find the first { and last }
  const start = clean.indexOf('{');
  const end = clean.lastIndexOf('}');
  if (start < 0 || end <= start) return null;

  let jsonStr = clean.slice(start, end + 1);

  // Fix common small-model JSON issues:
  // 1. education as object instead of string — convert to string
  jsonStr = jsonStr.replace(/"education"\s*:\s*\{([^}]*)\}/g, (match, inner) => {
    // Extract values from the object and join as a string
    const vals = inner.match(/"[^"]*"\s*:\s*"([^"]*)"/g)?.map((m: string) =>
      m.match(/"([^"]*)"\s*$/)?.[1] || ''
    ) || [];
    return `"education": "${vals.join(', ').replace(/"/g, '\\"')}"`;
  });

  // 2. bullets as array instead of string — convert to string
  jsonStr = jsonStr.replace(/"bullets"\s*:\s*\[([^]]*)\]/g, (match, inner) => {
    const vals = inner.match(/"([^"]*)"/g)?.map((m: string) =>
      m.replace(/"/g, '').trim()
    ) || [];
    return `"bullets": "${vals.join('\\n').replace(/"/g, '\\"')}"`;
  });

  try {
    return JSON.parse(jsonStr);
  } catch {
    return null;
  }
}

/**
 * Normalize the AI output to match our ResumeProfile + WorkHistoryEntry types.
 */
function normalizeAIResult(json: any, rawText: string): AIParseResult {
  const skills: string[] = Array.isArray(json.skills)
    ? json.skills.filter((s: any) => typeof s === 'string' && s.trim())
    : [];
  const tools: string[] = Array.isArray(json.tools)
    ? json.tools.filter((t: any) => typeof t === 'string' && t.trim())
    : [];

  const workHistory: WorkHistoryEntry[] = Array.isArray(json.workHistory)
    ? json.workHistory.map((w: any) => ({
        title: String(w.title || '').slice(0, 100),
        company: String(w.company || '').slice(0, 100),
        dates: String(w.dates || '').slice(0, 60),
        bullets: String(w.bullets || '').slice(0, 1500),
      }))
    : [];

  // Normalize email — strip spaces around @ and dots (common from PDF text)
  const rawEmail = String(json.email || '');
  const emailNorm = rawEmail.replace(/\s*@\s*/g, '@').replace(/\s*\.\s*([A-Za-z]{2,})/g, '.$1');
  const email = emailNorm.match(/[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}/)?.[0] ?? rawEmail;

  // Normalize LinkedIn — strip spaces around /, ., -
  const rawLinkedin = String(json.linkedin || '');
  const linkedinNorm = rawLinkedin.replace(/\s*\.\s*/g, '.').replace(/\s*\/\s*/g, '/').replace(/\s*-\s*/g, '-');
  const linkedinMatch = linkedinNorm.match(/linkedin\.com\/in\/([\w-]+)/i);
  const linkedin = linkedinMatch ? `https://www.linkedin.com/in/${linkedinMatch[1]}` : rawLinkedin;

  return {
    profile: {
      name: String(json.name || '').replace(/\s+/g, ' ').trim(),
      title: String(json.title || '').replace(/\s+/g, ' ').trim(),
      email,
      phone: String(json.phone || '').trim(),
      linkedin,
      location: String(json.location || '').trim(),
      skills: skills.join(', '),
      tools: tools.join(', '),
      education: String(json.education || '').replace(/\n/g, ' ').trim(),
    },
    workHistory,
    rawText,
    mode: 'ai',
  };
}

/**
 * BOT MODE entry point — tries AI first, falls back to CODE MODE.
 * Called from ResumeProfileScreen when BOT MODE is active.
 */
export async function parseResumeBotMode(rawText: string): Promise<AIParseResult> {
  const aiResult = await parseResumeWithAI(rawText);
  if (aiResult) return aiResult;

  // Fall back to CODE MODE
  const codeResult = parseResume(rawText);
  return {
    profile: codeResult.profile,
    workHistory: codeResult.workHistory,
    rawText: codeResult.rawText,
    mode: 'code',
  };
}
