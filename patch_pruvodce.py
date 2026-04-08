# -*- coding: utf-8 -*-
with open('src/App.js', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Přidám Průvodce komponentu před PRODUKTY PŘEHLED
old_marker = "// ─── PRODUKTY PŘEHLED ────────────────────────────────────────────────────────"

pruvodce_code = """// ─── PRŮVODCE STRATEGIÍ ──────────────────────────────────────────────────────
const MESICE = [
  { id: 'm1', label: 'Měsíc 1', sub: 'Průzkumník a lovec', barva: '#534AB7', bg: '#EEEDFE' },
  { id: 'm2', label: 'Měsíc 2–3', sub: 'Stavitel systému', barva: '#0F6E56', bg: '#E1F5EE' },
  { id: 'm3', label: 'Měsíc 4–6', sub: 'Přechod do KAM', barva: '#185FA5', bg: '#E6F1FB' },
]

const KROKY = [
  // MĚSÍC 1
  {
    id: 'k1', mesic: 'm1', priorita: 'kritická',
    nazev: 'Zmapuj existující warm leads od Radima a Aleše',
    proc: 'Toto je nejrychlejší cesta k prvnímu klientovi. Neprocházej vlastní síť dokud nevyčerpáš to co už Talkey má rozjednáno.',
    jak: 'Domluv si s Radimem a Alešem 1h session. Pro každý kontakt zjisti: kdo to je, kde se zaseklo a proč, co by bylo potřeba pro restart konverzace.',
    cil: 'Seznam min. 10 warm leads s kontextem a navrhnutým next stepem.',
    dynamicke: { klic: 'situace_3', ano: 'Výborně — warm leads existují. Začni tady a ne vlastní sítí.', ne: 'Žádné warm leads — jdeš rovnou na vlastní síť a cold outreach.' },
    tyden: 1,
  },
  {
    id: 'k2', mesic: 'm1', priorita: 'kritická',
    nazev: 'Nastav CRM (riscare appka je připravena)',
    proc: 'Bez evidence kontaktů je každý obchod náhoda. CRM = paměť celého týmu.',
    jak: 'Appka je hotová. Přidej prvních 10 leadů. Nastav follow-up datumy. Domluv se s Radimem a Alešem kdo co přidává.',
    cil: 'Min. 10 leadů v pipeline, každý s follow-up datem a odpovědnou osobou.',
    tyden: 1,
  },
  {
    id: 'k3', mesic: 'm1', priorita: 'kritická',
    nazev: 'Prvních 10 discovery callů',
    proc: 'Každý call je informace. Nemusíš prodávat — potřebuješ pochopit trh a vyzkoušet si script.',
    jak: 'Použi discovery call script v appce. Timer je tam. Po každém callu zapište poznámky do CRM do 30 minut. Cíl: 5-8 callů za týden.',
    cil: '10 callů, 10 záznamů v CRM, min. 2-3 vážní zájemci.',
    dynamicke: { klic: 'zakaznik_1', ano: 'Máte multiplikátory — zařaď je do prvních callů jako prioritu.', ne: 'Žádní multiplikátoři zatím — fokus na přímé klienty.' },
    tyden: 2,
  },
  {
    id: 'k4', mesic: 'm1', priorita: 'vysoká',
    nazev: 'Audit LinkedIn agentury',
    proc: 'Platíte agenturu ale nevíte co dostáváte. Tohle musí být jasné v týdnu 1.',
    jak: 'Vyžádej od agentury: počet followerů (vývoj 6M), engagement rate, počet leadů za 3M, cena za meeting. Pokud nemají data — je to odpověď sama o sobě.',
    cil: 'Jasný report co agentura dodává vs. co stojí. Rozhodnutí: přeorientovat nebo vyměnit.',
    dynamicke: { klic: 'linkedin_2', ano: 'Agentura generuje leady — nech ji být a jen optimalizuj.', ne: 'Agentura negeneruje leady — přeorientuj nebo vyměň ihned.' },
    tyden: 1,
  },
  {
    id: 'k5', mesic: 'm1', priorita: 'vysoká',
    nazev: 'Připrav nabídkový template a onepager',
    proc: 'Bez připraveného dokumentu ztrácíš čas po každém callu a vypadáš neprofesionálně.',
    jak: 'Template: 1-2 strany, jasná cena, co klient dostane, termín zahájení. Onepager pro multiplikátory: jazyk CEO/CFO, bez IT žargonu. Oba dokumenty nahraj do sekce Dokumenty v appce.',
    cil: 'Hotový template a onepager, dostupné celému týmu v appce.',
    tyden: 2,
  },
  {
    id: 'k6', mesic: 'm1', priorita: 'střední',
    nazev: 'Identifikuj 5 multiplikátorů a navažu kontakt',
    proc: 'Jeden multiplikátor = přístup k 5-20 potenciálním klientům. Je to nejefektivnější kanál na škálování.',
    jak: 'Projdi svoji síť: pojišťovací makléři, účetní, daňoví poradci, právníci, IT dodavatelé. Pro každého připrav personalizovanou zprávu. Neříkej "chci tvoje klienty" — říkej "přinesu ti hodnotu navíc pro tvoje klienty".',
    cil: '5 multiplikátorů kontaktováno, min. 3 v aktivní konverzaci, přidáni do CRM jako segment Multiplikátor.',
    tyden: '3-4',
  },
  {
    id: 'k7', mesic: 'm1', priorita: 'kritická',
    nazev: 'Uzavři první obchod — riscare Review NIS2',
    proc: 'Jeden platící klient dokazuje že model funguje. Všechno ostatní je teorie.',
    jak: 'Z 10 discovery callů vyber 2-3 nejslibnější. Follow-up email do 24h. Osobní telefonát. Nabídka. Slevový kód 20% pokud váhají nad cenou (36 000 Kč místo 45 000 Kč).',
    cil: 'Min. 1 podepsaná objednávka a uhrazená záloha do konce měsíce 1.',
    tyden: '3-4',
  },
  // MĚSÍC 2-3
  {
    id: 'k8', mesic: 'm2', priorita: 'kritická',
    nazev: 'Rozjeď referral síť — formální dohoda s multiplikátory',
    proc: 'Multiplikátoři jsou nejlevnější a nejefektivnější zdroj klientů. Musí mít jasný důvod tě doporučovat.',
    jak: 'Pro každého aktivního multiplikátora: domluv schůzku, vysvětli co dostávají jejich klienti, domluv model spolupráce (provize % nebo reciprocita). Připrav pro ně onepager který mohou předat.',
    cil: 'Min. 3 formální partnerství, každý s jasným modelem spolupráce.',
    dynamicke: { klic: 'infrastruktura_3', ano: 'Máte model provizí — použij ho.', ne: 'Model provizí není — navrhni reciprocitu nebo flat fee.' },
    tyden: '5-6',
  },
  {
    id: 'k9', mesic: 'm2', priorita: 'vysoká',
    nazev: 'Nastav emailovou sekvenci pro warm leads',
    proc: '3 emaily, ne newsletter. Cíl je dostat lidi na discovery call.',
    jak: 'Email 1 (den 1): edukační — co NIS2/DORA znamená pro firmy jako oni. Email 2 (den 4): příběh z praxe — co jsme zjistili u podobné firmy. Email 3 (den 8): přímá nabídka Review. Šablony jsou v appce.',
    cil: 'Sekvence nastavená, první batch 20 kontaktů rozeslaný.',
    tyden: '5-6',
  },
  {
    id: 'k10', mesic: 'm2', priorita: 'vysoká',
    nazev: 'Spusť LinkedIn strategii — osobní profily Radima a Aleše',
    proc: 'Firemní stránky nemají dosah. Osobní profily prodávají. Lidé kupují od lidí.',
    jak: 'S Radimem a Alešem: 1-2 posty týdně každý. Formát: příběhy z praxe, ne edukace. Jazyk CEO/CFO. Reaguj na každý komentář do 2h. 5 postů připravených k publikaci je v appce.',
    cil: '10% nárůst followerů za měsíc, min. 3 inbound DM z LinkedIn.',
    dynamicke: { klic: 'linkedin_5', ano: 'Radim a Aleš jsou ochotni — super. Naplánujte si 30 min/týden na obsah.', ne: 'Radim a Aleš nemají čas — najdi ghostwritera nebo napiš obsah ty a oni ho jen schválí.' },
    tyden: '5-8',
  },
  {
    id: 'k11', mesic: 'm2', priorita: 'střední',
    nazev: 'Uzavři 2-4 nové obchody za měsíc',
    proc: 'Měsíc 2 je test jestli máš fungující prodejní systém nebo jen štěstí z měsíce 1.',
    jak: 'Pipeline management: každý lead má datum next follow-up. Každé pondělí ráno otevři Follow-up dnes v appce. Žádný lead nezůstane bez kontaktu déle než 7 dní.',
    cil: '2-4 uzavřené kontrakty, revenue 72 000 - 144 000 Kč bez DPH.',
    tyden: '5-8',
  },
  {
    id: 'k12', mesic: 'm2', priorita: 'střední',
    nazev: 'Připrav a spusť první webinář',
    proc: 'Webinář generuje warm leads ve velkém. 1 webinář = 50-200 registrací potenciálních klientů.',
    jak: 'Téma: "Zjisti za 45 minut jestli spadáš pod NIS2". Délka: 45 min + 15 min Q&A. Radim jako technický expert, ty jako moderátor. Registrace přes LinkedIn event nebo web. Nahrávku použij jako evergreen lead magnet.',
    cil: 'Min. 30 registrací, 10+ discovery callů z webináře.',
    dynamicke: { klic: 'infrastruktura_4', ano: 'Kapacita je — webinář v měsíci 2.', ne: 'Kapacita není — přesuň na měsíc 3.' },
    tyden: '7-8',
  },
  // MĚSÍC 4-6
  {
    id: 'k13', mesic: 'm3', priorita: 'kritická',
    nazev: 'Přejdi do KAM role — pečuj o existující klienty',
    proc: 'Upsell je 5x levnější než nový klient. Klient co má Review a vidí výsledky je připraven koupit Program.',
    jak: 'Pro každého klienta co dokončil Review: follow-up call 30 dní po výstupu. Projdi akční plán — co splnili, co ne. Nabídni Lorenc nebo Program jako přirozený next step.',
    cil: 'Min. 30% konverzní míra Review → Lorenc/Program.',
    dynamicke: { klic: 'role_0', ano: 'Průměrný čas Review→Program znáš — plánuj follow-upy podle toho.', ne: 'Čas neznáš — nastavuji follow-up na 30 dní po výstupu jako default.' },
    tyden: '13-16',
  },
  {
    id: 'k14', mesic: 'm3', priorita: 'vysoká',
    nazev: 'Vytvoř první case studies',
    proc: 'Nic neprodává lépe než reálný příběh reálného klienta. Social proof = nejlevnější marketing.',
    jak: 'Prvních 2-3 klientů co dokončili Review: požádej o souhlas s anonymizovanou case study. Formát: situace → co jsme zjistili → akční plán → výsledek. Nahraj do sekce Dokumenty v appce.',
    cil: '2-3 anonymizované case studies připravené k použití v prodeji.',
    tyden: '13-16',
  },
  {
    id: 'k15', mesic: 'm3', priorita: 'vysoká',
    nazev: 'Spusť LinkedIn Sales Navigator outbound',
    proc: 'Systematický outbound na CEO/CFO/IT ředitele regulovaných firem.',
    jak: 'Filtr: odvětví (energetika, zdravotnictví, IT...), velikost 50-500 zaměstnanců, seniorní role. Personalizovaná zpráva každému — ne template. Max 20 zpráv/den.',
    cil: '100 outbound zpráv/měsíc, 10% response rate, 5 discovery callů.',
    tyden: '13-20',
  },
  {
    id: 'k16', mesic: 'm3', priorita: 'střední',
    nazev: 'Event strategie — první přednáška nebo panel',
    proc: 'Pozicování Talkey jako experta buduje důvěru a generuje inbound leads pasivně.',
    jak: 'Cíl: 1 přednáška nebo panel za měsíc. Témata: NIS2 pro management, osobní odpovědnost ředitelů, DORA pro finanční sektor. Kontaktuj organizátory byznys eventů v Ostravě, Praze, Brně.',
    cil: '2-3 potvrzené přednášky, min. 5 nových leadů z každé.',
    tyden: '17-24',
  },
]

const PruvodceStrategii = () => {
  const [aktivniMesic, setAktivniMesic] = useState('m1')
  const [splneno, setSplneno] = useState({})
  const [odpovedi, setOdpovedi] = useState({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      const [splRes, odpRes] = await Promise.all([
        supabase.from('pruvodce_splneno').select('*'),
        supabase.from('strategic_answers').select('*')
      ])
      if (splRes.data) {
        const m = {}
        splRes.data.forEach(r => { m[r.krok_id] = r.splneno })
        setSplneno(m)
      }
      if (odpRes.data) {
        const m = {}
        odpRes.data.forEach(r => { m[r.klic] = r.odpoved })
        setOdpovedi(m)
      }
      setLoading(false)
    }
    load()
  }, [])

  const toggleSplneno = async (id) => {
    const nove = !splneno[id]
    setSplneno(prev => ({ ...prev, [id]: nove }))
    const existing = splneno[id] !== undefined
    if (existing) {
      await supabase.from('pruvodce_splneno').update({ splneno: nove }).eq('krok_id', id)
    } else {
      await supabase.from('pruvodce_splneno').insert([{ krok_id: id, splneno: nove }])
    }
  }

  const krokyMesice = (mid) => KROKY.filter(k => k.mesic === mid)
  const splnenoMesice = (mid) => krokyMesice(mid).filter(k => splneno[k.id]).length
  const celkemSplneno = KROKY.filter(k => splneno[k.id]).length

  const prioritaBarva = { 'kritická': '#A32D2D', 'vysoká': '#854F0B', 'střední': '#185FA5' }
  const prioritaBg = { 'kritická': '#FCEBEB', 'vysoká': '#FAEEDA', 'střední': '#E6F1FB' }

  if (loading) return <div style={{color:'#aaa',padding:'32px 0',textAlign:'center'}}>Načítám...</div>

  return (
    <div>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:20}}>
        <div style={{fontSize:13,color:'#888'}}>
          Splněno {celkemSplneno} z {KROKY.length} kroků
        </div>
        <div style={{background:'#f5f5f3',borderRadius:8,height:8,width:200,overflow:'hidden'}}>
          <div style={{background:'#1D9E75',height:'100%',width:(celkemSplneno/KROKY.length*100)+'%',transition:'width 0.3s',borderRadius:8}} />
        </div>
      </div>

      <div style={{display:'flex',gap:8,marginBottom:24}}>
        {MESICE.map(m => {
          const kroky = krokyMesice(m.id)
          const done = splnenoMesice(m.id)
          const active = aktivniMesic === m.id
          return (
            <button key={m.id} onClick={() => setAktivniMesic(m.id)} style={{
              flex:1,padding:'14px 16px',borderRadius:10,cursor:'pointer',fontFamily:'inherit',
              border:'0.5px solid ' + (active ? m.barva : '#e0e0e0'),
              background: active ? m.bg : '#fff',
              textAlign:'left'
            }}>
              <div style={{fontSize:12,color: active ? m.barva : '#aaa',fontWeight:500,marginBottom:2}}>{m.label}</div>
              <div style={{fontSize:14,fontWeight:500,color: active ? m.barva : '#333'}}>{m.sub}</div>
              <div style={{marginTop:8,background: active ? m.barva+'33' : '#f0f0ee',borderRadius:4,height:4,overflow:'hidden'}}>
                <div style={{background: active ? m.barva : '#ccc',height:'100%',width:(done/kroky.length*100)+'%',borderRadius:4}} />
              </div>
              <div style={{fontSize:11,color: active ? m.barva : '#aaa',marginTop:4}}>{done}/{kroky.length} kroků</div>
            </button>
          )
        })}
      </div>

      <div style={{display:'flex',flexDirection:'column',gap:12}}>
        {krokyMesice(aktivniMesic).map((krok, i) => {
          const done = splneno[krok.id]
          const mesic = MESICE.find(m => m.id === krok.mesic)
          const dynOdp = krok.dynamicke ? odpovedi[krok.dynamicke.klic]?.trim() : null
          const dynZprava = dynOdp
            ? (dynOdp.toLowerCase().includes('ne') || dynOdp.toLowerCase().includes('0') || dynOdp.toLowerCase().includes('žádn')
                ? krok.dynamicke.ne : krok.dynamicke.ano)
            : null

          return (
            <div key={krok.id} style={{
              background:'#fff',border:'0.5px solid ' + (done ? '#5DCAA5' : '#e8e8e8'),
              borderRadius:12,overflow:'hidden',
              opacity: done ? 0.85 : 1
            }}>
              <div style={{padding:'14px 20px',display:'flex',alignItems:'center',gap:12,borderBottom: done ? 'none' : '0.5px solid #f5f5f3'}}>
                <button onClick={() => toggleSplneno(krok.id)} style={{
                  width:28,height:28,borderRadius:'50%',border:'0.5px solid ' + (done ? '#1D9E75' : '#ddd'),
                  background: done ? '#1D9E75' : '#fff',color:'#fff',fontSize:14,cursor:'pointer',
                  display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0
                }}>{done ? '✓' : ''}</button>
                <div style={{flex:1}}>
                  <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:2}}>
                    <span style={{fontSize:11,padding:'2px 7px',borderRadius:10,
                      background:prioritaBg[krok.priorita],color:prioritaBarva[krok.priorita],fontWeight:500}}>
                      {krok.priorita}
                    </span>
                    <span style={{fontSize:11,color:'#aaa'}}>Týden {krok.tyden}</span>
                  </div>
                  <div style={{fontSize:14,fontWeight:500,color: done ? '#888' : '#1a1a1a',textDecoration: done ? 'line-through' : 'none'}}>
                    {krok.nazev}
                  </div>
                </div>
              </div>

              {!done && (
                <div style={{padding:'14px 20px 16px 60px'}}>
                  <div style={{marginBottom:10}}>
                    <div style={{fontSize:11,color:'#aaa',fontWeight:500,marginBottom:4,textTransform:'uppercase'}}>Proč</div>
                    <div style={{fontSize:13,color:'#555',lineHeight:1.6}}>{krok.proc}</div>
                  </div>
                  <div style={{marginBottom:10}}>
                    <div style={{fontSize:11,color:'#aaa',fontWeight:500,marginBottom:4,textTransform:'uppercase'}}>Jak na to</div>
                    <div style={{fontSize:13,color:'#333',lineHeight:1.6}}>{krok.jak}</div>
                  </div>
                  <div style={{background:'#f5f5f3',borderRadius:8,padding:'10px 14px',marginBottom: dynZprava ? 10 : 0}}>
                    <div style={{fontSize:11,color:'#aaa',fontWeight:500,marginBottom:3,textTransform:'uppercase'}}>Cíl</div>
                    <div style={{fontSize:13,color:'#333',fontWeight:500}}>{krok.cil}</div>
                  </div>
                  {dynZprava && (
                    <div style={{background: mesic.bg,border:'0.5px solid '+mesic.barva+'44',borderRadius:8,padding:'10px 14px',marginTop:10}}>
                      <div style={{fontSize:11,color:mesic.barva,fontWeight:500,marginBottom:3}}>Podle vašich odpovědí ze strategického plánu:</div>
                      <div style={{fontSize:13,color:mesic.barva}}>{dynZprava}</div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── PRODUKTY PŘEHLED ────────────────────────────────────────────────────────"""

if old_marker in content:
    content = content.replace(old_marker, pruvodce_code)
    print("OK - PruvodceStrategii pridano")
else:
    print("ERROR - marker nenalezen")

# 2. Přidám drag & drop sidebar
old_nav_render = """        {NAV.map(n => (
          <div key={n.id} className={`nav-item ${tab===n.id?'active':''}`} onClick={() => setTab(n.id)}>
            <span className="nav-icon">{n.icon}</span>
            <span>{n.label}</span>
            {n.id==='followup' && fuCount>0 && (
              <span style={{marginLeft:'auto',background:'#A32D2D',color:'#fff',borderRadius:10,padding:'1px 7px',fontSize:11}}>{fuCount}</span>
            )}
          </div>
        ))}"""

new_nav_render = """        {navOrder.map((nid, idx) => {
          const n = NAV.find(x => x.id === nid)
          if (!n) return null
          return (
            <div
              key={n.id}
              draggable
              onDragStart={e => { e.dataTransfer.effectAllowed='move'; setDragNavId(n.id) }}
              onDragOver={e => { e.preventDefault(); setDragNavOver(n.id) }}
              onDrop={e => {
                e.preventDefault()
                if (dragNavId && dragNavId !== n.id) {
                  const newOrder = [...navOrder]
                  const fromIdx = newOrder.indexOf(dragNavId)
                  const toIdx = newOrder.indexOf(n.id)
                  newOrder.splice(fromIdx, 1)
                  newOrder.splice(toIdx, 0, dragNavId)
                  setNavOrder(newOrder)
                  try { localStorage.setItem('riscare_nav_order', JSON.stringify(newOrder)) } catch(e) {}
                }
                setDragNavId(null); setDragNavOver(null)
              }}
              onDragEnd={() => { setDragNavId(null); setDragNavOver(null) }}
              className={`nav-item ${tab===n.id?'active':''}`}
              onClick={() => setTab(n.id)}
              style={{
                cursor:'grab',
                background: dragNavOver===n.id && dragNavId!==n.id ? '#f0eeff' : undefined,
                borderLeft: dragNavOver===n.id && dragNavId!==n.id ? '3px solid #534AB7' : undefined,
                opacity: dragNavId===n.id ? 0.5 : 1,
              }}
            >
              <span className="nav-icon">{n.icon}</span>
              <span>{n.label}</span>
              {n.id==='followup' && fuCount>0 && (
                <span style={{marginLeft:'auto',background:'#A32D2D',color:'#fff',borderRadius:10,padding:'1px 7px',fontSize:11}}>{fuCount}</span>
              )}
            </div>
          )
        })}"""

if old_nav_render in content:
    content = content.replace(old_nav_render, new_nav_render)
    print("OK - drag nav render")
else:
    print("ERROR - nav render nenalezen")

# 3. Přidám state pro drag nav a navOrder
old_state = "  const [tab, setTab] = useState('kanban')"
new_state = """  const [tab, setTab] = useState('kanban')
  const DEFAULT_NAV = ['kanban','table','followup','multiplikatori','discovery','email','dokumenty','strategie','produkty','pruvodce']
  const [navOrder, setNavOrder] = useState(() => {
    try {
      const saved = localStorage.getItem('riscare_nav_order')
      if (saved) {
        const parsed = JSON.parse(saved)
        const allIds = ['kanban','table','followup','multiplikatori','discovery','email','dokumenty','strategie','produkty','pruvodce']
        const valid = parsed.filter(id => allIds.includes(id))
        const missing = allIds.filter(id => !valid.includes(id))
        return [...valid, ...missing]
      }
    } catch(e) {}
    return ['kanban','table','followup','multiplikatori','discovery','email','dokumenty','strategie','produkty','pruvodce']
  })
  const [dragNavId, setDragNavId] = useState(null)
  const [dragNavOver, setDragNavOver] = useState(null)"""

if old_state in content:
    content = content.replace(old_state, new_state)
    print("OK - nav state pridano")
else:
    print("ERROR - nav state nenalezen")

# 4. Přidám průvodce do NAV
old_nav_def = """  const NAV = [
    { id:'kanban', icon:'⬛', label:'Kanban' },
    { id:'table', icon:'☰', label:'Tabulka' },
    { id:'followup', icon:'📅', label:'Follow-up dnes' },
    { id:'multiplikatori', icon:'🤝', label:'Multiplikátoři' },
    { id:'discovery', icon:'📞', label:'Discovery script' },
    { id:'email', icon:'✉️', label:'Email šablony' },
    { id:'dokumenty', icon:'📄', label:'Dokumenty' },
    { id:'strategie', icon:'🎯', label:'Strategický plán' },
    { id:'produkty', icon:'📦', label:'Produkty' },
  ]"""

new_nav_def = """  const NAV = [
    { id:'kanban', icon:'⬛', label:'Kanban' },
    { id:'table', icon:'☰', label:'Tabulka' },
    { id:'followup', icon:'📅', label:'Follow-up dnes' },
    { id:'multiplikatori', icon:'🤝', label:'Multiplikátoři' },
    { id:'discovery', icon:'📞', label:'Discovery script' },
    { id:'email', icon:'✉️', label:'Email šablony' },
    { id:'dokumenty', icon:'📄', label:'Dokumenty' },
    { id:'strategie', icon:'🎯', label:'Strategický plán' },
    { id:'produkty', icon:'📦', label:'Produkty' },
    { id:'pruvodce', icon:'🗺️', label:'Průvodce strategií' },
  ]"""

if old_nav_def in content:
    content = content.replace(old_nav_def, new_nav_def)
    print("OK - pruvodce do NAV")
else:
    print("ERROR - NAV def nenalezena")

# 5. Přidám titles a render
old_titles = "{{kanban:'Pipeline',table:'Všechny leady',followup:'Follow-up dnes',multiplikatori:'Multiplikátoři',discovery:'Discovery call script',email:'Email šablony',dokumenty:'Dokumenty',strategie:'Strategický plán prodeje',produkty:'Portfolio produktů'}[tab]}"
new_titles = "{{kanban:'Pipeline',table:'Všechny leady',followup:'Follow-up dnes',multiplikatori:'Multiplikátoři',discovery:'Discovery call script',email:'Email šablony',dokumenty:'Dokumenty',strategie:'Strategický plán prodeje',produkty:'Portfolio produktů',pruvodce:'Průvodce strategií'}[tab]}"

if old_titles in content:
    content = content.replace(old_titles, new_titles)
    print("OK - titles")
else:
    print("ERROR - titles")

old_sub = "{{kanban:'Vizuální přehled obchodů podle fáze',table:'Kompletní seznam s filtry',followup:'Leady které čekají na tvůj kontakt',multiplikatori:'Partneři a zprostředkovatelé',discovery:'Průvodce pro 30minutový prodejní hovor',email:'Šablony připravené k odeslání',dokumenty:'Factsheets, nabídky a další PDF',strategie:'Brainstorming pro čtvrteční meeting — odpovědi se ukládají pro všechny',produkty:'Přehled produktů riscare s popisky a cenami'}[tab]}"
new_sub = "{{kanban:'Vizuální přehled obchodů podle fáze',table:'Kompletní seznam s filtry',followup:'Leady které čekají na tvůj kontakt',multiplikatori:'Partneři a zprostředkovatelé',discovery:'Průvodce pro 30minutový prodejní hovor',email:'Šablony připravené k odeslání',dokumenty:'Factsheets, nabídky a další PDF',strategie:'Brainstorming pro čtvrteční meeting — odpovědi se ukládají pro všechny',produkty:'Přehled produktů riscare s popisky a cenami',pruvodce:'Krok za krokem — co dělat a kdy. Sdílené pro celý tým.'}[tab]}"

if old_sub in content:
    content = content.replace(old_sub, new_sub)
    print("OK - sub")
else:
    print("ERROR - sub")

old_render = "{tab==='strategie' && <StrategickyPlan />}"
new_render = """{tab==='strategie' && <StrategickyPlan />}
        {tab==='pruvodce' && <PruvodceStrategii />}"""

if old_render in content:
    content = content.replace(old_render, new_render)
    print("OK - render")
else:
    print("ERROR - render")

with open('src/App.js', 'w', encoding='utf-8') as f:
    f.write(content)

print(f"Hotovo — radku: {len(content.splitlines())}, export: {'export default function App' in content}")
