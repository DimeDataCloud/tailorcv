// Structured extractor for plain-text resumes. Pure-function — no network, no
// React, no platform deps — so it runs identically in the browser, on the
// device, and in tests. Handles the common sections found on real resumes:
// HEADER (name/contact), SKILLS, TOOLS, EDUCATION, EXPERIENCE.

import type { ResumeProfile, WorkHistoryEntry } from '../types/navigation';

// Helper: build a regex string that matches a word allowing optional spaces between letters.
// E.g. "S K I L L S" or "SKILLS" or "Skills" all match.
function spacedWord(w: string): string {
  return w.split('').join('\\s*');
}

const SECTION_HEADERS: Array<[string, RegExp]> = [
  ['skills',     new RegExp('(?:^|\\n)\\s*(?:' + ['skills','core skills','key skills','technical skills'].map(spacedWord).join('|') + ')\\s*(?::\\s*|\\s*\\n)', 'i')],
  ['tools',      new RegExp('(?:^|\\n)\\s*(?:' + ['tools','technologies','tech stack','software','platforms','sales tools','technology','sales tools & technology'].map(spacedWord).join('|') + ')\\s*(?::\\s*|\\s*\\n)', 'i')],
  ['education',  new RegExp('(?:^|\\n)\\s*(?:' + ['education','academic background','qualifications'].map(spacedWord).join('|') + ')\\s*(?::\\s*|\\s*\\n)', 'i')],
  ['languages',  new RegExp('(?:^|\\n)\\s*(?:' + ['languages','language skills'].map(spacedWord).join('|') + ')\\s*(?::\\s*|\\s*\\n)', 'i')],
  ['experience', new RegExp('(?:^|\\n)\\s*(?:' + ['experience','work experience','employment','professional experience','work history','career'].map(spacedWord).join('|') + ')\\s*:?\\s*\\n', 'i')],
  ['summary',    new RegExp('(?:^|\\n)\\s*(?:' + ['summary','professional summary','profile','objective','about'].map(spacedWord).join('|') + ')\\s*:?\\s*\\n', 'i')],
];

interface SectionMap {
  summary?: string;
  skills?: string;
  tools?: string;
  education?: string;
  experience?: string;
}

function findSections(text: string): { sections: SectionMap; order: string[] } {
  const hits: Array<{ key: string; contentStart: number; headerStart: number }> = [];
  for (const [key, re] of SECTION_HEADERS) {
    const m = re.exec(text);
    if (m) {
      const contentStart = m.index + m[0].length;
      hits.push({ key, contentStart, headerStart: m.index });
    }
  }
  hits.sort((a, b) => a.contentStart - b.contentStart);

  const sections: SectionMap = {};
  const order: string[] = [];
  for (let i = 0; i < hits.length; i++) {
    const cur = hits[i];
    const next = hits[i + 1];
    let sliceEnd = next ? next.headerStart : text.length;
    // For inline sections (skills/tools/education on same line as "Label: content"),
    // cap at the end of that line so we don't swallow subsequent sections.
    const headerLine = text.slice(cur.headerStart, cur.contentStart);
    const isInline = !/\n\s*$/.test(headerLine) && !/^\s*$/.test(headerLine);
    if (isInline) {
      const nlAfter = text.indexOf('\n', cur.contentStart);
      if (nlAfter !== -1 && nlAfter < sliceEnd) {
        sliceEnd = nlAfter;
      }
    }
    const slice = text.slice(cur.contentStart, sliceEnd);
    if (!sections[cur.key as keyof SectionMap]) {
      sections[cur.key as keyof SectionMap] = slice;
      order.push(cur.key);
    }
  }
  return { sections, order };
}

