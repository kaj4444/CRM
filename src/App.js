import React, { useState, useEffect, useCallback } from 'react'
import './index.css'
import { supabase, APP_PASSWORD } from './supabase'

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
  const [comments, setComments] = useState([])
  const [newText, setNewText] = useState('')
  const [autor, setAutor] = useState('Karel')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)

  const fetchComments = useCallback(async () => {
    const { data } = await supabase
      .from('comments')
      .select('*')
      .eq('lead_id', lead.id)
      .order('created_at', { ascending: true })
    setComments(data || [])
    setLoading(false)
  }, [lead.id])

  useEffect(() => { fetchComments() }, [fetchComments])

  const sendComment = async () => {
    if (!newText.trim()) return
    setSending(true)
    await supabase.from('comments').insert([{
      lead_id: lead.id,
      autor,
      text: newText.trim()
    }])
    setNewText('')
    await fetchComments()
    setSending(false)
  }

  const deleteComment = async (id) => {
    if (!window.confirm('Smazat komentář?')) return
    await supabase.from('comments').delete().eq('id', id)
    fetchComments()
  }

  const formatDate = (iso) => {
    const d = new Date(iso)
    return d.toLocaleDateString('cs-CZ', { day:'numeric', month:'short' }) +
      ' ' + d.toLocaleTimeString('cs-CZ', { hour:'2-digit', minute:'2-digit' })
  }

  const autorColor = { Karel:'#534AB7', Radim:'#0F6E56', Aleš:'#854F0B' }

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
            <button className="close-btn" onClick={onClose}>×</button>
          </div>
        </div>

        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'8px 24px',padding:'16px 24px',borderBottom:'0.5px solid #f0f0f0',fontSize:13}}>
          {lead.email && <div><span style={{color:'#888'}}>Email: </span>{lead.email}</div>}
          {lead.telefon && <div><span style={{color:'#888'}}>Tel: </span>{lead.telefon}</div>}
          {lead.produkt && <div><span style={{color:'#888'}}>Produkt: </span>{lead.produkt}</div>}
          {lead.cena && <div><span style={{color:'#888'}}>Cena: </span>{Number(lead.cena).toLocaleString('cs')} Kč</div>}
          {lead.followup && <div><span style={{color:'#888'}}>Follow-up: </span>{lead.followup}</div>}
          {lead.vede && <div><span style={{color:'#888'}}>Vede: </span>{lead.vede}</div>}
          {lead.zdroj && <div><span style={{color:'#888'}}>Zdroj: </span>{lead.zdroj}</div>}
          {lead.prob && <div><span style={{color:'#888'}}>Pravd.: </span>{lead.prob}</div>}
        </div>

        {lead.poznamky && (
          <div style={{padding:'12px 24px',borderBottom:'0.5px solid #f0f0f0',fontSize:13,color:'#555',background:'#fafaf8'}}>
            <div style={{fontSize:11,color:'#aaa',marginBottom:4,fontWeight:500,textTransform:'uppercase',letterSpacing:'0.4px'}}>Poznámky</div>
            {lead.poznamky}
          </div>
        )}

        <div style={{padding:'16px 24px 0'}}>
          <div style={{fontSize:13,fontWeight:500,marginBottom:12}}>
            Aktivita · {comments.length} {comments.length===1?'komentář':'komentářů'}
          </div>

          <div style={{maxHeight:280,overflowY:'auto',marginBottom:16}}>
            {loading && <div style={{color:'#aaa',fontSize:13,padding:'16px 0'}}>Načítám...</div>}
            {!loading && !comments.length && (
              <div style={{color:'#ccc',fontSize:13,padding:'16px 0',textAlign:'center'}}>Zatím žádná aktivita — přidej první komentář</div>
            )}
            {comments.map(c => (
              <div key={c.id} style={{display:'flex',gap:10,marginBottom:14}}>
                <div style={{
                  width:32,height:32,borderRadius:'50%',flexShrink:0,
                  background: autorColor[c.autor] ? autorColor[c.autor]+'22' : '#f0f0ee',
                  display:'flex',alignItems:'center',justifyContent:'center',
                  fontSize:12,fontWeight:500,
                  color: autorColor[c.autor] || '#666'
                }}>
                  {c.autor.slice(0,1)}
                </div>
                <div style={{flex:1}}>
                  <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:3}}>
                    <span style={{fontSize:13,fontWeight:500,color: autorColor[c.autor] || '#333'}}>{c.autor}</span>
                    <span style={{fontSize:11,color:'#bbb'}}>{formatDate(c.created_at)}</span>
                    <button onClick={() => deleteComment(c.id)} style={{marginLeft:'auto',background:'none',border:'none',color:'#ddd',cursor:'pointer',fontSize:14,lineHeight:1,padding:'0 2px'}}>×</button>
                  </div>
                  <div style={{fontSize:13,color:'#333',lineHeight:1.6,background:'#f8f8f6',borderRadius:8,padding:'8px 12px',whiteSpace:'pre-wrap'}}>{c.text}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div style={{padding:'12px 24px 20px',borderTop:'0.5px solid #f0f0f0'}}>
          <div style={{display:'flex',gap:8,marginBottom:8,alignItems:'center'}}>
            <span style={{fontSize:12,color:'#888'}}>Píšu jako:</span>
            {['Karel','Radim','Aleš'].map(a => (
              <button key={a} onClick={() => setAutor(a)} style={{
                padding:'3px 12px',borderRadius:10,fontSize:12,cursor:'pointer',
                border:`0.5px solid ${autor===a ? autorColor[a] : '#e0e0e0'}`,
                background: autor===a ? autorColor[a]+'18' : '#fff',
                color: autor===a ? autorColor[a] : '#888',
                fontWeight: autor===a ? 500 : 400
              }}>{a}</button>
            ))}
          </div>
          <div style={{display:'flex',gap:8}}>
            <textarea
              value={newText}
              onChange={e => setNewText(e.target.value)}
              onKeyDown={e => { if(e.key==='Enter' && e.metaKey) sendComment() }}
              placeholder="Napiš komentář... (Cmd+Enter pro odeslání)"
              style={{flex:1,padding:'8px 12px',borderRadius:8,border:'0.5px solid #ddd',fontSize:13,fontFamily:'inherit',resize:'none',height:72}}
            />
            <button className="btn accent" onClick={sendComment} disabled={sending||!newText.trim()} style={{alignSelf:'flex-end',height:36}}>
              {sending ? '...' : 'Odeslat'}
            </button>
          </div>
        </div>
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
const KanbanView = ({ leads, onOpen }) => {
  const t = today()
  return (
    <div className="kanban">
      {KANBAN_STAVS.map(stav => {
        const cards = leads.filter(l => l.stav === stav)
        return (
          <div className="kanban-col" key={stav}>
            <div className="col-header">
              <span>{stav}</span>
              <span className="col-count">{cards.length}</span>
            </div>
            {!cards.length && <div className="empty-col">Prázdné</div>}
            {cards.map(l => {
              const overdue = l.followup && l.followup <= t
              return (
                <div className="kanban-card" key={l.id} onClick={() => onOpen(l)}>
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
const emailTemplates = [
  {
    label:'Standardní follow-up',
    subject:'Shrnutí našeho hovoru + návrh dalšího kroku — [Název firmy]',
    body:`Ahoj [Jméno],

díky za dnešní rozhovor — oceňuji tvůj čas a otevřenost.

Jak jsem slíbil, posílám shrnutí toho co jsme řešili a konkrétní návrh jak pokračovat.

Co jsme si řekli

Na základě našeho hovoru vidím u [Název firmy] tuto situaci:
• [Odvětví a velikost — např. "Působíte v logistice, přibližně 120 zaměstnanců"]
• [Co z toho plyne — např. "S vysokou pravděpodobností spadáte pod NIS2"]
• [Co víte nebo nevíte — např. "Dosud jste neměli formální analýzu rizik"]
• [Hlavní zájem — např. "Chcete vědět co přesně musíte udělat a v jakém pořadí"]

Navrhovaný první krok

Doporučuji začít s riscare Review NIS2 — jednorázová analýza vašeho aktuálního stavu vůči požadavkům zákona.

Co dostanete:
• Vstupní videokonzultace — projdeme váš stav pomocí checklistu NIS2
• Výstupní zpráva — hodnocení každého požadavku (splněno / nesplněno / kritická mezera)
• Akční plán — konkrétní kroky v doporučeném pořadí
• Výstupní videokonzultace — projdeme výsledky a navedeme vás na nejbližší kroky

Časový rámec: výstup do 2 týdnů od zahájení.
Cena: 36 000 Kč bez DPH (standardní cena 45 000 Kč, partnerská sleva 20 %).
Závazek: žádný — Review je jednorázové.

Jak pokračovat

Stačí odpovědět na tento email nebo mi zavolat. Pošlu ti jednoduchou objednávku a domluvíme vstupní konzultaci — jsme schopni začít do týdne.

S pozdravem
Karel Petros
Key Account Manager | Talkey a.s. | riscare`,
  },
  {
    label:'Varianta — cena jako námitka',
    subject:'Re: riscare Review — [Název firmy]',
    body:`Ahoj [Jméno],

rozumím že 36 000 Kč je rozhodnutí které chce schválení.

Pro usnadnění — Review je jednorázový náklad bez dalšího závazku. Jeho výstupem je přesný přehled co musíte udělat. Alternativa je postupovat naslepo a riskovat investice do věcí které nepotřebujete — nebo přehlédnout co je kritické.

Pokud by pomohlo projít to osobně s Radimem Hofrichterem, naším technickým ředitelem — rád to domluvím.

Jde mi o to abyste měli jistotu že to dává smysl, ne o rychlé uzavření.

Karel Petros | Talkey a.s. | riscare`,
  },
  {
    label:'Follow-up po 5 dnech bez odpovědi',
    subject:'Re: Shrnutí našeho hovoru — [Název firmy]',
    body:`Ahoj [Jméno],

jen krátce — ozývám se jestli jsi měl čas se na to podívat.

Neptám se kvůli tlaku. Ptám se protože pokud je tam otázka nebo nejasnost na kterou jsem neodpověděl, rád to dořeším.

Pokud timing není teď správný — v pořádku. Dej mi vědět kdy by se to hodilo víc.

Karel`,
  },
]

const EmailTemplates = () => {
  const [selected, setSelected] = useState(0)
  const [copied, setCopied] = useState(false)
  const t = emailTemplates[selected]

  const copy = () => {
    navigator.clipboard.writeText(`Předmět: ${t.subject}\n\n${t.body}`)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div>
      <div className="inner-tabs">
        {emailTemplates.map((t,i) => (
          <button key={i} className={`inner-tab ${selected===i?'active':''}`} onClick={() => setSelected(i)}>{t.label}</button>
        ))}
      </div>
      <div className="email-card">
        <div className="email-subject">Předmět:</div>
        <div className="email-subject-val">{t.subject}</div>
        <div className="email-body">{t.body}</div>
        <button className="copy-btn" onClick={copy}>{copied ? '✓ Zkopírováno!' : 'Kopírovat email'}</button>
      </div>
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
      } else {
        const { error } = await supabase.from('leads').insert([cleanForm])
        if (error) { alert('Chyba insert: ' + error.message); console.error(error); return }
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
        {NAV.map(n => (
          <div key={n.id} className={`nav-item ${tab===n.id?'active':''}`} onClick={() => setTab(n.id)}>
            <span className="nav-icon">{n.icon}</span>
            <span>{n.label}</span>
            {n.id==='followup' && fuCount>0 && (
              <span style={{marginLeft:'auto',background:'#A32D2D',color:'#fff',borderRadius:10,padding:'1px 7px',fontSize:11}}>{fuCount}</span>
            )}
          </div>
        ))}
        <div className="sidebar-user">
          <div>Karel Petros</div>
          <button className="logout-btn" onClick={() => setAuthed(false)}>Odhlásit se</button>
        </div>
      </div>

      <div className="main">
        <div className="page-header">
          <h1>{{kanban:'Pipeline',table:'Všechny leady',followup:'Follow-up dnes',multiplikatori:'Multiplikátoři',discovery:'Discovery call script',email:'Email šablony'}[tab]}</h1>
          <p>{{kanban:'Vizuální přehled obchodů podle fáze',table:'Kompletní seznam s filtry',followup:'Leady které čekají na tvůj kontakt',multiplikatori:'Partneři a zprostředkovatelé',discovery:'Průvodce pro 30minutový prodejní hovor',email:'Šablony připravené k odeslání'}[tab]}</p>
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
        {!loading && tab==='kanban' && <KanbanView leads={filtered} onOpen={setDetail} />}
        {!loading && tab==='table' && <TableView leads={filtered} onOpen={setDetail} />}
        {!loading && tab==='followup' && <FollowupView leads={filtered} onOpen={setDetail} />}
        {!loading && tab==='multiplikatori' && <MultiplikatoriView leads={filtered} onOpen={setDetail} />}
        {tab==='discovery' && <DiscoveryScript />}
        {tab==='email' && <EmailTemplates />}
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
