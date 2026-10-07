import { supabase } from './supabase';

export interface JobSessionResult {
  sessionId: string;
  jobTitle: string;
  companyName: string;
  jobRawText: string;
  source: 'url' | 'url+description' | 'description';
}

// Path 1: URL fetch — calls the fetch-job Edge Function then creates the session.
// If a user-supplied role description is provided, it's appended to the job
// text so the tailor-resume Edge Function can weigh both signals.
export async function fetchJobFromUrl(
  userId: string,
  url: string,
  userDescription?: string,
): Promise<JobSessionResult> {
  const { data, error } = await supabase.functions.invoke('fetch-job', {
    body: { url },
  });

  if (error) throw new Error('Could not load that job posting. Paste the description below instead.');
  if (data?.error) throw new Error(data.error);

  const jobTitle = (data.job_title || 'Unknown Role').slice(0, 200);
  const companyName = (data.company_name || 'Unknown Company').slice(0, 200);
  const urlText = (data.job_raw_text || '').slice(0, 12000);

  // Combine: URL-derived text is the primary signal; user-added description
  // is layered on top so the AI weighs both. The label tells the downstream
  // function how to weight them.
  const hasUserDesc = !!(userDescription && userDescription.trim());
  const jobRawText = hasUserDesc
    ? `${urlText}\n\n--- USER-SUPPLIED ROLE NOTES ---\n${userDescription.trim().slice(0, 4000)}`
    : urlText;
  const source: JobSessionResult['source'] = hasUserDesc ? 'url+description' : 'url';

  const { data: row, error: dbErr } = await supabase
    .from('sessions')
    .insert({
      user_id: userId,
      job_url: url,
      job_title: jobTitle,
      company_name: companyName,
      job_raw_text: jobRawText,
      status: 'pending',
    })
    .select('id')
    .single();

  if (dbErr || !row) throw new Error(`Session create failed: ${dbErr?.message}`);

  return { sessionId: row.id, jobTitle, companyName, jobRawText, source };
}

// Path 2: Description-only — user pasted a job description and either didn't
// supply a URL or the URL fetch failed. Job title is best-effort extracted
// from the first non-empty line; company defaults to "Unknown".
export async function createSessionFromDescription(
  userId: string,
  url: string,
  description: string,
): Promise<JobSessionResult> {
  const trimmed = (description || '').trim().slice(0, 12000);
  if (!trimmed) throw new Error('Please paste a job description.');

  // Heuristic title extraction: first non-empty line, trimmed.
  const firstLine = trimmed.split('\n').map(l => l.trim()).find(Boolean) ?? 'Unknown Role';
  const jobTitle = firstLine.length > 100 ? firstLine.slice(0, 100) + '...' : firstLine;

  const { data: row, error } = await supabase
    .from('sessions')
    .insert({
      user_id: userId,
      job_url: url || '',
      job_title: jobTitle,
      company_name: 'Unknown Company',
      job_raw_text: trimmed,
      status: 'pending',
    })
    .select('id')
    .single();

  if (error || !row) throw new Error(`Session create failed: ${error?.message}`);

  return {
    sessionId: row.id,
    jobTitle,
    companyName: 'Unknown Company',
    jobRawText: trimmed,
    source: url ? 'url+description' : 'description',
  };
}

// Backward-compat alias kept so older callers don't break.
export async function createSessionFromPaste(
  userId: string,
  url: string,
  pastedText: string,
): Promise<JobSessionResult> {
  return createSessionFromDescription(userId, url, pastedText);
}
