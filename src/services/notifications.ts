import { getSupabase, isSupabaseConfigured } from '@/lib/supabase'

/**
 * Asks the send-notifications Edge Function to process queued emails now.
 * Fire-and-forget: the queue lives in the database, so if this call fails the
 * emails are simply sent on the next run (or by the scheduled job).
 */
export function kickNotifications(): void {
  if (!isSupabaseConfigured) return
  void getSupabase()
    .functions.invoke('send-notifications', { body: {} })
    .catch(() => {})
}
