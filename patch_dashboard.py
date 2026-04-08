# -*- coding: utf-8 -*-
with open('src/App.js', 'r', encoding='utf-8') as f:
    content = f.read()

# Přidám Dashboard komponentu před hlavní App
old_marker = "// ─── ÚKOLY ───────────────────────────────────────────────────────────────────"

dashboard_code = """// ─── DASHBOARD ───────────────────────────────────────────────────────────────
const Dashboard = ({ leads, onOpen }) => {
  const [widgets, setWidgets] = useState(() => {
    try {
      const s = localStorage.getItem('dashboard_widgets')
      if (s) return JSON.parse(s)
    } catch(e) {}
    return ['metriky','followup','pipeline','koláč','mrtvé','aktivity']
  })
  const [editMode, setEditMode] = useState(false)
  const [dragW, setDragW] = useState(null)
  const [dragWOver, setDragWOver] = useState(null)

  const today = new Date().toISOString().slice(0,10)
  const active = leads.filter(l => !l.stav?.includes('Uzavřeno'))
  const won = leads.filter(l => l.stav === 'Uzavřeno — vyhráno')
  const revenue = won.reduce((s,l) => s+(Number(l.cena)||0), 0)
  const fuDnes = active.filter(l => l.followup && l.followup <= today)
  const mrtvé = active.filter(l => {
    if (!l.followup) return false
    const diff = (new Date(today) - new Date(l.followup)) / 86400000
    return diff >= 14
  })

  const stavCounts = {}
  STAVS.slice(0,7).forEach(s => { stavCounts[s] = leads.filter(l=>l.stav===s).length })

  const segCounts = {}
  leads.forEach(l => { if(l.segment) segCounts[l.segment] = (segCounts[l.segment]||0)+1 })

  const prodCounts = {}
  leads.forEach(l => { if(l.produkt && l.produkt!=='Neznámý') prodCounts[l.produkt] = (prodCounts[l.produkt]||0)+1 })

  const saveWidgets = (w) => {
    setWidgets(w)
    try { localStorage.setItem('dashboard_widgets', JSON.stringify(w)) } catch(e) {}
  }

  const toggleWidget = (id) => {
    const w = widgets.includes(id) ? widgets.filter(x=>x!==id) : [...widgets, id]
    saveWidgets(w)
  }

  const handleDragW = (e, id) => { setDragW(id); e.dataTransfer.effectAllowed='move' }
  const handleDropW = (e, id) => {
    e.preventDefault()
    if (!dragW || dragW===id) { setDragW(null); setDragWOver(null); return }
    const w = [...widgets]
    const fi = w.indexOf(dragW), ti = w.indexOf(id)
    w.splice(fi,1); w.splice(ti,0,dragW)
    saveWidgets(w)
    setDragW(null); setDragWOver(null)
  }

  const aC = { Karel:'#534AB7', Radim:'#0F6E56', Aleš:'#854F0B' }

  // Koláčový graf SVG
  const PieChart = ({ data, title }) => {
    const total = Object.values(data).reduce((s,v)=>s+v,0)
    if (!total) return <div style={{color:'#ccc',fontSize:13,textAlign:'center',padding:'20px 0'}}>Žádná data</div>
    const colors = ['#534AB7','#0F6E56','#185FA5','#854F0B','#A32D2D','#27500A','#633806']
    let angle = 0
    const slices = Object.entries(data).map(([k,v],i) => {
      const pct = v/total
      const startAngle = angle
      angle += pct * 360
      const start = polarToXY(50,50,40,startAngle)
      const end = polarToXY(50,50,40,angle)
      const large = pct > 0.5 ? 1 : 0
      const path = `M50,50 L${start.x},${start.y} A40,40 0 ${large},1 ${end.x},${end.y} Z`
      return { k, v, pct, path, color: colors[i%colors.length] }
    })
    return (
      <div>
        <svg viewBox="0 0 100 100" style={{width:'100%',maxWidth:160,display:'block',margin:'0 auto'}}>
          {slices.map((s,i) => (
            <path key={i} d={s.path} fill={s.color} stroke="#fff" strokeWidth="1" />
          ))}
          <circle cx="50" cy="50" r="20" fill="#fff" />
          <text x="50" y="53" textAnchor="middle" fontSize="8" fill="#333" fontWeight="bold">{total}</text>
        </svg>
        <div style={{display:'flex',flexDirection:'column',gap:4,marginTop:12}}>
          {slices.map((s,i) => (
            <div key={i} style={{display:'flex',alignItems:'center',gap:8,fontSize:12}}>
              <div style={{width:10,height:10,borderRadius:2,background:s.color,flexShrink:0}} />
              <span style={{color:'#555',flex:1,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{s.k}</span>
              <span style={{color:'#888',fontWeight:500}}>{s.v}</span>
            </div>
          ))}
        </div>
      </div>
    )
  }

  const polarToXY = (cx,cy,r,deg) => {
    const rad = (deg-90)*Math.PI/180
    return { x: cx+r*Math.cos(rad), y: cy+r*Math.sin(rad) }
  }

  const BarChart = ({ data }) => {
    const max = Math.max(...Object.values(data), 1)
    return (
      <div style={{display:'flex',flexDirection:'column',gap:6}}>
        {Object.entries(data).filter(([,v])=>v>0).map(([k,v],i) => (
          <div key={k}>
            <div style={{display:'flex',justifyContent:'space-between',fontSize:11,color:'#888',marginBottom:2}}>
              <span style={{overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',maxWidth:'75%'}}>{k}</span>
              <span style={{fontWeight:500,color:'#333'}}>{v}</span>
            </div>
            <div style={{height:6,background:'#f0f0ee',borderRadius:3,overflow:'hidden'}}>
              <div style={{height:'100%',width:(v/max*100)+'%',background:'#534AB7',borderRadius:3,transition:'width 0.5s'}} />
            </div>
          </div>
        ))}
      </div>
    )
  }

  const WIDGET_DEF = {
    metriky: {
      label: 'Klíčové metriky', icon: '📊',
      render: () => (
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
          {[
            {l:'Aktivní leady',v:active.length,sub:'v pipeline',c:'#534AB7'},
            {l:'Uzavřeno',v:won.length,sub:'vyhráno',c:'#27500A'},
            {l:'Revenue',v:revenue.toLocaleString('cs')+' Kč',sub:'celkem',c:'#185FA5'},
            {l:'Konverzní míra',v:leads.length?Math.round(won.length/leads.length*100)+'%':'0%',sub:'win rate',c:'#854F0B'},
          ].map(m => (
            <div key={m.l} style={{background:'#f8f8f6',borderRadius:10,padding:'12px 14px'}}>
              <div style={{fontSize:11,color:'#aaa',marginBottom:4}}>{m.l}</div>
              <div style={{fontSize:20,fontWeight:600,color:m.c}}>{m.v}</div>
              <div style={{fontSize:11,color:'#bbb',marginTop:2}}>{m.sub}</div>
            </div>
          ))}
        </div>
      )
    },
    followup: {
      label: 'Follow-up dnes', icon: '📅',
      render: () => (
        <div>
          {!fuDnes.length && <div style={{color:'#ccc',fontSize:13,textAlign:'center',padding:'16px 0'}}>Žádný follow-up dnes 🎉</div>}
          {fuDnes.slice(0,5).map(l => (
            <div key={l.id} onClick={()=>onOpen(l)} style={{
              display:'flex',alignItems:'center',gap:10,padding:'8px 0',
              borderBottom:'0.5px solid #f5f5f3',cursor:'pointer'
            }}>
              <div style={{width:8,height:8,borderRadius:'50%',background:'#A32D2D',flexShrink:0}} />
              <div style={{flex:1}}>
                <div style={{fontSize:13,fontWeight:500}}>{l.firma}</div>
                <div style={{fontSize:11,color:'#aaa'}}>{l.osoba} · {l.produkt}</div>
              </div>
              <span style={{fontSize:11,color:'#A32D2D',fontWeight:500}}>{l.followup}</span>
            </div>
          ))}
          {fuDnes.length>5 && <div style={{fontSize:12,color:'#aaa',marginTop:8,textAlign:'center'}}>+{fuDnes.length-5} dalších</div>}
        </div>
      )
    },
    pipeline: {
      label: 'Pipeline podle fáze', icon: '🔄',
      render: () => <BarChart data={stavCounts} />
    },
    'koláč': {
      label: 'Produkty — koláčový graf', icon: '🥧',
      render: () => <PieChart data={prodCounts} title="Produkty" />
    },
    'koláč2': {
      label: 'Segmenty — koláčový graf', icon: '🥧',
      render: () => <PieChart data={segCounts} title="Segmenty" />
    },
    mrtvé: {
      label: 'Stagnující leady (14+ dní)', icon: '⚠️',
      render: () => (
        <div>
          {!mrtvé.length && <div style={{color:'#ccc',fontSize:13,textAlign:'center',padding:'16px 0'}}>Žádné stagnující leady 💪</div>}
          {mrtvé.map(l => {
            const dni = Math.round((new Date(today)-new Date(l.followup))/86400000)
            return (
              <div key={l.id} onClick={()=>onOpen(l)} style={{
                display:'flex',alignItems:'center',gap:10,padding:'8px 0',
                borderBottom:'0.5px solid #f5f5f3',cursor:'pointer'
              }}>
                <div style={{width:8,height:8,borderRadius:'50%',background:'#854F0B',flexShrink:0}} />
                <div style={{flex:1}}>
                  <div style={{fontSize:13,fontWeight:500}}>{l.firma}</div>
                  <div style={{fontSize:11,color:'#aaa'}}>{l.stav}</div>
                </div>
                <span style={{fontSize:11,color:'#854F0B',fontWeight:500}}>{dni} dní</span>
              </div>
            )
          })}
        </div>
      )
    },
    aktivity: {
      label: 'Aktivita týmu', icon: '👥',
      render: () => {
        const vedeCounts = {}
        active.forEach(l => { if(l.vede) vedeCounts[l.vede]=(vedeCounts[l.vede]||0)+1 })
        return (
          <div style={{display:'flex',flexDirection:'column',gap:10}}>
            {Object.entries(vedeCounts).map(([k,v]) => (
              <div key={k} style={{display:'flex',alignItems:'center',gap:10}}>
                <div style={{width:32,height:32,borderRadius:'50%',background:(aC[k]||'#888')+'22',display:'flex',alignItems:'center',justifyContent:'center',fontSize:13,fontWeight:600,color:aC[k]||'#666'}}>{k.slice(0,1)}</div>
                <div style={{flex:1}}>
                  <div style={{fontSize:13,fontWeight:500}}>{k}</div>
                  <div style={{fontSize:11,color:'#aaa'}}>{v} aktivních leadů</div>
                </div>
              </div>
            ))}
            {!Object.keys(vedeCounts).length && <div style={{color:'#ccc',fontSize:13,textAlign:'center',padding:'8px 0'}}>Žádná data</div>}
          </div>
        )
      }
    },
    countdown: {
      label: 'Countdown k prvnímu klientovi', icon: '🎯',
      render: () => {
        const startDate = new Date('2026-04-08')
        const targetDate = new Date('2026-05-08')
        const now = new Date()
        const dniZbývá = Math.max(0, Math.round((targetDate-now)/86400000))
        const progress = Math.min(100, Math.round((now-startDate)/(targetDate-startDate)*100))
        const mameKlienta = won.length > 0
        return (
          <div style={{textAlign:'center',padding:'8px 0'}}>
            {mameKlienta ? (
              <div>
                <div style={{fontSize:40,marginBottom:8}}>🏆</div>
                <div style={{fontSize:16,fontWeight:600,color:'#27500A'}}>Máme prvního klienta!</div>
                <div style={{fontSize:13,color:'#888',marginTop:4}}>{won[0]?.firma}</div>
              </div>
            ) : (
              <div>
                <div style={{fontSize:48,fontWeight:700,color:'#534AB7',lineHeight:1}}>{dniZbývá}</div>
                <div style={{fontSize:13,color:'#888',marginTop:4}}>dní do cíle — první klient</div>
                <div style={{margin:'16px 0 4px',height:8,background:'#f0f0ee',borderRadius:4,overflow:'hidden'}}>
                  <div style={{height:'100%',width:progress+'%',background:'linear-gradient(90deg,#534AB7,#1D9E75)',borderRadius:4,transition:'width 0.5s'}} />
                </div>
                <div style={{fontSize:11,color:'#aaa'}}>{progress}% cesty uběhlo</div>
              </div>
            )}
          </div>
        )
      }
    },
  }

  const ALL_WIDGETS = Object.keys(WIDGET_DEF)

  return (
    <div>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:20}}>
        <div style={{fontSize:13,color:'#888'}}>
          {new Date().toLocaleDateString('cs-CZ',{weekday:'long',day:'numeric',month:'long'})}
        </div>
        <button onClick={()=>setEditMode(!editMode)} style={{
          padding:'6px 14px',borderRadius:8,fontSize:13,cursor:'pointer',fontFamily:'inherit',
          border:'0.5px solid '+(editMode?'#534AB7':'#e0e0e0'),
          background:editMode?'#EEEDFE':'#fff',
          color:editMode?'#534AB7':'#888'
        }}>{editMode?'✓ Hotovo':'✎ Upravit'}</button>
      </div>

      {editMode && (
        <div style={{background:'#f8f8f6',borderRadius:12,padding:'14px 16px',marginBottom:20}}>
          <div style={{fontSize:12,color:'#888',marginBottom:10,fontWeight:500}}>Widgety — zaškrtni co chceš vidět, přesuň pro změnu pořadí</div>
          <div style={{display:'flex',gap:6,flexWrap:'wrap'}}>
            {ALL_WIDGETS.map(id => (
              <button key={id} onClick={()=>toggleWidget(id)} style={{
                padding:'5px 12px',borderRadius:8,fontSize:12,cursor:'pointer',fontFamily:'inherit',
                border:'0.5px solid '+(widgets.includes(id)?'#534AB7':'#e0e0e0'),
                background:widgets.includes(id)?'#EEEDFE':'#fff',
                color:widgets.includes(id)?'#534AB7':'#888'
              }}>{WIDGET_DEF[id]?.icon} {WIDGET_DEF[id]?.label}</button>
            ))}
          </div>
        </div>
      )}

      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(300px,1fr))',gap:16}}>
        {widgets.filter(id=>WIDGET_DEF[id]).map(id => {
          const w = WIDGET_DEF[id]
          const isDragging = dragW===id
          const isOver = dragWOver===id
          return (
            <div
              key={id}
              draggable={editMode}
              onDragStart={e=>handleDragW(e,id)}
              onDragOver={e=>{e.preventDefault();setDragWOver(id)}}
              onDrop={e=>handleDropW(e,id)}
              onDragEnd={()=>{setDragW(null);setDragWOver(null)}}
              style={{
                background:'#fff',border:'0.5px solid '+(isOver?'#534AB7':'#e8e8e8'),
                borderRadius:12,overflow:'hidden',
                opacity:isDragging?0.5:1,
                cursor:editMode?'grab':'default',
                transform:isOver?'scale(1.02)':'none',
                transition:'transform 0.1s,border-color 0.1s'
              }}
            >
              <div style={{padding:'12px 16px',borderBottom:'0.5px solid #f5f5f3',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                <div style={{fontSize:13,fontWeight:500,color:'#333'}}>{w.icon} {w.label}</div>
                {editMode && <span style={{fontSize:11,color:'#ccc'}}>⠿ přetáhni</span>}
              </div>
              <div style={{padding:'14px 16px'}}>{w.render()}</div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── ÚKOLY ───────────────────────────────────────────────────────────────────"""

