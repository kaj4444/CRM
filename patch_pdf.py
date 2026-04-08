# -*- coding: utf-8 -*-
with open('src/App.js', 'r', encoding='utf-8') as f:
    content = f.read()

# Přidám PDF Documents komponentu před hlavní App
old = "// ─── HLAVNÍ APP ───────────────────────────────────────────────────────────────"

new = """// ─── PDF DOKUMENTY ───────────────────────────────────────────────────────────────
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

// ─── HLAVNÍ APP ───────────────────────────────────────────────────────────────"""

if old in content:
    content = content.replace(old, new)
    with open('src/App.js', 'w', encoding='utf-8') as f:
        f.write(content)
    print("OK - PdfDocuments přidán")
else:
    print("ERROR")
