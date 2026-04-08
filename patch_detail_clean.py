# -*- coding: utf-8 -*-
with open('src/App.js', 'r', encoding='utf-8') as f:
    content = f.read()

old_start = "// ─── LEAD DETAIL S KOMENTÁŘI ─────────────────────────────────────────────────"
old_end = "// ─── MODAL FORMULÁŘ ───────────────────────────────────────────────────────────────"
idx = content.find(old_start)
idx_end = content.find(old_end)
old_block = content[idx:idx_end]

new_block = """// ─── LEAD DETAIL S KOMENTÁŘI ─────────────────────────────────────────────────
const LeadDetail = ({ lead, onEdit, onClose }) => {
  const [tab, setTab] = useState('aktivita')
  const [comments, setComments] = useState([])
  const [newText, setNewText] = useState('')
  const [autor, setAutor] = useState('Karel')
  const [loadingC, setLoadingC] = useState(true)
  const [sending, setSending] = useState(false)
  const [docs, setDocs] = useState([])
  const [uploading, setUploading] = useState(false)

  const autorColor = { Karel:'#534AB7', Radim:'#0F6E56', Aleš:'#854F0B' }

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
    if (!window.confirm('Smazat komentář?')) return
    await supabase.from('comments').delete().eq('id', id)
    fetchComments()
  }

  const uploadDoc = async (e) => {
    const file = e.target.files[0]
    if (!file) return
    if (file.size > 20 * 1024 * 1024) { alert('Max 20 MB'); return }
    setUploading(true)
    const fileName = `leads/${lead.id}/${Date.now()}_${file.name}`
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
    if (!window.confirm(`Smazat "${doc.nazev}"?`)) return
    await supabase.storage.from('documents').remove([doc.soubor])
    await supabase.from('documents').delete().eq('id', doc.id)
    fetchDocs()
  }

  const fmt = (iso) => {
    const d = new Date(iso)
    return d.toLocaleDateString('cs-CZ', { day:'numeric', month:'short' }) + ' ' +
      d.toLocaleTimeString('cs-CZ', { hour:'2-digit', minute:'2-digit' })
  }

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{maxWidth:640}}>

        <div className="modal-head">
          <div>
            <h2>{lead.firma}</h2>
            <div style={{fontSize:13,color:'#888',marginTop:2}}>
              {lead.osoba} · {lead.role} · <StavBadge stav={lead.stav} />
            </div>
          </div>
          <div style={{display:'flex',gap:8,alignItems:'center'}}>
            <button className="btn" onClick={() => onEdit(lead)}>Upravit</button>
            <button className="close-btn" onClick={onClose}>×</button>
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
            <div style={{fontSize:11,color:'#aaa',marginBottom:3,fontWeight:500,textTransform:'uppercase'}}>Poznámky</div>
            {lead.poznamky}
          </div>
        )}

        <div style={{padding:'14px 24px 0'}}>
          <div style={{display:'flex',gap:4,marginBottom:14}}>
            {[
              { id:'aktivita', label:`Aktivita · ${comments.length}` },
              { id:'dokumenty', label:`Dokumenty · ${docs.length}` },
            ].map(t => (
              <button key={t.id} onClick={() => setTab(t.id)} style={{
                padding:'6px 16px',borderRadius:8,fontSize:13,cursor:'pointer',fontFamily:'inherit',
                border:`0.5px solid ${tab===t.id?'#534AB7':'#e0e0e0'}`,
                background: tab===t.id?'#EEEDFE':'#fff',
                color: tab===t.id?'#534AB7':'#888',
                fontWeight: tab===t.id?500:400
              }}>{t.label}</button>
            ))}
          </div>

          {tab==='aktivita' && (
            <div>
              <div style={{maxHeight:260,overflowY:'auto',marginBottom:14}}>
                {loadingC && <div style={{color:'#aaa',fontSize:13,padding:'16px 0'}}>Načítám...</div>}
                {!loadingC && !comments.length && (
                  <div style={{color:'#ccc',fontSize:13,padding:'16px 0',textAlign:'center'}}>Zatím žádná aktivita</div>
                )}
                {comments.map(c => (
                  <div key={c.id} style={{display:'flex',gap:10,marginBottom:12}}>
                    <div style={{
                      width:30,height:30,borderRadius:'50%',flexShrink:0,
                      background: (autorColor[c.autor]||'#888')+'22',
                      display:'flex',alignItems:'center',justifyContent:'center',
                      fontSize:12,fontWeight:500,color: autorColor[c.autor]||'#666'
                    }}>{c.autor.slice(0,1)}</div>
                    <div style={{flex:1}}>
                      <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:3}}>
                        <span style={{fontSize:13,fontWeight:500,color:autorColor[c.autor]||'#333'}}>{c.autor}</span>
                        <span style={{fontSize:11,color:'#bbb'}}>{fmt(c.created_at)}</span>
                        <button onClick={() => deleteComment(c.id)} style={{marginLeft:'auto',background:'none',border:'none',color:'#ddd',cursor:'pointer',fontSize:14}}>×</button>
                      </div>
                      <div style={{fontSize:13,color:'#333',lineHeight:1.6,background:'#f8f8f6',borderRadius:8,padding:'8px 12px',whiteSpace:'pre-wrap'}}>{c.text}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {tab==='dokumenty' && (
            <div style={{marginBottom:14}}>
              <div style={{display:'flex',justifyContent:'flex-end',marginBottom:10}}>
                <label style={{
                  padding:'6px 16px',borderRadius:8,border:'0.5px solid #534AB7',
                  background:'#EEEDFE',color:'#534AB7',fontSize:13,cursor:'pointer',
                  fontWeight:500,display:'inline-flex',alignItems:'center',gap:6
                }}>
                  {uploading ? 'Nahrávám...' : '+ Nahrát soubor'}
                  <input type="file" onChange={uploadDoc} style={{display:'none'}} disabled={uploading} />
                </label>
              </div>
              {!docs.length && (
                <div style={{color:'#ccc',fontSize:13,textAlign:'center',padding:'24px 0'}}>
                  Žádné dokumenty — nahraj první soubor
                </div>
              )}
              {docs.map(doc => (
                <div key={doc.id} style={{display:'flex',alignItems:'center',gap:10,padding:'10px 12px',background:'#f8f8f6',borderRadius:8,marginBottom:6}}>
                  <span style={{fontSize:18}}>📄</span>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontSize:13,fontWeight:500,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{doc.nazev}</div>
                    <div style={{fontSize:11,color:'#aaa'}}>{doc.velikost} KB · {new Date(doc.created_at).toLocaleDateString('cs-CZ')}</div>
                  </div>
                  <a href={doc.url} target="_blank" rel="noreferrer" style={{padding:'4px 12px',borderRadius:6,border:'0.5px solid #534AB7',background:'#EEEDFE',color:'#534AB7',fontSize:12,textDecoration:'none',whiteSpace:'nowrap'}}>Otevřít</a>
                  <button onClick={() => deleteDoc(doc)} style={{padding:'4px 8px',borderRadius:6,border:'0.5px solid #A32D2D',background:'#fff',color:'#A32D2D',fontSize:12,cursor:'pointer',fontFamily:'inherit'}}>×</button>
                </div>
              ))}
            </div>
          )}
        </div>

        {tab==='aktivita' && (
          <div style={{padding:'12px 24px 20px',borderTop:'0.5px solid #f0f0f0'}}>
            <div style={{display:'flex',gap:8,marginBottom:8,alignItems:'center'}}>
              <span style={{fontSize:12,color:'#888'}}>Píšu jako:</span>
              {['Karel','Radim','Aleš'].map(a => (
                <button key={a} onClick={() => setAutor(a)} style={{
                  padding:'3px 12px',borderRadius:10,fontSize:12,cursor:'pointer',fontFamily:'inherit',
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
        )}

      </div>
    </div>
  )
}

// ─── MODAL FORMULÁŘ ───────────────────────────────────────────────────────────"""

if old_block in content:
    content = content.replace(old_block, new_block)
    with open('src/App.js', 'w', encoding='utf-8') as f:
        f.write(content)
    print("OK - LeadDetail přepsán")
else:
    print("ERROR - old_block nenalezen, délka: " + str(len(old_block)))