if old_marker in content:
    content = content.replace(old_marker, dashboard_code)
    print("OK - Dashboard přidán")
else:
    print("ERROR - marker nenalezen")

# Přidám dashboard do NAV
old_nav = """  const NAV = [
    { id:'kanban', icon:'⬛', label:'Kanban' },"""
new_nav = """  const NAV = [
    { id:'dashboard', icon:'📊', label:'Dashboard' },
    { id:'kanban', icon:'⬛', label:'Kanban' },"""
if old_nav in content:
    content = content.replace(old_nav, new_nav)
    print("OK - dashboard do NAV")

# Přidám do DEFAULT_NAV
old_def = "  const DEFAULT_NAV = ['kanban','table','followup','ukoly','multiplikatori','discovery','email','dokumenty','strategie','produkty','pruvodce']"
new_def = "  const DEFAULT_NAV = ['dashboard','kanban','table','followup','ukoly','multiplikatori','discovery','email','dokumenty','strategie','produkty','pruvodce']"
if old_def in content:
    content = content.replace(old_def, new_def)
    print("OK - DEFAULT_NAV")

old_nav_arr1 = "    return ['kanban','table','followup','ukoly','multiplikatori','discovery','email','dokumenty','strategie','produkty','pruvodce']"
new_nav_arr1 = "    return ['dashboard','kanban','table','followup','ukoly','multiplikatori','discovery','email','dokumenty','strategie','produkty','pruvodce']"
if old_nav_arr1 in content:
    content = content.replace(old_nav_arr1, new_nav_arr1)
    print("OK - nav arr1")

