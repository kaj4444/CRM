# -*- coding: utf-8 -*-
with open('src/App.js', 'r', encoding='utf-8') as f:
    content = f.read()

# Přidám mobilní menu state do App
old_state = "  const [tab, setTab] = useState('kanban')"
new_state = """  const [tab, setTab] = useState('kanban')
  const [drawerOpen, setDrawerOpen] = useState(false)"""

if old_state in content:
    content = content.replace(old_state, new_state)
    print("OK - drawer state")
else:
    print("ERROR - tab state nenalezen")

# Nahradím celý return appky - přidám mobile topbar + drawer
old_return_start = """  return (
    <div className="app-layout">
      <div className="sidebar">
        <div className="sidebar-logo">
          <div className="logo">riscare CRM</div>
          <div className="sub">Talkey a.s.</div>
        </div>"""

new_return_start = """  const switchTab = (id) => { setTab(id); setDrawerOpen(false) }

  return (
    <div className="app-layout">

      {/* Mobile top bar */}
      <div className="mobile-topbar">
        <div className="logo">riscare CRM</div>
        <button className="hamburger-btn" onClick={() => setDrawerOpen(true)}>
          <span/><span/><span/>
        </button>
      </div>

      {/* Mobile drawer */}
      {drawerOpen && (
        <div className="mobile-drawer">
          <div className="drawer-overlay" onClick={() => setDrawerOpen(false)} />
          <div className="drawer-panel">
            <div className="drawer-head">
              <div>
                <div className="logo" style={{color:'#534AB7',fontWeight:600,fontSize:15}}>riscare CRM</div>
                <div style={{fontSize:11,color:'#999',marginTop:2}}>Talkey a.s.</div>
              </div>
              <button className="drawer-close" onClick={() => setDrawerOpen(false)}>&times;</button>
            </div>
            {navOrder.map(nid => {
              const n = NAV.find(x => x.id === nid)
              if (!n) return null
              return (
                <div key={n.id}
                  className={`nav-item ${tab===n.id?'active':''}`}
                  onClick={() => switchTab(n.id)}
                  style={{cursor:'pointer'}}
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
              <button className="logout-btn" onClick={() => { setAuthed(false); setDrawerOpen(false) }}>Odhlásit se</button>
            </div>
          </div>
        </div>
      )}

      <div className="sidebar">
        <div className="sidebar-logo">
          <div className="logo">riscare CRM</div>
          <div className="sub">Talkey a.s.</div>
        </div>"""

if old_return_start in content:
    content = content.replace(old_return_start, new_return_start)
    print("OK - mobile topbar + drawer přidán")
else:
    print("ERROR - return start nenalezen")

# Nahradím setTab za switchTab v sidebar nav
old_nav_click = "onClick={() => setTab(n.id)}"
new_nav_click = "onClick={() => switchTab(n.id)}"
count = content.count(old_nav_click)
content = content.replace(old_nav_click, new_nav_click)
print(f"OK - setTab→switchTab nahrazen ({count}x)")

with open('src/App.js', 'w', encoding='utf-8') as f:
    f.write(content)

print(f"Hotovo — radku: {len(content.splitlines())}, export: {'export default function App' in content}")
