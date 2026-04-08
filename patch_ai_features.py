# -*- coding: utf-8 -*-
with open('src/App.js', 'r', encoding='utf-8') as f:
    content = f.read()

# Přidám AI komponenty před Dashboard
old_marker = "// ─── DASHBOARD ───────────────────────────────────────────────────────────────"

ai_code = """// ─── AI ASISTENT PRO CALL ────────────────────────────────────────────────────
const AiCallBtn = ({ lead }) => {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)

  const prepare = async () => {
    setLoading(true)
    setResult(null)
    try {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 1000,
          messages: [{
            role: 'user',
            content: `Připrav mi stručný přehled pro discovery call s touto firmou. Odpovídej v češtině, buď konkrétní a praktický.

Firma: ${lead.firma}
Kontakt: ${lead.osoba || 'neznámý'}, role: ${lead.role || 'neznámá'}
Odvětví: ${lead.odvetvi || 'neznámé'}
Produkt zájem: ${lead.produkt || 'neznámý'}
Segment: ${lead.segment || 'neznámý'}
Poznámky: ${lead.poznamky || 'žádné'}

Vrať strukturovaně:
1. KLÍČOVÉ OTÁZKY (3 konkrétní otázky pro diagnostiku)
2. PRAVDĚPODOBNÉ NÁMITKY (3 nejčastější pro tento typ firmy + krátká odpověď)
3. DOPORUČENÝ VSTUP (jak začít hovor - 2 věty)

Buď stručný, každý bod max 2 řádky.`
          }]
        })
      })
      const data = await response.json()
      const text = data.content?.find(c=>c.type==='text')?.text || 'Chyba při generování'
      setResult(text)
    } catch(e) {
      setResult('Chyba: ' + e.message)
    }
    setLoading(false)
  }

  return (
    <div>
      <button className="btn" style={{color:'#0F6E56',borderColor:'#0F6E56',background:result?'#E1F5EE':'#fff'}} onClick={prepare} disabled={loading}>
        {loading ? '⏳ Generuji...' : '🤖 Připravit call'}
      </button>
      {result && (
        <div style={{
          marginTop:12,padding:'14px 16px',background:'#E1F5EE',
          borderRadius:10,border:'0.5px solid #5DCAA5',fontSize:13,
          color:'#0F6E56',lineHeight:1.7,whiteSpace:'pre-wrap'
        }}>
          <div style={{fontSize:11,color:'#1D9E75',fontWeight:600,marginBottom:8,textTransform:'uppercase'}}>AI příprava na call</div>
          {result}
          <button onClick={()=>setResult(null)} style={{display:'block',marginTop:10,background:'none',border:'none',color:'#1D9E75',fontSize:12,cursor:'pointer',padding:0}}>Zavřít</button>
        </div>
      )}
    </div>
  )
}

// ─── DASHBOARD ───────────────────────────────────────────────────────────────"""

if old_marker in content:
    content = content.replace(old_marker, ai_code)
    print("OK - AI asistent přidán")
else:
    print("ERROR - marker nenalezen")

# Přidám mrtvé leady notifikaci + týdenní Slack report do hlavní App
old_fetch_leads = "  useEffect(() => { if (authed) fetchLeads() }, [authed, fetchLeads])"
new_fetch_leads = """  useEffect(() => { if (authed) fetchLeads() }, [authed, fetchLeads])

  // Kontrola mrtvých leadů - při každém načtení
  useEffect(() => {
    if (!authed || !leads.length) return
    const today = new Date().toISOString().slice(0,10)
    const mrtve = leads.filter(l => {
      if (l.stav?.includes('Uzavřeno')) return false
      if (!l.followup) return false
      const diff = (new Date(today) - new Date(l.followup)) / 86400000
      return diff >= 14
    })
    if (mrtve.length > 0 && !sessionStorage.getItem('mrtve_notified_' + today)) {
      sessionStorage.setItem('mrtve_notified_' + today, '1')
      sendSlack('⚠️ *Stagnující leady — ' + today + '*\\n' +
        mrtve.map(l => '• *' + l.firma + '* — ' + Math.round((new Date(today)-new Date(l.followup))/86400000) + ' dní bez aktivity').join('\\n') +
        '\\n\\n👉 https://crm-two-lemon.vercel.app')
    }
  }, [leads, authed])

  // Týdenní Slack report každý pátek
  useEffect(() => {
    if (!authed || !leads.length) return
    const day = new Date().getDay()
    const today = new Date().toISOString().slice(0,10)
    if (day === 5 && !sessionStorage.getItem('weekly_report_' + today)) {
      sessionStorage.setItem('weekly_report_' + today, '1')
      const won = leads.filter(l => l.stav === 'Uzavřeno — vyhráno')
      const active = leads.filter(l => !l.stav?.includes('Uzavřeno'))
      const rev = won.reduce((s,l) => s+(Number(l.cena)||0), 0)
      sendSlack('📊 *Týdenní CEO report — ' + today + '*\\n\\n' +
        '*Aktivní leady:* ' + active.length + '\\n' +
        '*Uzavřeno celkem:* ' + won.length + '\\n' +
        '*Revenue celkem:* ' + rev.toLocaleString('cs') + ' Kč\\n' +
        '\\n👉 https://crm-two-lemon.vercel.app')
    }
  }, [leads, authed])"""

if old_fetch_leads in content:
    content = content.replace(old_fetch_leads, new_fetch_leads)
    print("OK - mrtvé leady + týdenní report")
else:
    print("ERROR - useEffect nenalezen")

with open('src/App.js', 'w', encoding='utf-8') as f:
    f.write(content)

print(f"Hotovo — radku: {len(content.splitlines())}, export: {'export default function App' in content}")