old_valid = "        const allIds = ['kanban','table','followup','ukoly','multiplikatori','discovery','email','dokumenty','strategie','produkty','pruvodce']"
new_valid = "        const allIds = ['dashboard','kanban','table','followup','ukoly','multiplikatori','discovery','email','dokumenty','strategie','produkty','pruvodce']"
if old_valid in content:
    content = content.replace(old_valid, new_valid)
    print("OK - allIds")

# Přidám titles
old_titles = "{{kanban:'Pipeline',table:'Všechny leady',followup:'Follow-up dnes',ukoly:'Úkoly',multiplikatori:'Multiplikátoři',discovery:'Discovery call script',email:'Email šablony',dokumenty:'Dokumenty',strategie:'Strategický plán prodeje',produkty:'Portfolio produktů',pruvodce:'Průvodce strategií'}[tab]}"
new_titles = "{{dashboard:'Dashboard',kanban:'Pipeline',table:'Všechny leady',followup:'Follow-up dnes',ukoly:'Úkoly',multiplikatori:'Multiplikátoři',discovery:'Discovery call script',email:'Email šablony',dokumenty:'Dokumenty',strategie:'Strategický plán prodeje',produkty:'Portfolio produktů',pruvodce:'Průvodce strategií'}[tab]}"
if old_titles in content:
    content = content.replace(old_titles, new_titles)
    print("OK - titles")