// Header (name/email/phone/location/linkedin) is extracted from the part of
// the resume BEFORE the first section header — i.e. the top of the document.
function parseHeader(text: string): { name: string; title: string; email: string; phone: string; linkedin: string; location: string } {
  const firstSectionIdx = (() => {
    for (const [, re] of SECTION_HEADERS) {
      const m = re.exec(text);
      if (m) return m.index;
    }
    return text.length;
  })();

  const head = text.slice(0, firstSectionIdx);

  // Email — RFC-ish, picks the FIRST match
  // Email — tolerates spaces around @ and dots (common in PDF-extracted text)
  const emailNorm = head.replace(/\s*@\s*/g, '@').replace(/\s*\.\s*([A-Za-z]{2,})/g, '.$1');
  const email = emailNorm.match(/[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}/)?.[0] ?? '';

  // Phone — tolerates +country, parens, dots, dashes, spaces. Requires 10 digits.
  const phoneMatch = head.match(/(\+?\d{1,3}[\s.\-]?)?\(?\d{3}\)?[\s.\-]?\d{3}[\s.\-]?\d{4}/);
  const phone = phoneMatch ? phoneMatch[0].trim() : '';

  // LinkedIn
  // LinkedIn — tolerates spaces around /, ., - in PDF-extracted text
  const linkedinNorm = head.replace(/\s*\.\s*/g, '.').replace(/\s*\/\s*/g, '/').replace(/\s*-\s*/g, '-');
  const linkedinMatch = linkedinNorm.match(/linkedin\.com\/in\/([\w-]+)/i);
  const linkedin = linkedinMatch ? `https://www.linkedin.com/in/${linkedinMatch[1]}` : '';

  // Location — "City, ST" or "City, Country"
  const locationMatch = head.match(/([A-Z][a-zA-Z .'-]+),\s*([A-Z]{2}|[A-Z][a-zA-Z]+)(?:\s|$)/m);
  const location = locationMatch ? `${locationMatch[1].trim()}, ${locationMatch[2].trim()}` : '';

  // Name — first non-empty line that looks like a name
  let name = '';
  for (const raw of head.split('\n')) {
    const t = raw.trim();
    if (!t) continue;
    if (t.length < 2 || t.length > 60) continue;
    if (/[@:/]/.test(t)) continue;
    if (!/[A-Za-z]/.test(t)) continue;
    if (/\d{3}/.test(t)) continue;
    if (/^[•\-*\u2022]/.test(t)) continue;
    if (/\b(street|st\.|avenue|ave\.|road|rd\.|suite|ste\.|drive|dr\.)\b/i.test(t)) continue;
    name = t;
    break;
  }
  // Handle name split across two lines (common in PDFs: "JANE\nDOE")
  if (name && !name.includes(' ')) {
    const allLines = head.split('\n').map(l => l.trim());
    const nameIdx = allLines.findIndex(l => l === name);
    if (nameIdx >= 0 && nameIdx + 1 < allLines.length) {
      const nextLine = allLines[nameIdx + 1];
      if (nextLine.length >= 2 && nextLine.length <= 40
          && /^[A-Z][a-zA-Z.'-]+$/.test(nextLine)
          && !/[@:\d{3}]/.test(nextLine)) {
        name = `${name} ${nextLine}`;
      }
    }
  }

  // Fallback for garbled PDF text where everything runs together:
  // extract a name from the beginning of the text, before the first
  // email/phone/linkedin marker. Look for 2-4 capitalized words.
  if (!name) {
    const beforeMarker = head.split(/@|\d{3}|linkedin|www\./i)[0].trim();
    const words = beforeMarker.split(/\s+/).filter(w => /^[A-Z][a-zA-Z.'-]+$/.test(w));
    if (words.length >= 2 && words.length <= 5) {
      name = words.slice(0, 4).join(' ');
    }
  }

  // Professional title — the line after the name that isn't contact info.
  // E.g. "T E C H  S A L E S  P R O F E S S I O N A L"
  let title = '';
  if (name) {
    const allLines = head.split('\n').map(l => l.trim()).filter(Boolean);
    const nameIdx = allLines.findIndex(l => l === name || l === name.split(' ')[0]);
    if (nameIdx >= 0) {
      for (let j = nameIdx + 1; j < allLines.length; j++) {
        const line = allLines[j];
        if (/@|\d{3}|linkedin|www\./i.test(line)) break;
        if (line.length < 5 || line.length > 80) continue;
        if (line === (name.split(' ')[1] || '')) continue;
        title = line.replace(/\s+/g, ' ').trim();
        break;
      }
    }
  }

  return { name, title, email, phone, linkedin, location };
}

// "Salesforce, HubSpot, Outreach, Zoom" — comma list.
function parseList(section: string): string[] {
  if (!section) return [];
  const flat = section.replace(/[•\u2022\u2023\u2043\u204C\u204D|;·]/g, ',');
  const tokens = flat.split(/[,\n]/)
    .map(t => t.replace(/\(.*?\)/g, '').trim())
    .filter(t => t.length >= 2 && t.length <= 40)
    .filter(t => !/^(and|or|with|including)$/i.test(t));
  const seen = new Set<string>();
  const out: string[] = [];
  for (const t of tokens) {
    const k = t.toLowerCase();
    if (!seen.has(k)) { seen.add(k); out.push(t); }
    if (out.length >= 40) break;
  }
  return out;
}

// Education entries: split on blank lines or per-line.
function parseEducation(section: string): string {
  if (!section) return '';
  const blocks = section.split(/\n\s*\n/).map(b => b.replace(/\s+/g, ' ').trim()).filter(Boolean);
  if (blocks.length > 1) return blocks.slice(0, 6).join('\n');
  const lines = section.split('\n').map(l => l.trim()).filter(Boolean);
  return lines.slice(0, 6).join('\n');
}

// Work history: each entry typically begins with a title line followed by
// company / dates. Find date lines and split there.
function parseWorkHistory(section: string): WorkHistoryEntry[] {
  if (!section) return [];
  const lines = section.split('\n').map(l => l.trim()).filter(Boolean);

  // Only consider a line an entry-start if it has a date RANGE - a year
  // with a separator and another year (or "present"). This avoids matching
  // stray years that bleed in from Education via weak section split.
  const dateRangeRe = /(?:^|\W)((?:19|20)\d{2}|present|now|current)\s*[\-–—to]+\s*((?:19|20)\d{2}|present|now|current)(?:\W|$)/i;
  const yearOnlyRe = /\b(?:19|20)\d{2}\b/;

  // Find every line that contains a date range. Each date line is the
  // marker for the END of one entry (the bullets come BEFORE the date, the
  // title/company come even further before).
  const dateLineIdxs: number[] = [];
  for (let i = 0; i < lines.length; i++) {
    if (dateRangeRe.test(lines[i])) dateLineIdxs.push(i);
  }

  if (dateLineIdxs.length === 0) {
    // Fallback: no dates found, treat each blank-line block as an entry.
    const blocks = section.split(/\n\s*\n/).map(b => b.trim()).filter(Boolean);
    return blocks.slice(0, 6).map(block => {
      const firstLine = block.split('\n')[0] || '';
      return { title: firstLine.slice(0, 100), company: '', dates: '', bullets: block };
    });
  }

  const entries: WorkHistoryEntry[] = [];
  for (let i = 0; i < dateLineIdxs.length; i++) {
    const dateIdx = dateLineIdxs[i];
    const nextDateIdx = dateLineIdxs[i + 1];
    const dateLine = lines[dateIdx];
    const dates = dateLine.match(dateRangeRe)?.[0]?.trim() ?? dateLine;

    // Walk BACKWARDS from the date line to find this entry's bullets.
    // Bullets are contiguous lines starting with -, *, bullet glyph, or en/em-dash.
    // STOP if we hit a previous entry's date line (don't steal their bullets).
    let bulletStart = dateIdx;
    while (bulletStart - 1 >= 0
           && /^[\-•*·—–]/.test(lines[bulletStart - 1])
           && !dateRangeRe.test(lines[bulletStart - 1])) {
      bulletStart--;
    }
    // Also scan FORWARD from dateIdx for bullets (CSV-style resumes where
    // bullets come AFTER the date line).
    let bulletEnd = dateIdx;
    while (bulletEnd + 1 < lines.length
           && /^[\-•*·—–]/.test(lines[bulletEnd + 1])
           && !dateRangeRe.test(lines[bulletEnd + 1])) {
      bulletEnd++;
    }
    const beforeBullets = lines.slice(bulletStart, dateIdx).join('\n').trim();
    const afterBullets  = lines.slice(dateIdx + 1, bulletEnd + 1).join('\n').trim();
    // Prefer afterBullets (forward) if beforeBullets belongs to a previous entry.
    // Heuristic: if beforeBullets contains more content than afterBullets AND
    // there's a previous date line between bulletStart and dateIdx, it's likely
    // stolen from the previous entry — use afterBullets instead.
    let bullets = '';
    if (afterBullets) {
      bullets = afterBullets;
    } else if (beforeBullets) {
      // Check if there's a date line between bulletStart and dateIdx — if so,
      // the bullets before it belong to the previous entry, not this one.
      let stolen = false;
      for (let j = bulletStart; j < dateIdx; j++) {
        if (dateRangeRe.test(lines[j])) { stolen = true; break; }
      }
      bullets = stolen ? '' : beforeBullets;
    }
    bullets = bullets.trim();

    // The header (title [+ company]) sits before the bullets. Walk back
    // until we hit a line that looks like another date, another bullet, or
    // the start of the section.
    let headerEnd = bulletStart;
    let headerStart = headerEnd;
    while (headerStart - 1 >= 0
           && !/^[\-•*·—–]/.test(lines[headerStart - 1])
           && !dateRangeRe.test(lines[headerStart - 1])) {
      headerStart--;
    }
    const headerLines = lines.slice(headerStart, headerEnd);

    // Edge case: when date is appended to the SAME line as the title
    // (CSV-style: "Senior Account Executive, Globex Corp, 2022 - Present"),
    // the date line IS the header line. Detect this: if the date line
    // itself contains commas and looks like a header (not pure date),
    // strip the date off and use what's left.
    let title = '';
    let company = '';
    const strippedLine = lines[dateIdx].replace(dateRangeRe, '').replace(/[,\s]+$/, '').trim();
    const csvParts = strippedLine.split(',').map(s => s.trim()).filter(Boolean);
    if (dateLine !== lines[dateIdx].replace(dateRangeRe, '').trim()
        && csvParts.length >= 3) {
      // Date is on the title line, in CSV form. Strip and split.
      title = csvParts[0] || '';
      company = csvParts.slice(1).join(', ');
    } else if (dateLine !== strippedLine && csvParts.length >= 1) {
      // Date is on the title line, space-separated (no commas).
      // E.g. "Sales  Team  Lead  Oct  2025 –  Present"
      // The stripped line is the title; the NEXT line is the company.
      title = strippedLine;
      if (dateIdx + 1 < lines.length) {
        const nextLine = lines[dateIdx + 1].trim();
        if (nextLine && !dateRangeRe.test(nextLine) && !/^[\-•*·—–▸]/.test(nextLine)) {
          company = nextLine;
        }
      }
    } else if (headerLines.length === 1) {
      const line = headerLines[0];
      if (line.includes(',')) {
        const parts = line.split(',').map(s => s.trim()).filter(Boolean);
        title = parts[0] || '';
        company = parts.slice(1).join(', ');
      } else {
        title = line;
      }
    } else if (headerLines.length >= 2) {
      title = headerLines[0];
      const candidate = headerLines[1];
      if (candidate && candidate.length < 80) {
        company = candidate;
      }
    }

    entries.push({
      title: title.slice(0, 100),
      company: company.slice(0, 100),
      dates: dates.slice(0, 60),
      bullets: bullets.slice(0, 1500),
    });
    if (entries.length >= 8) break;

    // If the next date starts on the next entry's date line, that's fine -
    // we re-loop above. We don't need to skip anything.
    void nextDateIdx;
  }

  return entries;
}

export interface ParsedResume {
  profile: Partial<ResumeProfile>;
  workHistory: WorkHistoryEntry[];
  rawText: string;
}

export function parseResume(text: string): ParsedResume {
  if (!text || !text.trim()) {
    return { profile: {}, workHistory: [], rawText: '' };
  }
  const { sections } = findSections(text);
  const header = parseHeader(text);

  const skillsArr   = parseList(sections.skills   ?? '');
  const toolsArr    = parseList(sections.tools    ?? '');
  const education   = parseEducation(sections.education ?? '');
  const workHistory = parseWorkHistory(sections.experience ?? '');

  return {
    profile: {
      name: header.name,
      title: header.title,
      email: header.email,
      phone: header.phone,
      linkedin: header.linkedin,
      location: header.location,
      skills: skillsArr.join(', '),
      tools: toolsArr.join(', '),
      education,
    },
    workHistory,
    rawText: text,
  };
}

// Backward compat for the existing ResumeProfileScreen import.
export function parse(text: string): Partial<ResumeProfile> {
  return parseResume(text).profile;
}
