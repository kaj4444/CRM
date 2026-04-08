# -*- coding: utf-8 -*-
with open('src/App.js', 'r', encoding='utf-8') as f:
    content = f.read()

# Opravím mobile topbar HTML - přidám název aktivní záložky a lepší strukturu
old_topbar = """      {/* Mobile top bar */}
      <div className="mobile-topbar">
        <div className="logo">riscare CRM</div>
        <button className="hamburger-btn" onClick={() => setDrawerOpen(true)}>
          <span/><span/><span/>
        </button>
      </div>"""

new_topbar = """      {/* Mobile top bar */}
      <div className="mobile-topbar">
        <div style={{display:'flex',alignItems:'center',gap:0}}>
          <span className="mob-logo">riscare</span>
          <span className="mob-tab"> · {{kanban:'Pipeline',table:'Tabulka',followup:'Follow-up',ukoly:'Úkoly',multiplikatori:'Multiplikátoři',discovery:'Discovery',email:'Emaily',dokumenty:'Dokumenty',strategie:'Strategie',produkty:'Produkty',pruvodce:'Průvodce'}[tab]||tab}</span>
        </div>
        <button className="hamburger-btn" onClick={() => setDrawerOpen(true)} aria-label="Menu">
          <span/><span/><span/>
        </button>
      </div>"""

if old_topbar in content:
    content = content.replace(old_topbar, new_topbar)
    print("OK - topbar opraven")
else:
    print("ERROR - topbar nenalezen")

with open('src/App.js', 'w', encoding='utf-8') as f:
    f.write(content)
print(f"Hotovo — radku: {len(content.splitlines())}, export: {'export default function App' in content}")