old_sub = "{{kanban:'Vizuální přehled obchodů podle fáze',table:'Kompletní seznam s filtry',followup:'Leady které čekají na tvůj kontakt',ukoly:'Propojené úkoly — splnění automaticky aktualizuje lead',multiplikatori:'Partneři a zprostředkovatelé',discovery:'Průvodce pro 30minutový prodejní hovor',email:'Šablony připravené k odeslání',dokumenty:'Factsheets, nabídky a další PDF',strategie:'Brainstorming pro čtvrteční meeting — odpovědi se ukládají pro všechny',produkty:'Přehled produktů riscare s popisky a cenami',pruvodce:'Krok za krokem — co dělat a kdy. Sdílené pro celý tým.'}[tab]}"
new_sub = "{{dashboard:'Přehled všeho na jednom místě — přizpůsobitelný',kanban:'Vizuální přehled obchodů podle fáze',table:'Kompletní seznam s filtry',followup:'Leady které čekají na tvůj kontakt',ukoly:'Propojené úkoly — splnění automaticky aktualizuje lead',multiplikatori:'Partneři a zprostředkovatelé',discovery:'Průvodce pro 30minutový prodejní hovor',email:'Šablony připravené k odeslání',dokumenty:'Factsheets, nabídky a další PDF',strategie:'Brainstorming pro čtvrteční meeting — odpovědi se ukládají pro všechny',produkty:'Přehled produktů riscare s popisky a cenami',pruvodce:'Krok za krokem — co dělat a kdy. Sdílené pro celý tým.'}[tab]}"
if old_sub in content:
    content = content.replace(old_sub, new_sub)
    print("OK - sub")

