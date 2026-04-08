# -*- coding: utf-8 -*-
with open('src/App.js', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. AI Follow-up email generátor - přidám za AiCallBtn
old_ai_end = "// ─── DASHBOARD ───────────────────────────────────────────────────────────────"

ai_followup = """// ─── AI FOLLOW-UP EMAIL ──────────────────────────────────────────────────────
const AiEmailBtn = ({ lead }) => {
  const [loading, setLoading] = useState(false)
  const [email, setEmail] = useState(null)
  const [copied, setCopied] = useState(false)

  const generate = async () => {
    setLoading(true)
    setEmail(null)
    try {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 1000,
          messages: [{
            role: 'user',
            content: `Napiš personalizovaný follow-up email po discovery callu. Email musí být v češtině, neformální, přirozený — ne robotický. Max 150 slov.

Firma: ${lead.firma}
Kontakt: ${lead.osoba || 'kolego'}, role: ${lead.role || ''}
Produkt: ${lead.produkt || 'riscare Review NIS2'}
Cena: ${lead.cena ? lead.cena.toLocaleString('cs') + ' Kč' : '36 000 Kč'}
Stav: ${lead.stav || ''}
Poznámky z callu: ${lead.poznamky || 'žádné'}
Hlavní námitka: ${lead.namitka || 'žádná'}

Struktura emailu:
- Předmět (1 řádek)
- Prázdný řádek
- Tělo emailu (přirozené, personalizované podle poznámek)
- Podpis: Karel Petros | Talkey a.s. | riscare

Začni přímo předmětem bez jakéhokoliv úvodu.`
          }]
        })
      })
      const data = await response.json()
      const text = data.content?.find(c=>c.type==='text')?.text || 'Chyba při generování'
      setEmail(text)
    } catch(e) {
      setEmail('Chyba: ' + e.message)
    }
    setLoading(false)
  }

  const copy = () => {
    navigator.clipboard.writeText(email)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div style={{marginTop:8}}>
      <button className="btn" style={{color:'#854F0B',borderColor:'#854F0B',background:email?'#FAEEDA':'#fff'}}
        onClick={generate} disabled={loading}>
        {loading ? '⏳ Generuji...' : '✉️ AI follow-up email'}
      </button>
      {email && (
        <div style={{marginTop:12,padding:'14px 16px',background:'#FAEEDA',borderRadius:10,border:'0.5px solid #FAC775'}}>
          <div style={{fontSize:11,color:'#854F0B',fontWeight:600,marginBottom:8,textTransform:'uppercase'}}>Vygenerovaný follow-up email</div>
          <div style={{fontSize:13,color:'#333',lineHeight:1.7,whiteSpace:'pre-wrap',fontFamily:'inherit'}}>{email}</div>
          <div style={{display:'flex',gap:8,marginTop:12}}>
            <button onClick={copy} style={{padding:'6px 14px',borderRadius:8,border:'0.5px solid #854F0B',background:'#fff',color:'#854F0B',fontSize:12,cursor:'pointer',fontFamily:'inherit',fontWeight:500}}>
              {copied ? '✓ Zkopírováno!' : 'Kopírovat'}
            </button>
            <button onClick={generate} style={{padding:'6px 14px',borderRadius:8,border:'0.5px solid #ddd',background:'#fff',color:'#888',fontSize:12,cursor:'pointer',fontFamily:'inherit'}}>
              Přegenerovat
            </button>
            <button onClick={()=>setEmail(null)} style={{padding:'6px 14px',borderRadius:8,border:'none',background:'none',color:'#bbb',fontSize:12,cursor:'pointer',fontFamily:'inherit'}}>
              Zavřít
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── DASHBOARD ───────────────────────────────────────────────────────────────"""

if old_ai_end in content:
    content = content.replace(old_ai_end, ai_followup)
    print("OK - AiEmailBtn přidán")
else:
    print("ERROR - marker nenalezen")

# Přidám AiEmailBtn do LeadDetail vedle AiCallBtn
old_ai_call_btn = "            <AiCallBtn lead={lead} />"
new_ai_call_btn = """            <AiCallBtn lead={lead} />
            <AiEmailBtn lead={lead} />"""
if old_ai_call_btn in content:
    content = content.replace(old_ai_call_btn, new_ai_call_btn)
    print("OK - AiEmailBtn v LeadDetail")
else:
    print("ERROR - AiCallBtn nenalezen")

# 2. Export do CSV/Excel
old_toolbar_end = "        <button className=\"btn accent\" onClick={() => setModal('new')}>+ Nový lead</button>"
new_toolbar_end = """        <button className="btn accent" onClick={() => setModal('new')}>+ Nový lead</button>
        <button className="btn" onClick={() => {
          const header = ['Firma','Osoba','Role','Segment','Email','Telefon','Odvětví','Zdroj','Produkt','Stav','Cena','Pravděpodobnost','Vede','Follow-up','Poznámky']
          const rows = filtered.map(l => [
            l.firma, l.osoba, l.role, l.segment, l.email, l.telefon,
            l.odvetvi, l.zdroj, l.produkt, l.stav, l.cena, l.prob,
            l.vede, l.followup, (l.poznamky||'').replace(/\n/g,' ')
          ])
          const csv = [header, ...rows].map(r => r.map(v => '"'+(v||'')+'"').join(',')).join('\n')
          const blob = new Blob(['\uFEFF'+csv], {type:'text/csv;charset=utf-8'})
          const url = URL.createObjectURL(blob)
          const a = document.createElement('a')
          a.href = url; a.download = 'riscare-pipeline-'+new Date().toISOString().slice(0,10)+'.csv'
          a.click(); URL.revokeObjectURL(url)
        }}>⬇ Export CSV</button>"""

if old_toolbar_end in content:
    content = content.replace(old_toolbar_end, new_toolbar_end)
    print("OK - Export CSV přidán")
else:
    print("ERROR - toolbar end nenalezen")

# 3. Globální vyhledávání - přidám GlobalSearch komponentu
old_global = "// ─── AI ASISTENT PRO CALL ────────────────────────────────────────────────────"
new_global = """// ─── GLOBÁLNÍ VYHLEDÁVÁNÍ ────────────────────────────────────────────────────
const GlobalSearch = ({ leads, onOpen }) => {
  const [q, setQ] = useState('')
  const [open, setOpen] = useState(false)

  const results = q.length > 1 ? leads.filter(l =>
    l.firma?.toLowerCase().includes(q.toLowerCase()) ||
    l.osoba?.toLowerCase().includes(q.toLowerCase()) ||
    l.email?.toLowerCase().includes(q.toLowerCase()) ||
    l.poznamky?.toLowerCase().includes(q.toLowerCase())
  ).slice(0, 8) : []

  return (
    <div style={{position:'relative',marginBottom:16}}>
      <div style={{position:'relative'}}>
        <input
          value={q}
          onChange={e => { setQ(e.target.value); setOpen(true) }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 200)}
          placeholder="🔍 Hledat leady, firmy, emaily..."
          style={{
            width:'100%', height:40, padding:'0 14px',
            border:'0.5px solid ' + (q ? '#534AB7' : '#ddd'),
            borderRadius:10, fontSize:14, fontFamily:'inherit',
            background:'#fff', color:'#1a1a1a',
            outline:'none', transition:'border-color 0.15s'
          }}
        />
        {q && (
          <button onClick={() => { setQ(''); setOpen(false) }}
            style={{position:'absolute',right:12,top:'50%',transform:'translateY(-50%)',background:'none',border:'none',color:'#aaa',cursor:'pointer',fontSize:16}}>
            ×
          </button>
        )}
      </div>
      {open && results.length > 0 && (
        <div style={{
          position:'absolute', top:'100%', left:0, right:0, zIndex:100,
          background:'#fff', border:'0.5px solid #e0e0e0', borderRadius:10,
          boxShadow:'0 8px 24px rgba(0,0,0,0.1)', marginTop:4, overflow:'hidden'
        }}>
          {results.map(l => (
            <div key={l.id} onClick={() => { onOpen(l); setQ(''); setOpen(false) }}
              style={{
                padding:'10px 16px', cursor:'pointer', borderBottom:'0.5px solid #f5f5f3',
                display:'flex', alignItems:'center', gap:12
              }}
              onMouseEnter={e => e.currentTarget.style.background='#fafaf8'}
              onMouseLeave={e => e.currentTarget.style.background='#fff'}
            >
              <div style={{width:32,height:32,borderRadius:8,background:'#EEEDFE',display:'flex',alignItems:'center',justifyContent:'center',fontSize:12,fontWeight:600,color:'#534AB7',flexShrink:0}}>
                {l.firma.slice(0,2).toUpperCase()}
              </div>
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontSize:13,fontWeight:500,color:'#1a1a1a'}}>{l.firma}</div>
                <div style={{fontSize:11,color:'#aaa',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>
                  {l.osoba} · {l.stav} · {l.produkt}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      {open && q.length > 1 && results.length === 0 && (
        <div style={{
          position:'absolute', top:'100%', left:0, right:0, zIndex:100,
          background:'#fff', border:'0.5px solid #e0e0e0', borderRadius:10,
          padding:'16px', textAlign:'center', color:'#aaa', fontSize:13,
          boxShadow:'0 8px 24px rgba(0,0,0,0.1)', marginTop:4
        }}>Žádné výsledky pro "{q}"</div>
      )}
    </div>
  )
}

// ─── AI ASISTENT PRO CALL ────────────────────────────────────────────────────"""

if old_global in content:
    content = content.replace(old_global, new_global)
    print("OK - GlobalSearch přidán")
else:
    print("ERROR - AI marker nenalezen")

# Přidám GlobalSearch do hlavního renderu - nad metriky
old_metrics_render = """        {['kanban','table','followup','multiplikatori'].includes(tab) && (
          <>
            <div className="metrics">"""
new_metrics_render = """        {['kanban','table','followup','multiplikatori'].includes(tab) && (
          <>
            <GlobalSearch leads={leads} onOpen={setDetail} />
            <div className="metrics">"""

if old_metrics_render in content:
    content = content.replace(old_metrics_render, new_metrics_render)
    print("OK - GlobalSearch v renderu")
else:
    print("ERROR - metrics render nenalezen")

# 4. Štítky na leadech - přidám do EMPTY_LEAD a do formuláře
old_empty = "const EMPTY_LEAD = {\n  firma:'', osoba:'', role:'CEO', segment:'Přímý klient',\n  email:'', telefon:'', odvetvi:'Energetika', zdroj:'Vlastní síť',\n  produkt:'Review NIS2', stav:'Lead', cena:'', prob:'Nízká (0–30 %)',\n  vede:'Karel', followup:'', d1:'', namitka:'', poznamky:''\n}"
new_empty = "const EMPTY_LEAD = {\n  firma:'', osoba:'', role:'CEO', segment:'Přímý klient',\n  email:'', telefon:'', odvetvi:'Energetika', zdroj:'Vlastní síť',\n  produkt:'Review NIS2', stav:'Lead', cena:'', prob:'Nízká (0–30 %)',\n  vede:'Karel', followup:'', d1:'', namitka:'', poznamky:'', stitky:''\n}\n\nconst STITKY_OPTIONS = ['VIP','Urgentní','Čeká na smlouvu','Warm','Cold','Referral','Enterprise','Priorita']\nconst STITKY_COLORS = {'VIP':'#534AB7','Urgentní':'#A32D2D','Čeká na smlouvu':'#854F0B','Warm':'#0F6E56','Cold':'#185FA5','Referral':'#27500A','Enterprise':'#633806','Priorita':'#791F1F'}"
if old_empty in content:
    content = content.replace(old_empty, new_empty)
    print("OK - štítky do EMPTY_LEAD")
else:
    print("ERROR - EMPTY_LEAD nenalezen")

# Přidám štítky do LeadModal formuláře - za poznámky
old_poznamky_field = "          <div className=\"form-row\"><label>Poznámky z callu</label>\n            <textarea {...fi('poznamky')} placeholder=\"Co říkali, co bolí, co rozhoduje...\" />\n          </div>"
new_poznamky_field = """          <div className="form-row"><label>Poznámky z callu</label>
            <textarea {...fi('poznamky')} placeholder="Co říkali, co bolí, co rozhoduje..." />
          </div>
          <div className="form-row"><label>Štítky</label>
            <div style={{display:'flex',gap:6,flexWrap:'wrap',marginTop:4}}>
              {STITKY_OPTIONS.map(s => {
                const active = (form.stitky||'').split(',').filter(Boolean).includes(s)
                const color = STITKY_COLORS[s] || '#534AB7'
                return (
                  <button key={s} type="button" onClick={() => {
                    const curr = (form.stitky||'').split(',').filter(Boolean)
                    const nove = active ? curr.filter(x=>x!==s) : [...curr,s]
                    set('stitky', nove.join(','))
                  }} style={{
                    padding:'3px 10px',borderRadius:10,fontSize:12,cursor:'pointer',
                    border:'0.5px solid '+(active?color:'#e0e0e0'),
                    background:active?color+'18':'#fff',
                    color:active?color:'#aaa',fontFamily:'inherit',fontWeight:active?500:400
                  }}>{s}</button>
                )
              })}
            </div>
          </div>"""

if old_poznamky_field in content:
    content = content.replace(old_poznamky_field, new_poznamky_field)
    print("OK - štítky do formuláře")
else:
    print("ERROR - poznamky field nenalezen")

# Přidám zobrazení štítků na Kanban kartě
old_card_tags = """                  <div className="card-tags">
                    <ProdTag produkt={l.produkt} />
                    <ProbTag prob={l.prob} />
                  </div>"""
new_card_tags = """                  <div className="card-tags">
                    <ProdTag produkt={l.produkt} />
                    <ProbTag prob={l.prob} />
                    {(l.stitky||'').split(',').filter(Boolean).map(s => (
                      <span key={s} className="tag" style={{background:(STITKY_COLORS[s]||'#534AB7')+'18',color:STITKY_COLORS[s]||'#534AB7',fontSize:10}}>{s}</span>
                    ))}
                  </div>"""

if old_card_tags in content:
    content = content.replace(old_card_tags, new_card_tags)
    print("OK - štítky na kartě")
else:
    print("ERROR - card tags nenalezeny")

# 5. PWA - přidám manifest do public/index.html
with open('src/App.js', 'w', encoding='utf-8') as f:
    f.write(content)

print(f"Hotovo — radku: {len(content.splitlines())}, export: {'export default function App' in content}")
