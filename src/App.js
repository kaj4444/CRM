import React, { useState, useEffect, useCallback } from 'react'
import './index.css'
import { supabase, APP_PASSWORD } from './supabase'

const SLACK_WEBHOOK = process.env.REACT_APP_SLACK_WEBHOOK

const sendSlack = async (text) => {
  if (!SLACK_WEBHOOK) return
  try {
    await fetch(SLACK_WEBHOOK, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text })
    })
  } catch(e) {
    console.error('Slack error:', e)
  }
}

const slackNovyLead = (l) => sendSlack(
  `🆕 *Nový lead přidán*
*Firma:* ${l.firma}
*Kontakt:* ${l.osoba || '—'} (${l.role || '—'})
*Produkt:* ${l.produkt || '—'}
*Segment:* ${l.segment || '—'}
*Vede:* ${l.vede || '—'}
👉 https://crm-two-lemon.vercel.app`
)

const slackZmenaStavu = (firma, stavOld, stavNew, vede) => {
  const isWin = stavNew === 'Uzavřeno — vyhráno'
  const emoji = isWin ? '🏆' : '🔄'
  const text = isWin
    ? `🏆 *DEAL UZAVŘEN! Gratulace!* 🎉
*Firma:* ${firma}
*Vede:* ${vede || '—'}

Výborná práce! 💪`
    : `🔄 *Změna stavu leadu*
*Firma:* ${firma}
*${stavOld}* → *${stavNew}*
*Vede:* ${vede || '—'}`
  return sendSlack(text)
}

const slackKomentar = (firma, autor, text) => sendSlack(
  `💬 *Nový komentář v leadu*
*Firma:* ${firma}
*Od:* ${autor}
*Zpráva:* ${text.slice(0, 150)}${text.length > 150 ? '...' : ''}`
)

// ─── KONSTANTY ────────────────────────────────────────────────────────────────
const STAVS = ['Lead','Kontaktováno','Discovery call domluven','Discovery call proběhl',
  'Nabídka odeslána','Vyjednávání','Uzavřeno — vyhráno','Uzavřeno — prohráno','Odloženo']

const STAV_STYLES = {
  'Lead': { bg:'#E6F1FB', color:'#185FA5' },
  'Kontaktováno': { bg:'#FAEEDA', color:'#854F0B' },
  'Discovery call domluven': { bg:'#E1F5EE', color:'#0F6E56' },
  'Discovery call proběhl': { bg:'#EAF3DE', color:'#3B6D11' },
  'Nabídka odeslána': { bg:'#EEEDFE', color:'#534AB7' },
  'Vyjednávání': { bg:'#FAEEDA', color:'#633806' },
  'Uzavřeno — vyhráno': { bg:'#EAF3DE', color:'#27500A' },
  'Uzavřeno — prohráno': { bg:'#FCEBEB', color:'#791F1F' },
  'Odloženo': { bg:'#F1EFE8', color:'#5F5E5A' },
}

const KANBAN_STAVS = STAVS.slice(0, 7)

const EMPTY_LEAD = {
  firma:'', osoba:'', role:'CEO', segment:'Přímý klient',
  email:'', telefon:'', odvetvi:'Energetika', zdroj:'Vlastní síť',
  produkt:'Review NIS2', stav:'Lead', cena:'', prob:'Nízká (0–30 %)',
  vede:'Karel', followup:'', d1:'', namitka:'', poznamky:''
}

const today = () => new Date().toISOString().slice(0,10)

// ─── HELPER KOMPONENTY ────────────────────────────────────────────────────────
const StavBadge = ({ stav }) => {
  const s = STAV_STYLES[stav] || { bg:'#f0f0ee', color:'#666' }
  return <span className="stav-badge" style={{ background:s.bg, color:s.color }}>{stav}</span>
}

const ProbTag = ({ prob }) => {
  if (!prob) return null
  const cls = prob.includes('Vysoká') ? 'tag-high' : prob.includes('Střední') ? 'tag-mid' : 'tag-low'
  const label = prob.replace(' (70–100 %)','').replace(' (30–70 %)','').replace(' (0–30 %)','')
  return <span className={`tag ${cls}`}>{label}</span>
}

const ProdTag = ({ produkt }) => {
  if (!produkt || produkt === 'Neznámý') return null
  const cls = produkt.includes('DORA') ? 'tag-dora' : 'tag-nis2'
  return <span className={`tag ${cls}`}>{produkt}</span>
}

