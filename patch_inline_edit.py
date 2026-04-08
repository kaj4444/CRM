# -*- coding: utf-8 -*-
with open('src/App.js', 'r', encoding='utf-8') as f:
    content = f.read()

old = """const PruvodceStrategii = () => {
  const [aktivniMesic, setAktivniMesic] = useState('m1')
  const [splneno, setSplneno] = useState({})
  const [odpovedi, setOdpovedi] = useState({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      const [splRes, odpRes] = await Promise.all([
        supabase.from('pruvodce_splneno').select('*'),
        supabase.from('strategic_answers').select('*')
      ])
      if (splRes.data) {
        const m = {}
        splRes.data.forEach(r => { m[r.krok_id] = r.splneno })
        setSplneno(m)
      }
      if (odpRes.data) {
        const m = {}
        odpRes.data.forEach(r => { m[r.klic] = r.odpoved })
        setOdpovedi(m)
      }
      setLoading(false)
    }
    load()
  }, [])

  const toggleSplneno = async (id) => {
    const nove = !splneno[id]
    setSplneno(prev => ({ ...prev, [id]: nove }))
    const existing = splneno[id] !== undefined
    if (existing) {
      await supabase.from('pruvodce_splneno').update({ splneno: nove }).eq('krok_id', id)
    } else {
      await supabase.from('pruvodce_splneno').insert([{ krok_id: id, splneno: nove }])
    }
  }

  const krokyMesice = (mid) => KROKY.filter(k => k.mesic === mid)
  const splnenoMesice = (mid) => krokyMesice(mid).filter(k => splneno[k.id]).length
  const celkemSplneno = KROKY.filter(k => splneno[k.id]).length

  const prioritaBarva = { 'kritická': '#A32D2D', 'vysoká': '#854F0B', 'střední': '#185FA5' }
  const prioritaBg = { 'kritická': '#FCEBEB', 'vysoká': '#FAEEDA', 'střední': '#E6F1FB' }

  if (loading) return <div style={{color:'#aaa',padding:'32px 0',textAlign:'center'}}>Načítám...</div>

  return (
    <div>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:20}}>
        <div style={{fontSize:13,color:'#888'}}>
          Splněno {celkemSplneno} z {KROKY.length} kroků
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
            <button key={m.id} onClick={() => setAktivniMesic(m.id)} style={{
              flex:1,padding:'14px 16px',borderRadius:10,cursor:'pointer',fontFamily:'inherit',
              border:'0.5px solid ' + (active ? m.barva : '#e0e0e0'),
              background: active ? m.bg : '#fff',
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
          const mesic = MESICE.find(m => m.id === krok.mesic)
          const dynOdp = krok.dynamicke ? odpovedi[krok.dynamicke.klic]?.trim() : null
          const dynZprava = dynOdp
            ? (dynOdp.toLowerCase().includes('ne') || dynOdp.toLowerCase().includes('0') || dynOdp.toLowerCase().includes('žádn')
                ? krok.dynamicke.ne : krok.dynamicke.ano)
            : null

          return (
            <div key={krok.id} style={{
              background:'#fff',border:'0.5px solid ' + (done ? '#5DCAA5' : '#e8e8e8'),
              borderRadius:12,overflow:'hidden',
              opacity: done ? 0.85 : 1
            }}>
              <div style={{padding:'14px 20px',display:'flex',alignItems:'center',gap:12,borderBottom: done ? 'none' : '0.5px solid #f5f5f3'}}>
                <button onClick={() => toggleSplneno(krok.id)} style={{
                  width:28,height:28,borderRadius:'50%',border:'0.5px solid ' + (done ? '#1D9E75' : '#ddd'),
                  background: done ? '#1D9E75' : '#fff',color:'#fff',fontSize:14,cursor:'pointer',
                  display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0
                }}>{done ? '✓' : ''}</button>
                <div style={{flex:1}}>
                  <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:2}}>
                    <span style={{fontSize:11,padding:'2px 7px',borderRadius:10,
                      background:prioritaBg[krok.priorita],color:prioritaBarva[krok.priorita],fontWeight:500}}>
                      {krok.priorita}
                    </span>
                    <span style={{fontSize:11,color:'#aaa'}}>Týden {krok.tyden}</span>
                  </div>
                  <div style={{fontSize:14,fontWeight:500,color: done ? '#888' : '#1a1a1a',textDecoration: done ? 'line-through' : 'none'}}>
                    {krok.nazev}
                  </div>
                </div>
              </div>

              {!done && (
                <div style={{padding:'14px 20px 16px 60px'}}>
                  <div style={{marginBottom:10}}>
                    <div style={{fontSize:11,color:'#aaa',fontWeight:500,marginBottom:4,textTransform:'uppercase'}}>Proč</div>
                    <div style={{fontSize:13,color:'#555',lineHeight:1.6}}>{krok.proc}</div>
                  </div>
                  <div style={{marginBottom:10}}>
                    <div style={{fontSize:11,color:'#aaa',fontWeight:500,marginBottom:4,textTransform:'uppercase'}}>Jak na to</div>
                    <div style={{fontSize:13,color:'#333',lineHeight:1.6}}>{krok.jak}</div>
                  </div>
                  <div style={{background:'#f5f5f3',borderRadius:8,padding:'10px 14px',marginBottom: dynZprava ? 10 : 0}}>
                    <div style={{fontSize:11,color:'#aaa',fontWeight:500,marginBottom:3,textTransform:'uppercase'}}>Cíl</div>
                    <div style={{fontSize:13,color:'#333',fontWeight:500}}>{krok.cil}</div>
                  </div>
                  {dynZprava && (
                    <div style={{background: mesic.bg,border:'0.5px solid '+mesic.barva+'44',borderRadius:8,padding:'10px 14px',marginTop:10}}>
                      <div style={{fontSize:11,color:mesic.barva,fontWeight:500,marginBottom:3}}>Podle vašich odpovědí ze strategického plánu:</div>
                      <div style={{fontSize:13,color:mesic.barva}}>{dynZprava}</div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        })}"""

