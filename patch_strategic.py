# -*- coding: utf-8 -*-
with open('src/App.js', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Nahradím PRODUKTY za objekt s popisky
old_produkty = "const PRODUKTY = ['Review NIS2','Check DORA','Program NIS2','Program DORA','Lorenc NIS2','Lorenc DORA','Kyber.testy']"

new_produkty = """const PRODUKTY = ['Review NIS2','Check DORA','Program NIS2','Program DORA','Lorenc NIS2','Lorenc DORA','Kyber.testy']

const PRODUKTY_INFO = {
  'Review NIS2': {
    popis: 'GAP analyza aktualniho stavu vuci pozadavkum NIS2. Vystup: zprava + akcni plan.',
    cena: '45 000 Kc (36 000 Kc se slevou)',
    typ: 'Jednorázový',
    barva: '#0F6E56', bg: '#E1F5EE'
  },
  'Check DORA': {
    popis: 'Hloubkova analyza pripravenosti vuci DORA a RTS. 7 klicovych oblasti. Vystup: zprava + akcni plan.',
    cena: '75 000 / 45 000 Kc (zjednoduseny system)',
    typ: 'Jednorázový',
    barva: '#185FA5', bg: '#E6F1FB'
  },
  'Program NIS2': {
    popis: 'All-inclusive outsourcing vsech zak. povinnych roli: CISO, risk manager, incident manager, pen. testy, skoleni, audit.',
    cena: 'Individuálně',
    typ: 'Průběžný',
    barva: '#534AB7', bg: '#EEEDFE'
  },
  'Program DORA': {
    popis: 'All-inclusive outsourcing DORA povinnosti: CISO, reporting CNB, ICT rizika, dodavatele, pen. testy, skoleni.',
    cena: 'Individuálně',
    typ: 'Průběžný',
    barva: '#534AB7', bg: '#EEEDFE'
  },
  'Lorenc NIS2': {
    popis: 'Mentoring bez plneho outsourcingu. Vy implementujete, my vedeme. Pravidelne konzultace, review dokumentace.',
    cena: 'Individuálně',
    typ: 'Průběžný',
    barva: '#854F0B', bg: '#FAEEDA'
  },
  'Lorenc DORA': {
    popis: 'Mentoring DORA implementace. Odborny dohled nad klicovymi oblastmi, review dokumentace, konzultace.',
    cena: 'Individuálně',
    typ: 'Průběžný',
    barva: '#854F0B', bg: '#FAEEDA'
  },
  'Kyber.testy': {
    popis: 'Penetracni testy a testy zranitelnosti dle TIBER-EU. Phishing simulace. Podrobna zprava s doporucenimy.',
    cena: 'Individuálně',
    typ: 'Jednorázový',
    barva: '#791F1F', bg: '#FCEBEB'
  },
  'Kyber.edukace': {
    popis: 'Skoleni zamestnancu, workshopy, simulace phishingu. Personalizovane programy dle potreb organizace.',
    cena: 'Individuálně',
    typ: 'Jednorázový',
    barva: '#3B6D11', bg: '#EAF3DE'
  },
}"""

if old_produkty in content:
    content = content.replace(old_produkty, new_produkty)
    print("OK - PRODUKTY_INFO pridano")
else:
    print("ERROR - PRODUKTY nenalezeno")

# 2. Přidám StrategickyPlan komponentu před hlavní App
strategic_plan = """
// ─── STRATEGICKÝ PLÁN ─────────────────────────────────────────────────────────
const PLAN_BLOKY = [
  {
    id: 'situace',
    nazev: 'Blok 1 — Kde jsme teď',
    cas: '0:00–0:15',
    barva: '#534AB7',
    uvod: 'Než začneme stavět strategii, potřebujeme si říct pravdu o výchozím stavu.',
    otazky: [
      'Existují nějací warm leads z minulosti? Kdo byl kontaktován, co se zaseklo a proč?',
      'Kolik obchodních konverzací proběhlo za posledních 6 měsíců a jaký byl výsledek?',
      'Kde je největší problém — generování leadů, konverze, nebo uzavření?',
      'Proč zatím nemáme platící klienty — vaše intuice?',
      'Co děláme špatně nebo vůbec neděláme?',
    ],
    mujNavrh: 'Na základě toho co jsem prostudoval vidím 3 hlavní mezery: (1) Chybí systematický outreach — spoléháme na inbound a agenturu. (2) Chybí jasný vstupní funnel — kdo kontaktuje koho, kdy a jak. (3) Chybí měřitelnost — nevíme co funguje protože neměříme nic.',
  },
  {
    id: 'zakaznik',
    nazev: 'Blok 2 — Zákazník a první klient do 30 dní',
    cas: '0:15–0:45',
    barva: '#0F6E56',
    uvod: 'Toto je srdce celého meetingu. Bez jasné odpovědi na kdo je náš ideální zákazník je vše ostatní jen teorie.',
    otazky: [
      'Máte kontakty mezi pojišťovacími makléři, účetními, právníky nebo IT dodavateli (multiplikátoři)?',
      'Jak reagují SME firmy v regulovaných odvětvích na outreach — jaká je typická první reakce?',
      'Máme zkušenosti nebo kontakty ve finančním sektoru (DORA)?',
      'Jaké kontakty z vaší strany mi můžete předat jako warm leads?',
      'Kdo technicky vede discovery call — já sám, nebo vždy s vámi?',
      'Kdy a jak zapojujete Radima do obchodního procesu?',
      'Co bylo nejčastější námitka proč klient nekoupil?',
    ],
    mujNavrh: 'Návrh 30denního plánu: Týden 1 — mapování kontaktů + CRM + discovery script. Týden 2 — 10 discovery callů + první outreach na multiplikátory. Týden 3-4 — follow-up, uzavření, první podpis.',
  },
  {
    id: 'infrastruktura',
    nazev: 'Blok 3 — Prodejní infrastruktura',
    cas: '0:45–1:10',
    barva: '#185FA5',
    uvod: 'Bez infrastruktury je každý obchod náhoda. Chci se dohodnout co stavíme teď a co může počkat.',
    otazky: [
      'Máte teď nějakou evidenci kontaktů nebo CRM? (navrhuju Airtable nebo HubSpot Free)',
      'Existuje nabídkový template nebo to tvoříme od nuly?',
      'Existuje onepager pro multiplikátory nebo to tvoříme?',
      'Jaký model partnerství preferujete — provize v %, nebo reciprocita?',
      'Máte kapacitu na webinář v měsíci 2-3? Kdo by ho vedl technicky?',
    ],
    mujNavrh: 'Fáze 1 (měsíc 1-2): CRM + discovery script + nabídkový template + onepager. Fáze 2 (měsíc 2-4): partnerský program + emailová sekvence + webinář. Fáze 3 (měsíc 4-6): case studies + LinkedIn Sales Navigator + event strategie.',
  },
  {
    id: 'role',
    nazev: 'Blok 4 — Moje role měsíc 1–6',
    cas: '1:10–1:35',
    barva: '#633806',
    uvod: 'KAM role dává smysl až když jsou klienti. Chci se dohodnout co přesně dělám a jak to měříme.',
    otazky: [
      'Jaký je průměrný čas mezi Review a rozhodnutím o Programu?',
      'Jaká je typická konverzní míra Review → Program z vaší zkušenosti nebo odhadu?',
      'Kdo vede upsell konverzaci — já jako KAM, nebo vždy vy?',
      'Jak poznáme že jsem připraven přejít do plné KAM role?',
    ],
    mujNavrh: 'Měsíc 1-2: průzkumník + první lovec (cíl: 5-8 callů/týden, 1 uzavřený obchod). Měsíc 2-4: stavitel systému + aktivní prodejce (cíl: 2-4 kontrakty/měsíc). Měsíc 4-6: přechod do KAM role při 5-8 aktivních klientech.',
  },
  {
    id: 'linkedin',
    nazev: 'Blok 5 — LinkedIn agentura',
    cas: '1:35–1:50',
    barva: '#185FA5',
    uvod: 'Platíme agenturu za organic reach ale nevíme jestli to funguje. Potřebujeme data a jasnou strategii.',
    otazky: [
      'Kolik má Talkey/riscare followerů na LinkedIn a jaký byl vývoj za 6 měsíců?',
      'Kolik leadů vygenerovala agentura za posledních 3-6 měsíců?',
      'Jaká je měsíční cena agentury?',
      'Jak jste spokojeni s agenturou dosud — intuitivně?',
      'Chceme agenturu přeorientovat nebo hledáme novou?',
      'Jsme ochotni investovat čas Radima a Aleše do osobního LinkedIn obsahu?',
    ],
    mujNavrh: 'Navrhuji: osobní profily (Radim + Aleš) místo firemní stránky, obsah jazykem CEO/CFO ne IT, příběhy z praxe místo edukace, měřitelný funnel Post→Engagement→DM→Meeting.',
  },
  {
    id: 'akcniplan',
    nazev: 'Blok 6 — Výstupy a akční plán',
    cas: '1:50–2:00',
    barva: '#27500A',
    uvod: 'Každý brainstorming bez konkrétních akcí je jen hezká konverzace. Každý odchází s jasným úkolem.',
    otazky: [
      'Co jsme dnes neřešili a měli bychom?',
      'Jaké je největší riziko celého plánu které vy vidíte a já jsem ho nepojmenoval?',
      'Co potřebuji od vás obou abych v měsíci 1 podával maximální výkon?',
    ],
    mujNavrh: 'Navrhované úkoly: Radim/Aleš předají warm leads do pátku. Karel nastaví CRM do pondělí. Karel připraví discovery script do středy. Karel připraví nabídkový template do středy. Karel+Aleš vyžádají data od agentury do pátku.',
  },
]

const StrategickyPlan = () => {
  const [odpovedi, setOdpovedi] = useState({})
  const [ulozeno, setUlozeno] = useState({})
  const [aktivniBlok, setAktivniBlok] = useState('situace')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const loadOdpovedi = async () => {
      const { data } = await supabase.from('strategic_answers').select('*')
      if (data) {
        const map = {}
        data.forEach(r => { map[r.klic] = r.odpoved })
        setOdpovedi(map)
        setUlozeno(map)
      }
    }
    loadOdpovedi()
  }, [])

  const saveOdpoved = async (klic, text) => {
    setSaving(true)
    const existing = ulozeno[klic]
    if (existing !== undefined) {
      await supabase.from('strategic_answers').update({ odpoved: text, updated_at: new Date().toISOString() }).eq('klic', klic)
    } else {
      await supabase.from('strategic_answers').insert([{ klic, odpoved: text }])
    }
    setUlozeno(prev => ({ ...prev, [klic]: text }))
    setSaving(false)
  }

  const blok = PLAN_BLOKY.find(b => b.id === aktivniBlok)
  const celkemOtazek = PLAN_BLOKY.reduce((s, b) => s + b.otazky.length, 0)
  const zodpovezeno = Object.keys(ulozeno).filter(k => ulozeno[k]?.trim()).length

  return (
    <div>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:20}}>
        <div>
          <div style={{fontSize:13,color:'#888'}}>Zodpovězeno {zodpovezeno} z {celkemOtazek} otázek · {saving ? 'Ukládám...' : 'Automatické ukládání'}</div>
        </div>
        <div style={{fontSize:12,color:'#aaa'}}>Odpovědi se ukládají pro všechny — Radim, Aleš i Karel</div>
      </div>

      <div style={{display:'flex',gap:8,marginBottom:20,flexWrap:'wrap'}}>
        {PLAN_BLOKY.map(b => {
          const zodp = b.otazky.filter((_, i) => ulozeno[b.id + '_' + i]?.trim()).length
          const done = zodp === b.otazky.length
          return (
            <button key={b.id} onClick={() => setAktivniBlok(b.id)} style={{
              padding:'6px 14px',borderRadius:8,fontSize:12,cursor:'pointer',fontFamily:'inherit',
              border:'0.5px solid ' + (aktivniBlok===b.id ? b.barva : '#e0e0e0'),
              background: aktivniBlok===b.id ? b.barva + '18' : done ? '#EAF3DE' : '#fff',
              color: aktivniBlok===b.id ? b.barva : done ? '#27500A' : '#888',
              fontWeight: aktivniBlok===b.id ? 500 : 400
            }}>
              {done ? '✓ ' : ''}{b.nazev.split(' — ')[0]} <span style={{fontSize:11,opacity:0.7}}>({zodp}/{b.otazky.length})</span>
            </button>
          )
        })}
      </div>

      {blok && (
        <div style={{background:'#fff',border:'0.5px solid #e8e8e8',borderRadius:12,overflow:'hidden'}}>
          <div style={{background:blok.barva,padding:'16px 24px'}}>
            <div style={{fontSize:11,color:'rgba(255,255,255,0.7)',marginBottom:4}}>{blok.cas}</div>
            <div style={{fontSize:18,fontWeight:500,color:'#fff'}}>{blok.nazev}</div>
          </div>

          <div style={{padding:'16px 24px',background:'#fafaf8',borderBottom:'0.5px solid #f0f0f0'}}>
            <div style={{fontSize:11,color:'#aaa',marginBottom:4,fontWeight:500,textTransform:'uppercase'}}>Můj vstupní návrh</div>
            <div style={{fontSize:13,color:'#555',lineHeight:1.6}}>{blok.mujNavrh}</div>
          </div>

          <div style={{padding:'20px 24px'}}>
            <div style={{fontSize:13,fontWeight:500,color:'#888',marginBottom:16}}>Otázky pro Radima a Aleše — klikněte a zapište odpovědi:</div>
            {blok.otazky.map((otazka, i) => {
              const klic = blok.id + '_' + i
              const val = odpovedi[klic] || ''
              const saved = ulozeno[klic]?.trim()
              return (
                <div key={i} style={{marginBottom:20,borderBottom:'0.5px solid #f5f5f3',paddingBottom:20}}>
                  <div style={{display:'flex',alignItems:'flex-start',gap:10,marginBottom:8}}>
                    <div style={{
                      width:22,height:22,borderRadius:'50%',flexShrink:0,marginTop:1,
                      background: saved ? '#EAF3DE' : blok.barva + '18',
                      display:'flex',alignItems:'center',justifyContent:'center',
                      fontSize:11,fontWeight:600,
                      color: saved ? '#27500A' : blok.barva
                    }}>{saved ? '✓' : (i+1)}</div>
                    <div style={{fontSize:13,color:'#333',lineHeight:1.5,fontWeight:500}}>{otazka}</div>
                  </div>
                  <div style={{paddingLeft:32}}>
                    <textarea
                      value={val}
                      onChange={e => setOdpovedi(prev => ({ ...prev, [klic]: e.target.value }))}
                      onBlur={e => { if(e.target.value !== ulozeno[klic]) saveOdpoved(klic, e.target.value) }}
                      placeholder="Zapište odpověď... (uloží se automaticky po kliknutí jinam)"
                      style={{
                        width:'100%',padding:'8px 12px',borderRadius:8,
                        border:'0.5px solid ' + (saved ? '#5DCAA5' : '#ddd'),
                        fontSize:13,fontFamily:'inherit',resize:'vertical',
                        minHeight:60,color:'#333',background: saved ? '#f8fffe' : '#fff'
                      }}
                    />
                    {saved && <div style={{fontSize:11,color:'#1D9E75',marginTop:4}}>Uloženo</div>}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

"""

# Přidám před hlavní App
old_app_marker = "// ─── HLAVNÍ APP ───────────────────────────────────────────────────────────────"
if old_app_marker in content:
    content = content.replace(old_app_marker, strategic_plan + old_app_marker)
    print("OK - StrategickyPlan přidán")
else:
    print("ERROR - marker hlavní App nenalezen")

# 3. Přidám do navigace
old_nav = """  const NAV = [
    { id:'kanban', icon:'⬛', label:'Kanban' },
    { id:'table', icon:'☰', label:'Tabulka' },
    { id:'followup', icon:'📅', label:'Follow-up dnes' },
    { id:'multiplikatori', icon:'🤝', label:'Multiplikátoři' },
    { id:'discovery', icon:'📞', label:'Discovery script' },
    { id:'email', icon:'✉️', label:'Email šablony' },
    { id:'dokumenty', icon:'📄', label:'Dokumenty' },
  ]"""

new_nav = """  const NAV = [
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

if old_nav in content:
    content = content.replace(old_nav, new_nav)
    print("OK - nav upraven")
else:
    print("ERROR - nav nenalezen")

# 4. Přidám page titles
old_titles = "{{kanban:'Pipeline',table:'Všechny leady',followup:'Follow-up dnes',multiplikatori:'Multiplikátoři',discovery:'Discovery call script',email:'Email šablony',dokumenty:'Dokumenty'}[tab]}"
new_titles = "{{kanban:'Pipeline',table:'Všechny leady',followup:'Follow-up dnes',multiplikatori:'Multiplikátoři',discovery:'Discovery call script',email:'Email šablony',dokumenty:'Dokumenty',strategie:'Strategický plán prodeje',produkty:'Portfolio produktů'}[tab]}"

if old_titles in content:
    content = content.replace(old_titles, new_titles)
    print("OK - titles upraven")
else:
    print("ERROR - titles nenalezeny")

# 5. Přidám sub titles
old_sub = "{{kanban:'Vizuální přehled obchodů podle fáze',table:'Kompletní seznam s filtry',followup:'Leady které čekají na tvůj kontakt',multiplikatori:'Partneři a zprostředkovatelé',discovery:'Průvodce pro 30minutový prodejní hovor',email:'Šablony připravené k odeslání',dokumenty:'Factsheets, nabídky a další PDF'}[tab]}"
new_sub = "{{kanban:'Vizuální přehled obchodů podle fáze',table:'Kompletní seznam s filtry',followup:'Leady které čekají na tvůj kontakt',multiplikatori:'Partneři a zprostředkovatelé',discovery:'Průvodce pro 30minutový prodejní hovor',email:'Šablony připravené k odeslání',dokumenty:'Factsheets, nabídky a další PDF',strategie:'Brainstorming pro čtvrteční meeting — odpovědi se ukládají pro všechny',produkty:'Přehled produktů riscare s popisky a cenami'}[tab]}"

if old_sub in content:
    content = content.replace(old_sub, new_sub)
    print("OK - sub upraven")
else:
    print("ERROR - sub nenalezen")

# 6. Přidám render
old_render = "{tab==='dokumenty' && <PdfDocuments />}"
new_render = """{tab==='dokumenty' && <PdfDocuments />}
        {tab==='strategie' && <StrategickyPlan />}
        {tab==='produkty' && <ProduktyPrehled />}"""

if old_render in content:
    content = content.replace(old_render, new_render)
    print("OK - render upraven")
else:
    print("ERROR - render nenalezen")

with open('src/App.js', 'w', encoding='utf-8') as f:
    f.write(content)

print(f"Radku: {len(content.splitlines())}, export default: {'export default function App' in content}")
