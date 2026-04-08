# -*- coding: utf-8 -*-
with open('src/App.js', 'r', encoding='utf-8') as f:
    content = f.read()

# Přidám dokumenty do navigace
old_nav = """  const NAV = [
    { id:'kanban', icon:'⬛', label:'Kanban' },
    { id:'table', icon:'☰', label:'Tabulka' },
    { id:'followup', icon:'📅', label:'Follow-up dnes' },
    { id:'multiplikatori', icon:'🤝', label:'Multiplikátoři' },
    { id:'discovery', icon:'📞', label:'Discovery script' },
    { id:'email', icon:'✉️', label:'Email šablony' },
  ]"""

new_nav = """  const NAV = [
    { id:'kanban', icon:'⬛', label:'Kanban' },
    { id:'table', icon:'☰', label:'Tabulka' },
    { id:'followup', icon:'📅', label:'Follow-up dnes' },
    { id:'multiplikatori', icon:'🤝', label:'Multiplikátoři' },
    { id:'discovery', icon:'📞', label:'Discovery script' },
    { id:'email', icon:'✉️', label:'Email šablony' },
    { id:'dokumenty', icon:'📄', label:'Dokumenty' },
  ]"""

if old_nav in content:
    content = content.replace(old_nav, new_nav)
    print("OK - nav updated")
else:
    print("ERROR nav")

# Přidám page header pro dokumenty
old_headers = "{{kanban:'Pipeline',table:'Všechny leady',followup:'Follow-up dnes',multiplikatori:'Multiplikátoři',discovery:'Discovery call script',email:'Email šablony'}[tab]}"
new_headers = "{{kanban:'Pipeline',table:'Všechny leady',followup:'Follow-up dnes',multiplikatori:'Multiplikátoři',discovery:'Discovery call script',email:'Email šablony',dokumenty:'Dokumenty'}[tab]}"

if old_headers in content:
    content = content.replace(old_headers, new_headers)
    print("OK - headers updated")
else:
    print("ERROR headers")

old_sub = "{{kanban:'Vizuální přehled obchodů podle fáze',table:'Kompletní seznam s filtry',followup:'Leady které čekají na tvůj kontakt',multiplikatori:'Partneři a zprostředkovatelé',discovery:'Průvodce pro 30minutový prodejní hovor',email:'Šablony připravené k odeslání'}[tab]}"
new_sub = "{{kanban:'Vizuální přehled obchodů podle fáze',table:'Kompletní seznam s filtry',followup:'Leady které čekají na tvůj kontakt',multiplikatori:'Partneři a zprostředkovatelé',discovery:'Průvodce pro 30minutový prodejní hovor',email:'Šablony připravené k odeslání',dokumenty:'Factsheets, nabídky a další PDF'}[tab]}"

if old_sub in content:
    content = content.replace(old_sub, new_sub)
    print("OK - sub updated")
else:
    print("ERROR sub")

# Přidám render dokumentů
old_render = "{tab==='email' && <EmailTemplates />}"
new_render = """{tab==='email' && <EmailTemplates />}
        {tab==='dokumenty' && <PdfDocuments />}"""

if old_render in content:
    content = content.replace(old_render, new_render)
    print("OK - render updated")
else:
    print("ERROR render")

with open('src/App.js', 'w', encoding='utf-8') as f:
    f.write(content)
print("Hotovo")
