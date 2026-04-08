# -*- coding: utf-8 -*-
with open('src/App.js', 'r', encoding='utf-8') as f:
    content = f.read()

old_marker = "// ─── STRATEGICKÝ PLÁN ─────────────────────────────────────────────────────────"

new_produkty_comp = """// ─── PRODUKTY PŘEHLED ────────────────────────────────────────────────────────
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

// ─── STRATEGICKÝ PLÁN ─────────────────────────────────────────────────────────"""

if old_marker in content:
    content = content.replace(old_marker, new_produkty_comp)
    with open('src/App.js', 'w', encoding='utf-8') as f:
        f.write(content)
    print(f"OK - ProduktyPrehled pridano, radku: {len(content.splitlines())}, export: {'export default function App' in content}")
else:
    print("ERROR - marker nenalezen")
