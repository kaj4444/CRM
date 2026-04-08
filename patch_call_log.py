# -*- coding: utf-8 -*-
with open('src/App.js', 'r', encoding='utf-8') as f:
    content = f.read()

# Nahradím celý LeadDetail s novým call logem
old_lead_detail = """const LeadDetail = ({ lead, onEdit, onClose }) => {
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
            <button className="btn" style={{color:'#534AB7',borderColor:'#534AB7'}} onClick={async () => {
              const nazev = prompt('Název úkolu:')
              if (!nazev) return
              await supabase.from('ukoly').insert([{
                nazev, popis:'', kdo:'Karel', do_kdy:'', stav:'todo',
                lead_id: lead.id, novy_stav_leadu:'', zdroj:'lead', zdroj_nazev: lead.firma
              }])
              alert('Úkol vytvořen a propojen s ' + lead.firma)
            }}>+ Úkol</button>
            <AiCallBtn lead={lead} />
            <AiEmailBtn lead={lead} />
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
        )}"""

new_lead_detail = """const LeadDetail = ({ lead, onEdit, onClose }) => {
  const [activeTab, setActiveTab] = useState('aktivita')
  const [comments, setComments] = useState([])
  const [newText, setNewText] = useState('')
  const [autor, setAutor] = useState('Karel')
  const [loadingC, setLoadingC] = useState(true)
  const [sending, setSending] = useState(false)
  const [docs, setDocs] = useState([])
  const [uploading, setUploading] = useState(false)
  // Call log state
  const [showCallForm, setShowCallForm] = useState(false)
  const [callDatum, setCallDatum] = useState(new Date().toISOString().slice(0,10))
  const [callText, setCallText] = useState('')
  const [callAutor, setCallAutor] = useState('Karel')
  const [savingCall, setSavingCall] = useState(false)

  const aC = { Karel:'#534AB7', Radim:'#0F6E56', Ales:'#854F0B', Aleš:'#854F0B' }

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

  const saveCall = async () => {
    if (!callText.trim()) return
    setSavingCall(true)
    const callEntry = {
      lead_id: lead.id,
      autor: callAutor,
      text: callText.trim(),
      typ: 'call',
      datum_callu: callDatum
    }
    await supabase.from('comments').insert([callEntry])
    await slackKomentar(lead.firma, callAutor, '📞 Call ' + callDatum + ': ' + callText.trim().slice(0,100))
    setCallText('')
    setCallDatum(new Date().toISOString().slice(0,10))
    setShowCallForm(false)
    setSavingCall(false)
    await fetchComments()
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
  const fmtDate = (d) => new Date(d).toLocaleDateString('cs-CZ', { weekday:'short', day:'numeric', month:'long', year:'numeric' })

  const calls = comments.filter(c => c.typ === 'call')
  const ostatni = comments.filter(c => c.typ !== 'call')

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{maxWidth:640}}>
        <div className="modal-head">
          <div>
            <h2>{lead.firma}</h2>
            <div style={{fontSize:13,color:'#888',marginTop:2}}>{lead.osoba} · {lead.role} · <StavBadge stav={lead.stav} /></div>
          </div>
          <div style={{display:'flex',gap:6,alignItems:'center',flexWrap:'wrap'}}>
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
            <AiCallBtn lead={lead} />
            <AiEmailBtn lead={lead} />
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
            <span style={{fontSize:11,color:'#aaa',fontWeight:500,textTransform:'uppercase',marginRight:8}}>Starší poznámky:</span>
            {lead.poznamky}
          </div>
        )}

        <div style={{padding:'14px 24px 0'}}>
          <div style={{display:'flex',gap:4,marginBottom:14,flexWrap:'wrap'}}>
            <button onClick={() => setActiveTab('aktivita')} style={{
              padding:'6px 14px',borderRadius:8,fontSize:13,cursor:'pointer',fontFamily:'inherit',
              border:'0.5px solid ' + (activeTab==='aktivita' ? '#534AB7' : '#e0e0e0'),
              background: activeTab==='aktivita' ? '#EEEDFE' : '#fff',
              color: activeTab==='aktivita' ? '#534AB7' : '#888',
              fontWeight: activeTab==='aktivita' ? 500 : 400
            }}>Aktivita · {ostatni.length}</button>
            <button onClick={() => setActiveTab('cally')} style={{
              padding:'6px 14px',borderRadius:8,fontSize:13,cursor:'pointer',fontFamily:'inherit',
              border:'0.5px solid ' + (activeTab==='cally' ? '#0F6E56' : '#e0e0e0'),
              background: activeTab==='cally' ? '#E1F5EE' : '#fff',
              color: activeTab==='cally' ? '#0F6E56' : '#888',
              fontWeight: activeTab==='cally' ? 500 : 400
            }}>📞 Cally · {calls.length}</button>
            <button onClick={() => setActiveTab('dokumenty')} style={{
              padding:'6px 14px',borderRadius:8,fontSize:13,cursor:'pointer',fontFamily:'inherit',
              border:'0.5px solid ' + (activeTab==='dokumenty' ? '#534AB7' : '#e0e0e0'),
              background: activeTab==='dokumenty' ? '#EEEDFE' : '#fff',
              color: activeTab==='dokumenty' ? '#534AB7' : '#888',
              fontWeight: activeTab==='dokumenty' ? 500 : 400
            }}>Dokumenty · {docs.length}</button>
          </div>

          {activeTab === 'aktivita' && (
            <div style={{maxHeight:300,overflowY:'auto',marginBottom:14}}>
              {loadingC && <div style={{color:'#aaa',fontSize:13,padding:'16px 0'}}>Načítám...</div>}
              {!loadingC && !ostatni.length && <div style={{color:'#ccc',fontSize:13,padding:'16px 0',textAlign:'center'}}>Zatím žádná aktivita</div>}
              {ostatni.map(c => (
                <div key={c.id} style={{display:'flex',gap:10,marginBottom:12}}>
                  <div style={{width:30,height:30,borderRadius:'50%',flexShrink:0,background:(aC[c.autor]||'#888')+'22',display:'flex',alignItems:'center',justifyContent:'center',fontSize:12,fontWeight:500,color:aC[c.autor]||'#666'}}>{(c.autor||'?').slice(0,1)}</div>
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

          {activeTab === 'cally' && (
            <div style={{marginBottom:14}}>
              {!showCallForm && (
                <button onClick={() => setShowCallForm(true)} style={{
                  width:'100%',padding:'10px',borderRadius:8,border:'1.5px dashed #e0e0e0',
                  background:'#fafaf8',color:'#888',fontSize:13,cursor:'pointer',
                  fontFamily:'inherit',marginBottom:14,textAlign:'center'
                }}>+ Nový call záznam</button>
              )}

              {showCallForm && (
                <div style={{background:'#E1F5EE',borderRadius:10,border:'0.5px solid #5DCAA5',padding:'14px 16px',marginBottom:14}}>
                  <div style={{fontSize:12,color:'#0F6E56',fontWeight:600,marginBottom:10,textTransform:'uppercase'}}>Nový call</div>
                  <div style={{display:'flex',gap:8,marginBottom:10,alignItems:'center',flexWrap:'wrap'}}>
                    <div style={{display:'flex',gap:4}}>
                      {['Karel','Radim','Aleš'].map(a => (
                        <button key={a} onClick={() => setCallAutor(a)} style={{
                          padding:'3px 10px',borderRadius:8,fontSize:12,cursor:'pointer',fontFamily:'inherit',
                          border:'0.5px solid '+(callAutor===a?(aC[a]||'#0F6E56'):'#b0dbc8'),
                          background:callAutor===a?(aC[a]||'#0F6E56')+'18':'#fff',
                          color:callAutor===a?(aC[a]||'#0F6E56'):'#666',fontWeight:callAutor===a?500:400
                        }}>{a}</button>
                      ))}
                    </div>
                    <input type="date" value={callDatum} onChange={e=>setCallDatum(e.target.value)}
                      style={{padding:'4px 10px',borderRadius:8,border:'0.5px solid #b0dbc8',fontSize:13,fontFamily:'inherit',background:'#fff'}} />
                  </div>
                  <textarea
                    value={callText}
                    onChange={e => setCallText(e.target.value)}
                    placeholder="Co bylo řečeno na callu? Zájem klienta, námitky, dohodnutý next step..."
                    style={{width:'100%',padding:'10px 12px',borderRadius:8,border:'0.5px solid #b0dbc8',fontSize:13,fontFamily:'inherit',resize:'vertical',minHeight:100,background:'#fff'}}
                  />
                  <div style={{display:'flex',gap:8,marginTop:10}}>
                    <button onClick={saveCall} disabled={savingCall||!callText.trim()} style={{
                      padding:'7px 18px',borderRadius:8,border:'none',background:'#0F6E56',
                      color:'#fff',fontSize:13,cursor:'pointer',fontFamily:'inherit',fontWeight:500
                    }}>{savingCall?'Ukládám...':'Uložit call'}</button>
                    <button onClick={()=>{setShowCallForm(false);setCallText('')}} style={{
                      padding:'7px 14px',borderRadius:8,border:'0.5px solid #ddd',
                      background:'#fff',color:'#888',fontSize:13,cursor:'pointer',fontFamily:'inherit'
                    }}>Zrušit</button>
                  </div>
                </div>
              )}

              {!loadingC && !calls.length && !showCallForm && (
                <div style={{color:'#ccc',fontSize:13,textAlign:'center',padding:'20px 0'}}>Žádné záznamy z callů</div>
              )}

              {calls.sort((a,b) => (b.datum_callu||b.created_at).localeCompare(a.datum_callu||a.created_at)).map((c,i) => (
                <div key={c.id} style={{marginBottom:12}}>
                  <div style={{
                    background:'#fff',border:'0.5px solid #e8e8e8',borderRadius:10,overflow:'hidden'
                  }}>
                    <div style={{
                      padding:'10px 14px',background:'#E1F5EE',borderBottom:'0.5px solid #b0dbc8',
                      display:'flex',alignItems:'center',gap:10
                    }}>
                      <span style={{fontSize:16}}>📞</span>
                      <div style={{flex:1}}>
                        <div style={{fontSize:13,fontWeight:600,color:'#0F6E56'}}>
                          {c.datum_callu ? fmtDate(c.datum_callu) : fmt(c.created_at)}
                        </div>
                        <div style={{fontSize:11,color:'#1D9E75'}}>
                          {c.autor} · záznam #{calls.length - i}
                        </div>
                      </div>
                      <button onClick={() => deleteComment(c.id)} style={{background:'none',border:'none',color:'#b0dbc8',cursor:'pointer',fontSize:14}}>&times;</button>
                    </div>
                    <div style={{padding:'12px 14px',fontSize:13,color:'#333',lineHeight:1.7,whiteSpace:'pre-wrap'}}>
                      {c.text}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'dokumenty' && (
            <div style={{marginBottom:14}}>
              <div style={{display:'flex',justifyContent:'flex-end',marginBottom:10}}>
                <label style={{padding:'6px 16px',borderRadius:8,border:'0.5px solid #534AB7',background:'#EEEDFE',color:'#534AB7',fontSize:13,cursor:'pointer',fontWeight:500,display:'inline-flex',alignItems:'center',gap:6}}>
                  {uploading ? 'Nahrávám...' : '+ Nahrát soubor'}
                  <input type="file" onChange={uploadDoc} style={{display:'none'}} disabled={uploading} />
                </label>
              </div>
              {!docs.length && <div style={{color:'#ccc',fontSize:13,textAlign:'center',padding:'24px 0'}}>Žádné dokumenty</div>}
              {docs.map(doc => (
                <div key={doc.id} style={{display:'flex',alignItems:'center',gap:10,padding:'10px 12px',background:'#f8f8f6',borderRadius:8,marginBottom:6}}>
                  <span>📄</span>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontSize:13,fontWeight:500,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{doc.nazev}</div>
                    <div style={{fontSize:11,color:'#aaa'}}>{doc.velikost} KB</div>
                  </div>
                  <a href={doc.url} target="_blank" rel="noreferrer" style={{padding:'4px 12px',borderRadius:6,border:'0.5px solid #534AB7',background:'#EEEDFE',color:'#534AB7',fontSize:12,textDecoration:'none'}}>Otevřít</a>
                  <button onClick={() => deleteDoc(doc)} style={{padding:'4px 8px',borderRadius:6,border:'0.5px solid #A32D2D',background:'#fff',color:'#A32D2D',fontSize:12,cursor:'pointer',fontFamily:'inherit'}}>×</button>
                </div>
              ))}
            </div>
          )}
        </div>

        {activeTab === 'aktivita' && (
          <div style={{padding:'12px 24px 20px',borderTop:'0.5px solid #f0f0f0'}}>
            <div style={{display:'flex',gap:8,marginBottom:8,alignItems:'center'}}>
              <span style={{fontSize:12,color:'#888'}}>Píšu jako:</span>
              {['Karel','Radim','Aleš'].map(a => (
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
                placeholder="Napiš komentář... (Cmd+Enter)"
                style={{flex:1,padding:'8px 12px',borderRadius:8,border:'0.5px solid #ddd',fontSize:13,fontFamily:'inherit',resize:'none',height:72}}
              />
              <button className="btn accent" onClick={sendComment} disabled={sending||!newText.trim()} style={{alignSelf:'flex-end',height:36}}>
                {sending ? '...' : 'Odeslat'}
              </button>
            </div>
          </div>
        )}"""

if old_lead_detail in content:
    content = content.replace(old_lead_detail, new_lead_detail)
    with open('src/App.js', 'w', encoding='utf-8') as f:
        f.write(content)
    print(f"OK — radku: {len(content.splitlines())}, export: {'export default function App' in content}")
else:
    print(f"ERROR — blok nenalezen, delka old: {len(old_lead_detail)}")
