# -*- coding: utf-8 -*-
with open('src/App.js', 'r', encoding='utf-8') as f:
    content = f.read()

old_start = "const EmailTemplates = () => {"
old_end = "// ─── HLAVNÍ APP ───────────────────────────────────────────────────────────────"
idx = content.find(old_start)
idx_end = content.find(old_end)
old_component = content[idx:idx_end]

new_component = """const EmailTemplates = () => {
  const [produkt, setProdukt] = useState('Review NIS2')
  const [faze, setFaze] = useState('První kontakt')
  const [copied, setCopied] = useState(false)

  const t = emailTemplates[produkt]?.[faze]

  const copy = () => {
    if (!t) return
    navigator.clipboard.writeText(`Předmět: ${t.subject}\\n\\n${t.body}`)
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

"""

if old_component in content:
    content = content.replace(old_component, new_component)
    with open('src/App.js', 'w', encoding='utf-8') as f:
        f.write(content)
    print("OK - EmailTemplates nahrazen")
else:
    print("ERROR - EmailTemplates nenalezen")
    print(repr(old_component[:200]))
