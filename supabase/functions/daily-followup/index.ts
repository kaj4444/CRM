import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SLACK_WEBHOOK = Deno.env.get('SLACK_WEBHOOK')!
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

Deno.serve(async () => {
  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)
  const today = new Date().toISOString().slice(0, 10)

  const { data: leads } = await supabase
    .from('leads')
    .select('firma, osoba, stav, vede, followup')
    .lte('followup', today)
    .not('stav', 'like', 'Uzavřeno%')
    .order('followup', { ascending: true })

  if (!leads || leads.length === 0) {
    await fetch(SLACK_WEBHOOK, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: `☀️ *Ranní přehled — ${today}*\n\nDnes žádné follow-upy. Volný den! 🎉` })
    })
    return new Response('OK - no followups')
  }

  const lines = leads.map(l =>
    `• *${l.firma}* — ${l.osoba || '—'} | Stav: ${l.stav} | Vede: ${l.vede || '—'} | Follow-up: ${l.followup}`
  ).join('\n')

  const text = `☀️ *Ranní přehled follow-upů — ${today}*\n\n${lines}\n\n_Celkem: ${leads.length} lead${leads.length > 1 ? 'ů' : ''} čeká na kontakt_\n👉 https://crm-two-lemon.vercel.app`

  await fetch(SLACK_WEBHOOK, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text })
  })

  return new Response('OK - sent ' + leads.length + ' followups')
})
