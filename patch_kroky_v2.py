# -*- coding: utf-8 -*-
with open('src/App.js', 'r', encoding='utf-8') as f:
    content = f.read()

# Nahradím celou PruvodceStrategii komponentu
old_start = "const PruvodceStrategii = () => {"
old_end = "// ─── PRODUKTY PŘEHLED ────────────────────────────────────────────────────────"
idx = content.find(old_start)
idx_end = content.find(old_end)
old_block = content[idx:idx_end]

new_block = """const PruvodceStrategii = () => {
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

"""

if old_block in content:
    content = content.replace(old_block, new_block)
    with open('src/App.js', 'w', encoding='utf-8') as f:
        f.write(content)
    print(f"OK — radku: {len(content.splitlines())}, export: {'export default function App' in content}")
else:
    print(f"ERROR — old_block nenalezen, delka: {len(old_block)}")
