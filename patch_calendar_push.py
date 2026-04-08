# -*- coding: utf-8 -*-
with open('src/App.js', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Google Calendar tlačítko - přidám do LeadDetail hlavičky
old_ukol_btn = """            <button className="btn" style={{color:'#534AB7',borderColor:'#534AB7'}} onClick={async () => {
              const nazev = prompt('Název úkolu:')
              if (!nazev) return
              await supabase.from('ukoly').insert([{
                nazev, popis:'', kdo:'Karel', do_kdy:'', stav:'todo',
                lead_id: lead.id, novy_stav_leadu:'', zdroj:'lead', zdroj_nazev: lead.firma
              }])
              alert('Úkol vytvořen a propojen s ' + lead.firma)
            }}>+ Úkol</button>"""

new_ukol_btn = """            <button className="btn" style={{color:'#534AB7',borderColor:'#534AB7'}} onClick={async () => {
              const nazev = prompt('Název úkolu:')
              if (!nazev) return
              await supabase.from('ukoly').insert([{
                nazev, popis:'', kdo:'Karel', do_kdy:'', stav:'todo',
                lead_id: lead.id, novy_stav_leadu:'', zdroj:'lead', zdroj_nazev: lead.firma
              }])
              alert('Úkol vytvořen a propojen s ' + lead.firma)
            }}>+ Úkol</button>
            <button className="btn" style={{color:'#0F6E56',borderColor:'#0F6E56'}} onClick={() => {
              const start = new Date()
              start.setDate(start.getDate() + 1)
              start.setHours(10, 0, 0, 0)
              const end = new Date(start)
              end.setMinutes(end.getMinutes() + 30)
              const fmt = (d) => d.toISOString().replace(/[-:]/g,'').slice(0,15) + 'Z'
              const title = encodeURIComponent('Discovery call — ' + lead.firma)
              const details = encodeURIComponent(
                'Firma: ' + lead.firma + '\\n' +
                'Kontakt: ' + (lead.osoba||'') + '\\n' +
                'Produkt: ' + (lead.produkt||'') + '\\n' +
                'CRM: https://crm-two-lemon.vercel.app'
              )
              const url = 'https://calendar.google.com/calendar/render?action=TEMPLATE' +
                '&text=' + title +
                '&dates=' + fmt(start) + '/' + fmt(end) +
                '&details=' + details
              window.open(url, '_blank')
            }}>📅 Naplánovat call</button>"""

if old_ukol_btn in content:
    content = content.replace(old_ukol_btn, new_ukol_btn)
    print("OK - Google Calendar tlačítko přidáno")
else:
    print("ERROR - ukol btn nenalezen")

# 2. Push notifikace - přidám helper funkci a žádost o povolení
old_send_slack = """const sendSlack = async (text) => {"""
new_send_slack = """// Push notifikace
const requestPushPermission = async () => {
  if (!('Notification' in window)) return false
  if (Notification.permission === 'granted') return true
  if (Notification.permission === 'denied') return false
  const perm = await Notification.requestPermission()
  return perm === 'granted'
}

const sendPushNotification = (title, body, onClick) => {
  if (!('Notification' in window) || Notification.permission !== 'granted') return
  const n = new Notification(title, {
    body,
    icon: '/favicon.ico',
    badge: '/favicon.ico',
    tag: 'riscare-crm',
  })
  if (onClick) n.onclick = () => { window.focus(); onClick(); n.close() }
}

const sendSlack = async (text) => {"""

if old_send_slack in content:
    content = content.replace(old_send_slack, new_send_slack)
    print("OK - Push notifikace helper přidán")
else:
    print("ERROR - sendSlack nenalezen")

# 3. Přidám žádost o povolení při přihlášení + push při follow-upu
old_fetch_leads_effect = "  useEffect(() => { if (authed) fetchLeads() }, [authed, fetchLeads])"
new_fetch_leads_effect = """  useEffect(() => {
    if (authed) {
      fetchLeads()
      // Požádat o push notifikace
      requestPushPermission()
    }
  }, [authed, fetchLeads])"""

if old_fetch_leads_effect in content:
    content = content.replace(old_fetch_leads_effect, new_fetch_leads_effect)
    print("OK - push povolení při přihlášení")
else:
    print("ERROR - useEffect nenalezen")

# 4. Přidám push notifikaci při detekci follow-upů
old_mrtve_check = "  // Kontrola mrtvých leadů - při každém načtení"
new_mrtve_check = """  // Push notifikace pro follow-up dnes
  useEffect(() => {
    if (!authed || !leads.length) return
    const today = new Date().toISOString().slice(0,10)
    const fuDnes = leads.filter(l => l.followup === today && !l.stav?.includes('Uzavřeno'))
    if (fuDnes.length > 0 && !sessionStorage.getItem('push_fu_' + today)) {
      sessionStorage.setItem('push_fu_' + today, '1')
      sendPushNotification(
        '📅 Follow-up dnes — ' + fuDnes.length + ' lead' + (fuDnes.length > 1 ? 'ů' : ''),
        fuDnes.slice(0,3).map(l => l.firma).join(', ') + (fuDnes.length > 3 ? ' a další...' : ''),
      )
    }
  }, [leads, authed])

  // Kontrola mrtvých leadů - při každém načtení"""

if old_mrtve_check in content:
    content = content.replace(old_mrtve_check, new_mrtve_check)
    print("OK - push notifikace pro follow-up")
else:
    print("ERROR - mrtve check nenalezen")

# 5. Přidám push při přidání nového leadu
old_insert_lead = """        const { error } = await supabase.from('leads').insert([cleanForm])
        if (error) { alert('Chyba insert: ' + error.message); console.error(error); return }
        await slackNovyLead(cleanForm)"""
new_insert_lead = """        const { error } = await supabase.from('leads').insert([cleanForm])
        if (error) { alert('Chyba insert: ' + error.message); console.error(error); return }
        await slackNovyLead(cleanForm)
        sendPushNotification('🆕 Nový lead přidán', cleanForm.firma + ' — ' + (cleanForm.produkt||''))"""

if old_insert_lead in content:
    content = content.replace(old_insert_lead, new_insert_lead)
    print("OK - push při novém leadu")
else:
    print("ERROR - insert lead nenalezen")

# 6. Přidám tlačítko pro povolení notifikací do sidebar
old_sidebar_user = """        <div className="sidebar-user">
          <div>Karel Petros</div>
          <button className="logout-btn" onClick={() => setAuthed(false)}>Odhlásit se</button>
        </div>"""
new_sidebar_user = """        <div className="sidebar-user">
          <div>Karel Petros</div>
          <button className="logout-btn" style={{marginBottom:6}} onClick={async () => {
            const ok = await requestPushPermission()
            alert(ok ? '✓ Push notifikace povoleny!' : 'Notifikace nejsou povoleny — povol je v nastavení prohlížeče.')
          }}>🔔 Notifikace</button>
          <button className="logout-btn" onClick={() => setAuthed(false)}>Odhlásit se</button>
        </div>"""

if old_sidebar_user in content:
    content = content.replace(old_sidebar_user, new_sidebar_user)
    print("OK - notifikace tlačítko v sidebar")
else:
    print("ERROR - sidebar user nenalezen")

with open('src/App.js', 'w', encoding='utf-8') as f:
    f.write(content)

print(f"Hotovo — radku: {len(content.splitlines())}, export: {'export default function App' in content}")
