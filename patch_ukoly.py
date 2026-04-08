# -*- coding: utf-8 -*-
with open('src/App.js', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Přidám UkolyView komponentu před hlavní App
old_marker = "// ─── HLAVNÍ APP ───────────────────────────────────────────────────────────────"

ukoly_code = """// ─── ÚKOLY ───────────────────────────────────────────────────────────────────
const UKOL_STAVS = ['todo', 'in_progress', 'hotovo']
const UKOL_STAV_LABEL = { todo: 'K udělání', in_progress: 'Probíhá', hotovo: 'Hotovo' }
const UKOL_STAV_COLOR = { todo: '#185FA5', in_progress: '#854F0B', hotovo: '#27500A' }
const UKOL_STAV_BG = { todo: '#E6F1FB', in_progress: '#FAEEDA', hotovo: '#EAF3DE' }

const UkolModal = ({ ukol, leads, onSave, onClose }) => {
  const [form, setForm] = useState(ukol || {
    nazev: '', popis: '', kdo: 'Karel', do_kdy: '', stav: 'todo',
    lead_id: '', novy_stav_leadu: '', zdroj: '', zdroj_id: ''
  })
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{maxWidth:520}}>
        <div className="modal-head">
          <h2>{ukol ? 'Upravit úkol' : 'Nový úkol'}</h2>
          <button className="close-btn" onClick={onClose}>&times;</button>
        </div>
        <div className="modal-body">
          <div className="form-row"><label>Název úkolu *</label>
            <input value={form.nazev} onChange={e=>set('nazev',e.target.value)} placeholder="Co je potřeba udělat..." />
          </div>
          <div className="form-row"><label>Popis</label>
            <textarea value={form.popis} onChange={e=>set('popis',e.target.value)} placeholder="Detaily, kontext..." style={{height:72}} />
          </div>
          <div className="form-grid">
            <div className="form-row"><label>Kdo to dělá</label>
              <select value={form.kdo} onChange={e=>set('kdo',e.target.value)}>
                {['Karel','Radim','Aleš'].map(o=><option key={o}>{o}</option>)}
              </select>
            </div>
            <div className="form-row"><label>Do kdy</label>
              <input type="date" value={form.do_kdy} onChange={e=>set('do_kdy',e.target.value)} />
            </div>
          </div>
          <div className="form-grid">
            <div className="form-row"><label>Stav</label>
              <select value={form.stav} onChange={e=>set('stav',e.target.value)}>
                {UKOL_STAVS.map(s=><option key={s} value={s}>{UKOL_STAV_LABEL[s]}</option>)}
              </select>
            </div>
            <div className="form-row"><label>Propojit s leadem</label>
              <select value={form.lead_id} onChange={e=>set('lead_id',e.target.value)}>
                <option value="">— žádný —</option>
                {leads.map(l=><option key={l.id} value={l.id}>{l.firma}</option>)}
              </select>
            </div>
          </div>
          {form.lead_id && (
            <div className="form-row">
              <label>Po splnění změnit stav leadu na</label>
              <select value={form.novy_stav_leadu} onChange={e=>set('novy_stav_leadu',e.target.value)}>
                <option value="">— neměnit —</option>
                {['Lead','Kontaktováno','Discovery call domluven','Discovery call proběhl',
                  'Nabídka odeslána','Vyjednávání','Uzavřeno — vyhráno','Uzavřeno — prohráno','Odloženo'
                ].map(s=><option key={s}>{s}</option>)}
              </select>
            </div>
          )}
          {form.zdroj && (
            <div style={{fontSize:12,color:'#aaa',background:'#f5f5f3',padding:'8px 12px',borderRadius:8}}>
              Propojeno: {form.zdroj === 'pruvodce' ? 'Průvodce strategií' : form.zdroj}
              {form.zdroj_nazev ? ` — ${form.zdroj_nazev}` : ''}
            </div>
          )}
        </div>
        <div className="modal-foot">
          {ukol && <button className="btn danger" onClick={() => { if(window.confirm('Smazat?')) onSave(null, true) }}>Smazat</button>}
          <button className="btn" onClick={onClose}>Zrušit</button>
          <button className="btn accent" onClick={() => { if(!form.nazev.trim()){alert('Zadej název');return} onSave(form) }}>Uložit</button>
        </div>
      </div>
    </div>
  )
}

const UkolyView = ({ leads, onLeadChange }) => {
  const [ukoly, setUkoly] = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(null)
  const [filtrKdo, setFiltrKdo] = useState('')
  const [filtrStav, setFiltrStav] = useState('')
  const [filtrLead, setFiltrLead] = useState('')
  const [search, setSearch] = useState('')

  const today = new Date().toISOString().slice(0,10)

  const fetchUkoly = async () => {
    const { data } = await supabase.from('ukoly').select('*').order('created_at', { ascending: false })
    setUkoly(data || [])
    setLoading(false)
  }

  useEffect(() => { fetchUkoly() }, [])

  const saveUkol = async (form, smazat) => {
    if (smazat) {
      await supabase.from('ukoly').delete().eq('id', modal.id)
      setModal(null)
      fetchUkoly()
      return
    }

    const bylHotovo = modal?.stav === 'hotovo'
    const jeHotovo = form.stav === 'hotovo'
    const stavSeZmenil = !bylHotovo && jeHotovo

    if (modal?.id) {
      await supabase.from('ukoly').update(form).eq('id', modal.id)
    } else {
      await supabase.from('ukoly').insert([form])
    }

    // Pokud se úkol označil jako hotový a má lead a nový stav
    if (stavSeZmenil && form.lead_id && form.novy_stav_leadu) {
      await supabase.from('leads').update({ stav: form.novy_stav_leadu }).eq('id', form.lead_id)
      await supabase.from('comments').insert([{
        lead_id: form.lead_id,
        autor: form.kdo,
        text: 'Úkol splněn: ' + form.nazev + (form.popis ? ' — ' + form.popis : '')
      }])
      if (onLeadChange) onLeadChange()
    }

    setModal(null)
    fetchUkoly()
  }

  const toggleStav = async (ukol) => {
    const novyStav = ukol.stav === 'hotovo' ? 'todo' : ukol.stav === 'todo' ? 'in_progress' : 'hotovo'
    const bylHotovo = ukol.stav === 'hotovo'
    const jeHotovo = novyStav === 'hotovo'

    await supabase.from('ukoly').update({ stav: novyStav }).eq('id', ukol.id)

    if (!bylHotovo && jeHotovo && ukol.lead_id && ukol.novy_stav_leadu) {
      await supabase.from('leads').update({ stav: ukol.novy_stav_leadu }).eq('id', ukol.lead_id)
      await supabase.from('comments').insert([{
        lead_id: ukol.lead_id,
        autor: ukol.kdo,
        text: 'Úkol splněn: ' + ukol.nazev
      }])
      if (onLeadChange) onLeadChange()
    }

    fetchUkoly()
  }

  const filtered = ukoly.filter(u => {
    if (search && !u.nazev.toLowerCase().includes(search.toLowerCase())) return false
    if (filtrKdo && u.kdo !== filtrKdo) return false
    if (filtrStav && u.stav !== filtrStav) return false
    if (filtrLead && u.lead_id !== filtrLead) return false
    return true
  })

  const todo = filtered.filter(u => u.stav === 'todo')
  const inProgress = filtered.filter(u => u.stav === 'in_progress')
  const hotovo = filtered.filter(u => u.stav === 'hotovo')
  const dnes = filtered.filter(u => u.do_kdy === today && u.stav !== 'hotovo')
  const poTerminu = filtered.filter(u => u.do_kdy && u.do_kdy < today && u.stav !== 'hotovo')

  const aC = { Karel:'#534AB7', Radim:'#0F6E56', Ales:'#854F0B', Aleš:'#854F0B' }

  const UkolKarta = ({ u }) => {
    const lead = leads.find(l => l.id === u.lead_id)
    const overdue = u.do_kdy && u.do_kdy < today && u.stav !== 'hotovo'
    const dnesTermin = u.do_kdy === today && u.stav !== 'hotovo'
    return (
      <div style={{
        background:'#fff', border:'0.5px solid ' + (u.stav==='hotovo'?'#5DCAA5':'#e8e8e8'),
        borderRadius:10, padding:'12px 14px', marginBottom:8,
        opacity: u.stav==='hotovo' ? 0.7 : 1
      }}>
        <div style={{display:'flex',alignItems:'flex-start',gap:10}}>
          <button onClick={() => toggleStav(u)} style={{
            width:22,height:22,borderRadius:'50%',flexShrink:0,marginTop:2,cursor:'pointer',
            border:'0.5px solid ' + (u.stav==='hotovo'?'#1D9E75':u.stav==='in_progress'?'#854F0B':'#ddd'),
            background: u.stav==='hotovo'?'#1D9E75':u.stav==='in_progress'?'#FAEEDA':'#fff',
            color: u.stav==='hotovo'?'#fff':'transparent',fontSize:11,
            display:'flex',alignItems:'center',justifyContent:'center'
          }}>{u.stav==='hotovo'?'✓':u.stav==='in_progress'?'▶':''}</button>
          <div style={{flex:1,minWidth:0}}>
            <div style={{fontSize:13,fontWeight:500,color:u.stav==='hotovo'?'#aaa':'#1a1a1a',
              textDecoration:u.stav==='hotovo'?'line-through':'none',marginBottom:3}}>
              {u.nazev}
            </div>
            {u.popis && <div style={{fontSize:12,color:'#888',marginBottom:4,lineHeight:1.5}}>{u.popis}</div>}
            <div style={{display:'flex',gap:6,flexWrap:'wrap',alignItems:'center'}}>
              <span style={{fontSize:11,padding:'1px 7px',borderRadius:10,
                background:(aC[u.kdo]||'#888')+'18',color:aC[u.kdo]||'#666'}}>{u.kdo}</span>
              {u.do_kdy && (
                <span style={{fontSize:11,color:overdue?'#A32D2D':dnesTermin?'#854F0B':'#aaa',fontWeight:overdue||dnesTermin?500:400}}>
                  📅 {u.do_kdy}{overdue?' — po termínu!':dnesTermin?' — dnes!':''}
                </span>
              )}
              {lead && (
                <span style={{fontSize:11,color:'#534AB7',background:'#EEEDFE',padding:'1px 7px',borderRadius:10}}>
                  🔗 {lead.firma}
                </span>
              )}
              {u.zdroj === 'pruvodce' && (
                <span style={{fontSize:11,color:'#0F6E56',background:'#E1F5EE',padding:'1px 7px',borderRadius:10}}>
                  🗺️ Průvodce
                </span>
              )}
            </div>
          </div>
          <button onClick={() => setModal(u)} style={{background:'none',border:'none',color:'#ccc',cursor:'pointer',fontSize:16,padding:'0 4px'}}>✎</button>
        </div>
      </div>
    )
  }

  const celkem = ukoly.filter(u=>u.stav!=='hotovo').length

  return (
    <div>
      <div style={{display:'flex',gap:8,marginBottom:16,flexWrap:'wrap',alignItems:'center'}}>
        <input placeholder="Hledat..." value={search} onChange={e=>setSearch(e.target.value)}
          style={{height:34,padding:'0 12px',border:'0.5px solid #ddd',borderRadius:8,fontSize:13,width:160,fontFamily:'inherit'}} />
        <select value={filtrKdo} onChange={e=>setFiltrKdo(e.target.value)}
          style={{height:34,padding:'0 12px',border:'0.5px solid #ddd',borderRadius:8,fontSize:13,fontFamily:'inherit',background:'#fff'}}>
          <option value="">Všichni</option>
          {['Karel','Radim','Aleš'].map(o=><option key={o}>{o}</option>)}
        </select>
        <select value={filtrStav} onChange={e=>setFiltrStav(e.target.value)}
          style={{height:34,padding:'0 12px',border:'0.5px solid #ddd',borderRadius:8,fontSize:13,fontFamily:'inherit',background:'#fff'}}>
          <option value="">Všechny stavy</option>
          {UKOL_STAVS.map(s=><option key={s} value={s}>{UKOL_STAV_LABEL[s]}</option>)}
        </select>
        <select value={filtrLead} onChange={e=>setFiltrLead(e.target.value)}
          style={{height:34,padding:'0 12px',border:'0.5px solid #ddd',borderRadius:8,fontSize:13,fontFamily:'inherit',background:'#fff'}}>
          <option value="">Všechny leady</option>
          {leads.map(l=><option key={l.id} value={l.id}>{l.firma}</option>)}
        </select>
        <button className="btn accent" onClick={() => setModal({})}>+ Nový úkol</button>
      </div>

      <div className="metrics" style={{marginBottom:20}}>
        <div className="metric-card"><div className="label">Aktivní úkoly</div><div className="val">{celkem}</div></div>
        <div className={`metric-card ${poTerminu.length>0?'alert':''}`}><div className="label">Po termínu</div><div className="val">{poTerminu.length}</div></div>
        <div className="metric-card"><div className="label">Dnes</div><div className="val">{dnes.length}</div></div>
        <div className="metric-card"><div className="label">Hotovo celkem</div><div className="val">{ukoly.filter(u=>u.stav==='hotovo').length}</div></div>
      </div>

      {loading && <div style={{color:'#aaa',padding:'32px',textAlign:'center'}}>Načítám...</div>}

      {!loading && (
        <div style={{display:'grid',gridTemplateColumns:'repeat(3,minmax(0,1fr))',gap:16}}>
          {[
            {stavKey:'todo', label:'K udělání', items:todo, barva:'#185FA5', bg:'#E6F1FB'},
            {stavKey:'in_progress', label:'Probíhá', items:inProgress, barva:'#854F0B', bg:'#FAEEDA'},
            {stavKey:'hotovo', label:'Hotovo', items:hotovo, barva:'#27500A', bg:'#EAF3DE'},
          ].map(col => (
            <div key={col.stavKey}>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:10}}>
                <span style={{fontSize:12,fontWeight:500,color:col.barva,background:col.bg,padding:'3px 10px',borderRadius:10}}>{col.label}</span>
                <span style={{fontSize:12,color:'#aaa'}}>{col.items.length}</span>
              </div>
              {!col.items.length && <div style={{fontSize:12,color:'#ccc',textAlign:'center',padding:'16px 0'}}>Prázdné</div>}
              {col.items.map(u => <UkolKarta key={u.id} u={u} />)}
            </div>
          ))}
        </div>
      )}

      {modal !== null && (
        <UkolModal
          ukol={modal.id ? modal : null}
          leads={leads}
          onSave={saveUkol}
          onClose={() => setModal(null)}
        />
      )}
    </div>
  )
}

// Globální hook pro vytvoření úkolu z jakéhokoliv místa
const useCreateUkol = (leads, onUkolCreated) => {
  const [showModal, setShowModal] = useState(false)
  const [defaultValues, setDefaultValues] = useState({})

  const openUkol = (defaults) => {
    setDefaultValues(defaults || {})
    setShowModal(true)
  }

  const saveUkol = async (form) => {
    await supabase.from('ukoly').insert([{ ...defaultValues, ...form }])
    setShowModal(false)
    if (onUkolCreated) onUkolCreated()
  }

  const modal = showModal ? (
    <UkolModal
      ukol={defaultValues}
      leads={leads}
      onSave={saveUkol}
      onClose={() => setShowModal(false)}
    />
  ) : null

  return { openUkol, modal }
}

// ─── HLAVNÍ APP ───────────────────────────────────────────────────────────────"""

if old_marker in content:
    content = content.replace(old_marker, ukoly_code)
    print("OK - UkolyView přidán")
else:
    print("ERROR - marker nenalezen")

# 2. Přidám úkoly do NAV
old_nav = """  const NAV = [
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

new_nav = """  const NAV = [
    { id:'kanban', icon:'⬛', label:'Kanban' },
    { id:'table', icon:'☰', label:'Tabulka' },
    { id:'followup', icon:'📅', label:'Follow-up dnes' },
    { id:'ukoly', icon:'✅', label:'Úkoly' },
    { id:'multiplikatori', icon:'🤝', label:'Multiplikátoři' },
    { id:'discovery', icon:'📞', label:'Discovery script' },
    { id:'email', icon:'✉️', label:'Email šablony' },
    { id:'dokumenty', icon:'📄', label:'Dokumenty' },
    { id:'strategie', icon:'🎯', label:'Strategický plán' },
    { id:'produkty', icon:'📦', label:'Produkty' },
    { id:'pruvodce', icon:'🗺️', label:'Průvodce strategií' },
  ]"""

if old_nav in content:
    content = content.replace(old_nav, new_nav)
    print("OK - úkoly do NAV")
else:
    print("ERROR - NAV nenalezen")

# 3. Přidám DEFAULT_NAV update
old_default = "  const DEFAULT_NAV = ['kanban','table','followup','multiplikatori','discovery','email','dokumenty','strategie','produkty','pruvodce']"
new_default = "  const DEFAULT_NAV = ['kanban','table','followup','ukoly','multiplikatori','discovery','email','dokumenty','strategie','produkty','pruvodce']"
if old_default in content:
    content = content.replace(old_default, new_default)
    print("OK - DEFAULT_NAV")

old_nav_state = """    return ['kanban','table','followup','multiplikatori','discovery','email','dokumenty','strategie','produkty','pruvodce']"""
new_nav_state = """    return ['kanban','table','followup','ukoly','multiplikatori','discovery','email','dokumenty','strategie','produkty','pruvodce']"""
if old_nav_state in content:
    content = content.replace(old_nav_state, new_nav_state)
    print("OK - nav state default")

old_valid = """        const allIds = ['kanban','table','followup','multiplikatori','discovery','email','dokumenty','strategie','produkty','pruvodce']"""
new_valid = """        const allIds = ['kanban','table','followup','ukoly','multiplikatori','discovery','email','dokumenty','strategie','produkty','pruvodce']"""
if old_valid in content:
    content = content.replace(old_valid, new_valid)
    print("OK - valid allIds")

# 4. Přidám fetchLeads callback a onLeadChange
old_fetch = """  const fetchLeads = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase.from('leads').select('*').order('created_at', { ascending: false })
    setLeads(data || [])
    setLoading(false)
  }, [])"""

new_fetch = """  const fetchLeads = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase.from('leads').select('*').order('created_at', { ascending: false })
    setLeads(data || [])
    setLoading(false)
  }, [])

  const onLeadChange = useCallback(() => { fetchLeads() }, [fetchLeads])"""

if old_fetch in content:
    content = content.replace(old_fetch, new_fetch)
    print("OK - onLeadChange přidán")
else:
    print("ERROR - fetchLeads nenalezen")

# 5. Přidám titles a sub
old_titles = "{{kanban:'Pipeline',table:'Všechny leady',followup:'Follow-up dnes',multiplikatori:'Multiplikátoři',discovery:'Discovery call script',email:'Email šablony',dokumenty:'Dokumenty',strategie:'Strategický plán prodeje',produkty:'Portfolio produktů',pruvodce:'Průvodce strategií'}[tab]}"
new_titles = "{{kanban:'Pipeline',table:'Všechny leady',followup:'Follow-up dnes',ukoly:'Úkoly',multiplikatori:'Multiplikátoři',discovery:'Discovery call script',email:'Email šablony',dokumenty:'Dokumenty',strategie:'Strategický plán prodeje',produkty:'Portfolio produktů',pruvodce:'Průvodce strategií'}[tab]}"
if old_titles in content:
    content = content.replace(old_titles, new_titles)
    print("OK - titles")

old_sub = "{{kanban:'Vizuální přehled obchodů podle fáze',table:'Kompletní seznam s filtry',followup:'Leady které čekají na tvůj kontakt',multiplikatori:'Partneři a zprostředkovatelé',discovery:'Průvodce pro 30minutový prodejní hovor',email:'Šablony připravené k odeslání',dokumenty:'Factsheets, nabídky a další PDF',strategie:'Brainstorming pro čtvrteční meeting — odpovědi se ukládají pro všechny',produkty:'Přehled produktů riscare s popisky a cenami',pruvodce:'Krok za krokem — co dělat a kdy. Sdílené pro celý tým.'}[tab]}"
new_sub = "{{kanban:'Vizuální přehled obchodů podle fáze',table:'Kompletní seznam s filtry',followup:'Leady které čekají na tvůj kontakt',ukoly:'Propojené úkoly — splnění automaticky aktualizuje lead',multiplikatori:'Partneři a zprostředkovatelé',discovery:'Průvodce pro 30minutový prodejní hovor',email:'Šablony připravené k odeslání',dokumenty:'Factsheets, nabídky a další PDF',strategie:'Brainstorming pro čtvrteční meeting — odpovědi se ukládají pro všechny',produkty:'Přehled produktů riscare s popisky a cenami',pruvodce:'Krok za krokem — co dělat a kdy. Sdílené pro celý tým.'}[tab]}"
if old_sub in content:
    content = content.replace(old_sub, new_sub)
    print("OK - sub")

# 6. Přidám notifikaci do sidebaru pro úkoly
old_followup_badge = """{n.id==='followup' && fuCount>0 && (
              <span style={{marginLeft:'auto',background:'#A32D2D',color:'#fff',borderRadius:10,padding:'1px 7px',fontSize:11}}>{fuCount}</span>
            )}"""
new_followup_badge = """{n.id==='followup' && fuCount>0 && (
              <span style={{marginLeft:'auto',background:'#A32D2D',color:'#fff',borderRadius:10,padding:'1px 7px',fontSize:11}}>{fuCount}</span>
            )}
            {n.id==='ukoly' && (
              <span style={{marginLeft:'auto',background:'#534AB7',color:'#fff',borderRadius:10,padding:'1px 7px',fontSize:11}}>{'✅'}</span>
            )}"""
if old_followup_badge in content:
    content = content.replace(old_followup_badge, new_followup_badge)
    print("OK - ukoly badge")

# 7. Přidám render
old_render = "{tab==='strategie' && <StrategickyPlan />}"
new_render = """{tab==='ukoly' && <UkolyView leads={leads} onLeadChange={onLeadChange} />}
        {tab==='strategie' && <StrategickyPlan />}"""
if old_render in content:
    content = content.replace(old_render, new_render)
    print("OK - render")

# 8. Přidám + Úkol tlačítko do LeadDetail
old_lead_head = """          <div style={{display:'flex',gap:8,alignItems:'center'}}>
            <button className="btn" onClick={() => onEdit(lead)}>Upravit</button>
            <button className="close-btn" onClick={onClose}>&times;</button>
          </div>"""
new_lead_head = """          <div style={{display:'flex',gap:8,alignItems:'center'}}>
            <button className="btn" onClick={() => onEdit(lead)}>Upravit</button>
            <button className="btn" style={{color:'#534AB7',borderColor:'#534AB7'}} onClick={async () => {
              const nazev = prompt('Název úkolu:')
              if (!nazev) return
              await supabase.from('ukoly').insert([{
                nazev, popis:'', kdo:'Karel', do_kdy:'', stav:'todo',
                lead_id: lead.id, novy_stav_leadu:'', zdroj:'lead', zdroj_nazev: lead.firma
              }])
              alert('Úkol vytvořen a propojen s ' + lead.firma)
            }}>+ Úkol</button>
            <button className="close-btn" onClick={onClose}>&times;</button>
          </div>"""
if old_lead_head in content:
    content = content.replace(old_lead_head, new_lead_head)
    print("OK - + Úkol v LeadDetail")
else:
    print("ERROR - LeadDetail head nenalezen")

with open('src/App.js', 'w', encoding='utf-8') as f:
    f.write(content)

print(f"Hotovo — radku: {len(content.splitlines())}, export: {'export default function App' in content}")
