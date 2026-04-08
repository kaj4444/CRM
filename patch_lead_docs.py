# -*- coding: utf-8 -*-
with open('src/App.js', 'r', encoding='utf-8') as f:
    content = f.read()

# Přidám LeadDocuments komponentu do LeadDetail
old = """  const deleteComment = async (id) => {
    if (!window.confirm('Smazat komentář?')) return
    await supabase.from('comments').delete().eq('id', id)
    fetchComments()
  }"""

new = """  const deleteComment = async (id) => {
    if (!window.confirm('Smazat komentář?')) return
    await supabase.from('comments').delete().eq('id', id)
    fetchComments()
  }

  const [leadDocs, setLeadDocs] = useState([])
  const [uploadingDoc, setUploadingDoc] = useState(false)
  const [docsTab, setDocsTab] = useState('komentare')

  const fetchLeadDocs = useCallback(async () => {
    const { data } = await supabase.from('documents')
      .select('*').eq('lead_id', lead.id).order('created_at', { ascending: false })
    setLeadDocs(data || [])
  }, [lead.id])

  useEffect(() => { fetchLeadDocs() }, [fetchLeadDocs])

  const uploadLeadDoc = async (e) => {
    const file = e.target.files[0]
    if (!file) return
    if (file.size > 20 * 1024 * 1024) { alert('Max 20 MB'); return }
    setUploadingDoc(true)
    const fileName = `leads/${lead.id}/${Date.now()}_${file.name}`
    const { error } = await supabase.storage.from('documents').upload(fileName, file)
    if (error) { alert('Chyba: ' + error.message); setUploadingDoc(false); return }
    const { data: urlData } = supabase.storage.from('documents').getPublicUrl(fileName)
    await supabase.from('documents').insert([{
      nazev: file.name,
      soubor: fileName,
      url: urlData.publicUrl,
      velikost: Math.round(file.size / 1024),
      kategorie: 'Lead dokument',
      lead_id: lead.id
    }])
    e.target.value = ''
    setUploadingDoc(false)
    fetchLeadDocs()
  }

  const deleteLeadDoc = async (doc) => {
    if (!window.confirm(`Smazat "${doc.nazev}"?`)) return
    await supabase.storage.from('documents').remove([doc.soubor])
    await supabase.from('documents').delete().eq('id', doc.id)
    fetchLeadDocs()
  }"""

if old in content:
    content = content.replace(old, new)
    print("OK - leadDocs state přidán")
else:
    print("ERROR - deleteComment nenalezen")

# Přidám tabs a dokument sekci do LeadDetail renderu
old_render = """        <div style={{padding:'16px 24px 0'}}>
          <div style={{fontSize:13,fontWeight:500,marginBottom:12}}>
            Aktivita · {comments.length} {comments.length===1?'komentář':'komentářů'}
          </div>"""

