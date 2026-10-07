// core/ai.js — optional AI tailoring step: rewrites summary/bullets/skills
// to match a target job description via a local Ollama model. Entirely
// optional — bin/tailor.js works fine without it (--no-ai / no Ollama
// running just renders the master resume as-is through the chosen template).

const http = require('http');

function buildPrompt(master, jobTitle, companyName, jdText, companyInfo) {
  const workHistoryStr = master.workHistory.map((w, i) =>
    `JOB ${i + 1}: ${w.title} | ${w.company} | ${w.dates}\n  ${w.bullets.replace(/\n/g, ' ')}`
  ).join('\n\n');

  const companyInfoBlock = companyInfo
    ? `\nCompany Background / Brand Voice (use this to calibrate tone and vocabulary — do NOT copy it into the resume verbatim, and never invent employer-specific claims like "as a [Company] employee"):\n${companyInfo.slice(0, 1500)}\n`
    : '';

  return `You are a resume tailoring assistant. Rewrite the resume content to match the target job AND the hiring company's own voice. Output ONLY a valid JSON object — no markdown, no code fences, no explanation.

JSON schema:
{"title":"tailored headline","summary":"2-3 sentence summary","bullets":["bullets for job 1 (newline-separated)","bullets for job 2","bullets for job 3"],"skills":["skill1","skill2","..."]}

Target Job: ${jobTitle} at ${companyName}
Job Description: ${jdText.slice(0, 3000)}
${companyInfoBlock}
Current Resume:
Name: ${master.name}
Title: ${master.title}
Skills: ${master.skills.join(', ')}

Work History:
${workHistoryStr}

Rules:
- Rewrite the summary to align with the target job — use SPECIFIC industry keywords from the JD
- Rewrite each job's bullets to emphasize relevance to the target job, but keep them truthful
- Match the JD's specific terminology and industry language
- Match the company's tone and register, inferred from the Job Description's own wording (and the
  Company Background block above, if provided) — a scrappy startup posting written casually should
  read differently than a formal enterprise/regulated-industry posting, even if the underlying
  skills are the same. Adjust word choice and formality only — never invent facts about the
  candidate's relationship to the company, its products, or its culture.
- DO NOT include any numbers, metrics, percentages, dollar amounts, or quantified statistics anywhere in the resume — EXCEPT for dates. No fabricated metrics.
- The bullets array must have exactly ${master.workHistory.length} strings, one per job, each containing 3-4 bullet points separated by newlines
- Reorder skills to put job-relevant first. Include ALL original skills. Add at most 1-2 new ones from the JD's specific keywords.
- Output ONLY the JSON`;
}

async function callOllama(prompt, { ollamaUrl = 'http://localhost:11434', model = 'gemma3' } = {}) {
  const url = ollamaUrl.replace(/\/+$/, '') + '/api/generate';
  const body = JSON.stringify({
    model,
    prompt,
    stream: false,
    options: { temperature: 0.6, num_predict: 4096, num_ctx: 8192 }
  });
  return new Promise((resolve, reject) => {
    const req = http.request(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) },
      timeout: 300000,
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); }
        catch (e) { reject(new Error('Ollama response was not valid JSON: ' + data.slice(0, 500))); }
      });
    });
    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error(`Ollama timeout (300s) — is "ollama serve" running at ${ollamaUrl}?`)); });
    req.write(body);
    req.end();
  });
}

// Escape raw newlines/CR/tabs that sit INSIDE JSON string literals — invalid
// JSON otherwise. Small local models emit them because we ask for
// newline-separated bullets. Walk char-by-char, track whether we're inside a
// quoted string, escape control chars found there.
function escapeControlCharsInStrings(s) {
  let out = '';
  let inStr = false, esc = false;
  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    if (esc) { out += ch; esc = false; continue; }
    if (ch === '\\') { out += ch; esc = true; continue; }
    if (ch === '"') { inStr = !inStr; out += ch; continue; }
    if (inStr) {
      if (ch === '\n') { out += '\\n'; continue; }
      if (ch === '\r') { out += '\\r'; continue; }
      if (ch === '\t') { out += '\\t'; continue; }
    }
    out += ch;
  }
  return out;
}

// Parse a local model's JSON response with repair passes, in order of
// increasing aggressiveness. Returns null (not a throw) if all repairs fail —
// callers should fall back to the untailored master resume.
function parseJSON(raw) {
  let s = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
  try { return JSON.parse(s); } catch (e) {}
  s = escapeControlCharsInStrings(s);
  try { return JSON.parse(s); } catch (e) {}
  let openB = (s.match(/{/g) || []).length;
  let closeB = (s.match(/}/g) || []).length;
  let openBr = (s.match(/\[/g) || []).length;
  let closeBr = (s.match(/\]/g) || []).length;
  for (let i = 0; i < openBr - closeBr; i++) s += ']';
  for (let i = 0; i < openB - closeB; i++) s += '}';
  s = s.replace(/,\s*([\]}])/g, '$1');
  try { return JSON.parse(s); } catch (e2) { return null; }
}

// Full tailoring step: prompt Ollama, parse+repair its JSON, return the
// tailored fields (or null if the model failed / Ollama is unreachable).
// `companyInfo` is optional free text (mission statement, About page, brand
// voice notes) used only to calibrate tone/vocabulary — see buildPrompt().
async function tailorToJob(master, { jobTitle, companyName, jdText, companyInfo }, aiOpts) {
  const prompt = buildPrompt(master, jobTitle, companyName, jdText, companyInfo);
  const result = await callOllama(prompt, aiOpts);
  return parseJSON(result.response || '');
}

module.exports = { buildPrompt, callOllama, parseJSON, escapeControlCharsInStrings, tailorToJob };