new = """// Inline editovatelný text - klikni pro edit, uloží se automaticky
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
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      const [splRes, odpRes, txtRes] = await Promise.all([
        supabase.from('pruvodce_splneno').select('*'),
        supabase.from('strategic_answers').select('*'),
        supabase.from('pruvodce_texty').select('*'),
      ])
      if (splRes.data) {
        const m = {}
        splRes.data.forEach(r => { m[r.krok_id] = r.splneno })
        setSplneno(m)
      }
      if (odpRes.data) {
        const m = {}
        odpRes.data.forEach(r => { m[r.klic] = r.odpoved })
        setOdpovedi(m)
      }
      if (txtRes.data) {
        const m = {}
        txtRes.data.forEach(r => { m[r.klic] = r.hodnota })
        setTexty(m)
      }
      setLoading(false)
    }
    load()
  }, [])

  const saveText = async (klic, hodnota) => {
    setTexty(prev => ({ ...prev, [klic]: hodnota }))
    const existing = texty[klic] !== undefined
    if (existing) {
      await supabase.from('pruvodce_texty').update({ hodnota }).eq('klic', klic)
    } else {
      await supabase.from('pruvodce_texty').insert([{ klic, hodnota }])
    }
  }

  const getText = (krok, pole) => {
    const klic = krok.id + '_' + pole
    return texty[klic] !== undefined ? texty[klic] : krok[pole]
  }

  const toggleSplneno = async (id) => {
    const nove = !splneno[id]
    setSplneno(prev => ({ ...prev, [id]: nove }))
    const existing = splneno[id] !== undefined
    if (existing) {
      await supabase.from('pruvodce_splneno').update({ splneno: nove }).eq('krok_id', id)
    } else {
      await supabase.from('pruvodce_splneno').insert([{ krok_id: id, splneno: nove }])
    }
  }

  const krokyMesice = (mid) => KROKY.filter(k => k.mesic === mid)
  const splnenoMesice = (mid) => krokyMesice(mid).filter(k => splneno[k.id]).length
  const celkemSplneno = KROKY.filter(k => splneno[k.id]).length

  const prioritaBarva = { 'kritická': '#A32D2D', 'vysoká': '#854F0B', 'střední': '#185FA5' }
  const prioritaBg = { 'kritická': '#FCEBEB', 'vysoká': '#FAEEDA', 'střední': '#E6F1FB' }

  if (loading) return <div style={{color:'#aaa',padding:'32px 0',textAlign:'center'}}>Načítám...</div>

  return (
    <div>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:20}}>
        <div style={{fontSize:13,color:'#888'}}>
          Splněno {celkemSplneno} z {KROKY.length} kroků · <span style={{fontSize:12,color:'#bbb'}}>Texty jsou editovatelné — klikni na libovolný text</span>
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
            <button key={m.id} onClick={() => setAktivniMesic(m.id)} style={{
              flex:1,padding:'14px 16px',borderRadius:10,cursor:'pointer',fontFamily:'inherit',
              border:'0.5px solid ' + (active ? m.barva : '#e0e0e0'),
              background: active ? m.bg : '#fff',
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
          const mesic = MESICE.find(m => m.id === krok.mesic)
          const dynOdp = krok.dynamicke ? odpovedi[krok.dynamicke.klic]?.trim() : null
          const dynZprava = dynOdp
            ? (dynOdp.toLowerCase().includes('ne') || dynOdp.toLowerCase().includes('0') || dynOdp.toLowerCase().includes('žádn')
                ? krok.dynamicke.ne : krok.dynamicke.ano)
            : null

          return (
            <div key={krok.id} style={{
              background:'#fff',border:'0.5px solid ' + (done ? '#5DCAA5' : '#e8e8e8'),
              borderRadius:12,overflow:'hidden',
              opacity: done ? 0.85 : 1
            }}>
              <div style={{padding:'14px 20px',display:'flex',alignItems:'center',gap:12,borderBottom: done ? 'none' : '0.5px solid #f5f5f3'}}>
                <button onClick={() => toggleSplneno(krok.id)} style={{
                  width:28,height:28,borderRadius:'50%',border:'0.5px solid ' + (done ? '#1D9E75' : '#ddd'),
                  background: done ? '#1D9E75' : '#fff',color:'#fff',fontSize:14,cursor:'pointer',
                  display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0
                }}>{done ? '✓' : ''}</button>
                <div style={{flex:1}}>
                  <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:2}}>
                    <span style={{fontSize:11,padding:'2px 7px',borderRadius:10,
                      background:prioritaBg[krok.priorita],color:prioritaBarva[krok.priorita],fontWeight:500}}>
                      {krok.priorita}
                    </span>
                    <span style={{fontSize:11,color:'#aaa'}}>Týden {krok.tyden}</span>
                  </div>
                  <InlineEdit
                    value={getText(krok, 'nazev')}
                    onSave={v => saveText(krok.id + '_nazev', v)}
                    style={{fontSize:14,fontWeight:500,color: done ? '#888' : '#1a1a1a',textDecoration: done ? 'line-through' : 'none'}}
                  />
                </div>
              </div>

              {!done && (
                <div style={{padding:'14px 20px 16px 60px'}}>
                  <div style={{marginBottom:12}}>
                    <div style={{fontSize:11,color:'#aaa',fontWeight:500,marginBottom:6,textTransform:'uppercase'}}>Proč</div>
                    <InlineEdit
                      value={getText(krok, 'proc')}
                      onSave={v => saveText(krok.id + '_proc', v)}
                      multiline={true}
                      style={{fontSize:13,color:'#555',lineHeight:1.6}}
                    />
                  </div>
                  <div style={{marginBottom:12}}>
                    <div style={{fontSize:11,color:'#aaa',fontWeight:500,marginBottom:6,textTransform:'uppercase'}}>Jak na to</div>
                    <InlineEdit
                      value={getText(krok, 'jak')}
                      onSave={v => saveText(krok.id + '_jak', v)}
                      multiline={true}
                      style={{fontSize:13,color:'#333',lineHeight:1.6}}
                    />
                  </div>
                  <div style={{background:'#f5f5f3',borderRadius:8,padding:'10px 14px',marginBottom: dynZprava ? 10 : 0}}>
                    <div style={{fontSize:11,color:'#aaa',fontWeight:500,marginBottom:6,textTransform:'uppercase'}}>Cíl</div>
                    <InlineEdit
                      value={getText(krok, 'cil')}
                      onSave={v => saveText(krok.id + '_cil', v)}
                      style={{fontSize:13,color:'#333',fontWeight:500}}
                    />
                  </div>
                  {dynZprava && (
                    <div style={{background: mesic.bg,border:'0.5px solid '+mesic.barva+'44',borderRadius:8,padding:'10px 14px',marginTop:10}}>
                      <div style={{fontSize:11,color:mesic.barva,fontWeight:500,marginBottom:3}}>Podle vašich odpovědí ze strategického plánu:</div>
                      <div style={{fontSize:13,color:mesic.barva}}>{dynZprava}</div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        })}"""

if old in content:
    content = content.replace(old, new)
    with open('src/App.js', 'w', encoding='utf-8') as f:
        f.write(content)
    print(f"OK — radku: {len(content.splitlines())}, export: {'export default function App' in content}")
else:
    print("ERROR - blok nenalezen")
    print(repr(old[:100]))