new_render = """        <div style={{padding:'16px 24px 0'}}>
          <div style={{display:'flex',gap:4,marginBottom:16}}>
            <button onClick={() => setDocsTab('komentare')} style={{
              padding:'6px 16px',borderRadius:8,fontSize:13,cursor:'pointer',fontFamily:'inherit',
              border:`0.5px solid ${docsTab==='komentare'?'#534AB7':'#e0e0e0'}`,
              background: docsTab==='komentare'?'#EEEDFE':'#fff',
              color: docsTab==='komentare'?'#534AB7':'#888',
              fontWeight: docsTab==='komentare'?500:400
            }}>
              Aktivita · {comments.length}
            </button>
            <button onClick={() => setDocsTab('dokumenty')} style={{
              padding:'6px 16px',borderRadius:8,fontSize:13,cursor:'pointer',fontFamily:'inherit',
              border:`0.5px solid ${docsTab==='dokumenty'?'#534AB7':'#e0e0e0'}`,
              background: docsTab==='dokumenty'?'#EEEDFE':'#fff',
              color: docsTab==='dokumenty'?'#534AB7':'#888',
              fontWeight: docsTab==='dokumenty'?500:400
            }}>
              Dokumenty · {leadDocs.length}
            </button>
          </div>

          {docsTab==='dokumenty' && (
            <div style={{marginBottom:16}}>
              <div style={{display:'flex',justifyContent:'flex-end',marginBottom:12}}>
                <label style={{
                  padding:'6px 16px',borderRadius:8,border:'0.5px solid #534AB7',
                  background:'#EEEDFE',color:'#534AB7',fontSize:13,cursor:'pointer',
                  fontWeight:500,display:'inline-flex',alignItems:'center',gap:6
                }}>
                  {uploadingDoc ? 'Nahrávám...' : '+ Nahrát soubor'}
                  <input type="file" onChange={uploadLeadDoc} style={{display:'none'}} disabled={uploadingDoc} />
                </label>
              </div>
              {!leadDocs.length && (
                <div style={{color:'#ccc',fontSize:13,textAlign:'center',padding:'24px 0'}}>
                  Žádné dokumenty — nahraj první soubor
                </div>
              )}
              {leadDocs.map(doc => (
                <div key={doc.id} style={{
                  display:'flex',alignItems:'center',gap:10,padding:'10px 12px',
                  background:'#f8f8f6',borderRadius:8,marginBottom:6
                }}>
                  <span style={{fontSize:18}}>📄</span>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontSize:13,fontWeight:500,color:'#1a1a1a',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{doc.nazev}</div>
                    <div style={{fontSize:11,color:'#aaa'}}>{doc.velikost} KB · {new Date(doc.created_at).toLocaleDateString('cs-CZ')}</div>
                  </div>
                  <a href={doc.url} target="_blank" rel="noreferrer" style={{
                    padding:'4px 12px',borderRadius:6,border:'0.5px solid #534AB7',
                    background:'#EEEDFE',color:'#534AB7',fontSize:12,textDecoration:'none',whiteSpace:'nowrap'
                  }}>Otevřít</a>
                  <button onClick={() => deleteLeadDoc(doc)} style={{
                    padding:'4px 8px',borderRadius:6,border:'0.5px solid #A32D2D',
                    background:'#fff',color:'#A32D2D',fontSize:12,cursor:'pointer',fontFamily:'inherit'
                  }}>×</button>
                </div>
              ))}
            </div>
          )}

          {docsTab==='komentare' && <div>
          <div style={{fontSize:13,fontWeight:500,marginBottom:12}}>
            Aktivita · {comments.length} {comments.length===1?'komentář':'komentářů'}
          </div>"""

if old_render in content:
    content = content.replace(old_render, new_render)
    print("OK - docs tab přidán do render")
else:
    print("ERROR - old_render nenalezen")

# Uzavřu komentare div
old_close = """        <div style={{padding:'12px 24px 20px',borderTop:'0.5px solid #f0f0f0'}}>"""
new_close = """          </div>}
        </div>

        <div style={{padding:'12px 24px 20px',borderTop:'0.5px solid #f0f0f0'}}>"""

if old_close in content:
    content = content.replace(old_close, new_close, 1)
    print("OK - komentare div uzavřen")
else:
    print("ERROR - close div nenalezen")

# Skryjeme input box když jsme na dokumenty tabu
old_input_section = """        <div style={{padding:'12px 24px 20px',borderTop:'0.5px solid #f0f0f0'}}>
          <div style={{display:'flex',gap:8,marginBottom:8,alignItems:'center'}}>"""
new_input_section = """        {docsTab==='komentare' && <div style={{padding:'12px 24px 20px',borderTop:'0.5px solid #f0f0f0'}}>
          <div style={{display:'flex',gap:8,marginBottom:8,alignItems:'center'}}>"""

if old_input_section in content:
    content = content.replace(old_input_section, new_input_section)
    print("OK - input section podmíněna")
else:
    print("ERROR - input section nenalezena")

# Uzavřeme podmíněný div na konci modal body
old_end = """        </div>
      </div>
    </div>
  )
}

// ─── MODAL FORMULÁŘ ───────────────────────────────────────────────────────────"""

new_end = """        </div>}
      </div>
    </div>
  )
}

// ─── MODAL FORMULÁŘ ───────────────────────────────────────────────────────────"""

if old_end in content:
    content = content.replace(old_end, new_end)
    print("OK - end div opraven")
else:
    print("ERROR - end div nenalezen")

with open('src/App.js', 'w', encoding='utf-8') as f:
    f.write(content)
print("Hotovo")