# Přidám render
old_render = "{tab==='ukoly' && <UkolyView leads={leads} onLeadChange={onLeadChange} />}"
new_render = """{tab==='dashboard' && <Dashboard leads={leads} onOpen={setDetail} />}
        {tab==='ukoly' && <UkolyView leads={leads} onLeadChange={onLeadChange} />}"""
if old_render in content:
    content = content.replace(old_render, new_render)
    print("OK - render")

# Přidám AI asistenta do LeadDetail - tlačítko "Připravit call"
old_lead_buttons = """            <button className="btn" style={{color:'#534AB7',borderColor:'#534AB7'}} onClick={async () => {
              const nazev = prompt('Název úkolu:')
              if (!nazev) return
              await supabase.from('ukoly').insert([{
                nazev, popis:'', kdo:'Karel', do_kdy:'', stav:'todo',
                lead_id: lead.id, novy_stav_leadu:'', zdroj:'lead', zdroj_nazev: lead.firma
              }])
              alert('Úkol vytvořen a propojen s ' + lead.firma)
            }}>+ Úkol</button>"""

new_lead_buttons = """            <button className="btn" style={{color:'#534AB7',borderColor:'#534AB7'}} onClick={async () => {
              const nazev = prompt('Název úkolu:')
              if (!nazev) return
              await supabase.from('ukoly').insert([{
                nazev, popis:'', kdo:'Karel', do_kdy:'', stav:'todo',
                lead_id: lead.id, novy_stav_leadu:'', zdroj:'lead', zdroj_nazev: lead.firma
              }])
              alert('Úkol vytvořen a propojen s ' + lead.firma)
            }}>+ Úkol</button>
            <AiCallBtn lead={lead} />"""

if old_lead_buttons in content:
    content = content.replace(old_lead_buttons, new_lead_buttons)
    print("OK - AI btn v LeadDetail")

with open('src/App.js', 'w', encoding='utf-8') as f:
    f.write(content)

print(f"Hotovo — radku: {len(content.splitlines())}, export: {'export default function App' in content}")
