export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') { res.status(200).end(); return }
  if (req.method !== 'POST') { res.status(405).json({ error: 'Method not allowed' }); return }

  const WEBHOOK = ['https://hooks.slack.com/services','T0AR39GDS5V','B0ARXL5FRK3','zW6FV2hAoVWdQPRuKtiUxvpA'].join('/')

  try {
    const response = await fetch(WEBHOOK, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: req.body.text })
    })
    const result = await response.text()
    res.status(200).json({ ok: true, result })
  } catch(e) {
    res.status(500).json({ error: e.message })
  }
}
