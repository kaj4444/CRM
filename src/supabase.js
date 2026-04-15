import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL
const supabaseKey = process.env.REACT_APP_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseKey)

// Trial: 7 dní od registrace
export function isTrialActive(profile) {
  if (!profile) return false
  if (profile.subscription_status === 'active') return true
  if (!profile.trial_ends_at) return false
  return new Date(profile.trial_ends_at) > new Date()
}

export function trialDaysLeft(profile) {
  if (!profile?.trial_ends_at) return 0
  const diff = new Date(profile.trial_ends_at) - new Date()
  return Math.max(0, Math.ceil(diff / 86400000))
}