// ─── LEAD DETAIL S KOMENTÁŘI ─────────────────────────────────────────────────
const LeadDetail = ({ lead, onEdit, onClose }) => {
  const [activeTab, setActiveTab] = useState('aktivita')
  const [comments, setComments] = useState([])
  const [newText, setNewText] = useState('')
  const [autor, setAutor] = useState('Karel')
  const [loadingC, setLoadingC] = useState(true)
  const [sending, setSending] = useState(false)
  const [docs, setDocs] = useState([])
  const [uploading, setUploading] = useState(false)
  const aC = { Karel:'#534AB7', Radim:'#0F6E56', Ales:'#854F0B' }

  const fetchComments = useCallback(async () => {
    const { data } = await supabase.from('comments').select('*')
      .eq('lead_id', lead.id).order('created_at', { ascending: true })
    setComments(data || [])
    setLoadingC(false)
  }, [lead.id])

  const fetchDocs = useCallback(async () => {
    const { data } = await supabase.from('documents').select('*')
      .eq('lead_id', lead.id).order('created_at', { ascending: false })
    setDocs(data || [])
  }, [lead.id])

  useEffect(() => { fetchComments(); fetchDocs() }, [fetchComments, fetchDocs])

  const sendComment = async () => {
    if (!newText.trim()) return
    setSending(true)
    await supabase.from('comments').insert([{ lead_id: lead.id, autor, text: newText.trim() }])
    await slackKomentar(lead.firma, autor, newText.trim())
    setNewText('')
    await fetchComments()
    setSending(false)
  }

  const deleteComment = async (id) => {
    if (!window.confirm('Smazat?')) return
    await supabase.from('comments').delete().eq('id', id)
    fetchComments()
  }

  const uploadDoc = async (e) => {
    const file = e.target.files[0]
    if (!file) return
    setUploading(true)
    const fileName = 'leads/' + lead.id + '/' + Date.now() + '_' + file.name
    const { error } = await supabase.storage.from('documents').upload(fileName, file)
    if (error) { alert('Chyba: ' + error.message); setUploading(false); return }
    const { data: urlData } = supabase.storage.from('documents').getPublicUrl(fileName)
    await supabase.from('documents').insert([{
      nazev: file.name, soubor: fileName, url: urlData.publicUrl,
      velikost: Math.round(file.size / 1024), kategorie: 'Lead dokument', lead_id: lead.id
    }])
    e.target.value = ''
    setUploading(false)
    fetchDocs()
  }

  const deleteDoc = async (doc) => {
    if (!window.confirm('Smazat?')) return
    await supabase.storage.from('documents').remove([doc.soubor])
    await supabase.from('documents').delete().eq('id', doc.id)
    fetchDocs()
  }

  const fmt = (iso) => new Date(iso).toLocaleString('cs-CZ', { day:'numeric', month:'short', hour:'2-digit', minute:'2-digit' })

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{maxWidth:640}}>
        <div className="modal-head">
          <div>
            <h2>{lead.firma}</h2>
            <div style={{fontSize:13,color:'#888',marginTop:2}}>{lead.osoba} · {lead.role} · <StavBadge stav={lead.stav} /></div>
          </div>
          <div style={{display:'flex',gap:8,alignItems:'center'}}>
            <button className="btn" onClick={() => onEdit(lead)}>Upravit</button>
            <button className="close-btn" onClick={onClose}>&times;</button>
          </div>
        </div>

        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'8px 24px',padding:'14px 24px',borderBottom:'0.5px solid #f0f0f0',fontSize:13}}>
          {lead.email && <div><span style={{color:'#888'}}>Email: </span>{lead.email}</div>}
          {lead.telefon && <div><span style={{color:'#888'}}>Tel: </span>{lead.telefon}</div>}
          {lead.produkt && <div><span style={{color:'#888'}}>Produkt: </span>{lead.produkt}</div>}
          {lead.cena && <div><span style={{color:'#888'}}>Cena: </span>{Number(lead.cena).toLocaleString('cs')} Kc</div>}
          {lead.followup && <div><span style={{color:'#888'}}>Follow-up: </span>{lead.followup}</div>}
          {lead.vede && <div><span style={{color:'#888'}}>Vede: </span>{lead.vede}</div>}
          {lead.zdroj && <div><span style={{color:'#888'}}>Zdroj: </span>{lead.zdroj}</div>}
          {lead.prob && <div><span style={{color:'#888'}}>Pravd.: </span>{lead.prob}</div>}
        </div>

        {lead.poznamky && (
          <div style={{padding:'10px 24px',borderBottom:'0.5px solid #f0f0f0',fontSize:13,color:'#555',background:'#fafaf8'}}>
            {lead.poznamky}
          </div>
        )}

        <div style={{padding:'14px 24px 0'}}>
          <div style={{display:'flex',gap:4,marginBottom:14}}>
            <button onClick={() => setActiveTab('aktivita')} style={{
              padding:'6px 16px',borderRadius:8,fontSize:13,cursor:'pointer',fontFamily:'inherit',
              border:'0.5px solid ' + (activeTab==='aktivita' ? '#534AB7' : '#e0e0e0'),
              background: activeTab==='aktivita' ? '#EEEDFE' : '#fff',
              color: activeTab==='aktivita' ? '#534AB7' : '#888',
              fontWeight: activeTab==='aktivita' ? 500 : 400
            }}>Aktivita · {comments.length}</button>
            <button onClick={() => setActiveTab('dokumenty')} style={{
              padding:'6px 16px',borderRadius:8,fontSize:13,cursor:'pointer',fontFamily:'inherit',
              border:'0.5px solid ' + (activeTab==='dokumenty' ? '#534AB7' : '#e0e0e0'),
              background: activeTab==='dokumenty' ? '#EEEDFE' : '#fff',
              color: activeTab==='dokumenty' ? '#534AB7' : '#888',
              fontWeight: activeTab==='dokumenty' ? 500 : 400
            }}>Dokumenty · {docs.length}</button>
          </div>

          {activeTab === 'aktivita' && (
            <div style={{maxHeight:260,overflowY:'auto',marginBottom:14}}>
              {loadingC && <div style={{color:'#aaa',fontSize:13,padding:'16px 0'}}>Nacitam...</div>}
              {!loadingC && !comments.length && <div style={{color:'#ccc',fontSize:13,padding:'16px 0',textAlign:'center'}}>Zatim zadna aktivita</div>}
              {comments.map(c => (
                <div key={c.id} style={{display:'flex',gap:10,marginBottom:12}}>
                  <div style={{width:30,height:30,borderRadius:'50%',flexShrink:0,background:(aC[c.autor]||'#888')+'22',display:'flex',alignItems:'center',justifyContent:'center',fontSize:12,fontWeight:500,color:aC[c.autor]||'#666'}}>{c.autor.slice(0,1)}</div>
                  <div style={{flex:1}}>
                    <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:3}}>
                      <span style={{fontSize:13,fontWeight:500,color:aC[c.autor]||'#333'}}>{c.autor}</span>
                      <span style={{fontSize:11,color:'#bbb'}}>{fmt(c.created_at)}</span>
                      <button onClick={() => deleteComment(c.id)} style={{marginLeft:'auto',background:'none',border:'none',color:'#ddd',cursor:'pointer',fontSize:14}}>&times;</button>
                    </div>
                    <div style={{fontSize:13,color:'#333',lineHeight:1.6,background:'#f8f8f6',borderRadius:8,padding:'8px 12px',whiteSpace:'pre-wrap'}}>{c.text}</div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'dokumenty' && (
            <div style={{marginBottom:14}}>
              <div style={{display:'flex',justifyContent:'flex-end',marginBottom:10}}>
                <label style={{padding:'6px 16px',borderRadius:8,border:'0.5px solid #534AB7',background:'#EEEDFE',color:'#534AB7',fontSize:13,cursor:'pointer',fontWeight:500,display:'inline-flex',alignItems:'center',gap:6}}>
                  {uploading ? 'Nahravám...' : '+ Nahrat soubor'}
                  <input type="file" onChange={uploadDoc} style={{display:'none'}} disabled={uploading} />
                </label>
              </div>
              {!docs.length && <div style={{color:'#ccc',fontSize:13,textAlign:'center',padding:'24px 0'}}>Zadne dokumenty</div>}
              {docs.map(doc => (
                <div key={doc.id} style={{display:'flex',alignItems:'center',gap:10,padding:'10px 12px',background:'#f8f8f6',borderRadius:8,marginBottom:6}}>
                  <span>PDF</span>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontSize:13,fontWeight:500,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{doc.nazev}</div>
                    <div style={{fontSize:11,color:'#aaa'}}>{doc.velikost} KB</div>
                  </div>
                  <a href={doc.url} target="_blank" rel="noreferrer" style={{padding:'4px 12px',borderRadius:6,border:'0.5px solid #534AB7',background:'#EEEDFE',color:'#534AB7',fontSize:12,textDecoration:'none'}}>Otevrit</a>
                  <button onClick={() => deleteDoc(doc)} style={{padding:'4px 8px',borderRadius:6,border:'0.5px solid #A32D2D',background:'#fff',color:'#A32D2D',fontSize:12,cursor:'pointer',fontFamily:'inherit'}}>X</button>
                </div>
              ))}
            </div>
          )}
        </div>

        {activeTab === 'aktivita' && (
          <div style={{padding:'12px 24px 20px',borderTop:'0.5px solid #f0f0f0'}}>
            <div style={{display:'flex',gap:8,marginBottom:8,alignItems:'center'}}>
              <span style={{fontSize:12,color:'#888'}}>Pisu jako:</span>
              {['Karel','Radim','Ales'].map(a => (
                <button key={a} onClick={() => setAutor(a)} style={{
                  padding:'3px 12px',borderRadius:10,fontSize:12,cursor:'pointer',fontFamily:'inherit',
                  border:'0.5px solid ' + (autor===a ? (aC[a]||'#534AB7') : '#e0e0e0'),
                  background: autor===a ? (aC[a]||'#534AB7')+'18' : '#fff',
                  color: autor===a ? (aC[a]||'#534AB7') : '#888',
                  fontWeight: autor===a ? 500 : 400
                }}>{a}</button>
              ))}
            </div>
            <div style={{display:'flex',gap:8}}>
              <textarea value={newText} onChange={e => setNewText(e.target.value)}
                onKeyDown={e => { if(e.key==='Enter' && e.metaKey) sendComment() }}
                placeholder="Napiste komentar... (Cmd+Enter)"
                style={{flex:1,padding:'8px 12px',borderRadius:8,border:'0.5px solid #ddd',fontSize:13,fontFamily:'inherit',resize:'none',height:72}}
              />
              <button className="btn accent" onClick={sendComment} disabled={sending||!newText.trim()} style={{alignSelf:'flex-end',height:36}}>
                {sending ? '...' : 'Odeslat'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── MODAL FORMULÁŘ ───────────────────────────────────────────────────────────
const LeadModal = ({ lead, onSave, onDelete, onClose }) => {
  const [form, setForm] = useState(lead || EMPTY_LEAD)
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))
  const fi = (k) => ({ value: form[k] || '', onChange: e => set(k, e.target.value) })

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-head">
          <h2>{lead ? 'Upravit lead' : 'Nový lead'}</h2>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>
        <div className="modal-body">
          <div className="form-grid">
            <div className="form-row"><label>Název firmy *</label><input {...fi('firma')} placeholder="Acme s.r.o." /></div>
            <div className="form-row"><label>Kontaktní osoba</label><input {...fi('osoba')} placeholder="Jan Novák" /></div>
          </div>
          <div className="form-grid">
            <div className="form-row"><label>Role</label>
              <select {...fi('role')}>{['CEO','CFO','IT ředitel','Jiná'].map(o=><option key={o}>{o}</option>)}</select>
            </div>
            <div className="form-row"><label>Segment</label>
              <select {...fi('segment')}>{['Přímý klient','Multiplikátor','Finanční sektor (DORA)','Veřejná správa'].map(o=><option key={o}>{o}</option>)}</select>
            </div>
          </div>
          <div className="form-grid">
            <div className="form-row"><label>Email</label><input type="email" {...fi('email')} /></div>
            <div className="form-row"><label>Telefon</label><input {...fi('telefon')} /></div>
          </div>
          <div className="form-grid">
            <div className="form-row"><label>Odvětví</label>
              <select {...fi('odvetvi')}>{['Energetika','Zdravotnictví','Doprava','IT/Tech','Výroba','Finance','Logistika','Jiné'].map(o=><option key={o}>{o}</option>)}</select>
            </div>
            <div className="form-row"><label>Zdroj leadu</label>
              <select {...fi('zdroj')}>{['Vlastní síť','Referral','LinkedIn','Agentura','Warm lead Talkey','Event'].map(o=><option key={o}>{o}</option>)}</select>
            </div>
          </div>
          <div className="form-grid">
            <div className="form-row"><label>Produkt zájem</label>
              <select {...fi('produkt')}>{['Review NIS2','Check DORA','Program NIS2','Program DORA','Lorenc','Kyber.testy','Neznámý'].map(o=><option key={o}>{o}</option>)}</select>
            </div>
            <div className="form-row"><label>Stav</label>
              <select {...fi('stav')}>{STAVS.map(o=><option key={o}>{o}</option>)}</select>
            </div>
          </div>
          <div className="form-grid">
            <div className="form-row"><label>Cena nabídky (Kč)</label><input type="number" {...fi('cena')} placeholder="36000" /></div>
            <div className="form-row"><label>Pravděpodobnost</label>
              <select {...fi('prob')}>{['Nízká (0–30 %)','Střední (30–70 %)','Vysoká (70–100 %)'].map(o=><option key={o}>{o}</option>)}</select>
            </div>
          </div>
          <div className="form-grid">
            <div className="form-row"><label>Kdo vede obchod</label>
              <select {...fi('vede')}>{['Karel','Radim','Aleš'].map(o=><option key={o}>{o}</option>)}</select>
            </div>
            <div className="form-row"><label>Datum next follow-upu</label><input type="date" {...fi('followup')} /></div>
          </div>
          <div className="form-grid">
            <div className="form-row"><label>Datum 1. kontaktu</label><input type="date" {...fi('d1')} /></div>
            <div className="form-row"><label>Hlavní námitka</label>
              <select {...fi('namitka')}>{['','Cena','Timing','Interní řešení','Potřebuje schválení','Není zájem','Jiné'].map(o=><option key={o} value={o}>{o||'—'}</option>)}</select>
            </div>
          </div>
          <div className="form-row"><label>Poznámky z callu</label>
            <textarea {...fi('poznamky')} placeholder="Co říkali, co bolí, co rozhoduje..." />
          </div>
        </div>
        <div className="modal-foot">
          {lead && <button className="btn danger" onClick={() => { if(window.confirm('Smazat?')) onDelete(lead.id) }}>Smazat</button>}
          <button className="btn" onClick={onClose}>Zrušit</button>
          <button className="btn accent" onClick={() => { if(!form.firma.trim()){alert('Zadej název firmy');return} onSave(form) }}>Uložit</button>
        </div>
      </div>
    </div>
  )
}

// ─── KANBAN ────────────────────────────────────────────────────────────────────
const KanbanView = ({ leads, onOpen, onStavChange }) => {
  const t = today()
  const [dragging, setDragging] = useState(null)
  const [dragOver, setDragOver] = useState(null)

  const handleDragStart = (e, lead) => {
    setDragging(lead)
    e.dataTransfer.effectAllowed = 'move'
  }

  const handleDragOver = (e, stav) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    setDragOver(stav)
  }

  const handleDrop = (e, newStav) => {
    e.preventDefault()
    if (dragging && dragging.stav !== newStav) {
      onStavChange(dragging, newStav)
    }
    setDragging(null)
    setDragOver(null)
  }

  const handleDragEnd = () => {
    setDragging(null)
    setDragOver(null)
  }

  return (
    <div className="kanban">
      {KANBAN_STAVS.map(stav => {
        const cards = leads.filter(l => l.stav === stav)
        const isOver = dragOver === stav
        return (
          <div
            className="kanban-col"
            key={stav}
            onDragOver={e => handleDragOver(e, stav)}
            onDrop={e => handleDrop(e, stav)}
            style={{ transition: 'background 0.15s' }}
          >
            <div className="col-header" style={{ color: isOver ? '#534AB7' : undefined }}>
              <span>{stav}</span>
              <span className="col-count">{cards.length}</span>
            </div>
            <div style={{
              minHeight: 60,
              borderRadius: 8,
              border: isOver ? '2px dashed #534AB7' : '2px dashed transparent',
              background: isOver ? '#EEEDFE' : 'transparent',
              transition: 'all 0.15s',
              padding: isOver ? '4px' : '0',
            }}>
              {!cards.length && !isOver && <div className="empty-col">Prázdné</div>}
              {cards.map(l => {
                const overdue = l.followup && l.followup <= t
                const isDragging = dragging?.id === l.id
                return (
                  <div
                    className="kanban-card"
                    key={l.id}
                    draggable
                    onDragStart={e => handleDragStart(e, l)}
                    onDragEnd={handleDragEnd}
                    onClick={() => !dragging && onOpen(l)}
                    style={{
                      opacity: isDragging ? 0.4 : 1,
                      cursor: 'grab',
                      transform: isDragging ? 'rotate(2deg)' : 'none',
                      transition: 'opacity 0.15s, transform 0.15s',
                    }}
                  >
                    <div className="card-firm">{l.firma}</div>
                    <div className="card-person">{l.osoba || '—'} · {l.role}</div>
                    <div className="card-tags">
                      <ProdTag produkt={l.produkt} />
                      <ProbTag prob={l.prob} />
                    </div>
                    {l.followup && (
                      <div className={`card-followup ${overdue ? 'overdue' : ''}`}>
                        📅 {l.followup}{overdue ? ' — dnes!' : ''}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ─── TABLE ────────────────────────────────────────────────────────────────────
const TableView = ({ leads, onOpen }) => {
  const t = today()
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Firma</th><th>Osoba</th><th>Segment</th><th>Produkt</th>
            <th>Stav</th><th>Cena (Kč)</th><th>Vede</th><th>Follow-up</th>
          </tr>
        </thead>
        <tbody>
          {!leads.length && <tr><td colSpan={8} style={{textAlign:'center',color:'#bbb',padding:'32px'}}>Žádné záznamy</td></tr>}
          {leads.map(l => {
            const overdue = l.followup && l.followup <= t
            return (
              <tr key={l.id} onClick={() => onOpen(l)}>
                <td style={{fontWeight:500}}>{l.firma}</td>
                <td>{l.osoba || '—'}</td>
                <td><span className="tag tag-neu">{l.segment}</span></td>
                <td><ProdTag produkt={l.produkt} /></td>
                <td><StavBadge stav={l.stav} /></td>
                <td>{l.cena ? Number(l.cena).toLocaleString('cs') : '—'}</td>
                <td>{l.vede}</td>
                <td style={{color: overdue ? '#A32D2D' : 'inherit', fontWeight: overdue ? 500 : 400}}>{l.followup || '—'}</td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

// ─── FOLLOWUP VIEW ────────────────────────────────────────────────────────────
const FollowupView = ({ leads, onOpen }) => {
  const t = today()
  const fu = leads.filter(l => l.followup && l.followup <= t && !l.stav.includes('Uzavřeno'))
  return (
    <div>
      <p style={{marginBottom:12,fontSize:13,color:'#888'}}>{fu.length} lead{fu.length!==1?'ů':''} čeká na follow-up dnes nebo po termínu</p>
      <div className="table-wrap">
        <table>
          <thead><tr><th>Firma</th><th>Osoba</th><th>Stav</th><th>Follow-up</th><th>Námitka</th><th>Poznámky</th></tr></thead>
          <tbody>
            {!fu.length && <tr><td colSpan={6} style={{textAlign:'center',color:'#bbb',padding:'32px'}}>Žádný follow-up dnes 🎉</td></tr>}
            {fu.map(l => (
              <tr key={l.id} onClick={() => onOpen(l)}>
                <td style={{fontWeight:500}}>{l.firma}</td>
                <td>{l.osoba || '—'}</td>
                <td><StavBadge stav={l.stav} /></td>
                <td style={{color:'#A32D2D',fontWeight:500}}>{l.followup}</td>
                <td>{l.namitka || '—'}</td>
                <td style={{fontSize:12,color:'#888',maxWidth:180}}>{(l.poznamky||'').slice(0,70)}{l.poznamky?.length>70?'...':''}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ─── MULTIPLIKATORI ───────────────────────────────────────────────────────────
const MultiplikatoriView = ({ leads, onOpen }) => {
  const mp = leads.filter(l => l.segment === 'Multiplikátor')
  return (
    <div>
      <p style={{marginBottom:12,fontSize:13,color:'#888'}}>{mp.length} partnerů a zprostředkovatelů</p>
      <div className="table-wrap">
        <table>
          <thead><tr><th>Firma</th><th>Osoba</th><th>Odvětví</th><th>Stav</th><th>Zdroj</th><th>Vede</th><th>Poznámky</th></tr></thead>
          <tbody>
            {!mp.length && <tr><td colSpan={7} style={{textAlign:'center',color:'#bbb',padding:'32px'}}>Žádní multiplikátoři — přidej přes + Nový lead</td></tr>}
            {mp.map(l => (
              <tr key={l.id} onClick={() => onOpen(l)}>
                <td style={{fontWeight:500}}>{l.firma}</td>
                <td>{l.osoba || '—'}</td>
                <td>{l.odvetvi}</td>
                <td><StavBadge stav={l.stav} /></td>
                <td>{l.zdroj}</td>
                <td>{l.vede}</td>
                <td style={{fontSize:12,color:'#888',maxWidth:180}}>{(l.poznamky||'').slice(0,60)}{l.poznamky?.length>60?'...':''}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ─── DISCOVERY CALL SCRIPT ────────────────────────────────────────────────────
const phases = [
  { id:'prep', label:'Příprava', title:'Příprava před callem', meta:'5 minut před callem',
    script: null,
    questions:['Zjistil jsem odvětví a velikost firmy','Vím jméno a roli kontaktní osoby','Vím zda spadají pod NIS2 nebo DORA','Vím jak jsem se k nim dostal','Mám připravenou pauzu po nabídce'],
    tips:{ label:'Pravidla callu', items:['Mluv max 30 % času — oni 70 %','Nikdy nepřerušuj','Pauza po nabídce = NEŘÍKEJ NIC','Cíl: pochopit situaci, ne prodat'] },
    namitky: null
  },
  { id:'open', label:'Otevření', title:'Otevření callu', meta:'0–3 min · Nastavit agendu',
    script:{ label:'Co říkáš', text:'"Ahoj [Jméno], díky za čas. Plánoval jsem nám 30 minut — chci to dodržet. Agenda je jednoduchá: pár otázek abych pochopil kde stojíte, pak vám řeknu co vidíme u podobných firem, a na konci se rozhodneme jestli dává smysl jít dál nebo ne. Žádný tlak. Hodí se vám to tak?"' },
    questions:['Potvrdili agendu callu','Atmosféra je uvolněná'],
    tips:{ label:'Proč to funguje', items:['Říkáš že žádný tlak — snižuje defenzivu','Souhlas s agendou = první micro-yes'] },
    namitky: null
  },
  { id:'diag', label:'Diagnostika', title:'Diagnostika', meta:'3–15 min · NEDĚLEJ PITCH',
    script:{ label:'Otevírací otázka', text:'"Nejdřív mi řekněte — jak velká je vaše organizace a kdo u vás za IT a bezpečnost odpovídá?"' },
    questions:['Velikost firmy (zaměstnanci, obrat)','Kdo odpovídá za IT a bezpečnost','Mají interního CISO?','Co slyšeli o NIS2/DORA','Dělali někdy analýzu rizik nebo audit','Co je přivedlo k tématu teď','Kdo by byl odpovědný při auditu','Identifikoval jsem hlavní bolest'],
    tips:{ label:'Signály které hledáš', items:['Neví zda spadají → velká příležitost','Nemají CISO → příležitost pro Program','Říkají "řešíme interně" → zjisti jak daleko jsou','Říkají "ještě počkáme" → zjisti na co'] },
    namitky: null
  },
  { id:'edu', label:'Edukace', title:'Edukace a pozicování', meta:'15–23 min · Mluv o jejich situaci',
    script:{ label:'Pokud neví zda spadají pod NIS2', text:'"Na základě toho co jste mi řekl — s vysokou pravděpodobností pod NIS2 spadáte. Zákon platí od listopadu 2025. NÚKIB může přijít na audit kdykoliv. A odpovědnost není jen firemní — váš ředitel může být pokutován osobně. Pokuty jsou až 10 milionů euro nebo 2 % obratu, záleží co je vyšší."' },
    questions:['Zmínil jsem osobní odpovědnost managementu','Zmínil jsem konkrétní výši pokut','Vytvořil jsem urgenci bez strašení'],
    tips:{ label:'Varianty podle situace', items:['Neví kde stojí → "Pracuji na tom při auditu nestačí"','Nemají CISO → "Zákon třetí možnost nezná"','Říkají že to řeší → "Víte přesně kde stojíte?"'] },
    namitky: null
  },
  { id:'offer', label:'Nabídka', title:'Nabídka', meta:'23–28 min · Přirozený první krok',
    script:{ label:'Jak nabídnout Review', text:'"Na základě toho co jsme si řekli — nejchytřejší první krok je udělat analýzu kde přesně stojíte. Říkáme tomu riscare Review. Formou videokonzultace projdeme váš stav, dostanete zprávu a konkrétní akční plán. Výstup do dvou týdnů. Cena je 36 000 Kč bez DPH."' },
    questions:['Nabídl jsem Review jako přirozený krok','Nechal jsem pauzu po ceně','Reagoval jsem správnou variantou'],
    tips: null,
    namitky:[
      { q:'"Kolik to přesně stojí?"', a:'"36 000 Kč je cena s partnerskou slevou — standardní je 45 000 Kč. Jednorázová platba, žádný závazek."' },
      { q:'"Musím to probrat s kolegy."', a:'"Samozřejmě. Pošlu vám shrnutí do zítra. Kdy byste měli jasno — příští týden?"' },
      { q:'"Ještě počkáme."', a:'"Na co konkrétně čekáte? Ptám se abych pochopil co vám chybí k rozhodnutí."' },
      { q:'"Řešíme to interně."', a:'"Jak daleko jste — máte analýzu rizik, obsazené role? Někdy děláme nezávislý pohled pro potvrzení."' },
      { q:'"Je to drahé."', a:'"Alternativa je investovat do věcí které nepotřebujete. Review je přesně o tom aby investice šla tam kde to dává smysl."' },
    ]
  },
  { id:'close', label:'Uzavření', title:'Uzavření a next step', meta:'28–30 min · Vždy konkrétní krok',
    script:{ label:'Pokud je zájem', text:'"Výborně. Pošlu vám dnes shrnutí a jednoduchou objednávku. Jakmile potvrdíte, domluvíme vstupní konzultaci — jsme schopni začít do týdne. Na jakou emailovou adresu to mám poslat?"' },
    questions:['Dohodli jsme konkrétní next step','Vím kdy a jak se ozvou','Mám email pro zaslání nabídky','Do 24h pošlu follow-up email'],
    tips:{ label:'Pravidlo uzavření', items:['Zájem → nabídka dnes','Potřebují čas → konkrétní datum follow-upu','Není pro ně → požádej o referral','NIKDY nekonči bez data dalšího kontaktu'] },
    namitky: null
  },
]

const DiscoveryScript = () => {
  const [current, setCurrent] = useState(0)
  const [checked, setChecked] = useState({})
  const [openNamitka, setOpenNamitka] = useState(null)
  const [timerSec, setTimerSec] = useState(1800)
  const [running, setRunning] = useState(false)

  useEffect(() => {
    if (!running) return
    const i = setInterval(() => setTimerSec(s => Math.max(0, s - 1)), 1000)
    return () => clearInterval(i)
  }, [running])

  const p = phases[current]
  const toggleCheck = (key) => setChecked(c => ({ ...c, [key]: !c[key] }))
  const totalQ = phases.reduce((s,ph) => s + (ph.questions?.length || 0), 0)
  const totalDone = Object.values(checked).filter(Boolean).length
  const m = Math.floor(timerSec/60), s = timerSec%60

  return (
    <div>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:16}}>
        <div>
          <div style={{fontSize:16,fontWeight:500}}>Discovery call průvodce</div>
          <div style={{fontSize:12,color:'#888',marginTop:2}}>{totalDone} / {totalQ} bodů splněno</div>
        </div>
        <div style={{display:'flex',alignItems:'center',gap:10}}>
          <div style={{fontSize:22,fontWeight:500,fontVariantNumeric:'tabular-nums',color:timerSec<300?'#A32D2D':'inherit'}}>
            {m}:{s.toString().padStart(2,'0')}
          </div>
          <button className="btn" onClick={() => setRunning(r=>!r)}>{running?'Pause':'Start'}</button>
          <button className="btn" onClick={() => {setRunning(false);setTimerSec(1800)}}>Reset</button>
        </div>
      </div>

      <div style={{display:'flex',gap:4,marginBottom:16,flexWrap:'wrap'}}>
        {phases.map((ph,i) => (
          <span key={ph.id} onClick={() => setCurrent(i)} style={{
            padding:'4px 12px',borderRadius:10,fontSize:12,cursor:'pointer',
            background: i===current ? '#EEEDFE' : i<current ? '#E1F5EE' : '#f5f5f3',
            color: i===current ? '#534AB7' : i<current ? '#0F6E56' : '#888',
            border: `0.5px solid ${i===current?'#AFA9EC':i<current?'#5DCAA5':'#e8e8e8'}`,
          }}>{ph.label}</span>
        ))}
      </div>

      <div style={{fontSize:11,color:'#aaa',textTransform:'uppercase',letterSpacing:'0.5px',marginBottom:6}}>Fáze {current+1} / {phases.length}</div>
      <div style={{fontSize:18,fontWeight:500,marginBottom:4}}>{p.title}</div>
      <div style={{fontSize:13,color:'#888',marginBottom:16}}>{p.meta}</div>

      {p.script && (
        <div className="script-box">
          <div className="script-label">{p.script.label}</div>
          <div className="script-text">{p.script.text}</div>
        </div>
      )}

      {p.questions && (
        <div style={{marginBottom:14}}>
          <div style={{fontSize:12,fontWeight:500,color:'#888',marginBottom:8}}>Checklist</div>
          {p.questions.map((q,i) => {
            const key = p.id+'_'+i
            const done = checked[key]
            return (
              <div key={i} className={`checklist-item ${done?'done':''}`} onClick={() => toggleCheck(key)}>
                <div className="check-circle">{done?'✓':''}</div>
                <span style={{fontSize:13}}>{q}</span>
              </div>
            )
          })}
        </div>
      )}

      {p.tips && (
        <div className="tip-box" style={{marginBottom:14}}>
          <div className="tip-label">{p.tips.label}</div>
          <ul>{p.tips.items.map((t,i) => <li key={i}>{t}</li>)}</ul>
        </div>
      )}

      {p.namitky && (
        <div style={{marginBottom:14}}>
          <div style={{fontSize:12,fontWeight:500,color:'#888',marginBottom:8}}>Časté námitky</div>
          {p.namitky.map((n,i) => (
            <div key={i} className="namitka-item">
              <div className="namitka-head" onClick={() => setOpenNamitka(openNamitka===i?null:i)}>
                <span>{n.q}</span><span>{openNamitka===i?'▲':'▼'}</span>
              </div>
              <div className={`namitka-body ${openNamitka===i?'open':''}`}>{n.a}</div>
            </div>
          ))}
        </div>
      )}

      <div style={{display:'flex',justifyContent:'space-between',marginTop:16}}>
        <button className="btn" onClick={() => setCurrent(c=>Math.max(0,c-1))} disabled={current===0}>← Zpět</button>
        <button className="btn accent" onClick={() => setCurrent(c=>Math.min(phases.length-1,c+1))} disabled={current===phases.length-1}>
          {current===phases.length-1?'Hotovo ✓':'Další →'}
        </button>
      </div>
    </div>
  )
}

// ─── EMAIL TEMPLATE ───────────────────────────────────────────────────────────
const PRODUKTY = ['Review NIS2','Check DORA','Program NIS2','Program DORA','Lorenc NIS2','Lorenc DORA','Kyber.testy']

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
}
const FAZE = ['První kontakt','Po discovery callu','Follow-up','Uzavření']

const emailTemplates = {
  'Review NIS2': {
    'První kontakt': {
      subject: 'NIS2 — víte kde vaše firma stojí?',
      body: `Ahoj [Jméno],

dostalo se ke mně že se pohybuješ v [odvětví] — a proto ti píšu.

Od listopadu 2025 platí nový zákon o kybernetické bezpečnosti. S velkou pravděpodobností se týká i vaší firmy. Osobní odpovědnost managementu, pokuty až 10 mil. EUR.

Spolupracuji se společností Talkey — jejich produkt riscare Review NIS2 je jednorázová analýza kde přesně stojíte, s konkrétním akčním plánem co dělat dál. Výstup do 2 týdnů, žádný závazek.

Hodí se 20 minut call kde to posoudíme?

Karel Petros
Key Account Manager | Talkey a.s. | riscare`,
    },
    'Po discovery callu': {
      subject: 'Shrnutí našeho hovoru — riscare Review NIS2',
      body: `Ahoj [Jméno],

díky za dnešní rozhovor. Jak jsem slíbil, posílám shrnutí.

Na základě toho co jsme si řekli:
• [Firma] s vysokou pravděpodobností spadá pod NIS2
• [Konkrétní mezera z callu — doplň]
• [Konkrétní mezera z callu — doplň]

Navrhovaný první krok: riscare Review NIS2

Co dostanete:
• Vstupní videokonzultace — projdeme váš stav vůči NIS2
• Výstupní zpráva — co splňujete, co chybí, co je kritické
• Akční plán — konkrétní kroky v doporučeném pořadí
• Výstupní videokonzultace — projdeme výsledky spolu

Cena: 36 000 Kč bez DPH (partnerská sleva 20 % ze standardních 45 000 Kč).
Závazek: žádný.

Stačí odpovědět na tento email — jsme schopni začít do týdne.

Karel Petros
Key Account Manager | Talkey a.s. | riscare`,
    },
    'Follow-up': {
      subject: 'Re: riscare Review NIS2 — [Název firmy]',
      body: `Ahoj [Jméno],

ozývám se jestli jsi měl čas se na to podívat.

Neptám se kvůli tlaku — pokud je nějaká otázka nebo nejasnost, rád to dořeším.

Pokud timing není teď správný, dej mi vědět kdy by se to hodilo víc.

Jen pro připomenutí — riscare Review NIS2 je jednorázová analýza za 36 000 Kč bez DPH. Výstup do 2 týdnů, žádný závazek.

Karel Petros
Key Account Manager | Talkey a.s. | riscare`,
    },
    'Uzavření': {
      subject: 'Objednávka — riscare Review NIS2',
      body: `Ahoj [Jméno],

výborně, jsem rád že jdeme do toho.

V příloze je objednávkový formulář pro riscare Review NIS2. Po potvrzení a úhradě zálohy domluvíme vstupní videokonzultaci — jsme schopni začít do týdne.

Shrnutí:
• Produkt: riscare Review NIS2
• Cena: 36 000 Kč bez DPH
• Výstup: do 2 týdnů od zahájení

Těším se na spolupráci.

Karel Petros
Key Account Manager | Talkey a.s. | riscare`,
    },
  },
  'Check DORA': {
    'První kontakt': {
      subject: 'DORA — jak na tom jste po lednu 2025?',
      body: `Ahoj [Jméno],

DORA platí od 17. ledna 2025. Finanční sektor je pod dohledem CNB a cas na "jeste to doladime" se krati.

Spolupracuji se společností Talkey — riscare Check DORA je hloubková analýza vaší připravenosti vůči DORA a RTS požadavkům. Výstup je zpráva plus akční plán přesně pro váš typ instituce.

Hodíte se na krátký call?

Karel Petros
Key Account Manager | Talkey a.s. | riscare`,
    },
    'Po discovery callu': {
      subject: 'Shrnutí našeho hovoru — riscare Check DORA',
      body: `Ahoj [Jméno],

díky za dnešní rozhovor. Posílám shrnutí a návrh dalšího kroku.

Na základě toho co jsme si řekli:
• [Typ instituce] spadá plně pod DORA od ledna 2025
• [Konkrétní oblast k řešení — doplň]
• [Konkrétní oblast k řešení — doplň]

Navrhovaný první krok: riscare Check DORA

Co dostanete:
• Screening vůči checklistu DORA a RTS
• Projdeme vaši stávající dokumentaci
• Výstupní zpráva s hodnocením požadavků
• Akční plán doporučení
• Výstupní videokonzultace

7 klíčových oblastí: Governance, Rizení ICT rizik, Incident management, Testování, Business Continuity, Rízení tretích stran, Threat intelligence.

Cena: 75 000 Kc / 45 000 Kc bez DPH (zjednodušený systém rízení rizika).

Karel Petros
Key Account Manager | Talkey a.s. | riscare`,
    },
    'Follow-up': {
      subject: 'Re: riscare Check DORA — [Název instituce]',
      body: `Ahoj [Jméno],

ozývám se jestli jsi měl čas se na nabídku podívat.

Pokud by pomohlo projít to osobně s Radimem Hofrichterem, naším technickým ředitelem, rád to domluvím.

Dej mi vědět.

Karel Petros
Key Account Manager | Talkey a.s. | riscare`,
    },
    'Uzavření': {
      subject: 'Objednávka — riscare Check DORA',
      body: `Ahoj [Jméno],

výborně. V příloze je objednávka pro riscare Check DORA.

Shrnutí:
• Produkt: riscare Check DORA
• Cena: [75 000 / 45 000] Kc bez DPH
• Výstup: zpráva plus akční plán

Po potvrzení domluvíme vstupní videokonzultaci.

Karel Petros
Key Account Manager | Talkey a.s. | riscare`,
    },
  },
  'Program NIS2': {
    'První kontakt': {
      subject: 'NIS2 compliance bez vlastního CISO — je to možné',
      body: `Ahoj [Jméno],

většina firem které musí plnit NIS2 nemá interního specialistu. A zákon přesto vyžaduje obsazení konkrétních rolí — manažer KB, manažer rizik, incident manager.

Spolupracuji se společností Talkey — riscare Program NIS2 řeší přesně toto. All-inclusive outsourcing všech zákonem požadovaných rolí. Jedna smlouva, jeden partner.

Hodí se na 20 minut call?

Karel Petros
Key Account Manager | Talkey a.s. | riscare`,
    },
    'Po discovery callu': {
      subject: 'Shrnutí hovoru — riscare Program NIS2',
      body: `Ahoj [Jméno],

díky za dnešní rozhovor. Posílám přehled programu.

Co je součástí riscare Program NIS2:
• CISO as a Service — odborné vedení bez vlastního specialisty
• Rízení ICT rizik — risk analýza, BIA, registr aktiv
• Rízení IKT dodavatelů — politika, hodnocení rizik, smluvní požadavky
• Incident management — monitoring, detekce, hlášení
• Penetrační testy — každoroční test plus zpráva
• Školení zaměstnanců — praktická školení plus phishing simulace
• Každoroční interní audit

Výsledek: plná NIS2 compliance bez vlastního bezpečnostního týmu.

Rád připravím cenovou nabídku na míru — stačí mi říct velikost firmy a odvětví.

Karel Petros
Key Account Manager | Talkey a.s. | riscare`,
    },
    'Follow-up': {
      subject: 'Re: riscare Program NIS2 — [Název firmy]',
      body: `Ahoj [Jméno],

ozývám se po naší schůzce — jestli jsi měl čas to probrat interně.

Pokud potřebuješ více informací nebo prezentaci pro vedení, rád to připravím.

Karel Petros
Key Account Manager | Talkey a.s. | riscare`,
    },
    'Uzavření': {
      subject: 'Smlouva — riscare Program NIS2',
      body: `Ahoj [Jméno],

výborně, jsem rád že jdeme do spolupráce.

V příloze najdeš návrh smlouvy pro riscare Program NIS2. Prosím o kontrolu a případné připomínky.

Po podpisu naplánujeme kickoff — ustavení systému rízení KB, definice rolí a první kroky.

Těším se na spolupráci.

Karel Petros
Key Account Manager | Talkey a.s. | riscare`,
    },
  },
  'Program DORA': {
    'První kontakt': {
      subject: 'DORA Program — outsourcing všeho co zákon vyžaduje',
      body: `Ahoj [Jméno],

DORA platí od ledna 2025 a CNB začíná dozor zpřísňovat. Pro finanční instituce to znamená konkrétní povinnosti — CISO, risk manager, incident manager, penetrační testy, reporting vůči CNB.

Talkey má produkt riscare Program DORA — pokrývá všechny tyto povinnosti formou outsourcingu. Jedna smlouva místo 3-4 specialistů.

Hodí se na krátký call?

Karel Petros
Key Account Manager | Talkey a.s. | riscare`,
    },
    'Po discovery callu': {
      subject: 'Shrnutí hovoru — riscare Program DORA',
      body: `Ahoj [Jméno],

díky za dnešní rozhovor. Posílám přehled programu.

riscare Program DORA obsahuje:
• CISO as a Service — vedení systému digitální provozní odolnosti
• Reporting vůči CNB — registr IKT dodavatelů, incident reporting, registr rizik
• Rízení ICT rizik — risk analýza, BIA, identifikace aktiv
• Rízení IKT dodavatelů — politika, hodnocení, smluvní standardy
• Incident management — monitoring, detekce, hlášení
• Penetrační testy — dle TIBER-EU metodiky
• Testy plánů reakce a obnovy — RTO/RPO parametry
• Školení zaměstnanců

Připravím cenovou nabídku na míru — potřebuji vědět velikost instituce a aktuální stav implementace.

Karel Petros
Key Account Manager | Talkey a.s. | riscare`,
    },
    'Follow-up': {
      subject: 'Re: riscare Program DORA — [Název instituce]',
      body: `Ahoj [Jméno],

ozývám se po naší schůzce.

Pokud by pomohlo sejít se osobně s Radimem a Alešem — rádi přijedeme nebo domluvíme Teams.

Dej mi vědět jak to u vás vypadá.

Karel Petros
Key Account Manager | Talkey a.s. | riscare`,
    },
    'Uzavření': {
      subject: 'Smlouva — riscare Program DORA',
      body: `Ahoj [Jméno],

výborně. V příloze je návrh smlouvy pro riscare Program DORA.

Po podpisu domluvíme kickoff — audit stávajícího stavu, ustavení rolí a nastavení reportingových procesů vůči CNB.

Těším se na spolupráci.

Karel Petros
Key Account Manager | Talkey a.s. | riscare`,
    },
  },
  'Lorenc NIS2': {
    'První kontakt': {
      subject: 'NIS2 mentoring — odborné vedení bez plného outsourcingu',
      body: `Ahoj [Jméno],

pokud chce vaše firma zvládnout NIS2 vlastními silami ale potřebuje odborné vedení — máme přesně to pravé.

riscare Lorenc NIS2 je mentoring od specialistů Talkey. Vy implementujete, my vás vedeme — pravidelné konzultace, odpovědi na konkrétní otázky, review dokumentace.

Levnější než plný outsourcing, efektivnější než jít do toho naslepo.

Hodí se na krátký call?

Karel Petros
Key Account Manager | Talkey a.s. | riscare`,
    },
    'Po discovery callu': {
      subject: 'Shrnutí hovoru — riscare Lorenc NIS2',
      body: `Ahoj [Jméno],

díky za dnešní rozhovor. Lorenc NIS2 je ideální pokud:
• Máte interní kapacitu na implementaci ale chybí expertíza
• Chcete mít kontrolu nad procesem ale potřebujete odborný dohled
• Plný outsourcing je nad rámec aktuálního rozpočtu

Co Lorenc obnáší:
• Pravidelné konzultační sessions
• Review vaší dokumentace a procesů
• Odpovědi na konkrétní otázky při implementaci
• Dohled nad klíčovými milníky

Rád připravím konkrétní nabídku — stačí mi říct kde v implementaci aktuálně jste.

Karel Petros
Key Account Manager | Talkey a.s. | riscare`,
    },
    'Follow-up': {
      subject: 'Re: riscare Lorenc NIS2 — [Název firmy]',
      body: `Ahoj [Jméno],

ozývám se — jestli jsi měl čas to probrat.

Pokud váháte mezi Lorenc a plným Programem, rád to projdeme — pomůžu vám vybrat správný přístup pro vaši situaci.

Karel Petros
Key Account Manager | Talkey a.s. | riscare`,
    },
    'Uzavření': {
      subject: 'Objednávka — riscare Lorenc NIS2',
      body: `Ahoj [Jméno],

výborně. V příloze je objednávka pro riscare Lorenc NIS2.

Po potvrzení domluvíme úvodní session — zmapujeme kde stojíte a nastavíme plán konzultací.

Těším se na spolupráci.

Karel Petros
Key Account Manager | Talkey a.s. | riscare`,
    },
  },
  'Lorenc DORA': {
    'První kontakt': {
      subject: 'DORA mentoring — odborné vedení bez plného outsourcingu',
      body: `Ahoj [Jméno],

DORA je komplexní regulace a mnoho institucí chce implementovat vlastními silami — ale s odborným vedením po boku.

riscare Lorenc DORA je přesně toto. Specialisté Talkey vás provází implementací — pravidelné konzultace, review dokumentace, odpovědi na konkrétní otázky k DORA a RTS.

Hodí se na krátký call?

Karel Petros
Key Account Manager | Talkey a.s. | riscare`,
    },
    'Po discovery callu': {
      subject: 'Shrnutí hovoru — riscare Lorenc DORA',
      body: `Ahoj [Jméno],

díky za dnešní rozhovor. Lorenc DORA je vhodný pokud:
• Máte interní tým který implementuje ale chybí DORA expertíza
• Potřebujete odborný dohled nad klíčovými oblastmi
• Chcete jistotu správného směru před auditem CNB

Rád připravím konkrétní nabídku na míru vaší instituci.

Karel Petros
Key Account Manager | Talkey a.s. | riscare`,
    },
    'Follow-up': {
      subject: 'Re: riscare Lorenc DORA — [Název instituce]',
      body: `Ahoj [Jméno],

ozývám se po naší schůzce — jak to u vás vypadá?

Pokud potřebuješ více podkladů pro rozhodnutí, rád doplním.

Karel Petros
Key Account Manager | Talkey a.s. | riscare`,
    },
    'Uzavření': {
      subject: 'Objednávka — riscare Lorenc DORA',
      body: `Ahoj [Jméno],

výborně. V příloze je objednávka pro riscare Lorenc DORA.

Po potvrzení domluvíme úvodní session — zmapujeme aktuální stav a nastavíme plán konzultací.

Těším se na spolupráci.

Karel Petros
Key Account Manager | Talkey a.s. | riscare`,
    },
  },
  'Kyber.testy': {
    'První kontakt': {
      subject: 'Víte jak odolné jsou vaše systémy vůči útoku?',
      body: `Ahoj [Jméno],

penetrační test je jediný způsob jak zjistit jestli vaše systémy odolají reálnému útoku — před tím než to zjistí útočník.

Talkey provádí penetrační testy a testy zranitelností podle nejnovějších metodik. Výstup je podrobná zpráva s konkrétními doporučeními. Pro firmy pod NIS2 nebo DORA je to navíc zákonná povinnost.

Hodí se na krátký call?

Karel Petros
Key Account Manager | Talkey a.s. | riscare`,
    },
    'Po discovery callu': {
      subject: 'Shrnutí hovoru — Kyber.testy',
      body: `Ahoj [Jméno],

díky za dnešní rozhovor. Na základě toho co jsme si řekli připravím nabídku na:

• [Penetrační test / Test zranitelností / Phishing simulace — doplň]
• Scope: [systémy / aplikace / síť — doplň]
• Metodika: [TIBER-EU / OWASP / custom — doplň]

Výstup bude vždy obsahovat:
• Podrobnou zprávu s výsledky testování
• Klasifikaci zranitelností (kritické / vysoké / střední / nízké)
• Konkrétní doporučení pro každou zranitelnost
• Executive summary pro vedení

Pošlu nabídku do 2 pracovních dnů.

Karel Petros
Key Account Manager | Talkey a.s. | riscare`,
    },
    'Follow-up': {
      subject: 'Re: Kyber.testy — [Název firmy]',
      body: `Ahoj [Jméno],

ozývám se — jak to u vás vypadá s timingem pro penetrační test?

Pokud potřebuješ více informací o metodice nebo rozsahu, rád to doplním.

Karel Petros
Key Account Manager | Talkey a.s. | riscare`,
    },
    'Uzavření': {
      subject: 'Objednávka — Kyber.testy',
      body: `Ahoj [Jméno],

výborně. V příloze je objednávka a technická specifikace testu.

Prosím o potvrzení rozsahu a preferovaného termínu zahájení — minimálně 2 týdny předem kvůli přípravě.

Těším se na spolupráci.

Karel Petros
Key Account Manager | Talkey a.s. | riscare`,
    },
  },
}

const EmailTemplates = () => {
  const [produkt, setProdukt] = useState('Review NIS2')
  const [faze, setFaze] = useState('První kontakt')
  const [copied, setCopied] = useState(false)

  const t = emailTemplates[produkt]?.[faze]

  const copy = () => {
    if (!t) return
    navigator.clipboard.writeText(`Předmět: ${t.subject}\n\n${t.body}`)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div>
      <div style={{display:'flex',gap:12,marginBottom:20,flexWrap:'wrap',alignItems:'center'}}>
        <div>
          <div style={{fontSize:12,color:'#888',marginBottom:6,fontWeight:500}}>Produkt</div>
          <div style={{display:'flex',gap:4,flexWrap:'wrap'}}>
            {PRODUKTY.map(p => (
              <button key={p} onClick={() => setProdukt(p)} style={{
                padding:'5px 12px', borderRadius:8, fontSize:12, cursor:'pointer',
                border:`0.5px solid ${produkt===p?'#534AB7':'#e0e0e0'}`,
                background: produkt===p ? '#EEEDFE' : '#fff',
                color: produkt===p ? '#534AB7' : '#666',
                fontWeight: produkt===p ? 500 : 400,
                fontFamily:'inherit'
              }}>{p}</button>
            ))}
          </div>
        </div>
      </div>

      <div style={{display:'flex',gap:4,marginBottom:20}}>
        {FAZE.map(f => (
          <button key={f} onClick={() => setFaze(f)} style={{
            padding:'6px 16px', borderRadius:8, fontSize:13, cursor:'pointer',
            border:`0.5px solid ${faze===f?'#1D9E75':'#e0e0e0'}`,
            background: faze===f ? '#E1F5EE' : '#fff',
            color: faze===f ? '#0F6E56' : '#666',
            fontWeight: faze===f ? 500 : 400,
            fontFamily:'inherit'
          }}>{f}</button>
        ))}
      </div>

      {t ? (
        <div className="email-card">
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:4}}>
            <div className="email-subject">Předmět:</div>
            <div style={{fontSize:11,color:'#aaa'}}>{produkt} · {faze}</div>
          </div>
          <div className="email-subject-val">{t.subject}</div>
          <div className="email-body">{t.body}</div>
          <button className="copy-btn" onClick={copy}>{copied ? '✓ Zkopírováno!' : 'Kopírovat email'}</button>
        </div>
      ) : (
        <div style={{color:'#aaa',fontSize:13,padding:'32px 0',textAlign:'center'}}>Šablona nenalezena</div>
      )}
    </div>
  )
}

// ─── PDF DOKUMENTY ───────────────────────────────────────────────────────────────
const PdfDocuments = () => {
  const [docs, setDocs] = useState([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [filter, setFilter] = useState('')
  const [kategorie, setKategorie] = useState('')

  const fetchDocs = async () => {
    const { data } = await supabase.from('documents').select('*').order('created_at', { ascending: false })
    setDocs(data || [])
    setLoading(false)
  }

  useEffect(() => { fetchDocs() }, [])

  const upload = async (e) => {
    const file = e.target.files[0]
    if (!file) return
    if (file.type !== 'application/pdf') { alert('Pouze PDF soubory'); return }
    if (file.size > 10 * 1024 * 1024) { alert('Maximální velikost souboru je 10 MB'); return }
    setUploading(true)
    const fileName = `${Date.now()}_${file.name}`
    const { error: uploadError } = await supabase.storage.from('documents').upload(fileName, file)
    if (uploadError) { alert('Chyba při uploadu: ' + uploadError.message); setUploading(false); return }
    const { data: urlData } = supabase.storage.from('documents').getPublicUrl(fileName)
    await supabase.from('documents').insert([{
      nazev: file.name.replace('.pdf', ''),
      soubor: fileName,
      url: urlData.publicUrl,
      velikost: Math.round(file.size / 1024),
      kategorie: kategorie || 'Obecné'
    }])
    e.target.value = ''
    setUploading(false)
    fetchDocs()
  }

  const deleteDoc = async (doc) => {
    if (!window.confirm(`Smazat "${doc.nazev}"?`)) return
    await supabase.storage.from('documents').remove([doc.soubor])
    await supabase.from('documents').delete().eq('id', doc.id)
    fetchDocs()
  }

  const KATEGORIE = ['Factsheet','Nabídka','Smlouva','Prezentace','Obecné']
  const filtered = docs.filter(d => {
    if (filter && !d.nazev.toLowerCase().includes(filter.toLowerCase())) return false
    if (kategorie && d.kategorie !== kategorie) return false
    return true
  })

  const katColor = {
    'Factsheet': {bg:'#E1F5EE',color:'#0F6E56'},
    'Nabídka': {bg:'#EEEDFE',color:'#534AB7'},
    'Smlouva': {bg:'#FCEBEB',color:'#791F1F'},
    'Prezentace': {bg:'#FAEEDA',color:'#854F0B'},
    'Obecné': {bg:'#f0f0ee',color:'#666'},
  }

  return (
    <div>
      <div style={{display:'flex',gap:8,marginBottom:20,flexWrap:'wrap',alignItems:'center'}}>
        <input placeholder="Hledat dokument..." value={filter} onChange={e=>setFilter(e.target.value)}
          style={{height:34,padding:'0 12px',border:'0.5px solid #ddd',borderRadius:8,fontSize:13,width:200,fontFamily:'inherit'}} />
        <select value={kategorie} onChange={e=>setKategorie(e.target.value)}
          style={{height:34,padding:'0 12px',border:'0.5px solid #ddd',borderRadius:8,fontSize:13,fontFamily:'inherit',background:'#fff'}}>
          <option value="">Všechny kategorie</option>
          {KATEGORIE.map(k=><option key={k}>{k}</option>)}
        </select>
        <div style={{marginLeft:'auto',display:'flex',gap:8,alignItems:'center'}}>
          <select value={kategorie} onChange={e=>setKategorie(e.target.value)}
            style={{height:34,padding:'0 12px',border:'0.5px solid #ddd',borderRadius:8,fontSize:13,fontFamily:'inherit',background:'#fff'}}>
            <option value="">Kategorie uploadu...</option>
            {KATEGORIE.map(k=><option key={k}>{k}</option>)}
          </select>
          <label style={{
            height:34,padding:'0 16px',borderRadius:8,border:'0.5px solid #534AB7',
            background:'#534AB7',color:'#fff',fontSize:13,cursor:'pointer',
            display:'flex',alignItems:'center',gap:6,fontWeight:500,whiteSpace:'nowrap'
          }}>
            {uploading ? 'Nahrávám...' : '+ Nahrát PDF'}
            <input type="file" accept=".pdf" onChange={upload} style={{display:'none'}} disabled={uploading} />
          </label>
        </div>
      </div>

      {loading && <div style={{color:'#aaa',fontSize:13,padding:'32px 0',textAlign:'center'}}>Načítám dokumenty...</div>}

      {!loading && !filtered.length && (
        <div style={{color:'#ccc',fontSize:13,padding:'48px 0',textAlign:'center'}}>
          <div style={{fontSize:32,marginBottom:12}}>📄</div>
          <div>Žádné dokumenty — nahraj první PDF</div>
        </div>
      )}

      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(220px,1fr))',gap:12}}>
        {filtered.map(doc => {
          const kat = katColor[doc.kategorie] || katColor['Obecné']
          return (
            <div key={doc.id} style={{
              background:'#fff',border:'0.5px solid #e8e8e8',borderRadius:10,
              padding:'16px',display:'flex',flexDirection:'column',gap:10
            }}>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start'}}>
                <div style={{fontSize:24}}>📄</div>
                <span style={{fontSize:11,padding:'2px 8px',borderRadius:10,background:kat.bg,color:kat.color}}>{doc.kategorie}</span>
              </div>
              <div>
                <div style={{fontSize:13,fontWeight:500,color:'#1a1a1a',marginBottom:3,lineHeight:1.4}}>{doc.nazev}</div>
                <div style={{fontSize:11,color:'#aaa'}}>{doc.velikost} KB · {new Date(doc.created_at).toLocaleDateString('cs-CZ')}</div>
              </div>
              <div style={{display:'flex',gap:6,marginTop:'auto'}}>
                <a href={doc.url} target="_blank" rel="noreferrer" style={{
                  flex:1,padding:'6px 0',borderRadius:8,border:'0.5px solid #534AB7',
                  background:'#EEEDFE',color:'#534AB7',fontSize:12,textAlign:'center',
                  textDecoration:'none',fontWeight:500
                }}>Otevřít</a>
                <button onClick={() => deleteDoc(doc)} style={{
                  padding:'6px 10px',borderRadius:8,border:'0.5px solid #A32D2D',
                  background:'#fff',color:'#A32D2D',fontSize:12,cursor:'pointer',fontFamily:'inherit'
                }}>Smazat</button>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}


// ─── PRŮVODCE STRATEGIÍ ──────────────────────────────────────────────────────
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

// Inline editovatelný text - klikni pro edit, uloží se automaticky
const InlineEdit = ({ value, onSave, style, multiline }) => {
  const [editing, setEditing] = useState(false)
  const [val, setVal] = useState(value)
  const [saving, setSaving] = useState(false)

  const save = async () => {
    if (val === value) { setEditing(false); return }
    setSaving(true)
    await onSave(val)
    setSaving(false)
    setEditing(false)
  }

  if (editing) {
    return multiline ? (
      <textarea
        autoFocus
        value={val}
        onChange={e => setVal(e.target.value)}
        onBlur={save}
        onKeyDown={e => { if(e.key==='Escape') { setVal(value); setEditing(false) } }}
        style={{
          width:'100%', padding:'6px 8px', borderRadius:6,
          border:'0.5px solid #534AB7', fontSize:13, fontFamily:'inherit',
          resize:'vertical', minHeight:60, lineHeight:1.6,
          background:'#fafffe', color:'#333',
          ...style
        }}
      />
    ) : (
      <input
        autoFocus
        value={val}
        onChange={e => setVal(e.target.value)}
        onBlur={save}
        onKeyDown={e => { if(e.key==='Enter') save(); if(e.key==='Escape') { setVal(value); setEditing(false) } }}
        style={{
          width:'100%', padding:'4px 8px', borderRadius:6,
          border:'0.5px solid #534AB7', fontSize:14, fontFamily:'inherit',
          background:'#fafffe', color:'#1a1a1a', fontWeight:500,
          ...style
        }}
      />
    )
  }

  return (
    <div
      onClick={() => setEditing(true)}
      title="Klikni pro editaci"
      style={{
        cursor:'text', borderRadius:6, padding:'2px 4px', margin:'-2px -4px',
        border:'0.5px solid transparent',
        transition:'border-color 0.15s, background 0.15s',
        ...style
      }}
      onMouseEnter={e => { e.currentTarget.style.borderColor='#e0e0e0'; e.currentTarget.style.background='#fafaf8' }}
      onMouseLeave={e => { e.currentTarget.style.borderColor='transparent'; e.currentTarget.style.background='transparent' }}
    >
      {saving ? <span style={{color:'#aaa'}}>Ukládám...</span> : (val || <span style={{color:'#ccc',fontStyle:'italic'}}>Klikni pro editaci...</span>)}
    </div>
  )
}

const PruvodceStrategii = () => {
  const [aktivniMesic, setAktivniMesic] = useState('m1')
  const [splneno, setSplneno] = useState({})
  const [odpovedi, setOdpovedi] = useState({})
  const [texty, setTexty] = useState({})
  const [komentar, setKomentar] = useState({})
  const [komenAutor, setKomenAutor] = useState('Karel')
  const [komenText, setKomenText] = useState({})
  const [otevrenyKomen, setOtevrenyKomen] = useState(null)
  const [sendingKomen, setSendingKomen] = useState(false)
  const [loading, setLoading] = useState(true)
  const [krokOrder, setKrokOrder] = useState({})
  const [dragKrokId, setDragKrokId] = useState(null)
  const [dragKrokOver, setDragKrokOver] = useState(null)

  const aC = { Karel:'#534AB7', Radim:'#0F6E56', Ales:'#854F0B' }

  useEffect(() => {
    const load = async () => {
      const [splRes, odpRes, txtRes, komRes, ordRes] = await Promise.all([
        supabase.from('pruvodce_splneno').select('*'),
        supabase.from('strategic_answers').select('*'),
        supabase.from('pruvodce_texty').select('*'),
        supabase.from('pruvodce_komentare').select('*').order('created_at', { ascending: true }),
        supabase.from('pruvodce_order').select('*'),
      ])
      if (splRes.data) { const m = {}; splRes.data.forEach(r => { m[r.krok_id] = r.splneno }); setSplneno(m) }
      if (odpRes.data) { const m = {}; odpRes.data.forEach(r => { m[r.klic] = r.odpoved }); setOdpovedi(m) }
      if (txtRes.data) { const m = {}; txtRes.data.forEach(r => { m[r.klic] = r.hodnota }); setTexty(m) }
      if (komRes.data) {
        const m = {}
        komRes.data.forEach(r => { if (!m[r.krok_id]) m[r.krok_id] = []; m[r.krok_id].push(r) })
        setKomentar(m)
      }
      if (ordRes.data) { const m = {}; ordRes.data.forEach(r => { m[r.krok_id] = r.pozice }); setKrokOrder(m) }
      setLoading(false)
    }
    load()
  }, [])

  const saveText = async (klic, hodnota) => {
    setTexty(prev => ({ ...prev, [klic]: hodnota }))
    const existing = texty[klic] !== undefined
    if (existing) await supabase.from('pruvodce_texty').update({ hodnota }).eq('klic', klic)
    else await supabase.from('pruvodce_texty').insert([{ klic, hodnota }])
  }

  const getText = (krok, pole) => {
    const klic = krok.id + '_' + pole
    return texty[klic] !== undefined ? texty[klic] : krok[pole]
  }

  const toggleSplneno = async (id) => {
    const nove = !splneno[id]
    setSplneno(prev => ({ ...prev, [id]: nove }))
    const existing = splneno[id] !== undefined
    if (existing) await supabase.from('pruvodce_splneno').update({ splneno: nove }).eq('krok_id', id)
    else await supabase.from('pruvodce_splneno').insert([{ krok_id: id, splneno: nove }])
  }

  const sendKomentar = async (krokId) => {
    const text = komenText[krokId]?.trim()
    if (!text) return
    setSendingKomen(true)
    const { data } = await supabase.from('pruvodce_komentare').insert([{ krok_id: krokId, autor: komenAutor, text }]).select()
    if (data) setKomentar(prev => ({ ...prev, [krokId]: [...(prev[krokId]||[]), data[0]] }))
    setKomenText(prev => ({ ...prev, [krokId]: '' }))
    setSendingKomen(false)
  }

  const deleteKomentar = async (krokId, komId) => {
    if (!window.confirm('Smazat?')) return
    await supabase.from('pruvodce_komentare').delete().eq('id', komId)
    setKomentar(prev => ({ ...prev, [krokId]: prev[krokId].filter(k => k.id !== komId) }))
  }

  const getKrokyMesice = (mid) => {
    const kroky = KROKY.filter(k => k.mesic === mid)
    return [...kroky].sort((a, b) => {
      const pa = krokOrder[a.id] ?? KROKY.findIndex(k => k.id === a.id)
      const pb = krokOrder[b.id] ?? KROKY.findIndex(k => k.id === b.id)
      return pa - pb
    })
  }

  const handleDragStart = (e, krokId) => {
    setDragKrokId(krokId)
    e.dataTransfer.effectAllowed = 'move'
  }

  const handleDrop = async (e, targetId, targetMesic) => {
    e.preventDefault()
    if (!dragKrokId || dragKrokId === targetId) { setDragKrokId(null); setDragKrokOver(null); return }

    const allKroky = [...KROKY]
    const fromKrok = allKroky.find(k => k.id === dragKrokId)
    const targetKrok = allKroky.find(k => k.id === targetId)

    const noveMesicFrom = targetMesic
    const noveMesicTarget = fromKrok.mesic

    const novyOrder = { ...krokOrder }
    const targetPozice = krokOrder[targetId] ?? allKroky.findIndex(k => k.id === targetId)
    const fromPozice = krokOrder[dragKrokId] ?? allKroky.findIndex(k => k.id === dragKrokId)

    novyOrder[dragKrokId] = targetPozice
    novyOrder[targetId] = fromPozice

    setKrokOrder(novyOrder)

    await Promise.all([
      supabase.from('pruvodce_order').upsert([
        { krok_id: dragKrokId, pozice: targetPozice, mesic: targetMesic },
        { krok_id: targetId, pozice: fromPozice, mesic: fromKrok.mesic },
      ])
    ])

    setDragKrokId(null)
    setDragKrokOver(null)
  }

  const getMesicKroku = (krokId) => {
    const saved = null
    return saved || KROKY.find(k => k.id === krokId)?.mesic
  }

  const krokyMesice = getKrokyMesice
  const splnenoMesice = (mid) => krokyMesice(mid).filter(k => splneno[k.id]).length
  const celkemSplneno = KROKY.filter(k => splneno[k.id]).length
  const prioritaBarva = { 'kritická': '#A32D2D', 'vysoká': '#854F0B', 'střední': '#185FA5' }
  const prioritaBg = { 'kritická': '#FCEBEB', 'vysoká': '#FAEEDA', 'střední': '#E6F1FB' }
  const fmt = (iso) => new Date(iso).toLocaleString('cs-CZ', { day:'numeric', month:'short', hour:'2-digit', minute:'2-digit' })

  if (loading) return <div style={{color:'#aaa',padding:'32px 0',textAlign:'center'}}>Načítám...</div>

  return (
    <div>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:20}}>
        <div style={{fontSize:13,color:'#888'}}>
          Splněno {celkemSplneno} z {KROKY.length} kroků · <span style={{fontSize:12,color:'#bbb'}}>Texty editovatelné kliknutím · Kroky přesouvatelné tažením</span>
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
            <button key={m.id} onClick={() => setAktivniMesic(m.id)}
              onDragOver={e => { e.preventDefault(); setDragKrokOver('mesic_' + m.id) }}
              onDrop={async e => {
                e.preventDefault()
                if (!dragKrokId) return
                const pozice = KROKY.findIndex(k => k.id === dragKrokId)
                const novyOrder = { ...krokOrder, [dragKrokId]: pozice }
                setKrokOrder(novyOrder)
                await supabase.from('pruvodce_order').upsert([{ krok_id: dragKrokId, pozice, mesic: m.id }])
                setDragKrokId(null); setDragKrokOver(null)
              }}
              style={{
                flex:1,padding:'14px 16px',borderRadius:10,cursor:'pointer',fontFamily:'inherit',
                border:'0.5px solid ' + (dragKrokOver==='mesic_'+m.id ? m.barva : active ? m.barva : '#e0e0e0'),
                background: dragKrokOver==='mesic_'+m.id ? m.bg : active ? m.bg : '#fff',
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
          const mesic = MESICE.find(m => m.id === aktivniMesic)
          const dynOdp = krok.dynamicke ? odpovedi[krok.dynamicke.klic]?.trim() : null
          const dynZprava = dynOdp
            ? (dynOdp.toLowerCase().includes('ne') || dynOdp.toLowerCase().includes('0') || dynOdp.toLowerCase().includes('žádn')
                ? krok.dynamicke.ne : krok.dynamicke.ano)
            : null
          const komentare = komentar[krok.id] || []
          const isDragging = dragKrokId === krok.id
          const isOver = dragKrokOver === krok.id

          return (
            <div
              key={krok.id}
              draggable
              onDragStart={e => handleDragStart(e, krok.id)}
              onDragOver={e => { e.preventDefault(); setDragKrokOver(krok.id) }}
              onDrop={e => handleDrop(e, krok.id, aktivniMesic)}
              onDragEnd={() => { setDragKrokId(null); setDragKrokOver(null) }}
              style={{
                background:'#fff',
                border:'0.5px solid ' + (isOver ? '#534AB7' : done ? '#5DCAA5' : '#e8e8e8'),
                borderRadius:12,overflow:'hidden',
                opacity: isDragging ? 0.4 : done ? 0.85 : 1,
                cursor:'grab',
                transform: isOver ? 'scale(1.01)' : 'none',
                transition:'transform 0.1s, border-color 0.1s',
              }}
            >
              <div style={{padding:'14px 20px',display:'flex',alignItems:'center',gap:12,borderBottom: done && !komentare.length ? 'none' : '0.5px solid #f5f5f3'}}>
                <div style={{fontSize:14,color:'#ddd',cursor:'grab',flexShrink:0,userSelect:'none'}}>⠿</div>
                <button onClick={() => toggleSplneno(krok.id)} style={{
                  width:28,height:28,borderRadius:'50%',border:'0.5px solid ' + (done ? '#1D9E75' : '#ddd'),
                  background: done ? '#1D9E75' : '#fff',color:'#fff',fontSize:14,cursor:'pointer',
                  display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0
                }}>{done ? '✓' : ''}</button>
                <div style={{flex:1}}>
                  <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:2}}>
                    <span style={{fontSize:11,padding:'2px 7px',borderRadius:10,background:prioritaBg[krok.priorita],color:prioritaBarva[krok.priorita],fontWeight:500}}>{krok.priorita}</span>
                    <span style={{fontSize:11,color:'#aaa'}}>Týden {krok.tyden}</span>
                    {komentare.length > 0 && <span style={{fontSize:11,color:'#888'}}>💬 {komentare.length}</span>}
                  </div>
                  <InlineEdit
                    value={getText(krok, 'nazev')}
                    onSave={v => saveText(krok.id + '_nazev', v)}
                    style={{fontSize:14,fontWeight:500,color: done ? '#888' : '#1a1a1a',textDecoration: done ? 'line-through' : 'none'}}
                  />
                </div>
                <button onClick={() => setOtevrenyKomen(otevrenyKomen===krok.id ? null : krok.id)} style={{
                  padding:'4px 10px',borderRadius:8,border:'0.5px solid #e0e0e0',background:'#fff',
                  fontSize:12,color:'#888',cursor:'pointer',fontFamily:'inherit',flexShrink:0
                }}>💬 Komentáře</button>
              </div>

              {!done && (
                <div style={{padding:'14px 20px 16px 64px'}}>
                  <div style={{marginBottom:12}}>
                    <div style={{fontSize:11,color:'#aaa',fontWeight:500,marginBottom:6,textTransform:'uppercase'}}>Proč</div>
                    <InlineEdit value={getText(krok,'proc')} onSave={v=>saveText(krok.id+'_proc',v)} multiline={true} style={{fontSize:13,color:'#555',lineHeight:1.6}} />
                  </div>
                  <div style={{marginBottom:12}}>
                    <div style={{fontSize:11,color:'#aaa',fontWeight:500,marginBottom:6,textTransform:'uppercase'}}>Jak na to</div>
                    <InlineEdit value={getText(krok,'jak')} onSave={v=>saveText(krok.id+'_jak',v)} multiline={true} style={{fontSize:13,color:'#333',lineHeight:1.6}} />
                  </div>
                  <div style={{background:'#f5f5f3',borderRadius:8,padding:'10px 14px',marginBottom:dynZprava?10:0}}>
                    <div style={{fontSize:11,color:'#aaa',fontWeight:500,marginBottom:6,textTransform:'uppercase'}}>Cíl</div>
                    <InlineEdit value={getText(krok,'cil')} onSave={v=>saveText(krok.id+'_cil',v)} style={{fontSize:13,color:'#333',fontWeight:500}} />
                  </div>
                  {dynZprava && (
                    <div style={{background:mesic.bg,border:'0.5px solid '+mesic.barva+'44',borderRadius:8,padding:'10px 14px',marginTop:10}}>
                      <div style={{fontSize:11,color:mesic.barva,fontWeight:500,marginBottom:3}}>Podle vašich odpovědí:</div>
                      <div style={{fontSize:13,color:mesic.barva}}>{dynZprava}</div>
                    </div>
                  )}
                </div>
              )}

              {otevrenyKomen===krok.id && (
                <div style={{borderTop:'0.5px solid #f0f0f0',padding:'14px 20px 16px 64px'}}>
                  {komentare.length === 0 && <div style={{fontSize:12,color:'#ccc',marginBottom:12,textAlign:'center'}}>Zatím žádné komentáře</div>}
                  {komentare.map(c => (
                    <div key={c.id} style={{display:'flex',gap:8,marginBottom:10}}>
                      <div style={{width:26,height:26,borderRadius:'50%',flexShrink:0,background:(aC[c.autor]||'#888')+'22',display:'flex',alignItems:'center',justifyContent:'center',fontSize:11,fontWeight:500,color:aC[c.autor]||'#666'}}>{c.autor.slice(0,1)}</div>
                      <div style={{flex:1}}>
                        <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:2}}>
                          <span style={{fontSize:12,fontWeight:500,color:aC[c.autor]||'#333'}}>{c.autor}</span>
                          <span style={{fontSize:11,color:'#bbb'}}>{fmt(c.created_at)}</span>
                          <button onClick={() => deleteKomentar(krok.id, c.id)} style={{marginLeft:'auto',background:'none',border:'none',color:'#ddd',cursor:'pointer',fontSize:13}}>&times;</button>
                        </div>
                        <div style={{fontSize:13,color:'#333',background:'#f8f8f6',borderRadius:8,padding:'6px 10px',lineHeight:1.5}}>{c.text}</div>
                      </div>
                    </div>
                  ))}
                  <div style={{display:'flex',gap:8,marginTop:8,alignItems:'flex-end'}}>
                    <div style={{display:'flex',gap:4,marginBottom:4,flexShrink:0}}>
                      {['Karel','Radim','Ales'].map(a => (
                        <button key={a} onClick={() => setKomenAutor(a)} style={{
                          padding:'2px 8px',borderRadius:8,fontSize:11,cursor:'pointer',fontFamily:'inherit',
                          border:'0.5px solid '+(komenAutor===a?(aC[a]||'#534AB7'):'#e0e0e0'),
                          background:komenAutor===a?(aC[a]||'#534AB7')+'18':'#fff',
                          color:komenAutor===a?(aC[a]||'#534AB7'):'#888',fontWeight:komenAutor===a?500:400
                        }}>{a}</button>
                      ))}
                    </div>
                    <textarea
                      value={komenText[krok.id]||''}
                      onChange={e => setKomenText(prev=>({...prev,[krok.id]:e.target.value}))}
                      onKeyDown={e => { if(e.key==='Enter'&&e.metaKey) sendKomentar(krok.id) }}
                      placeholder="Komentář... (Cmd+Enter)"
                      style={{flex:1,padding:'6px 10px',borderRadius:8,border:'0.5px solid #ddd',fontSize:13,fontFamily:'inherit',resize:'none',height:56}}
                    />
                    <button onClick={() => sendKomentar(krok.id)} disabled={sendingKomen||!komenText[krok.id]?.trim()} className="btn accent" style={{height:36,alignSelf:'flex-end'}}>
                      {sendingKomen?'...':'Odeslat'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── PRODUKTY PŘEHLED ────────────────────────────────────────────────────────
const ProduktyPrehled = () => {
  const vsechny = Object.entries(PRODUKTY_INFO)
  return (
    <div>
      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(300px,1fr))',gap:14}}>
        {vsechny.map(([nazev, info]) => (
          <div key={nazev} style={{background:'#fff',border:'0.5px solid #e8e8e8',borderRadius:12,overflow:'hidden'}}>
            <div style={{background:info.bg,borderBottom:'0.5px solid ' + info.barva + '33',padding:'14px 18px',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
              <div style={{fontSize:15,fontWeight:500,color:info.barva}}>{nazev}</div>
              <span style={{fontSize:11,padding:'2px 8px',borderRadius:10,background:'#fff',color:info.barva,border:'0.5px solid ' + info.barva + '44'}}>{info.typ}</span>
            </div>
            <div style={{padding:'14px 18px'}}>
              <div style={{fontSize:13,color:'#555',lineHeight:1.6,marginBottom:12}}>{info.popis}</div>
              <div style={{display:'flex',alignItems:'center',gap:6}}>
                <span style={{fontSize:11,color:'#aaa'}}>Cena:</span>
                <span style={{fontSize:13,fontWeight:500,color:'#1a1a1a'}}>{info.cena}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div style={{marginTop:24,background:'#fff',border:'0.5px solid #e8e8e8',borderRadius:12,overflow:'hidden'}}>
        <div style={{padding:'14px 24px',borderBottom:'0.5px solid #f0f0f0',fontWeight:500,fontSize:15}}>Upsell mapa</div>
        <div style={{padding:'20px 24px',overflowX:'auto'}}>
          <div style={{display:'flex',gap:0,alignItems:'stretch',minWidth:600}}>
            {[
              { label:'riscare Review NIS2', sub:'36 000 Kč', bg:'#E1F5EE', color:'#0F6E56', arrow:true },
              { label:'Akční plán', sub:'výstup', bg:'#f5f5f3', color:'#888', arrow:true },
              { label:'Lorenc NIS2', sub:'mentoring', bg:'#FAEEDA', color:'#854F0B', arrow:false },
              { label:'Program NIS2', sub:'all-inclusive', bg:'#EEEDFE', color:'#534AB7', arrow:false },
            ].map((item, i) => (
              <div key={i} style={{display:'flex',alignItems:'center',gap:0}}>
                <div style={{background:item.bg,borderRadius:8,padding:'12px 16px',textAlign:'center',minWidth:130}}>
                  <div style={{fontSize:12,fontWeight:500,color:item.color}}>{item.label}</div>
                  <div style={{fontSize:11,color:item.color,opacity:0.7,marginTop:2}}>{item.sub}</div>
                </div>
                {item.arrow && <div style={{fontSize:20,color:'#ccc',padding:'0 8px'}}>→</div>}
                {!item.arrow && i===2 && <div style={{fontSize:20,color:'#ccc',padding:'0 8px'}}>/</div>}
              </div>
            ))}
          </div>
          <div style={{marginTop:12,fontSize:12,color:'#aaa'}}>Stejná logika platí pro DORA: Check DORA → Lorenc DORA → Program DORA</div>
        </div>
      </div>
    </div>
  )
}

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

// ─── HLAVNÍ APP ───────────────────────────────────────────────────────────────
export default function App() {
  const [authed, setAuthed] = useState(false)
  const [pw, setPw] = useState('')
  const [pwErr, setPwErr] = useState('')
  const [leads, setLeads] = useState([])
  const [loading, setLoading] = useState(false)
  const [tab, setTab] = useState('kanban')
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
  const [dragNavOver, setDragNavOver] = useState(null)
  const [modal, setModal] = useState(null) // null | 'new' | lead object
  const [detail, setDetail] = useState(null) // lead object pro detail s komentáři
  const [search, setSearch] = useState('')
  const [filtrSeg, setFiltrSeg] = useState('')
  const [filtrProd, setFiltrProd] = useState('')
  const [filtrVede, setFiltrVede] = useState('')

  const login = () => {
    if (pw === APP_PASSWORD) { setAuthed(true); setPwErr('') }
    else setPwErr('Nesprávné heslo')
  }

  const fetchLeads = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase.from('leads').select('*').order('created_at', { ascending: false })
    setLeads(data || [])
    setLoading(false)
  }, [])

  useEffect(() => { if (authed) fetchLeads() }, [authed, fetchLeads])

  const saveLead = async (form) => {
    try {
      const cleanForm = { ...form }
      delete cleanForm.id
      delete cleanForm.created_at
      if (modal && modal.id) {
        const { error } = await supabase.from('leads').update(cleanForm).eq('id', modal.id)
        if (error) { alert('Chyba update: ' + error.message); console.error(error); return }
        if (modal.stav !== cleanForm.stav) {
          await slackZmenaStavu(cleanForm.firma, modal.stav, cleanForm.stav, cleanForm.vede)
        }
      } else {
        const { error } = await supabase.from('leads').insert([cleanForm])
        if (error) { alert('Chyba insert: ' + error.message); console.error(error); return }
        await slackNovyLead(cleanForm)
      }
      setModal(null)
      setDetail(null)
      fetchLeads()
    } catch(e) {
      alert('Neočekávaná chyba: ' + e.message)
      console.error(e)
    }
  }

  const deleteLead = async (id) => {
    await supabase.from('leads').delete().eq('id', id)
    setModal(null)
    fetchLeads()
  }

  const changeStav = async (lead, newStav) => {
    const { error } = await supabase.from('leads').update({ stav: newStav }).eq('id', lead.id)
    if (!error) {
      await slackZmenaStavu(lead.firma, lead.stav, newStav, lead.vede)
      fetchLeads()
    }
  }

  const filtered = leads.filter(l => {
    if (search && !l.firma?.toLowerCase().includes(search.toLowerCase()) && !l.osoba?.toLowerCase().includes(search.toLowerCase())) return false
    if (filtrSeg && l.segment !== filtrSeg) return false
    if (filtrProd && l.produkt !== filtrProd) return false
    if (filtrVede && l.vede !== filtrVede) return false
    return true
  })

  const t = today()
  const active = leads.filter(l => !l.stav?.includes('Uzavřeno'))
  const won = leads.filter(l => l.stav === 'Uzavřeno — vyhráno')
  const rev = won.reduce((s,l) => s + (Number(l.cena)||0), 0)
  const fuCount = active.filter(l => l.followup && l.followup <= t).length

  const NAV = [
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
  ]

  if (!authed) return (
    <div className="login-wrap">
      <div className="login-card">
        <div style={{fontSize:28,marginBottom:8}}>🛡️</div>
        <h1>riscare CRM</h1>
        <p>Talkey a.s. · Interní systém</p>
        <input type="password" placeholder="Heslo" value={pw}
          onChange={e => setPw(e.target.value)}
          onKeyDown={e => e.key==='Enter' && login()} />
        <button className="btn-primary" onClick={login}>Přihlásit se</button>
        {pwErr && <div className="login-error">{pwErr}</div>}
      </div>
    </div>
  )

  return (
    <div className="app-layout">
      <div className="sidebar">
        <div className="sidebar-logo">
          <div className="logo">riscare CRM</div>
          <div className="sub">Talkey a.s.</div>
        </div>
        {navOrder.map((nid, idx) => {
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
        })}
        <div className="sidebar-user">
          <div>Karel Petros</div>
          <button className="logout-btn" onClick={() => setAuthed(false)}>Odhlásit se</button>
        </div>
      </div>

      <div className="main">
        <div className="page-header">
          <h1>{{kanban:'Pipeline',table:'Všechny leady',followup:'Follow-up dnes',multiplikatori:'Multiplikátoři',discovery:'Discovery call script',email:'Email šablony',dokumenty:'Dokumenty',strategie:'Strategický plán prodeje',produkty:'Portfolio produktů',pruvodce:'Průvodce strategií'}[tab]}</h1>
          <p>{{kanban:'Vizuální přehled obchodů podle fáze',table:'Kompletní seznam s filtry',followup:'Leady které čekají na tvůj kontakt',multiplikatori:'Partneři a zprostředkovatelé',discovery:'Průvodce pro 30minutový prodejní hovor',email:'Šablony připravené k odeslání',dokumenty:'Factsheets, nabídky a další PDF',strategie:'Brainstorming pro čtvrteční meeting — odpovědi se ukládají pro všechny',produkty:'Přehled produktů riscare s popisky a cenami',pruvodce:'Krok za krokem — co dělat a kdy. Sdílené pro celý tým.'}[tab]}</p>
        </div>

        {['kanban','table','followup','multiplikatori'].includes(tab) && (
          <>
            <div className="metrics">
              <div className="metric-card"><div className="label">Aktivní leady</div><div className="val">{active.length}</div><div className="sub">v pipeline</div></div>
              <div className="metric-card"><div className="label">Uzavřeno</div><div className="val">{won.length}</div><div className="sub">vyhráno</div></div>
              <div className="metric-card"><div className="label">Revenue</div><div className="val">{rev.toLocaleString('cs')}</div><div className="sub">Kč</div></div>
              <div className={`metric-card ${fuCount>0?'alert':''}`}><div className="label">Follow-up dnes</div><div className="val">{fuCount}</div><div className="sub">čeká</div></div>
            </div>
            <div className="toolbar">
              <input placeholder="Hledat..." value={search} onChange={e=>setSearch(e.target.value)} style={{width:160}} />
              <select value={filtrSeg} onChange={e=>setFiltrSeg(e.target.value)}>
                <option value="">Všechny segmenty</option>
                {['Přímý klient','Multiplikátor','Finanční sektor (DORA)','Veřejná správa'].map(o=><option key={o}>{o}</option>)}
              </select>
              <select value={filtrProd} onChange={e=>setFiltrProd(e.target.value)}>
                <option value="">Všechny produkty</option>
                {['Review NIS2','Check DORA','Program NIS2','Program DORA','Lorenc','Kyber.testy'].map(o=><option key={o}>{o}</option>)}
              </select>
              <select value={filtrVede} onChange={e=>setFiltrVede(e.target.value)}>
                <option value="">Všichni</option>
                {['Karel','Radim','Aleš'].map(o=><option key={o}>{o}</option>)}
              </select>
              <button className="btn accent" onClick={() => setModal('new')}>+ Nový lead</button>
            </div>
          </>
        )}

        {loading && <div className="loading">Načítám data...</div>}
        {!loading && tab==='kanban' && <KanbanView leads={filtered} onOpen={setDetail} onStavChange={changeStav} />}
        {!loading && tab==='table' && <TableView leads={filtered} onOpen={setDetail} />}
        {!loading && tab==='followup' && <FollowupView leads={filtered} onOpen={setDetail} />}
        {!loading && tab==='multiplikatori' && <MultiplikatoriView leads={filtered} onOpen={setDetail} />}
        {tab==='discovery' && <DiscoveryScript />}
        {tab==='email' && <EmailTemplates />}
        {tab==='dokumenty' && <PdfDocuments />}
        {tab==='strategie' && <StrategickyPlan />}
        {tab==='pruvodce' && <PruvodceStrategii />}
        {tab==='produkty' && <ProduktyPrehled />}
      </div>

      {detail && (
        <LeadDetail
          lead={detail}
          onEdit={(l) => { setDetail(null); setModal(l) }}
          onClose={() => setDetail(null)}
        />
      )}

      {modal && (
        <LeadModal
          lead={modal === 'new' ? null : modal}
          onSave={async (form) => { await saveLead(form); if(detail) setDetail({...detail,...form}) }}
          onDelete={deleteLead}
          onClose={() => setModal(null)}
        />
      )}
    </div>
  )
}
