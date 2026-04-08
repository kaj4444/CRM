# -*- coding: utf-8 -*-
with open('src/App.js', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Přidám QuickUkolModal komponentu před LeadDetail
old_marker = "const LeadDetail = ({ lead, onEdit, onClose }) => {"

quick_ukol = """// ─── QUICK ÚKOL MODAL ────────────────────────────────────────────────────────
const PRIORITY_OPTIONS = ['Nízká', 'Střední', 'Vysoká', 'Kritická']
const PRIORITY_COLORS = { 'Nízká':'#185FA5', 'Střední':'#854F0B', 'Vysoká':'#A32D2D', 'Kritická':'#791F1F' }
const PRIORITY_BG = { 'Nízká':'#E6F1FB', 'Střední':'#FAEEDA', 'Vysoká':'#FCEBEB', 'Kritická':'#F5D5D5' }

const QuickUkolModal = ({ lead, onClose, onSaved }) => {
  const tomorrow = new Date(); tomorrow.setDate(tomorrow.getDate()+1)
  const [form, setForm] = useState({
    nazev: '',
    popis: '',
    kdo: 'Karel',
    do_kdy: tomorrow.toISOString().slice(0,10),
    priorita: 'Střední',
    typ_ukolu: 'Follow-up call',
    novy_stav_leadu: '',
    stav: 'todo',
  })
  const [saving, setSaving] = useState(false)
  const set = (k,v) => setForm(f=>({...f,[k]:v}))

  const save = async () => {
    if (!form.nazev.trim()) { alert('Zadej název úkolu'); return }
    setSaving(true)
    await supabase.from('ukoly').insert([{
      ...form,
      lead_id: lead.id,
      zdroj: 'lead',
      zdroj_nazev: lead.firma,
    }])
    setSaving(false)
    if (onSaved) onSaved()
    onClose()
  }

  const addToCalendar = () => {
    const start = new Date(form.do_kdy + 'T09:00:00')
    const end = new Date(form.do_kdy + 'T09:30:00')
    const fmt = (d) => d.toISOString().replace(/[-:]/g,'').slice(0,15) + 'Z'
    const title = encodeURIComponent(form.nazev + ' — ' + lead.firma)
    const details = encodeURIComponent(
      'Firma: ' + lead.firma + '\\n' +
      'Kontakt: ' + (lead.osoba||'') + '\\n' +
      'Typ: ' + form.typ_ukolu + '\\n' +
      'Priorita: ' + form.priorita + '\\n' +
      (form.popis ? 'Popis: ' + form.popis + '\\n' : '') +
      'CRM: https://crm-two-lemon.vercel.app'
    )
    const url = 'https://calendar.google.com/calendar/render?action=TEMPLATE' +
      '&text=' + title +
      '&dates=' + fmt(start) + '/' + fmt(end) +
      '&details=' + details
    window.open(url, '_blank')
  }

  const typy = ['Follow-up call','Discovery call','Schůzka','Nabídka','Smlouva','Interní úkol','Email','Jiné']
  const aC = { Karel:'#534AB7', Radim:'#0F6E56', Aleš:'#854F0B' }

  return (
    <div className="modal-overlay" onClick={e => e.target===e.currentTarget && onClose()}>
      <div className="modal" style={{maxWidth:480}}>
        <div className="modal-head">
          <div>
            <h2>Nový úkol</h2>
            <div style={{fontSize:12,color:'#aaa',marginTop:2}}>Propojeno s: {lead.firma}</div>
          </div>
          <button className="close-btn" onClick={onClose}>&times;</button>
        </div>
        <div className="modal-body">

          <div className="form-row">
            <label>Název úkolu *</label>
            <input value={form.nazev} onChange={e=>set('nazev',e.target.value)}
              placeholder="Co je potřeba udělat..." autoFocus />
          </div>

          <div className="form-row">
            <label>Typ úkolu</label>
            <div style={{display:'flex',gap:6,flexWrap:'wrap',marginTop:4}}>
              {typy.map(t => (
                <button key={t} type="button" onClick={()=>set('typ_ukolu',t)} style={{
                  padding:'4px 12px',borderRadius:8,fontSize:12,cursor:'pointer',fontFamily:'inherit',
                  border:'0.5px solid '+(form.typ_ukolu===t?'#534AB7':'#e0e0e0'),
                  background:form.typ_ukolu===t?'#EEEDFE':'#fff',
                  color:form.typ_ukolu===t?'#534AB7':'#888',
                  fontWeight:form.typ_ukolu===t?500:400
                }}>{t}</button>
              ))}
            </div>
          </div>

          <div className="form-row">
            <label>Popis / poznámky</label>
            <textarea value={form.popis} onChange={e=>set('popis',e.target.value)}
              placeholder="Kontext, co říct, co zjistit..." style={{height:72}} />
          </div>

          <div className="form-grid">
            <div className="form-row">
              <label>Zodpovědný</label>
              <div style={{display:'flex',gap:6,marginTop:4}}>
                {['Karel','Radim','Aleš'].map(a => (
                  <button key={a} type="button" onClick={()=>set('kdo',a)} style={{
                    flex:1,padding:'6px 0',borderRadius:8,fontSize:13,cursor:'pointer',fontFamily:'inherit',
                    border:'0.5px solid '+(form.kdo===a?(aC[a]||'#534AB7'):'#e0e0e0'),
                    background:form.kdo===a?(aC[a]||'#534AB7')+'18':'#fff',
                    color:form.kdo===a?(aC[a]||'#534AB7'):'#888',fontWeight:form.kdo===a?500:400
                  }}>{a}</button>
                ))}
              </div>
            </div>
            <div className="form-row">
              <label>Deadline</label>
              <input type="date" value={form.do_kdy} onChange={e=>set('do_kdy',e.target.value)} />
            </div>
          </div>

          <div className="form-row">
            <label>Priorita</label>
            <div style={{display:'flex',gap:6,marginTop:4}}>
              {PRIORITY_OPTIONS.map(p => (
                <button key={p} type="button" onClick={()=>set('priorita',p)} style={{
                  flex:1,padding:'6px 0',borderRadius:8,fontSize:12,cursor:'pointer',fontFamily:'inherit',
                  border:'0.5px solid '+(form.priorita===p?PRIORITY_COLORS[p]:'#e0e0e0'),
                  background:form.priorita===p?PRIORITY_BG[p]:'#fff',
                  color:form.priorita===p?PRIORITY_COLORS[p]:'#888',
                  fontWeight:form.priorita===p?500:400
                }}>{p}</button>
              ))}
            </div>
          </div>

          <div className="form-row">
            <label>Po splnění změnit stav leadu na</label>
            <select value={form.novy_stav_leadu} onChange={e=>set('novy_stav_leadu',e.target.value)}>
              <option value="">— neměnit —</option>
              {['Lead','Kontaktováno','Discovery call domluven','Discovery call proběhl',
                'Nabídka odeslána','Vyjednávání','Uzavřeno — vyhráno','Uzavřeno — prohráno','Odloženo'
              ].map(s=><option key={s}>{s}</option>)}
            </select>
          </div>

        </div>
        <div className="modal-foot">
          <button className="btn" onClick={addToCalendar} style={{color:'#0F6E56',borderColor:'#0F6E56'}}>
            📅 Přidat do kalendáře
          </button>
          <button className="btn" onClick={onClose}>Zrušit</button>
          <button className="btn accent" onClick={save} disabled={saving}>
            {saving ? 'Ukládám...' : 'Vytvořit úkol'}
          </button>
        </div>
      </div>
    </div>
  )
}

const LeadDetail = ({ lead, onEdit, onClose }) => {"""

if old_marker in content:
    content = content.replace(old_marker, quick_ukol)
    print("OK - QuickUkolModal přidán")
else:
    print("ERROR - marker nenalezen")

# 2. Přidám showUkolModal state do LeadDetail
old_state = """  const [showCallForm, setShowCallForm] = useState(false)"""
new_state = """  const [showUkolModal, setShowUkolModal] = useState(false)
  const [showCallForm, setShowCallForm] = useState(false)"""

if old_state in content:
    content = content.replace(old_state, new_state)
    print("OK - state přidán")
else:
    print("ERROR - state nenalezen")

# 3. Nahradím prompt za otevření modalu
old_ukol_btn = """            <button className="btn" style={{color:'#534AB7',borderColor:'#534AB7'}} onClick={async () => {
              const nazev = prompt('Název úkolu:')
              if (!nazev) return
              await supabase.from('ukoly').insert([{
                nazev, popis:'', kdo:'Karel', do_kdy:'', stav:'todo',
                lead_id: lead.id, novy_stav_leadu:'', zdroj:'lead', zdroj_nazev: lead.firma
              }])
              alert('Úkol vytvořen a propojen s ' + lead.firma)
            }}>+ Úkol</button>"""

new_ukol_btn = """            <button className="btn" style={{color:'#534AB7',borderColor:'#534AB7'}} onClick={() => setShowUkolModal(true)}>+ Úkol</button>"""

if old_ukol_btn in content:
    content = content.replace(old_ukol_btn, new_ukol_btn)
    print("OK - tlačítko nahrazeno")
else:
    print("ERROR - tlačítko nenalezeno")

# 4. Přidám modal render na konec LeadDetail (před poslední </div></div>)
old_close_modal = """      </div>
    </div>
  )
}

// ─── MODAL FORMULÁŘ ───────────────────────────────────────────────────────────"""

new_close_modal = """      </div>

      {showUkolModal && (
        <QuickUkolModal
          lead={lead}
          onClose={() => setShowUkolModal(false)}
          onSaved={() => {}}
        />
      )}
    </div>
  )
}

// ─── MODAL FORMULÁŘ ───────────────────────────────────────────────────────────"""

if old_close_modal in content:
    content = content.replace(old_close_modal, new_close_modal)
    print("OK - modal render přidán")
else:
    print("ERROR - close modal nenalezen")

# 5. Přidám priorita sloupec do ukoly tabulky - přidám do EMPTY_LEAD style
# Přidám prioritu do UkolKarta zobrazení
old_ukol_karta_badge = """              <span style={{fontSize:11,padding:'1px 7px',borderRadius:10,
                background:(aC[u.kdo]||'#888')+'18',color:aC[u.kdo]||'#666'}}>{u.kdo}</span>"""
new_ukol_karta_badge = """              <span style={{fontSize:11,padding:'1px 7px',borderRadius:10,
                background:(aC[u.kdo]||'#888')+'18',color:aC[u.kdo]||'#666'}}>{u.kdo}</span>
              {u.priorita && u.priorita !== 'Střední' && (
                <span style={{fontSize:11,padding:'1px 7px',borderRadius:10,
                  background:(PRIORITY_BG[u.priorita]||'#f0f0f0'),color:(PRIORITY_COLORS[u.priorita]||'#888')}}>
                  {u.priorita}
                </span>
              )}
              {u.typ_ukolu && <span style={{fontSize:11,color:'#aaa'}}>{u.typ_ukolu}</span>}"""

if old_ukol_karta_badge in content:
    content = content.replace(old_ukol_karta_badge, new_ukol_karta_badge)
    print("OK - priorita v kartě úkolu")
else:
    print("ERROR - ukol karta badge nenalezena")

with open('src/App.js', 'w', encoding='utf-8') as f:
    f.write(content)

print(f"Hotovo — radku: {len(content.splitlines())}, export: {'export default function App' in content}")
