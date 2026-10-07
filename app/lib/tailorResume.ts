import { supabase } from './supabase';

// Updates the session with insider context, sets status = processing,
// then fires the tailor-resume Edge Function without awaiting completion.
// The Processing Screen polls sessions.status to detect when it finishes.
export async function startTailoring(sessionId: string, insiderContext: string): Promise<void> {
  const { error } = await supabase
    .from('sessions')
    .update({ insider_context: insiderContext, status: 'processing' })
    .eq('id', sessionId);

  if (error) throw new Error(`Failed to start tailoring: ${error.message}`);

  // Fire without await — Edge Function runs async, updates status when done
  supabase.functions
    .invoke('tailor-resume', { body: { session_id: sessionId } })
    .catch(() => {
      // If the invoke transport itself fails, mark session as error
      supabase
        .from('sessions')
        .update({ status: 'error', error_message: 'Tailoring request failed to send.' })
        .eq('id', sessionId);
    });
}
