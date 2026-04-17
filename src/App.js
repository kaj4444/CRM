import React, { useState, useEffect, useCallback } from 'react'
import './index.css'
import { supabase, isTrialActive, trialDaysLeft } from './supabase'

const SLACK_WEBHOOK = ['https://hooks.slack.com/services','T0AR39GDS5V','B0ARXL5FRK3','zW6FV2hAoVWdQPRuKtiUxvpA'].join('/')

// Push notifikace
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
    tag: 'mikomi-os',
  })
  if (onClick) n.onclick = () => { window.focus(); onClick(); n.close() }
}

const sendSlack = async (text) => {
  try {
    await fetch('/api/slack', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text })
    })
  } catch(e) {
    console.error('Slack error:', e)
  }
}

const slackNovyLead = (l) => sendSlack(
  `🆕 *Nový lead přidán*
*Firma:* ${l.firma}
*Kontakt:* ${l.osoba || '—'} (${l.role || '—'})
*Produkt:* ${l.produkt || '—'}
*Segment:* ${l.segment || '—'}
*Vede:* ${l.vede || '—'}
👉 https://crm-two-lemon.vercel.app`
)

const slackZmenaStavu = (firma, stavOld, stavNew, vede) => {
  const isWin = stavNew === 'Uzavřeno — vyhráno'
  const emoji = isWin ? '🏆' : '🔄'
  const text = isWin
    ? `🏆 *DEAL UZAVŘEN! Gratulace!* 🎉
*Firma:* ${firma}
*Vede:* ${vede || '—'}

Výborná práce! 💪`
    : `🔄 *Změna stavu leadu*
*Firma:* ${firma}
*${stavOld}* → *${stavNew}*
*Vede:* ${vede || '—'}`
  return sendSlack(text)
}

const slackKomentar = (firma, autor, text) => sendSlack(
  `💬 *Nový komentář v leadu*
*Firma:* ${firma}
*Od:* ${autor}
*Zpráva:* ${text.slice(0, 150)}${text.length > 150 ? '...' : ''}`
)

// ─── KONSTANTY ────────────────────────────────────────────────────────────────
const STAVS = ['Lead','Kontaktováno','Discovery call domluven','Discovery call proběhl',
  'Nabídka odeslána','Vyjednávání','Uzavřeno — vyhráno','Uzavřeno — prohráno','Odloženo']

const STAV_STYLES = {
  'Lead': { bg:'#E6F1FB', color:'#185FA5' },
  'Kontaktováno': { bg:'#FAEEDA', color:'#854F0B' },
  'Discovery call domluven': { bg:'#E1F5EE', color:'#0F6E56' },
  'Discovery call proběhl': { bg:'#EAF3DE', color:'#3B6D11' },
  'Nabídka odeslána': { bg:'#EEEDFE', color:'#534AB7' },
  'Vyjednávání': { bg:'#FAEEDA', color:'#633806' },
  'Uzavřeno — vyhráno': { bg:'#EAF3DE', color:'#27500A' },
  'Uzavřeno — prohráno': { bg:'#FCEBEB', color:'#791F1F' },
  'Odloženo': { bg:'#F1EFE8', color:'#5F5E5A' },
  // Consulting stages
  'Úvodní schůzka domluvena': { bg:'#FAEEDA', color:'#854F0B' },
  'Úvodní schůzka proběhla': { bg:'#E1F5EE', color:'#0F6E56' },
  'Smlouva podepsána': { bg:'#EAF3DE', color:'#3B6D11' },
  'Projekt zahájen': { bg:'#EEEDFE', color:'#534AB7' },
  'Průběh projektu': { bg:'#FAEEDA', color:'#633806' },
  'Uzavřeno — dokončeno': { bg:'#EAF3DE', color:'#27500A' },
  'Uzavřeno — zrušeno': { bg:'#FCEBEB', color:'#791F1F' },
  // Real-estate stages
  'Poptávka': { bg:'#E6F1FB', color:'#185FA5' },
  'Prohlídka domluvena': { bg:'#FAEEDA', color:'#854F0B' },
  'Prohlídka proběhla': { bg:'#E1F5EE', color:'#0F6E56' },
  'Rezervace podepsána': { bg:'#EAF3DE', color:'#3B6D11' },
  'Podpis smlouvy': { bg:'#FAEEDA', color:'#633806' },
  'Uzavřeno — prodáno': { bg:'#EAF3DE', color:'#27500A' },
  'Uzavřeno — staženo': { bg:'#FCEBEB', color:'#791F1F' },
  // General stages
  'Schůzka domluvena': { bg:'#E1F5EE', color:'#0F6E56' },
  'Schůzka proběhla': { bg:'#EAF3DE', color:'#3B6D11' },
}

const KANBAN_STAVS = STAVS.slice(0, 7)

const EMPTY_LEAD = {
  firma:'', osoba:'', role:'CEO', segment:'Přímý klient',
  email:'', telefon:'', odvetvi:'Energetika', zdroj:'Vlastní síť',
  produkt:'Review NIS2', stav:'Lead', cena:'', prob:'Nízká (0–30 %)',
  vede:'', followup:'', d1:'', namitka:'', poznamky:'', stitky:''
}

const STITKY_OPTIONS = ['VIP','Urgentní','Čeká na smlouvu','Warm','Cold','Referral','Enterprise','Priorita']
const STITKY_COLORS = {'VIP':'#534AB7','Urgentní':'#A32D2D','Čeká na smlouvu':'#854F0B','Warm':'#0F6E56','Cold':'#185FA5','Referral':'#27500A','Enterprise':'#633806','Priorita':'#791F1F'}


// ─── INDUSTRY CONFIG ──────────────────────────────────────────────────────────
const INDUSTRY_CONFIG = {
  cybersecurity: {
    label: 'Kyberbezpečnost',
    stavs: ['Lead','Kontaktováno','Discovery call domluven','Discovery call proběhl',
      'Nabídka odeslána','Vyjednávání','Uzavřeno — vyhráno','Uzavřeno — prohráno','Odloženo'],
    kanbanStavs: ['Lead','Kontaktováno','Discovery call domluven','Discovery call proběhl',
      'Nabídka odeslána','Vyjednávání','Uzavřeno — vyhráno'],
    emptyLead: {
      firma:'', osoba:'', role:'CEO', segment:'Přímý klient',
      email:'', telefon:'', odvetvi:'Energetika', zdroj:'Vlastní síť',
      produkt:'Review NIS2', stav:'Lead', cena:'', prob:'Nízká (0–30 %)',
      vede:'', followup:'', d1:'', namitka:'', poznamky:'', stitky:'', web:''
    },
    firmLabel: 'Název firmy',
    klientLabel: 'Kontaktní osoba',
    produkty: ['Review NIS2','Check DORA','Program NIS2','Program DORA','Lorenc NIS2','Lorenc DORA','Kyber.testy'],
    segmenty: ['Přímý klient','Multiplikátor','Finanční sektor (DORA)','Veřejná správa'],
    odvetvi: ['Energetika','Zdravotnictví','Doprava','IT/Tech','Výroba','Finance','Logistika','Jiné'],
    role: ['CEO','CFO','IT ředitel','Jiná'],
    namitky: ['','Cena','Timing','Interní řešení','Potřebuje schválení','Není zájem','Jiné'],
    extraFields: null,
  },
  'real-estate': {
    label: 'Reality',
    stavs: ['Poptávka','Prohlídka domluvena','Prohlídka proběhla','Nabídka odeslána',
      'Rezervace podepsána','Podpis smlouvy','Uzavřeno — prodáno','Uzavřeno — staženo','Odloženo'],
    kanbanStavs: ['Poptávka','Prohlídka domluvena','Prohlídka proběhla','Nabídka odeslána',
      'Rezervace podepsána','Podpis smlouvy','Uzavřeno — prodáno'],
    emptyLead: {
      firma:'', osoba:'', role:'Kupující', segment:'Přímý klient',
      email:'', telefon:'', odvetvi:'Byt', zdroj:'Vlastní síť',
      produkt:'Prodej nemovitosti', stav:'Poptávka', cena:'', prob:'Nízká (0–30 %)',
      vede:'', followup:'', d1:'', namitka:'', poznamky:'', stitky:'', web:'',
      lokalita:'', dispozice:'', plocha:''
    },
    firmLabel: 'Název nemovitosti / adresa',
    klientLabel: 'Klient (jméno)',
    produkty: ['Prodej nemovitosti','Pronájem','Koupě — zastupuji kupujícího','Ocenění','Správa nemovitosti','Investiční poradenství'],
    segmenty: ['Přímý klient','Referral','Developer','Investor','Firma'],
    odvetvi: ['Byt','Rodinný dům','Komerční prostor','Pozemek','Novostavba','Rekonstrukce','Jiné'],
    role: ['Kupující','Prodávající','Investor','Nájemník','Developer'],
    namitky: ['','Cena','Lokalita','Stav nemovitosti','Financování','Timing','Konkurenční nabídka','Jiné'],
    extraFields: ['lokalita','dispozice','plocha'],
  },
  general: {
    label: 'Consulting',
    stavs: ['Poptávka','Úvodní schůzka domluvena','Úvodní schůzka proběhla','Nabídka odeslána',
      'Smlouva podepsána','Projekt zahájen','Průběh projektu','Uzavřeno — dokončeno','Uzavřeno — zrušeno','Odloženo'],
    kanbanStavs: ['Poptávka','Úvodní schůzka domluvena','Úvodní schůzka proběhla','Nabídka odeslána',
      'Smlouva podepsána','Projekt zahájen','Uzavřeno — dokončeno'],
    emptyLead: {
      firma:'', osoba:'', role:'CEO / Majitel', segment:'Přímý klient',
      email:'', telefon:'', odvetvi:'Management / strategie', zdroj:'Vlastní síť',
      produkt:'Strategický audit', stav:'Poptávka', cena:'', prob:'Nízká (0–30 %)',
      vede:'', followup:'', d1:'', namitka:'', poznamky:'', stitky:'', web:''
    },
    firmLabel: 'Název klienta / firmy',
    klientLabel: 'Kontaktní osoba (jméno)',
    produkty: ['Strategický audit','HR audit a doporučení','Organizační rozvoj','Leadership program','Change management','Firemní vzdělávání / workshop','Mentoring managementu','Retainer / měsíční spolupráce','Týmový rozvoj','Diagnostika firemní kultury'],
    segmenty: ['Přímý klient','Referral','Enterprise (500+ zaměstnanců)','SME (do 500 zaměstnanců)','Veřejný sektor','Scale-up'],
    odvetvi: ['Management / strategie','HR a lidé','Výroba','Finance a bankovnictví','IT a tech','Zdravotnictví','Retail a e-commerce','Logistika','Jiné'],
    role: ['CEO / Majitel','HR ředitel','COO','CFO','Manažer týmu','L&D manažer','Board member','Jiná'],
    namitky: ['','Cena','Timing / kapacity','Interní řešení','Potřebuje schválení boardu','Rozpočet','Není zájem','Jiné'],
    extraFields: null,
  }
}

const getIndustryCfg = (industry) => INDUSTRY_CONFIG[industry] || INDUSTRY_CONFIG['general']

// Real-estate stav styles
const STAV_STYLES_RE = {
  'Poptávka': { bg:'#E6F1FB', color:'#185FA5' },
  'Prohlídka domluvena': { bg:'#FAEEDA', color:'#854F0B' },
  'Prohlídka proběhla': { bg:'#E1F5EE', color:'#0F6E56' },
  'Nabídka odeslána': { bg:'#EEEDFE', color:'#534AB7' },
  'Rezervace podepsána': { bg:'#EAF3DE', color:'#3B6D11' },
  'Podpis smlouvy': { bg:'#FAEEDA', color:'#633806' },
  'Uzavřeno — prodáno': { bg:'#EAF3DE', color:'#27500A' },
  'Uzavřeno — staženo': { bg:'#FCEBEB', color:'#791F1F' },
  'Odloženo': { bg:'#F1EFE8', color:'#5F5E5A' },
}

const today = () => new Date().toISOString().slice(0,10)

// ─── HELPER KOMPONENTY ────────────────────────────────────────────────────────
const StavBadge = ({ stav }) => {
  const s = STAV_STYLES[stav] || { bg:'#f0f0ee', color:'#666' }
  return <span className="stav-badge" style={{ background:s.bg, color:s.color }}>{stav}</span>
}

const ProbTag = ({ prob }) => {
  if (!prob) return null
  const cls = prob.includes('Vysoká') ? 'tag-high' : prob.includes('Střední') ? 'tag-mid' : 'tag-low'
  const label = prob.replace(' (70–100 %)','').replace(' (30–70 %)','').replace(' (0–30 %)','')
  return <span className={`tag ${cls}`}>{label}</span>
}

const ProdTag = ({ produkt }) => {
  if (!produkt || produkt === 'Neznámý') return null
  const cls = produkt.includes('DORA') ? 'tag-dora' : 'tag-nis2'
  return <span className={`tag ${cls}`}>{produkt}</span>
}

// ─── LEAD DETAIL S KOMENTÁŘI ─────────────────────────────────────────────────
// ─── QUICK ÚKOL MODAL ────────────────────────────────────────────────────────
const PRIORITY_OPTIONS = ['Nízká', 'Střední', 'Vysoká', 'Kritická']
const PRIORITY_COLORS = { 'Nízká':'#185FA5', 'Střední':'#854F0B', 'Vysoká':'#A32D2D', 'Kritická':'#791F1F' }
const PRIORITY_BG = { 'Nízká':'#E6F1FB', 'Střední':'#FAEEDA', 'Vysoká':'#FCEBEB', 'Kritická':'#F5D5D5' }

const QuickUkolModal = ({ lead, onClose, onSaved, teamMembers }) => {
  const activeTeam = (teamMembers && teamMembers.length > 0) ? teamMembers : ['Karel','Radim','Aleš']
  const tomorrow = new Date(); tomorrow.setDate(tomorrow.getDate()+1)
  const [form, setForm] = useState({
    nazev: '',
    popis: '',
    kdo: 'Karel',
    do_kdy: tomorrow.toISOString().slice(0,10),
    priorita: 'Střední',
    typ_ukolu: 'Follow-up call',
    novy_stav_leadu: '',
    stav: 'todo',
  })
  const [saving, setSaving] = useState(false)
  const set = (k,v) => setForm(f=>({...f,[k]:v}))

  const save = async () => {
    if (!form.nazev.trim()) { alert('Zadej název úkolu'); return }
    setSaving(true)
    await supabase.from('ukoly').insert([{
      user_id: session?.user?.id,
      ...form,
      lead_id: lead.id,
      zdroj: 'lead',
      zdroj_nazev: lead.firma,
    }])
    setSaving(false)
    if (onSaved) onSaved()
    onClose()
  }

  const addToCalendar = () => {
    const start = new Date(form.do_kdy + 'T09:00:00')
    const end = new Date(form.do_kdy + 'T09:30:00')
    const fmt = (d) => d.toISOString().replace(/[-:]/g,'').slice(0,15) + 'Z'
    const title = encodeURIComponent(form.nazev + ' — ' + lead.firma)
    const details = encodeURIComponent(
      'Firma: ' + lead.firma + '\n' +
      'Kontakt: ' + (lead.osoba||'') + '\n' +
      'Typ: ' + form.typ_ukolu + '\n' +
      'Priorita: ' + form.priorita + '\n' +
      (form.popis ? 'Popis: ' + form.popis + '\n' : '') +
      'CRM: https://crm-two-lemon.vercel.app'
    )
    const url = 'https://calendar.google.com/calendar/render?action=TEMPLATE' +
      '&text=' + title +
      '&dates=' + fmt(start) + '/' + fmt(end) +
      '&details=' + details
    window.open(url, '_blank')
  }

  const typy = ['Follow-up call','Discovery call','Schůzka','Nabídka','Smlouva','Interní úkol','Email','Jiné']
  const aC = { Karel:'#534AB7', Radim:'#0F6E56', Aleš:'#854F0B' }

  return (
    <div className="modal-overlay" onClick={e => e.target===e.currentTarget && onClose()}>
      <div className="modal" style={{maxWidth:480}}>
        <div className="modal-head">
          <div>
            <h2>Nový úkol</h2>
            <div style={{fontSize:12,color:'#aaa',marginTop:2}}>Propojeno s: {lead.firma}</div>
          </div>
          <button className="close-btn" onClick={onClose}>&times;</button>
        </div>
        <div className="modal-body">

          <div className="form-row">
            <label>Název úkolu *</label>
            <input value={form.nazev} onChange={e=>set('nazev',e.target.value)}
              placeholder="Co je potřeba udělat..." autoFocus />
          </div>

          <div className="form-row">
            <label>Typ úkolu</label>
            <div style={{display:'flex',gap:6,flexWrap:'wrap',marginTop:4}}>
              {typy.map(t => (
                <button key={t} type="button" onClick={()=>set('typ_ukolu',t)} style={{
                  padding:'4px 12px',borderRadius:8,fontSize:12,cursor:'pointer',fontFamily:'inherit',
                  border:'0.5px solid '+(form.typ_ukolu===t?'#534AB7':'#e0e0e0'),
                  background:form.typ_ukolu===t?'#EEEDFE':'#fff',
                  color:form.typ_ukolu===t?'#534AB7':'#888',
                  fontWeight:form.typ_ukolu===t?500:400
                }}>{t}</button>
              ))}
            </div>
          </div>

          <div className="form-row">
            <label>Popis / poznámky</label>
            <textarea value={form.popis} onChange={e=>set('popis',e.target.value)}
              placeholder="Kontext, co říct, co zjistit..." style={{height:72}} />
          </div>

          <div className="form-grid">
            <div className="form-row">
              <label>Zodpovědný</label>
              <div style={{display:'flex',gap:6,marginTop:4}}>
                {activeTeam.map(a => (
                  <button key={a} type="button" onClick={()=>set('kdo',a)} style={{
                    flex:1,padding:'6px 0',borderRadius:8,fontSize:13,cursor:'pointer',fontFamily:'inherit',
                    border:'0.5px solid '+(form.kdo===a?'#534AB7':'#e0e0e0'),
                    background:form.kdo===a?'#53 4AB718':'#fff',
                    color:form.kdo===a?'#534AB7':'#888',fontWeight:form.kdo===a?500:400
                  }}>{a}</button>
                ))}
              </div>
            </div>
            <div className="form-row">
              <label>Deadline</label>
              <input type="date" value={form.do_kdy} onChange={e=>set('do_kdy',e.target.value)} />
            </div>
          </div>

          <div className="form-row">
            <label>Priorita</label>
            <div style={{display:'flex',gap:6,marginTop:4}}>
              {PRIORITY_OPTIONS.map(p => (
                <button key={p} type="button" onClick={()=>set('priorita',p)} style={{
                  flex:1,padding:'6px 0',borderRadius:8,fontSize:12,cursor:'pointer',fontFamily:'inherit',
                  border:'0.5px solid '+(form.priorita===p?PRIORITY_COLORS[p]:'#e0e0e0'),
                  background:form.priorita===p?PRIORITY_BG[p]:'#fff',
                  color:form.priorita===p?PRIORITY_COLORS[p]:'#888',
                  fontWeight:form.priorita===p?500:400
                }}>{p}</button>
              ))}
            </div>
          </div>

          <div className="form-row">
            <label>Po splnění změnit stav leadu na</label>
            <select value={form.novy_stav_leadu} onChange={e=>set('novy_stav_leadu',e.target.value)}>
              <option value="">— neměnit —</option>
              {['Lead','Kontaktováno','Discovery call domluven','Discovery call proběhl',
                'Nabídka odeslána','Vyjednávání','Uzavřeno — vyhráno','Uzavřeno — prohráno','Odloženo'
              ].map(s=><option key={s}>{s}</option>)}
            </select>
          </div>

        </div>
        <div className="modal-foot">
          <button className="btn" onClick={addToCalendar} style={{color:'#0F6E56',borderColor:'#0F6E56'}}>
            📅 Přidat do kalendáře
          </button>
          <button className="btn" onClick={onClose}>Zrušit</button>
          <button className="btn accent" onClick={save} disabled={saving}>
            {saving ? 'Ukládám...' : 'Vytvořit úkol'}
          </button>
        </div>
      </div>
    </div>
  )
}

const LeadDetail = ({ lead, onEdit, onClose, teamMembers: tmProps }) => {
  const activeTeam = (tmProps && tmProps.length > 0) ? tmProps : ['Karel','Radim','Aleš']
  const [activeTab, setActiveTab] = useState('aktivita')
  const [nabidka, setNabidka] = useState(lead.nabidka || '')
  const [nabidkaLoading, setNabidkaLoading] = useState(false)
  const [nabidkaSaved, setNabidkaSaved] = useState(false)

  const generateNabidka = async () => {
    if (!lead.firma) return alert('Lead musí mít název firmy.')
    setNabidkaLoading(true)
    try {
      const webQuery = [lead.firma, lead.web || (lead.email ? lead.email.split('@')[1] : ''), lead.odvetvi || ''].filter(Boolean).join(' ')
      const produktyInfo = lead.produkt ? `Navrhovaný produkt/služba: ${lead.produkt}` : ''
      const prompt = `Jsi expert na B2B prodej. Napiš personalizovaný obchodní dopis — hotový k odeslání.

KLIENT:
- Firma: ${lead.firma}
- Web: ${lead.web || ''}
- Kontakt: ${lead.osoba || ''} (${lead.role || ''})
- Odvětví: ${lead.odvetvi || ''}
- Produkt/služba: ${lead.produkt || ''}
- Segment: ${lead.segment || ''}
${produktyInfo}
- Poznámky: ${lead.poznamky || ''}

INSTRUKCE:
1. Prohledej web ${lead.web || ""} a vše o firmě "${lead.firma}" — web, LinkedIn, PR, sociální sítě
2. Napiš hotový osobní obchodní dopis — NE šablonu s placeholdery, ale konkrétní text

STRUKTURA DOPISU:

Dobrý den ${lead.osoba ? lead.osoba : ''},

1. PROČ PÍŠU PRÁVĚ VÁM
[1-2 věty — co konkrétního tě na této firmě zaujalo. Specifické, ne obecné.]

2. CO O VÁS VÍM
[3-5 vět — konkrétní fakta z veřejných zdrojů: co dělají, kde jsou, co vidíš z webu/LinkedInu. Ukáž přpravenost.]

3. CO SE U VÁS PRAVDĚPODOBNĚ DĚJE TEĎ
[Začni slovem 'Říkám pravděpodobně'. 3-4 konkrétní výzvy typické pro firmy v jejich situaci/odvětví/fázi růstu. Toto je srdce dopisu — buď velmi konkrétní.]

4. CO NEŘEŠÍM A CO ŘEŠÍM
[Krátce — co ${lead.produkt || 'naše řešení'} NENÍ a co JE. Odliš se od konkurence.]

5. JAK BYCH K TOMU PŘISTOUPIL U VÁS KONKRÉTNĚ
[2-3 konkrétní kroky nebo fáze spolupráce přizpůsobené jejich situaci.]

6. CO BY TO PRO VÁS ZNAMENALO KONKRÉTNĚ
[3 konkrétní výsledky/přínosy — co se změní, co získají.]

7. DALŠÍ KROK
[Konkrétní výzva k akci. 1-2 věty. Přímé, sebevědomé.]

S pozdravem,
[jméno odesílatele]

---
PRAVIDLA: Piš česky. Dopis musí být HOTOVÝ k odeslání — žádné [závorky] v textu. Vyhni se prázdným frázím. Buď velmi konkrétní. 400-600 slov.`

      const res = await fetch('/api/claude', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'claude-opus-4-5',
          max_tokens: 2000,
          messages: [{ role: 'user', content: prompt }]
        })
      })
      const data = await res.json()
      const text = data.content?.[0]?.text || ''
      if (text) {
        setNabidka(text)
        // Auto-save to Supabase
        await supabase.from('leads').update({
          nabidka: text,
          nabidka_updated_at: new Date().toISOString()
        }).eq('id', lead.id)
        setNabidkaSaved(true)
        setTimeout(() => setNabidkaSaved(false), 3000)
      }
    } catch(e) {
      console.error('Nabídka error:', e)
      alert('Chyba při generování nabídky. Zkontroluj ANTHROPIC_API_KEY v Vercel.')
    }
    setNabidkaLoading(false)
  }

  const saveNabidka = async () => {
    await supabase.from('leads').update({
      nabidka,
      nabidka_updated_at: new Date().toISOString()
    }).eq('id', lead.id)
    setNabidkaSaved(true)
    setTimeout(() => setNabidkaSaved(false), 2000)
  }

  const sendNabidkaEmail = () => {
    if (!lead.email) return alert('Lead nemá zadaný email.')
    const subject = encodeURIComponent(`Nabídka spolupráce — ${lead.firma}`)
    const body = encodeURIComponent(nabidka.replace(/#{1,3} /g, '').replace(/\*\*/g, ''))
    window.open(`mailto:${lead.email}?subject=${subject}&body=${body}`)
  }
  const [comments, setComments] = useState([])
  const [newText, setNewText] = useState('')
  const [autor, setAutor] = useState('Karel')
  const [loadingC, setLoadingC] = useState(true)
  const [sending, setSending] = useState(false)
  const [docs, setDocs] = useState([])
  const [uploading, setUploading] = useState(false)
  // Call log state
  const [showUkolModal, setShowUkolModal] = useState(false)
  const [showCallForm, setShowCallForm] = useState(false)
  const [callDatum, setCallDatum] = useState(new Date().toISOString().slice(0,10))
  const [callText, setCallText] = useState('')
  const [callAutor, setCallAutor] = useState('Karel')
  const [savingCall, setSavingCall] = useState(false)

  const aC = { Karel:'#534AB7', Radim:'#0F6E56', Ales:'#854F0B', Aleš:'#854F0B' }

  const fetchComments = useCallback(async () => {
    const { data } = await supabase.from('comments').select('*').eq('user_id', session?.user?.id)
      .eq('lead_id', lead.id).order('created_at', { ascending: true })
    setComments(data || [])
    setLoadingC(false)
  }, [lead.id])

  const fetchDocs = useCallback(async () => {
    const { data } = await supabase.from('documents').select('*')
      .eq('lead_id', lead.id).order('created_at', { ascending: false })
    setDocs(data || [])
  }, [lead.id])

  useEffect(() => { fetchComments(); fetchDocs() }, [fetchComments, fetchDocs])

  const sendComment = async () => {
    if (!newText.trim()) return
    setSending(true)
    await supabase.from('comments').insert([{ lead_id: lead.id, autor, text: newText.trim(), user_id: session?.user?.id }])
    await slackKomentar(lead.firma, autor, newText.trim())
    setNewText('')
    await fetchComments()
    setSending(false)
  }

  const saveCall = async () => {
    if (!callText.trim()) return
    setSavingCall(true)
    const callEntry = {
      lead_id: lead.id,
      autor: callAutor,
      text: callText.trim(),
      typ: 'call',
      datum_callu: callDatum
    }
    await supabase.from('comments').insert([{ ...callEntry, user_id: session?.user?.id }])
    await slackKomentar(lead.firma, callAutor, '📞 Call ' + callDatum + ': ' + callText.trim().slice(0,100))
    setCallText('')
    setCallDatum(new Date().toISOString().slice(0,10))
    setShowCallForm(false)
    setSavingCall(false)
    await fetchComments()
  }

  const deleteComment = async (id) => {
    if (!window.confirm('Smazat?')) return
    await supabase.from('comments').delete().eq('id', id)
    fetchComments()
  }

  const uploadDoc = async (e) => {
    const file = e.target.files[0]
    if (!file) return
    setUploading(true)
    const fileName = 'leads/' + lead.id + '/' + Date.now() + '_' + file.name
    const { error } = await supabase.storage.from('documents').upload(fileName, file)
    if (error) { alert('Chyba: ' + error.message); setUploading(false); return }
    const { data: urlData } = supabase.storage.from('documents').getPublicUrl(fileName)
    await supabase.from('documents').insert([{
      nazev: file.name, soubor: fileName, url: urlData.publicUrl,
      velikost: Math.round(file.size / 1024), kategorie: 'Lead dokument', lead_id: lead.id, user_id: session?.user?.id
    }])
    e.target.value = ''
    setUploading(false)
    fetchDocs()
  }

  const deleteDoc = async (doc) => {
    if (!window.confirm('Smazat?')) return
    await supabase.storage.from('documents').remove([doc.soubor])
    await supabase.from('documents').delete().eq('id', doc.id)
    fetchDocs()
  }

  const fmt = (iso) => new Date(iso).toLocaleString('cs-CZ', { day:'numeric', month:'short', hour:'2-digit', minute:'2-digit' })
  const fmtDate = (d) => new Date(d).toLocaleDateString('cs-CZ', { weekday:'short', day:'numeric', month:'long', year:'numeric' })

  const calls = comments.filter(c => c.typ === 'call')
  const ostatni = comments.filter(c => c.typ !== 'call')

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{maxWidth:640}}>
        <div className="modal-head">
          <div>
            <h2>{lead.firma}</h2>
            <div style={{fontSize:13,color:'#888',marginTop:2}}>{lead.osoba} · {lead.role} · <StavBadge stav={lead.stav} /></div>
          </div>
          <div style={{display:'flex',gap:6,alignItems:'center',flexWrap:'wrap'}}>
            <button className="btn" onClick={() => onEdit(lead)}>Upravit</button>
            <button className="btn" style={{color:'#534AB7',borderColor:'#534AB7'}} onClick={() => setShowUkolModal(true)}>+ Úkol</button>
            {lead.email && (
              <a href={'mailto:'+lead.email+'?subject=riscare — '+encodeURIComponent(lead.firma)}
                style={{padding:'0 14px',height:34,borderRadius:8,border:'0.5px solid #185FA5',background:'#E6F1FB',color:'#185FA5',fontSize:13,fontWeight:500,textDecoration:'none',display:'inline-flex',alignItems:'center',gap:4,whiteSpace:'nowrap'}}
                onClick={e=>e.stopPropagation()}>
                ✉️ Email
              </a>
            )}
            <button className="btn" style={{color:'#0F6E56',borderColor:'#0F6E56'}} onClick={() => {
              const start = new Date()
              start.setDate(start.getDate() + 1)
              start.setHours(10, 0, 0, 0)
              const end = new Date(start)
              end.setMinutes(end.getMinutes() + 30)
              const fmt = (d) => d.toISOString().replace(/[-:]/g,'').slice(0,15) + 'Z'
              const title = encodeURIComponent('Schůzka — ' + lead.firma)
              const details = encodeURIComponent(
                'Firma: ' + lead.firma + '\n' +
                'Kontakt: ' + (lead.osoba||'') + '\n' +
                'Produkt: ' + (lead.produkt||'') + '\n' +
                'CRM: https://crm-two-lemon.vercel.app'
              )
              const url = 'https://calendar.google.com/calendar/render?action=TEMPLATE' +
                '&text=' + title +
                '&dates=' + fmt(start) + '/' + fmt(end) +
                '&details=' + details
              window.open(url, '_blank')
            }}>📅 Naplánovat schůzku</button>
            <AiCallBtn lead={lead} />
            <AiEmailBtn lead={lead} />
            <button className="close-btn" onClick={onClose}>&times;</button>
          </div>
        </div>

        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'8px 24px',padding:'14px 24px',borderBottom:'0.5px solid #f0f0f0',fontSize:13}}>
          {lead.email && <div><span style={{color:'#888'}}>Email: </span><a href={'mailto:'+lead.email} style={{color:'#534AB7',textDecoration:'none',fontWeight:500}}>{lead.email}</a></div>}
          {lead.telefon && <div><span style={{color:'#888'}}>Tel: </span>{lead.telefon}</div>}
          {lead.produkt && <div><span style={{color:'#888'}}>Produkt: </span>{lead.produkt}</div>}
          {lead.cena && <div><span style={{color:'#888'}}>Cena: </span>{Number(lead.cena).toLocaleString('cs')} Kc</div>}
          {lead.followup && <div><span style={{color:'#888'}}>Follow-up: </span>{lead.followup}</div>}
          {lead.vede && <div><span style={{color:'#888'}}>Vede: </span>{lead.vede}</div>}
          {lead.zdroj && <div><span style={{color:'#888'}}>Zdroj: </span>{lead.zdroj}</div>}
              {lead.web && <div><span style={{color:'#888'}}>Web: </span><a href={lead.web.startsWith('http') ? lead.web : 'https://'+lead.web} target="_blank" rel="noreferrer" style={{color:'#534AB7'}}>{lead.web}</a></div>}
          {lead.prob && <div><span style={{color:'#888'}}>Pravd.: </span>{lead.prob}</div>}
        </div>

        {lead.poznamky && (
          <div style={{padding:'10px 24px',borderBottom:'0.5px solid #f0f0f0',fontSize:13,color:'#555',background:'#fafaf8'}}>
            <span style={{fontSize:11,color:'#aaa',fontWeight:500,textTransform:'uppercase',marginRight:8}}>Starší poznámky:</span>
            {lead.poznamky}
          </div>
        )}

        <div style={{padding:'14px 24px 0'}}>
          <div style={{display:'flex',gap:4,marginBottom:14,flexWrap:'wrap'}}>
            <button onClick={() => setActiveTab('aktivita')} style={{
              padding:'6px 14px',borderRadius:8,fontSize:13,cursor:'pointer',fontFamily:'inherit',
              border:'0.5px solid ' + (activeTab==='aktivita' ? '#534AB7' : '#e0e0e0'),
              background: activeTab==='aktivita' ? '#EEEDFE' : '#fff',
              color: activeTab==='aktivita' ? '#534AB7' : '#888',
              fontWeight: activeTab==='aktivita' ? 500 : 400
            }}>Aktivita · {ostatni.length}</button>
            <button onClick={() => setActiveTab('cally')} style={{
              padding:'6px 14px',borderRadius:8,fontSize:13,cursor:'pointer',fontFamily:'inherit',
              border:'0.5px solid ' + (activeTab==='cally' ? '#0F6E56' : '#e0e0e0'),
              background: activeTab==='cally' ? '#E1F5EE' : '#fff',
              color: activeTab==='cally' ? '#0F6E56' : '#888',
              fontWeight: activeTab==='cally' ? 500 : 400
            }}>📞 Cally · {calls.length}</button>
            <button onClick={() => setActiveTab('dokumenty')} style={{
              padding:'6px 14px',borderRadius:8,fontSize:13,cursor:'pointer',fontFamily:'inherit',
              border:'0.5px solid ' + (activeTab==='dokumenty' ? '#534AB7' : '#e0e0e0'),
              background: activeTab==='dokumenty' ? '#EEEDFE' : '#fff',
              color: activeTab==='dokumenty' ? '#534AB7' : '#888',
              fontWeight: activeTab==='dokumenty' ? 500 : 400
            }}>Dokumenty · {docs.length}</button>
            <button onClick={() => setActiveTab('nabidka')} style={{
              padding:'6px 14px',borderRadius:8,fontSize:13,cursor:'pointer',fontFamily:'inherit',
              border:'0.5px solid ' + (activeTab==='nabidka' ? '#854F0B' : '#e0e0e0'),
              background: activeTab==='nabidka' ? '#FAEEDA' : '#fff',
              color: activeTab==='nabidka' ? '#854F0B' : '#888',
              fontWeight: activeTab==='nabidka' ? 500 : 400
            }}>💡 Nabídka AI</button>
          </div>

          {activeTab === 'aktivita' && (
            <div style={{maxHeight:300,overflowY:'auto',marginBottom:14}}>
              {loadingC && <div style={{color:'#aaa',fontSize:13,padding:'16px 0'}}>Načítám...</div>}
              {!loadingC && !ostatni.length && <div style={{color:'#ccc',fontSize:13,padding:'16px 0',textAlign:'center'}}>Zatím žádná aktivita</div>}
              {ostatni.map(c => (
                <div key={c.id} style={{display:'flex',gap:10,marginBottom:12}}>
                  <div style={{width:30,height:30,borderRadius:'50%',flexShrink:0,background:(aC[c.autor]||'#888')+'22',display:'flex',alignItems:'center',justifyContent:'center',fontSize:12,fontWeight:500,color:aC[c.autor]||'#666'}}>{(c.autor||'?').slice(0,1)}</div>
                  <div style={{flex:1}}>
                    <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:3}}>
                      <span style={{fontSize:13,fontWeight:500,color:aC[c.autor]||'#333'}}>{c.autor}</span>
                      <span style={{fontSize:11,color:'#bbb'}}>{fmt(c.created_at)}</span>
                      <button onClick={() => deleteComment(c.id)} style={{marginLeft:'auto',background:'none',border:'none',color:'#ddd',cursor:'pointer',fontSize:14}}>&times;</button>
                    </div>
                    <div style={{fontSize:13,color:'#333',lineHeight:1.6,background:'#f8f8f6',borderRadius:8,padding:'8px 12px',whiteSpace:'pre-wrap'}}>{c.text}</div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'cally' && (
            <div style={{marginBottom:14}}>
              {!showCallForm && (
                <button onClick={() => setShowCallForm(true)} style={{
                  width:'100%',padding:'10px',borderRadius:8,border:'1.5px dashed #e0e0e0',
                  background:'#fafaf8',color:'#888',fontSize:13,cursor:'pointer',
                  fontFamily:'inherit',marginBottom:14,textAlign:'center'
                }}>+ Nový call záznam</button>
              )}

              {showCallForm && (
                <div style={{background:'#E1F5EE',borderRadius:10,border:'0.5px solid #5DCAA5',padding:'14px 16px',marginBottom:14}}>
                  <div style={{fontSize:12,color:'#0F6E56',fontWeight:600,marginBottom:10,textTransform:'uppercase'}}>Nový call</div>
                  <div style={{display:'flex',gap:8,marginBottom:10,alignItems:'center',flexWrap:'wrap'}}>
                    <div style={{display:'flex',gap:4}}>
                      {activeTeam.map(a => (
                        <button key={a} onClick={() => setCallAutor(a)} style={{
                          padding:'3px 10px',borderRadius:8,fontSize:12,cursor:'pointer',fontFamily:'inherit',
                          border:'0.5px solid '+(callAutor===a?'#0F6E56':'#b0dbc8'),
                          background:callAutor===a?'#0F6E5618':'#fff',
                          color:callAutor===a?'#0F6E56':'#666',fontWeight:callAutor===a?500:400
                        }}>{a}</button>
                      ))}
                    </div>
                    <input type="date" value={callDatum} onChange={e=>setCallDatum(e.target.value)}
                      style={{padding:'4px 10px',borderRadius:8,border:'0.5px solid #b0dbc8',fontSize:13,fontFamily:'inherit',background:'#fff'}} />
                  </div>
                  <textarea
                    value={callText}
                    onChange={e => setCallText(e.target.value)}
                    placeholder="Co bylo řečeno na callu? Zájem klienta, námitky, dohodnutý next step..."
                    style={{width:'100%',padding:'10px 12px',borderRadius:8,border:'0.5px solid #b0dbc8',fontSize:13,fontFamily:'inherit',resize:'vertical',minHeight:100,background:'#fff'}}
                  />
                  <div style={{display:'flex',gap:8,marginTop:10}}>
                    <button onClick={saveCall} disabled={savingCall||!callText.trim()} style={{
                      padding:'7px 18px',borderRadius:8,border:'none',background:'#0F6E56',
                      color:'#fff',fontSize:13,cursor:'pointer',fontFamily:'inherit',fontWeight:500
                    }}>{savingCall?'Ukládám...':'Uložit call'}</button>
                    <button onClick={()=>{setShowCallForm(false);setCallText('')}} style={{
                      padding:'7px 14px',borderRadius:8,border:'0.5px solid #ddd',
                      background:'#fff',color:'#888',fontSize:13,cursor:'pointer',fontFamily:'inherit'
                    }}>Zrušit</button>
                  </div>
                </div>
              )}

              {!loadingC && !calls.length && !showCallForm && (
                <div style={{color:'#ccc',fontSize:13,textAlign:'center',padding:'20px 0'}}>Žádné záznamy z callů</div>
              )}

              {calls.sort((a,b) => (b.datum_callu||b.created_at).localeCompare(a.datum_callu||a.created_at)).map((c,i) => (
                <div key={c.id} style={{marginBottom:12}}>
                  <div style={{
                    background:'#fff',border:'0.5px solid #e8e8e8',borderRadius:10,overflow:'hidden'
                  }}>
                    <div style={{
                      padding:'10px 14px',background:'#E1F5EE',borderBottom:'0.5px solid #b0dbc8',
                      display:'flex',alignItems:'center',gap:10
                    }}>
                      <span style={{fontSize:16}}>📞</span>
                      <div style={{flex:1}}>
                        <div style={{fontSize:13,fontWeight:600,color:'#0F6E56'}}>
                          {c.datum_callu ? fmtDate(c.datum_callu) : fmt(c.created_at)}
                        </div>
                        <div style={{fontSize:11,color:'#1D9E75'}}>
                          {c.autor} · záznam #{calls.length - i}
                        </div>
                      </div>
                      <button onClick={() => deleteComment(c.id)} style={{background:'none',border:'none',color:'#b0dbc8',cursor:'pointer',fontSize:14}}>&times;</button>
                    </div>
                    <div style={{padding:'12px 14px',fontSize:13,color:'#333',lineHeight:1.7,whiteSpace:'pre-wrap'}}>
                      {c.text}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'dokumenty' && (
            <div style={{marginBottom:14}}>
              <div style={{display:'flex',justifyContent:'flex-end',marginBottom:10}}>
                <label style={{padding:'6px 16px',borderRadius:8,border:'0.5px solid #534AB7',background:'#EEEDFE',color:'#534AB7',fontSize:13,cursor:'pointer',fontWeight:500,display:'inline-flex',alignItems:'center',gap:6}}>
                  {uploading ? 'Nahrávám...' : '+ Nahrát soubor'}
                  <input type="file" onChange={uploadDoc} style={{display:'none'}} disabled={uploading} />
                </label>
              </div>
              {!docs.length && <div style={{color:'#ccc',fontSize:13,textAlign:'center',padding:'24px 0'}}>Žádné dokumenty</div>}
              {docs.map(doc => (
                <div key={doc.id} style={{display:'flex',alignItems:'center',gap:10,padding:'10px 12px',background:'#f8f8f6',borderRadius:8,marginBottom:6}}>
                  <span>📄</span>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontSize:13,fontWeight:500,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{doc.nazev}</div>
                    <div style={{fontSize:11,color:'#aaa'}}>{doc.velikost} KB</div>
                  </div>
                  <a href={doc.url} target="_blank" rel="noreferrer" style={{padding:'4px 12px',borderRadius:6,border:'0.5px solid #534AB7',background:'#EEEDFE',color:'#534AB7',fontSize:12,textDecoration:'none'}}>Otevřít</a>
                  <button onClick={() => deleteDoc(doc)} style={{padding:'4px 8px',borderRadius:6,border:'0.5px solid #A32D2D',background:'#fff',color:'#A32D2D',fontSize:12,cursor:'pointer',fontFamily:'inherit'}}>×</button>
                </div>
              ))}
            </div>
          )}
        </div>

        {activeTab === 'aktivita' && (
          <div style={{padding:'12px 24px 20px',borderTop:'0.5px solid #f0f0f0'}}>
            <div style={{display:'flex',gap:8,marginBottom:8,alignItems:'center'}}>
              <span style={{fontSize:12,color:'#888'}}>Píšu jako:</span>
              {activeTeam.map(a => (
                <button key={a} onClick={() => setAutor(a)} style={{
                  padding:'3px 12px',borderRadius:10,fontSize:12,cursor:'pointer',fontFamily:'inherit',
                  border:'0.5px solid ' + (autor===a ? '#534AB7' : '#e0e0e0'),
                  background: autor===a ? '#EEEDFE' : '#fff',
                  color: autor===a ? '#534AB7' : '#888',
                  fontWeight: autor===a ? 500 : 400
                }}>{a}</button>
              ))}
            </div>
            <div style={{display:'flex',gap:8}}>
              <textarea value={newText} onChange={e => setNewText(e.target.value)}
                onKeyDown={e => { if(e.key==='Enter' && e.metaKey) sendComment() }}
                placeholder="Napiš komentář... (Cmd+Enter)"
                style={{flex:1,padding:'8px 12px',borderRadius:8,border:'0.5px solid #ddd',fontSize:13,fontFamily:'inherit',resize:'none',height:72}}
              />
              <button className="btn accent" onClick={sendComment} disabled={sending||!newText.trim()} style={{alignSelf:'flex-end',height:36}}>
                {sending ? '...' : 'Odeslat'}
              </button>
            </div>
          </div>
        )}

          {activeTab === 'nabidka' && (
            <div style={{padding:'12px 0 20px'}}>
              <div style={{display:'flex',gap:8,marginBottom:14,flexWrap:'wrap',alignItems:'center'}}>
                <button
                  onClick={generateNabidka}
                  disabled={nabidkaLoading}
                  style={{
                    padding:'8px 18px',borderRadius:8,border:'none',
                    background: nabidkaLoading ? '#e0e0e0' : '#854F0B',
                    color: nabidkaLoading ? '#888' : '#fff',
                    fontSize:13,cursor:nabidkaLoading?'not-allowed':'pointer',fontFamily:'inherit',fontWeight:500,
                    display:'flex',alignItems:'center',gap:6
                  }}>
                  {nabidkaLoading ? '⏳ Generuji nabídku...' : '✨ Generovat AI nabídku'}
                </button>
                {nabidka && (
                  <>
                    <button onClick={saveNabidka} style={{
                      padding:'8px 14px',borderRadius:8,border:'0.5px solid #0F6E56',
                      background:'#E1F5EE',color:'#0F6E56',fontSize:13,cursor:'pointer',fontFamily:'inherit'
                    }}>💾 Uložit</button>
                    <button onClick={sendNabidkaEmail} style={{
                      padding:'8px 14px',borderRadius:8,border:'0.5px solid #534AB7',
                      background:'#EEEDFE',color:'#534AB7',fontSize:13,cursor:'pointer',fontFamily:'inherit'
                    }}>✉️ Odeslat emailem</button>
                  </>
                )}
                {nabidkaSaved && <span style={{fontSize:12,color:'#0F6E56'}}>✓ Uloženo</span>}
              </div>

              {nabidkaLoading && (
                <div style={{padding:'32px 0',textAlign:'center'}}>
                  <div style={{fontSize:13,color:'#854F0B',marginBottom:8}}>Claude prohledává dostupné informace o klientovi...</div>
                  <div style={{fontSize:12,color:'#bbb'}}>Trvá to 15–30 sekund</div>
                </div>
              )}

              {!nabidkaLoading && !nabidka && (
                <div style={{padding:'32px 0',textAlign:'center',color:'#bbb',fontSize:13}}>
                  <div style={{fontSize:32,marginBottom:8}}>💡</div>
                  <div>Klikni na „Generovat AI nabídku" a Claude vytvoří</div>
                  <div>personalizovanou nabídku na základě informací o klientovi z internetu.</div>
                  <div style={{marginTop:8,fontSize:12,color:'#ddd'}}>Používá SPIN + Challenger Sale framework</div>
                </div>
              )}

              {!nabidkaLoading && nabidka && (
                <div>
                  <textarea
                    value={nabidka}
                    onChange={e => setNabidka(e.target.value)}
                    style={{
                      width:'100%',padding:'14px 16px',borderRadius:10,
                      border:'0.5px solid #e0e0e0',fontSize:13,fontFamily:'inherit',
                      resize:'vertical',minHeight:400,lineHeight:1.7,
                      background:'#fafaf8',color:'#333'
                    }}
                  />
                  <div style={{fontSize:11,color:'#bbb',marginTop:6}}>
                    Nabídku můžeš přímo editovat, pak uložit nebo odeslat emailem.
                    {lead.nabidka_updated_at && ' Naposledy aktualizováno: ' + new Date(lead.nabidka_updated_at).toLocaleDateString('cs')}
                  </div>
                </div>
              )}
            </div>
          )}
      </div>

      {showUkolModal && (
        <QuickUkolModal
          lead={lead}
          onClose={() => setShowUkolModal(false)}
          onSaved={() => {}}
          teamMembers={tmProps}
        />
      )}
    </div>
  )
}

// ─── MODAL FORMULÁŘ ───────────────────────────────────────────────────────────
const LeadModal = ({ lead, onSave, onDelete, onClose, industry, teamMembers }) => {
  const cfg = getIndustryCfg(industry)
  const vedeOptions = teamMembers && teamMembers.length > 0 ? teamMembers : ['Karel','Radim','Aleš']
  const defaultVede = teamMembers && teamMembers.length > 0 ? teamMembers[0] : ''
  const [form, setForm] = useState(lead || { ...cfg.emptyLead, vede: lead?.vede || defaultVede })
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))
  const fi = (k) => ({ value: form[k] || '', onChange: e => set(k, e.target.value) })

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-head">
          <h2>{lead ? (industry === 'real-estate' ? 'Upravit klienta' : 'Upravit lead') : (industry === 'real-estate' ? 'Nový klient / nemovitost' : 'Nový lead')}</h2>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>
        <div className="modal-body">
          <div className="form-grid">
            <div className="form-row"><label>{cfg.firmLabel} *</label><input {...fi('firma')} placeholder={cfg.firmLabel} /></div>
            <div className="form-row"><label>{cfg.klientLabel}</label><input {...fi('osoba')} placeholder="Jan Novák" /></div>
          </div>
          <div className="form-grid">
            <div className="form-row"><label>Role</label>
              <select {...fi('role')}>{cfg.role.map(o=><option key={o}>{o}</option>)}</select>
            </div>
            <div className="form-row"><label>Segment</label>
              <select {...fi('segment')}>{cfg.segmenty.map(o=><option key={o}>{o}</option>)}</select>
            </div>
          </div>
          <div className="form-grid">
            <div className="form-row"><label>Email</label><input type="email" {...fi('email')} /></div>
            <div className="form-row"><label>Telefon</label><input {...fi('telefon')} /></div>
          </div>
          <div className="form-row"><label>Web klienta</label><input {...fi('web')} placeholder="https://www.firma.cz" /></div>
          <div className="form-grid">
            <div className="form-row"><label>Odvětví</label>
              <select {...fi('odvetvi')}>{cfg.odvetvi.map(o=><option key={o}>{o}</option>)}</select>
            </div>
            <div className="form-row"><label>Zdroj leadu</label>
              <select {...fi('zdroj')}>{(industry === 'cybersecurity' ? ['Vlastní síť','Referral','LinkedIn','Agentura','Warm lead Talkey','Event'] : ['Vlastní síť','Referral','LinkedIn','Agentura','Warm lead','Event','Doporučení']).map(o=><option key={o}>{o}</option>)}</select>
            </div>
          </div>
          <div className="form-grid">
            <div className="form-row"><label>Produkt zájem</label>
              <select {...fi('produkt')}>{cfg.produkty.map(o=><option key={o}>{o}</option>)}</select>
            </div>
            <div className="form-row"><label>Stav</label>
              <select {...fi('stav')}>{cfg.stavs.map(o=><option key={o}>{o}</option>)}</select>
            </div>
          </div>
          <div className="form-grid">
            <div className="form-row"><label>Cena nabídky (Kč)</label><input type="number" {...fi('cena')} placeholder="36000" /></div>
            <div className="form-row"><label>Pravděpodobnost</label>
              <select {...fi('prob')}>{['Nízká (0–30 %)','Střední (30–70 %)','Vysoká (70–100 %)'].map(o=><option key={o}>{o}</option>)}</select>
            </div>
          </div>
          <div className="form-grid">
            <div className="form-row"><label>Kdo vede obchod</label>
              <select {...fi('vede')}>{vedeOptions.map(o=><option key={o}>{o}</option>)}</select>
            </div>
            <div className="form-row"><label>Datum next follow-upu</label><input type="date" {...fi('followup')} /></div>
          </div>
          <div className="form-grid">
            <div className="form-row"><label>Datum 1. kontaktu</label><input type="date" {...fi('d1')} /></div>
            <div className="form-row"><label>Hlavní námitka</label>
              <select {...fi('namitka')}>{cfg.namitky.map(o=><option key={o} value={o}>{o||'—'}</option>)}</select>
            </div>
          </div>
          <div className="form-row"><label>{industry === 'real-estate' ? 'Poznámky' : 'Poznámky z callu'}</label>
            <textarea {...fi('poznamky')} placeholder={industry === 'real-estate' ? 'Stav nemovitosti, motivace klienta, požadavky...' : 'Co říkali, co bolí, co rozhoduje...'} />
          </div>
          {industry === 'real-estate' && (
            <div className="form-grid">
              <div className="form-row"><label>Lokalita / adresa</label><input {...fi('lokalita')} placeholder="Praha 6 — Dejvice" /></div>
              <div className="form-row"><label>Dispozice</label>
                <select {...fi('dispozice')}>
                  {['','1+kk','1+1','2+kk','2+1','3+kk','3+1','4+kk','4+1','5+kk','5+1','6+','Komerční','Pozemek'].map(o=><option key={o} value={o}>{o||'—'}</option>)}
                </select>
              </div>
            </div>
          )}
          {industry === 'real-estate' && (
            <div className="form-grid">
              <div className="form-row"><label>Plocha (m²)</label><input type="number" {...fi('plocha')} placeholder="75" /></div>
              <div className="form-row"><label>Stav nemovitosti</label>
                <select {...fi('stav_nemovitosti')}>
                  {['','Novostavba','Po rekonstrukci','Dobrý stav','K rekonstrukci','Projekt'].map(o=><option key={o} value={o}>{o||'—'}</option>)}
                </select>
              </div>
            </div>
          )}
          <div className="form-row"><label>Štítky</label>
            <div style={{display:'flex',gap:6,flexWrap:'wrap',marginTop:4}}>
              {STITKY_OPTIONS.map(s => {
                const active = (form.stitky||'').split(',').filter(Boolean).includes(s)
                const color = STITKY_COLORS[s] || '#534AB7'
                return (
                  <button key={s} type="button" onClick={() => {
                    const curr = (form.stitky||'').split(',').filter(Boolean)
                    const nove = active ? curr.filter(x=>x!==s) : [...curr,s]
                    set('stitky', nove.join(','))
                  }} style={{
                    padding:'3px 10px',borderRadius:10,fontSize:12,cursor:'pointer',
                    border:'0.5px solid '+(active?color:'#e0e0e0'),
                    background:active?color+'18':'#fff',
                    color:active?color:'#aaa',fontFamily:'inherit',fontWeight:active?500:400
                  }}>{s}</button>
                )
              })}
            </div>
          </div>
        </div>
        <div className="modal-foot">
          {lead && <button className="btn danger" onClick={() => { if(window.confirm('Smazat?')) onDelete(lead.id) }}>Smazat</button>}
          <button className="btn" onClick={onClose}>Zrušit</button>
          <button className="btn accent" onClick={() => { if(!form.firma.trim()){alert('Zadej název firmy');return} onSave(form) }}>Uložit</button>
        </div>
      </div>
    </div>
  )
}

// ─── KANBAN ────────────────────────────────────────────────────────────────────
const KanbanView = ({ leads, onOpen, onStavChange, industry }) => {
  const cfg = getIndustryCfg(industry)
  const kanbanStavs = cfg.kanbanStavs
  const stavStyles = industry === 'real-estate' ? STAV_STYLES_RE : STAV_STYLES
  const t = today()
  const [dragging, setDragging] = useState(null)
  const [dragOver, setDragOver] = useState(null)

  const handleDragStart = (e, lead) => {
    setDragging(lead)
    e.dataTransfer.effectAllowed = 'move'
  }

  const handleDragOver = (e, stav) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    setDragOver(stav)
  }

  const handleDrop = (e, newStav) => {
    e.preventDefault()
    if (dragging && dragging.stav !== newStav) {
      onStavChange(dragging, newStav)
    }
    setDragging(null)
    setDragOver(null)
  }

  const handleDragEnd = () => {
    setDragging(null)
    setDragOver(null)
  }

  return (
    <div className="kanban">
      {kanbanStavs.map(stav => {
        const cards = leads.filter(l => l.stav === stav)
        const isOver = dragOver === stav
        return (
          <div
            className="kanban-col"
            key={stav}
            onDragOver={e => handleDragOver(e, stav)}
            onDrop={e => handleDrop(e, stav)}
            style={{ transition: 'background 0.15s' }}
          >
            <div className="col-header" style={{ color: isOver ? '#534AB7' : undefined }}>
              <span>{stav}</span>
              <span className="col-count">{cards.length}</span>
            </div>
            <div style={{
              minHeight: 60,
              borderRadius: 8,
              border: isOver ? '2px dashed #534AB7' : '2px dashed transparent',
              background: isOver ? '#EEEDFE' : 'transparent',
              transition: 'all 0.15s',
              padding: isOver ? '4px' : '0',
            }}>
              {!cards.length && !isOver && <div className="empty-col">Prázdné</div>}
              {cards.map(l => {
                const overdue = l.followup && l.followup <= t
                const isDragging = dragging?.id === l.id
                return (
                  <div
                    className="kanban-card"
                    key={l.id}
                    draggable
                    onDragStart={e => handleDragStart(e, l)}
                    onDragEnd={handleDragEnd}
                    onClick={() => !dragging && onOpen(l)}
                    style={{
                      opacity: isDragging ? 0.4 : 1,
                      cursor: 'grab',
                      transform: isDragging ? 'rotate(2deg)' : 'none',
                      transition: 'opacity 0.15s, transform 0.15s',
                    }}
                  >
                    <div className="card-firm">{l.firma}</div>
                    <div className="card-person">{l.osoba || '—'} · {l.role}</div>
                    <div className="card-tags">
                      <ProdTag produkt={l.produkt} />
                      <ProbTag prob={l.prob} />
                    </div>
                    {l.followup && (
                      <div className={`card-followup ${overdue ? 'overdue' : ''}`}>
                        📅 {l.followup}{overdue ? ' — dnes!' : ''}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ─── TABLE ────────────────────────────────────────────────────────────────────
const TableView = ({ leads, onOpen }) => {
  const t = today()
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Firma</th><th>Osoba</th><th>Segment</th><th>Produkt</th>
            <th>Stav</th><th>Cena (Kč)</th><th>Vede</th><th>Follow-up</th>
          </tr>
        </thead>
        <tbody>
          {!leads.length && <tr><td colSpan={8} style={{textAlign:'center',color:'#bbb',padding:'32px'}}>Žádné záznamy</td></tr>}
          {leads.map(l => {
            const overdue = l.followup && l.followup <= t
            return (
              <tr key={l.id} onClick={() => onOpen(l)}>
                <td style={{fontWeight:500}}>{l.firma}</td>
                <td>{l.osoba || '—'}</td>
                <td>{l.email ? <a href={'mailto:'+l.email} onClick={e=>e.stopPropagation()} style={{color:'#185FA5',textDecoration:'none',fontSize:12}}>✉️ {l.email}</a> : '—'}</td>
                <td><span className="tag tag-neu">{l.segment}</span></td>
                <td><ProdTag produkt={l.produkt} /></td>
                <td><StavBadge stav={l.stav} /></td>
                <td>{l.cena ? Number(l.cena).toLocaleString('cs') : '—'}</td>
                <td>{l.vede}</td>
                <td style={{color: overdue ? '#A32D2D' : 'inherit', fontWeight: overdue ? 500 : 400}}>{l.followup || '—'}</td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

// ─── FOLLOWUP VIEW ────────────────────────────────────────────────────────────
const FollowupView = ({ leads, onOpen }) => {
  const t = today()
  const fu = leads.filter(l => l.followup && l.followup <= t && !l.stav.includes('Uzavřeno'))
  return (
    <div>
      <p style={{marginBottom:12,fontSize:13,color:'#888'}}>{fu.length} lead{fu.length!==1?'ů':''} čeká na follow-up dnes nebo po termínu</p>
      <div className="table-wrap">
        <table>
          <thead><tr><th>Firma</th><th>Osoba</th><th>Stav</th><th>Follow-up</th><th>Námitka</th><th>Poznámky</th></tr></thead>
          <tbody>
            {!fu.length && <tr><td colSpan={6} style={{textAlign:'center',color:'#bbb',padding:'32px'}}>Žádný follow-up dnes 🎉</td></tr>}
            {fu.map(l => (
              <tr key={l.id} onClick={() => onOpen(l)}>
                <td style={{fontWeight:500}}>{l.firma}</td>
                <td>{l.osoba || '—'}</td>
                <td><StavBadge stav={l.stav} /></td>
                <td style={{color:'#A32D2D',fontWeight:500}}>{l.followup}</td>
                <td>{l.namitka || '—'}</td>
                <td style={{fontSize:12,color:'#888',maxWidth:180}}>{(l.poznamky||'').slice(0,70)}{l.poznamky?.length>70?'...':''}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ─── MULTIPLIKATORI ───────────────────────────────────────────────────────────
const MultiplikatoriView = ({ leads, onOpen }) => {
  const mp = leads.filter(l => l.segment === 'Multiplikátor')
  return (
    <div>
      <p style={{marginBottom:12,fontSize:13,color:'#888'}}>{mp.length} partnerů a zprostředkovatelů</p>
      <div className="table-wrap">
        <table>
          <thead><tr><th>Firma</th><th>Osoba</th><th>Odvětví</th><th>Stav</th><th>Zdroj</th><th>Vede</th><th>Poznámky</th></tr></thead>
          <tbody>
            {!mp.length && <tr><td colSpan={7} style={{textAlign:'center',color:'#bbb',padding:'32px'}}>Žádní multiplikátoři — přidej přes + Nový lead</td></tr>}
            {mp.map(l => (
              <tr key={l.id} onClick={() => onOpen(l)}>
                <td style={{fontWeight:500}}>{l.firma}</td>
                <td>{l.osoba || '—'}</td>
                <td>{l.odvetvi}</td>
                <td><StavBadge stav={l.stav} /></td>
                <td>{l.zdroj}</td>
                <td>{l.vede}</td>
                <td style={{fontSize:12,color:'#888',maxWidth:180}}>{(l.poznamky||'').slice(0,60)}{l.poznamky?.length>60?'...':''}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ─── DISCOVERY CALL SCRIPT ────────────────────────────────────────────────────
const phases = [
  { id:'prep', label:'Příprava', title:'Příprava před callem', meta:'5 minut před callem',
    script: null,
    questions:['Zjistil jsem odvětví a velikost firmy','Vím jméno a roli kontaktní osoby','Vím zda spadají pod NIS2 nebo DORA','Vím jak jsem se k nim dostal','Mám připravenou pauzu po nabídce'],
    tips:{ label:'Pravidla callu', items:['Mluv max 30 % času — oni 70 %','Nikdy nepřerušuj','Pauza po nabídce = NEŘÍKEJ NIC','Cíl: pochopit situaci, ne prodat'] },
    namitky: null
  },
  { id:'open', label:'Otevření', title:'Otevření callu', meta:'0–3 min · Nastavit agendu',
    script:{ label:'Co říkáš', text:'"Ahoj [Jméno], díky za čas. Plánoval jsem nám 30 minut — chci to dodržet. Agenda je jednoduchá: pár otázek abych pochopil kde stojíte, pak vám řeknu co vidíme u podobných firem, a na konci se rozhodneme jestli dává smysl jít dál nebo ne. Žádný tlak. Hodí se vám to tak?"' },
    questions:['Potvrdili agendu callu','Atmosféra je uvolněná'],
    tips:{ label:'Proč to funguje', items:['Říkáš že žádný tlak — snižuje defenzivu','Souhlas s agendou = první micro-yes'] },
    namitky: null
  },
  { id:'diag', label:'Diagnostika', title:'Diagnostika', meta:'3–15 min · NEDĚLEJ PITCH',
    script:{ label:'Otevírací otázka', text:'"Nejdřív mi řekněte — jak velká je vaše organizace a kdo u vás za IT a bezpečnost odpovídá?"' },
    questions:['Velikost firmy (zaměstnanci, obrat)','Kdo odpovídá za IT a bezpečnost','Mají interního CISO?','Co slyšeli o NIS2/DORA','Dělali někdy analýzu rizik nebo audit','Co je přivedlo k tématu teď','Kdo by byl odpovědný při auditu','Identifikoval jsem hlavní bolest'],
    tips:{ label:'Signály které hledáš', items:['Neví zda spadají → velká příležitost','Nemají CISO → příležitost pro Program','Říkají "řešíme interně" → zjisti jak daleko jsou','Říkají "ještě počkáme" → zjisti na co'] },
    namitky: null
  },
  { id:'edu', label:'Edukace', title:'Edukace a pozicování', meta:'15–23 min · Mluv o jejich situaci',
    script:{ label:'Pokud neví zda spadají pod NIS2', text:'"Na základě toho co jste mi řekl — s vysokou pravděpodobností pod NIS2 spadáte. Zákon platí od listopadu 2025. NÚKIB může přijít na audit kdykoliv. A odpovědnost není jen firemní — váš ředitel může být pokutován osobně. Pokuty jsou až 10 milionů euro nebo 2 % obratu, záleží co je vyšší."' },
    questions:['Zmínil jsem osobní odpovědnost managementu','Zmínil jsem konkrétní výši pokut','Vytvořil jsem urgenci bez strašení'],
    tips:{ label:'Varianty podle situace', items:['Neví kde stojí → "Pracuji na tom při auditu nestačí"','Nemají CISO → "Zákon třetí možnost nezná"','Říkají že to řeší → "Víte přesně kde stojíte?"'] },
    namitky: null
  },
  { id:'offer', label:'Nabídka', title:'Nabídka', meta:'23–28 min · Přirozený první krok',
    script:{ label:'Jak nabídnout Review', text:'"Na základě toho co jsme si řekli — nejchytřejší první krok je udělat analýzu kde přesně stojíte. Říkáme tomu riscare Review. Formou videokonzultace projdeme váš stav, dostanete zprávu a konkrétní akční plán. Výstup do dvou týdnů. Cena je 36 000 Kč bez DPH."' },
    questions:['Nabídl jsem Review jako přirozený krok','Nechal jsem pauzu po ceně','Reagoval jsem správnou variantou'],
    tips: null,
    namitky:[
      { q:'"Kolik to přesně stojí?"', a:'"36 000 Kč je cena s partnerskou slevou — standardní je 45 000 Kč. Jednorázová platba, žádný závazek."' },
      { q:'"Musím to probrat s kolegy."', a:'"Samozřejmě. Pošlu vám shrnutí do zítra. Kdy byste měli jasno — příští týden?"' },
      { q:'"Ještě počkáme."', a:'"Na co konkrétně čekáte? Ptám se abych pochopil co vám chybí k rozhodnutí."' },
      { q:'"Řešíme to interně."', a:'"Jak daleko jste — máte analýzu rizik, obsazené role? Někdy děláme nezávislý pohled pro potvrzení."' },
      { q:'"Je to drahé."', a:'"Alternativa je investovat do věcí které nepotřebujete. Review je přesně o tom aby investice šla tam kde to dává smysl."' },
    ]
  },
  { id:'close', label:'Uzavření', title:'Uzavření a next step', meta:'28–30 min · Vždy konkrétní krok',
    script:{ label:'Pokud je zájem', text:'"Výborně. Pošlu vám dnes shrnutí a jednoduchou objednávku. Jakmile potvrdíte, domluvíme vstupní konzultaci — jsme schopni začít do týdne. Na jakou emailovou adresu to mám poslat?"' },
    questions:['Dohodli jsme konkrétní next step','Vím kdy a jak se ozvou','Mám email pro zaslání nabídky','Do 24h pošlu follow-up email'],
    tips:{ label:'Pravidlo uzavření', items:['Zájem → nabídka dnes','Potřebují čas → konkrétní datum follow-upu','Není pro ně → požádej o referral','NIKDY nekonči bez data dalšího kontaktu'] },
    namitky: null
  },
]

const DiscoveryScript = ({ industry }) => {
  const isCons = industry !== 'real-estate' && industry !== 'cybersecurity'
  const activePhasesData = industry === 'real-estate' ? phasesRE : isCons ? phasesConsulting : phases
  const discoveryTitle = industry === 'real-estate' ? 'Script prodejní schůzky' : isCons ? 'Script konzultační schůzky' : 'Discovery Call Script'
  const [current, setCurrent] = useState(0)
  const [checked, setChecked] = useState({})
  const [openNamitka, setOpenNamitka] = useState(null)
  const [timerSec, setTimerSec] = useState(industry === 'real-estate' ? 2700 : 1800)
  const [running, setRunning] = useState(false)

  useEffect(() => {
    if (!running) return
    const i = setInterval(() => setTimerSec(s => Math.max(0, s - 1)), 1000)
    return () => clearInterval(i)
  }, [running])

  const p = activePhasesData[current]
  const toggleCheck = (key) => setChecked(c => ({ ...c, [key]: !c[key] }))
  const totalQ = phases.reduce((s,ph) => s + (ph.questions?.length || 0), 0)
  const totalDone = Object.values(checked).filter(Boolean).length
  const m = Math.floor(timerSec/60), s = timerSec%60

  return (
    <div>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:16}}>
        <div>
          <div style={{fontSize:16,fontWeight:500}}>Discovery call průvodce</div>
          <div style={{fontSize:12,color:'#888',marginTop:2}}>{totalDone} / {totalQ} bodů splněno</div>
        </div>
        <div style={{display:'flex',alignItems:'center',gap:10}}>
          <div style={{fontSize:22,fontWeight:500,fontVariantNumeric:'tabular-nums',color:timerSec<300?'#A32D2D':'inherit'}}>
            {m}:{s.toString().padStart(2,'0')}
          </div>
          <button className="btn" onClick={() => setRunning(r=>!r)}>{running?'Pause':'Start'}</button>
          <button className="btn" onClick={() => {setRunning(false);setTimerSec(1800)}}>Reset</button>
        </div>
      </div>

      <div style={{display:'flex',gap:4,marginBottom:16,flexWrap:'wrap'}}>
        {activePhasesData.map((ph,i) => (
          <span key={ph.id} onClick={() => setCurrent(i)} style={{
            padding:'4px 12px',borderRadius:10,fontSize:12,cursor:'pointer',
            background: i===current ? '#EEEDFE' : i<current ? '#E1F5EE' : '#f5f5f3',
            color: i===current ? '#534AB7' : i<current ? '#0F6E56' : '#888',
            border: `0.5px solid ${i===current?'#AFA9EC':i<current?'#5DCAA5':'#e8e8e8'}`,
          }}>{ph.label}</span>
        ))}
      </div>

      <div style={{fontSize:11,color:'#aaa',textTransform:'uppercase',letterSpacing:'0.5px',marginBottom:6}}>Fáze {current+1} / {activePhasesData.length}</div>
      <div style={{fontSize:18,fontWeight:500,marginBottom:4}}>{p.title}</div>
      <div style={{fontSize:13,color:'#888',marginBottom:16}}>{p.meta}</div>

      {p.script && (
        <div className="script-box">
          <div className="script-label">{p.script.label}</div>
          <div className="script-text">{p.script.text}</div>
        </div>
      )}

      {p.questions && (
        <div style={{marginBottom:14}}>
          <div style={{fontSize:12,fontWeight:500,color:'#888',marginBottom:8}}>Checklist</div>
          {p.questions.map((q,i) => {
            const key = p.id+'_'+i
            const done = checked[key]
            return (
              <div key={i} className={`checklist-item ${done?'done':''}`} onClick={() => toggleCheck(key)}>
                <div className="check-circle">{done?'✓':''}</div>
                <span style={{fontSize:13}}>{q}</span>
              </div>
            )
          })}
        </div>
      )}

      {p.tips && (
        <div className="tip-box" style={{marginBottom:14}}>
          <div className="tip-label">{p.tips.label}</div>
          <ul>{p.tips.items.map((t,i) => <li key={i}>{t}</li>)}</ul>
        </div>
      )}

      {p.namitky && (
        <div style={{marginBottom:14}}>
          <div style={{fontSize:12,fontWeight:500,color:'#888',marginBottom:8}}>Časté námitky</div>
          {p.namitky.map((n,i) => (
            <div key={i} className="namitka-item">
              <div className="namitka-head" onClick={() => setOpenNamitka(openNamitka===i?null:i)}>
                <span>{n.q}</span><span>{openNamitka===i?'▲':'▼'}</span>
              </div>
              <div className={`namitka-body ${openNamitka===i?'open':''}`}>{n.a}</div>
            </div>
          ))}
        </div>
      )}

      <div style={{display:'flex',justifyContent:'space-between',marginTop:16}}>
        <button className="btn" onClick={() => setCurrent(c=>Math.max(0,c-1))} disabled={current===0}>← Zpět</button>
        <button className="btn accent" onClick={() => setCurrent(c=>Math.min(activePhasesData.length-1,c+1))} disabled={current===activePhasesData.length-1}>
          {current===activePhasesData.length-1?'Hotovo ✓':'Další →'}
        </button>
      </div>
    </div>
  )
}

// ─── EMAIL TEMPLATE ───────────────────────────────────────────────────────────
const PRODUKTY = ['Review NIS2','Check DORA','Program NIS2','Program DORA','Lorenc NIS2','Lorenc DORA','Kyber.testy']

const PRODUKTY_INFO = {
  'Review NIS2': {
    popis: 'GAP analyza aktualniho stavu vuci pozadavkum NIS2. Vystup: zprava + akcni plan.',
    cena: '45 000 Kc (36 000 Kc se slevou)',
    typ: 'Jednorázový',
    barva: '#0F6E56', bg: '#E1F5EE'
  },
  'Check DORA': {
    popis: 'Hloubkova analyza pripravenosti vuci DORA a RTS. 7 klicovych oblasti. Vystup: zprava + akcni plan.',
    cena: '75 000 / 45 000 Kc (zjednoduseny system)',
    typ: 'Jednorázový',
    barva: '#185FA5', bg: '#E6F1FB'
  },
  'Program NIS2': {
    popis: 'All-inclusive outsourcing vsech zak. povinnych roli: CISO, risk manager, incident manager, pen. testy, skoleni, audit.',
    cena: 'Individuálně',
    typ: 'Průběžný',
    barva: '#534AB7', bg: '#EEEDFE'
  },
  'Program DORA': {
    popis: 'All-inclusive outsourcing DORA povinnosti: CISO, reporting CNB, ICT rizika, dodavatele, pen. testy, skoleni.',
    cena: 'Individuálně',
    typ: 'Průběžný',
    barva: '#534AB7', bg: '#EEEDFE'
  },
  'Lorenc NIS2': {
    popis: 'Mentoring bez plneho outsourcingu. Vy implementujete, my vedeme. Pravidelne konzultace, review dokumentace.',
    cena: 'Individuálně',
    typ: 'Průběžný',
    barva: '#854F0B', bg: '#FAEEDA'
  },
  'Lorenc DORA': {
    popis: 'Mentoring DORA implementace. Odborny dohled nad klicovymi oblastmi, review dokumentace, konzultace.',
    cena: 'Individuálně',
    typ: 'Průběžný',
    barva: '#854F0B', bg: '#FAEEDA'
  },
  'Kyber.testy': {
    popis: 'Penetracni testy a testy zranitelnosti dle TIBER-EU. Phishing simulace. Podrobna zprava s doporucenimy.',
    cena: 'Individuálně',
    typ: 'Jednorázový',
    barva: '#791F1F', bg: '#FCEBEB'
  },
  'Kyber.edukace': {
    popis: 'Skoleni zamestnancu, workshopy, simulace phishingu. Personalizovane programy dle potreb organizace.',
    cena: 'Individuálně',
    typ: 'Jednorázový',
    barva: '#3B6D11', bg: '#EAF3DE'
  },
}
const FAZE = ['První kontakt','Po discovery callu','Follow-up','Uzavření']

const emailTemplates = {
  'Review NIS2': {
    'První kontakt': {
      subject: 'NIS2 — víte kde vaše firma stojí?',
      body: `Ahoj [Jméno],

dostalo se ke mně že se pohybuješ v [odvětví] — a proto ti píšu.

Od listopadu 2025 platí nový zákon o kybernetické bezpečnosti. S velkou pravděpodobností se týká i vaší firmy. Osobní odpovědnost managementu, pokuty až 10 mil. EUR.

Spolupracuji se společností Talkey — jejich produkt riscare Review NIS2 je jednorázová analýza kde přesně stojíte, s konkrétním akčním plánem co dělat dál. Výstup do 2 týdnů, žádný závazek.

Hodí se 20 minut call kde to posoudíme?

Karel Petros
Key Account Manager | Talkey a.s. | riscare`,
    },
    'Po discovery callu': {
      subject: 'Shrnutí našeho hovoru — riscare Review NIS2',
      body: `Ahoj [Jméno],

díky za dnešní rozhovor. Jak jsem slíbil, posílám shrnutí.

Na základě toho co jsme si řekli:
• [Firma] s vysokou pravděpodobností spadá pod NIS2
• [Konkrétní mezera z callu — doplň]
• [Konkrétní mezera z callu — doplň]

Navrhovaný první krok: riscare Review NIS2

Co dostanete:
• Vstupní videokonzultace — projdeme váš stav vůči NIS2
• Výstupní zpráva — co splňujete, co chybí, co je kritické
• Akční plán — konkrétní kroky v doporučeném pořadí
• Výstupní videokonzultace — projdeme výsledky spolu

Cena: 36 000 Kč bez DPH (partnerská sleva 20 % ze standardních 45 000 Kč).
Závazek: žádný.

Stačí odpovědět na tento email — jsme schopni začít do týdne.

Karel Petros
Key Account Manager | Talkey a.s. | riscare`,
    },
    'Follow-up': {
      subject: 'Re: riscare Review NIS2 — [Název firmy]',
      body: `Ahoj [Jméno],

ozývám se jestli jsi měl čas se na to podívat.

Neptám se kvůli tlaku — pokud je nějaká otázka nebo nejasnost, rád to dořeším.

Pokud timing není teď správný, dej mi vědět kdy by se to hodilo víc.

Jen pro připomenutí — riscare Review NIS2 je jednorázová analýza za 36 000 Kč bez DPH. Výstup do 2 týdnů, žádný závazek.

Karel Petros
Key Account Manager | Talkey a.s. | riscare`,
    },
    'Uzavření': {
      subject: 'Objednávka — riscare Review NIS2',
      body: `Ahoj [Jméno],

výborně, jsem rád že jdeme do toho.

V příloze je objednávkový formulář pro riscare Review NIS2. Po potvrzení a úhradě zálohy domluvíme vstupní videokonzultaci — jsme schopni začít do týdne.

Shrnutí:
• Produkt: riscare Review NIS2
• Cena: 36 000 Kč bez DPH
• Výstup: do 2 týdnů od zahájení

Těším se na spolupráci.

Karel Petros
Key Account Manager | Talkey a.s. | riscare`,
    },
  },
  'Check DORA': {
    'První kontakt': {
      subject: 'DORA — jak na tom jste po lednu 2025?',
      body: `Ahoj [Jméno],

DORA platí od 17. ledna 2025. Finanční sektor je pod dohledem CNB a cas na "jeste to doladime" se krati.

Spolupracuji se společností Talkey — riscare Check DORA je hloubková analýza vaší připravenosti vůči DORA a RTS požadavkům. Výstup je zpráva plus akční plán přesně pro váš typ instituce.

Hodíte se na krátký call?

Karel Petros
Key Account Manager | Talkey a.s. | riscare`,
    },
    'Po discovery callu': {
      subject: 'Shrnutí našeho hovoru — riscare Check DORA',
      body: `Ahoj [Jméno],

díky za dnešní rozhovor. Posílám shrnutí a návrh dalšího kroku.

Na základě toho co jsme si řekli:
• [Typ instituce] spadá plně pod DORA od ledna 2025
• [Konkrétní oblast k řešení — doplň]
• [Konkrétní oblast k řešení — doplň]

Navrhovaný první krok: riscare Check DORA

Co dostanete:
• Screening vůči checklistu DORA a RTS
• Projdeme vaši stávající dokumentaci
• Výstupní zpráva s hodnocením požadavků
• Akční plán doporučení
• Výstupní videokonzultace

7 klíčových oblastí: Governance, Rizení ICT rizik, Incident management, Testování, Business Continuity, Rízení tretích stran, Threat intelligence.

Cena: 75 000 Kc / 45 000 Kc bez DPH (zjednodušený systém rízení rizika).

Karel Petros
Key Account Manager | Talkey a.s. | riscare`,
    },
    'Follow-up': {
      subject: 'Re: riscare Check DORA — [Název instituce]',
      body: `Ahoj [Jméno],

ozývám se jestli jsi měl čas se na nabídku podívat.

Pokud by pomohlo projít to osobně s Radimem Hofrichterem, naším technickým ředitelem, rád to domluvím.

Dej mi vědět.

Karel Petros
Key Account Manager | Talkey a.s. | riscare`,
    },
    'Uzavření': {
      subject: 'Objednávka — riscare Check DORA',
      body: `Ahoj [Jméno],

výborně. V příloze je objednávka pro riscare Check DORA.

Shrnutí:
• Produkt: riscare Check DORA
• Cena: [75 000 / 45 000] Kc bez DPH
• Výstup: zpráva plus akční plán

Po potvrzení domluvíme vstupní videokonzultaci.

Karel Petros
Key Account Manager | Talkey a.s. | riscare`,
    },
  },
  'Program NIS2': {
    'První kontakt': {
      subject: 'NIS2 compliance bez vlastního CISO — je to možné',
      body: `Ahoj [Jméno],

většina firem které musí plnit NIS2 nemá interního specialistu. A zákon přesto vyžaduje obsazení konkrétních rolí — manažer KB, manažer rizik, incident manager.

Spolupracuji se společností Talkey — riscare Program NIS2 řeší přesně toto. All-inclusive outsourcing všech zákonem požadovaných rolí. Jedna smlouva, jeden partner.

Hodí se na 20 minut call?

Karel Petros
Key Account Manager | Talkey a.s. | riscare`,
    },
    'Po discovery callu': {
      subject: 'Shrnutí hovoru — riscare Program NIS2',
      body: `Ahoj [Jméno],

díky za dnešní rozhovor. Posílám přehled programu.

Co je součástí riscare Program NIS2:
• CISO as a Service — odborné vedení bez vlastního specialisty
• Rízení ICT rizik — risk analýza, BIA, registr aktiv
• Rízení IKT dodavatelů — politika, hodnocení rizik, smluvní požadavky
• Incident management — monitoring, detekce, hlášení
• Penetrační testy — každoroční test plus zpráva
• Školení zaměstnanců — praktická školení plus phishing simulace
• Každoroční interní audit

Výsledek: plná NIS2 compliance bez vlastního bezpečnostního týmu.

Rád připravím cenovou nabídku na míru — stačí mi říct velikost firmy a odvětví.

Karel Petros
Key Account Manager | Talkey a.s. | riscare`,
    },
    'Follow-up': {
      subject: 'Re: riscare Program NIS2 — [Název firmy]',
      body: `Ahoj [Jméno],

ozývám se po naší schůzce — jestli jsi měl čas to probrat interně.

Pokud potřebuješ více informací nebo prezentaci pro vedení, rád to připravím.

Karel Petros
Key Account Manager | Talkey a.s. | riscare`,
    },
    'Uzavření': {
      subject: 'Smlouva — riscare Program NIS2',
      body: `Ahoj [Jméno],

výborně, jsem rád že jdeme do spolupráce.

V příloze najdeš návrh smlouvy pro riscare Program NIS2. Prosím o kontrolu a případné připomínky.

Po podpisu naplánujeme kickoff — ustavení systému rízení KB, definice rolí a první kroky.

Těším se na spolupráci.

Karel Petros
Key Account Manager | Talkey a.s. | riscare`,
    },
  },
  'Program DORA': {
    'První kontakt': {
      subject: 'DORA Program — outsourcing všeho co zákon vyžaduje',
      body: `Ahoj [Jméno],

DORA platí od ledna 2025 a CNB začíná dozor zpřísňovat. Pro finanční instituce to znamená konkrétní povinnosti — CISO, risk manager, incident manager, penetrační testy, reporting vůči CNB.

Talkey má produkt riscare Program DORA — pokrývá všechny tyto povinnosti formou outsourcingu. Jedna smlouva místo 3-4 specialistů.

Hodí se na krátký call?

Karel Petros
Key Account Manager | Talkey a.s. | riscare`,
    },
    'Po discovery callu': {
      subject: 'Shrnutí hovoru — riscare Program DORA',
      body: `Ahoj [Jméno],

díky za dnešní rozhovor. Posílám přehled programu.

riscare Program DORA obsahuje:
• CISO as a Service — vedení systému digitální provozní odolnosti
• Reporting vůči CNB — registr IKT dodavatelů, incident reporting, registr rizik
• Rízení ICT rizik — risk analýza, BIA, identifikace aktiv
• Rízení IKT dodavatelů — politika, hodnocení, smluvní standardy
• Incident management — monitoring, detekce, hlášení
• Penetrační testy — dle TIBER-EU metodiky
• Testy plánů reakce a obnovy — RTO/RPO parametry
• Školení zaměstnanců

Připravím cenovou nabídku na míru — potřebuji vědět velikost instituce a aktuální stav implementace.

Karel Petros
Key Account Manager | Talkey a.s. | riscare`,
    },
    'Follow-up': {
      subject: 'Re: riscare Program DORA — [Název instituce]',
      body: `Ahoj [Jméno],

ozývám se po naší schůzce.

Pokud by pomohlo sejít se osobně s Radimem a Alešem — rádi přijedeme nebo domluvíme Teams.

Dej mi vědět jak to u vás vypadá.

Karel Petros
Key Account Manager | Talkey a.s. | riscare`,
    },
    'Uzavření': {
      subject: 'Smlouva — riscare Program DORA',
      body: `Ahoj [Jméno],

výborně. V příloze je návrh smlouvy pro riscare Program DORA.

Po podpisu domluvíme kickoff — audit stávajícího stavu, ustavení rolí a nastavení reportingových procesů vůči CNB.

Těším se na spolupráci.

Karel Petros
Key Account Manager | Talkey a.s. | riscare`,
    },
  },
  'Lorenc NIS2': {
    'První kontakt': {
      subject: 'NIS2 mentoring — odborné vedení bez plného outsourcingu',
      body: `Ahoj [Jméno],

pokud chce vaše firma zvládnout NIS2 vlastními silami ale potřebuje odborné vedení — máme přesně to pravé.

riscare Lorenc NIS2 je mentoring od specialistů Talkey. Vy implementujete, my vás vedeme — pravidelné konzultace, odpovědi na konkrétní otázky, review dokumentace.

Levnější než plný outsourcing, efektivnější než jít do toho naslepo.

Hodí se na krátký call?

Karel Petros
Key Account Manager | Talkey a.s. | riscare`,
    },
    'Po discovery callu': {
      subject: 'Shrnutí hovoru — riscare Lorenc NIS2',
      body: `Ahoj [Jméno],

díky za dnešní rozhovor. Lorenc NIS2 je ideální pokud:
• Máte interní kapacitu na implementaci ale chybí expertíza
• Chcete mít kontrolu nad procesem ale potřebujete odborný dohled
• Plný outsourcing je nad rámec aktuálního rozpočtu

Co Lorenc obnáší:
• Pravidelné konzultační sessions
• Review vaší dokumentace a procesů
• Odpovědi na konkrétní otázky při implementaci
• Dohled nad klíčovými milníky

Rád připravím konkrétní nabídku — stačí mi říct kde v implementaci aktuálně jste.

Karel Petros
Key Account Manager | Talkey a.s. | riscare`,
    },
    'Follow-up': {
      subject: 'Re: riscare Lorenc NIS2 — [Název firmy]',
      body: `Ahoj [Jméno],

ozývám se — jestli jsi měl čas to probrat.

Pokud váháte mezi Lorenc a plným Programem, rád to projdeme — pomůžu vám vybrat správný přístup pro vaši situaci.

Karel Petros
Key Account Manager | Talkey a.s. | riscare`,
    },
    'Uzavření': {
      subject: 'Objednávka — riscare Lorenc NIS2',
      body: `Ahoj [Jméno],

výborně. V příloze je objednávka pro riscare Lorenc NIS2.

Po potvrzení domluvíme úvodní session — zmapujeme kde stojíte a nastavíme plán konzultací.

Těším se na spolupráci.

Karel Petros
Key Account Manager | Talkey a.s. | riscare`,
    },
  },
  'Lorenc DORA': {
    'První kontakt': {
      subject: 'DORA mentoring — odborné vedení bez plného outsourcingu',
      body: `Ahoj [Jméno],

DORA je komplexní regulace a mnoho institucí chce implementovat vlastními silami — ale s odborným vedením po boku.

riscare Lorenc DORA je přesně toto. Specialisté Talkey vás provází implementací — pravidelné konzultace, review dokumentace, odpovědi na konkrétní otázky k DORA a RTS.

Hodí se na krátký call?

Karel Petros
Key Account Manager | Talkey a.s. | riscare`,
    },
    'Po discovery callu': {
      subject: 'Shrnutí hovoru — riscare Lorenc DORA',
      body: `Ahoj [Jméno],

díky za dnešní rozhovor. Lorenc DORA je vhodný pokud:
• Máte interní tým který implementuje ale chybí DORA expertíza
• Potřebujete odborný dohled nad klíčovými oblastmi
• Chcete jistotu správného směru před auditem CNB

Rád připravím konkrétní nabídku na míru vaší instituci.

Karel Petros
Key Account Manager | Talkey a.s. | riscare`,
    },
    'Follow-up': {
      subject: 'Re: riscare Lorenc DORA — [Název instituce]',
      body: `Ahoj [Jméno],

ozývám se po naší schůzce — jak to u vás vypadá?

Pokud potřebuješ více podkladů pro rozhodnutí, rád doplním.

Karel Petros
Key Account Manager | Talkey a.s. | riscare`,
    },
    'Uzavření': {
      subject: 'Objednávka — riscare Lorenc DORA',
      body: `Ahoj [Jméno],

výborně. V příloze je objednávka pro riscare Lorenc DORA.

Po potvrzení domluvíme úvodní session — zmapujeme aktuální stav a nastavíme plán konzultací.

Těším se na spolupráci.

Karel Petros
Key Account Manager | Talkey a.s. | riscare`,
    },
  },
  'Kyber.testy': {
    'První kontakt': {
      subject: 'Víte jak odolné jsou vaše systémy vůči útoku?',
      body: `Ahoj [Jméno],

penetrační test je jediný způsob jak zjistit jestli vaše systémy odolají reálnému útoku — před tím než to zjistí útočník.

Talkey provádí penetrační testy a testy zranitelností podle nejnovějších metodik. Výstup je podrobná zpráva s konkrétními doporučeními. Pro firmy pod NIS2 nebo DORA je to navíc zákonná povinnost.

Hodí se na krátký call?

Karel Petros
Key Account Manager | Talkey a.s. | riscare`,
    },
    'Po discovery callu': {
      subject: 'Shrnutí hovoru — Kyber.testy',
      body: `Ahoj [Jméno],

díky za dnešní rozhovor. Na základě toho co jsme si řekli připravím nabídku na:

• [Penetrační test / Test zranitelností / Phishing simulace — doplň]
• Scope: [systémy / aplikace / síť — doplň]
• Metodika: [TIBER-EU / OWASP / custom — doplň]

Výstup bude vždy obsahovat:
• Podrobnou zprávu s výsledky testování
• Klasifikaci zranitelností (kritické / vysoké / střední / nízké)
• Konkrétní doporučení pro každou zranitelnost
• Executive summary pro vedení

Pošlu nabídku do 2 pracovních dnů.

Karel Petros
Key Account Manager | Talkey a.s. | riscare`,
    },
    'Follow-up': {
      subject: 'Re: Kyber.testy — [Název firmy]',
      body: `Ahoj [Jméno],

ozývám se — jak to u vás vypadá s timingem pro penetrační test?

Pokud potřebuješ více informací o metodice nebo rozsahu, rád to doplním.

Karel Petros
Key Account Manager | Talkey a.s. | riscare`,
    },
    'Uzavření': {
      subject: 'Objednávka — Kyber.testy',
      body: `Ahoj [Jméno],

výborně. V příloze je objednávka a technická specifikace testu.

Prosím o potvrzení rozsahu a preferovaného termínu zahájení — minimálně 2 týdny předem kvůli přípravě.

Těším se na spolupráci.

Karel Petros
Key Account Manager | Talkey a.s. | riscare`,
    },
  },
}



// ─── CONSULTING EMAIL TEMPLATES ──────────────────────────────────────────────
const emailTemplatesConsulting = {
  'Strategický audit': {
    'První kontakt': {
      subject: 'Strategický audit — kde přesně stojí vaše firma?',
      body: `Dobrý den [Jméno],

dostal jsem se k vám přes [zdroj]. Zaujalo mě co děláte v [odvětví].

Vidím u firem vaší velikosti jeden vzorec: strategické priority jsou nastavené, ale realita organizace za nimi zaostává. Výsledkem jsou zpomalená rozhodnutí a přetížení klíčoví lidé.

Náš Strategický audit je strukturovaná 2–4týdenní diagnostika. Výstup: prioritizovaný akční plán.

Má smysl si o tom promluvit 30 minut?

S pozdravem
[Vaše jméno]`
    },
    'Po úvodní schůzce': {
      subject: 'Shrnutí schůzky — Strategický audit pro [Firma]',
      body: `Dobrý den [Jméno],

díky za dnešní rozhovor. Hlavní výzvy které jste zmínil/a:
• [výzva 1]
• [výzva 2]

Navrhuji: Strategický audit [X týdnů] — rozhovory s klíčovými lidmi, analýza procesů, výstupní zpráva.

Cena: [X] Kč bez DPH | Start: [datum]

Pošlu návrh smlouvy v příštích dnech.

S pozdravem
[Vaše jméno]`
    },
    'Follow-up': {
      subject: 'Navazuji — Strategický audit [Firma]',
      body: `Dobrý den [Jméno],

navazuji na schůzku z [datum]. [Hlavní výzva] se mi zdá jako skutečná priorita.

Hodí se hovor tento nebo příští týden?

S pozdravem
[Vaše jméno]`
    },
    'Uzavření': {
      subject: 'Smlouva — Strategický audit [Firma]',
      body: `Dobrý den [Jméno],

v příloze zasílám návrh smlouvy.

Rozsah: [X týdnů] | Start: [datum] | Cena: [X] Kč bez DPH
Platba: 50 % při podpisu, 50 % po předání výstupu

Jakmile potvrdíte, domluvíme kick-off.

S pozdravem
[Vaše jméno]`
    }
  },
  'HR audit a doporučení': {
    'První kontakt': {
      subject: 'HR audit — víte kde vaše organizace ztrácí talenty?',
      body: `Dobrý den [Jméno],

propojili jsme se přes [zdroj]. Firmy v rychlé fázi růstu čelí podobnému problému: HR procesy pro 50 lidí přestávají fungovat pro 150. Talenti odcházejí, onboarding je pomalý.

Náš HR audit odhalí kde jsou trhlinky. Výstup: doporučení s prioritami na 3, 6 a 12 měsíců.

Má smysl si promluvit?

S pozdravem
[Vaše jméno]`
    },
    'Po úvodní schůzce': {
      subject: 'Shrnutí schůzky — HR audit [Firma]',
      body: `Dobrý den [Jméno],

díky za otevřený rozhovor. Klíčové výzvy:
• [výzva 1]
• [výzva 2]

Navrhuji: HR audit [3–4 týdny] — dotazníky, rozhovory, výstupní workshop.

Cena: [X] Kč bez DPH. Mohu zaslat detailní návrh?

S pozdravem
[Vaše jméno]`
    },
    'Follow-up': {
      subject: 'HR audit — jak to vypadá z vaší strany?',
      body: `Dobrý den [Jméno],

navazuji. Pokud potřebujete reference z podobných projektů, rád je zašlu.

S pozdravem
[Vaše jméno]`
    },
    'Uzavření': {
      subject: 'Smlouva — HR audit [Firma]',
      body: `Dobrý den [Jméno],

v příloze zasílám smlouvu.

Rozsah: [X týdnů] | Start: [datum] | Cena: [X] Kč bez DPH

Po podpisu domluvíme kick-off a harmonogram rozhovorů.

S pozdravem
[Vaše jméno]`
    }
  },
  'Leadership program': {
    'První kontakt': {
      subject: 'Leadership program — rozvoj manažerů který přináší výsledky',
      body: `Dobrý den [Jméno],

dostal jsem se k vám přes [zdroj]. Nejčastější problém u manažerů: jsou skvělí odborníci, ale leadership dovednosti za odborností zaostávají.

Náš Leadership program kombinuje skupinové workshopy, individuální koučink a praktická zadání. Výsledky měřitelné do 90 dní.

Hodí se 20 minut?

S pozdravem
[Vaše jméno]`
    },
    'Po úvodní schůzce': {
      subject: 'Leadership program — návrh pro [Firma]',
      body: `Dobrý den [Jméno],

navrhuji: [X workshopů] + individuální koučink, délka [X měsíců], [X] účastníků.

Obsah: diagnostika kompetencí → skupinové workshopy → individuální koučink → závěrečné hodnocení.

Cena: [X] Kč bez DPH. Mohu zaslat detailní program?

S pozdravem
[Vaše jméno]`
    },
    'Follow-up': {
      subject: 'Leadership program — máte otázky?',
      body: `Dobrý den [Jméno],

navazuji. Pokud váháte nad formátem, rád program upravím.

S pozdravem
[Vaše jméno]`
    },
    'Uzavření': {
      subject: 'Smlouva — Leadership program [Firma]',
      body: `Dobrý den [Jméno],

v příloze zasílám smlouvu a harmonogram.

Start: [datum] | Účastníků: [X] | Cena: [X] Kč bez DPH

Těším se na spolupráci.

S pozdravem
[Vaše jméno]`
    }
  },
  'Retainer / měsíční spolupráce': {
    'První kontakt': {
      subject: 'Strategický partner na retainer — jiný přístup ke konzultacím',
      body: `Dobrý den [Jméno],

nabízím retainer model: jsem k dispozici jako váš externím strategický nebo HR partner každý měsíc. Bez zdlouhavého onboardování — rovnou k věci.

Typicky pomáhám se strategickými rozhodnutími, HR procesy, leadership coachingem a přípravou na změny.

Hodí se krátký hovor?

S pozdravem
[Vaše jméno]`
    },
    'Po úvodní schůzce': {
      subject: 'Retainer spolupráce — návrh pro [Firma]',
      body: `Dobrý den [Jméno],

navrhuji měsíčně: [X hodin] konzultací + ad-hoc dostupnost + review priorit.

Cena: [X] Kč/měsíc bez DPH | Minimum: 3 měsíce | Výpověď: 1 měsíc

S pozdravem
[Vaše jméno]`
    },
    'Follow-up': {
      subject: 'Retainer — jak to vidíte?',
      body: `Dobrý den [Jméno],

navazuji. Pokud by pomohlo upravit rozsah, rád se přizpůsobím.

S pozdravem
[Vaše jméno]`
    },
    'Uzavření': {
      subject: 'Smlouva o retainer spolupráci — [Firma]',
      body: `Dobrý den [Jméno],

v příloze zasílám smlouvu.

Start: [datum] | Paušál: [X] Kč/měsíc bez DPH

Těším se na spolupráci.

S pozdravem
[Vaše jméno]`
    }
  }
}

// ─── CONSULTING DISCOVERY PHASES ─────────────────────────────────────────────
const phasesConsulting = [
  { id:'prep', label:'Příprava', title:'Příprava před schůzkou', meta:'10 minut před schůzkou',
    script: null,
    questions:['Prostudoval jsem web a LinkedIn klienta','Znám velikost firmy a odvětví','Vím kdo se schůzky účastní','Mám hypotézu o jejich hlavní výzvě','Připravil jsem 3 otázky které otevřou rozhovor'],
    tips:{ label:'Příprava je 70 % úspěchu', items:['Projdi LinkedIn — co komunikují posledních 6 měsíců?','Web — co zdůrazňují, co chybí?','Google — co se o nich píše?','Připrav hypotézu: „Tipuju že jejich výzva je..."'] },
    namitky: null
  },
  { id:'open', label:'Otevření', title:'Otevření schůzky', meta:'0–5 min · Nastavit tón',
    script:{ label:'Jak otevřít', text:'„Jsem rád že se potkáváme. Plánoval jsem nám 45 minut — chci nejdřív pochopit vaši situaci, pak ukázat jak uvažujeme o podobných výzvách, a na konci se rozhodnemé jestli dává smysl jít dál. Hodí se vám to tak?"' },
    questions:['Klient souhlasil s agendou','Atmosféra je uvolněná','Vím kdo je v místnosti a jaká je role'],
    tips:{ label:'Proč to funguje', items:['Souhlas s agendou = první micro-yes','„Rozhodnemé" — ne „přesvědčím vás"','70:30 pravidlo — ptej se víc než mluvíš'] },
    namitky: null
  },
  { id:'diag', label:'Diagnostika', title:'Diagnostika situace', meta:'5–20 min · Klíčová fáze',
    script:{ label:'Otevírací otázka', text:'„Řekněte mi — jak byste popsali kde vaše firma stojí teď a co vás nejvíc zaměstnává? Rád slyším vaši perspektivu bez filtrů."' },
    questions:['Znám hlavní business výzvu','Vím co se děje s lidmi / organizací','Znám historii — co zkoušeli a proč nefungovalo','Rozumím rozhodovacímu procesu','Identifikoval jsem skutečnou bolest','Vím jaký je jejich horizont'],
    tips:{ label:'Otázky které otvírají', items:['„Co vás na tom nejvíc frustruje?"','„Jak to ovlivňuje váš tým?"','„Co jste už zkoušeli?"','„Jak to vypadá za 12 měsíců pokud se nic nezmění?"','Ticho je váš kamarád'] },
    namitky: null
  },
  { id:'edu', label:'Perspektiva', title:'Sdílení perspektivy', meta:'20–30 min · Přidat hodnotu',
    script:{ label:'Jak sdílet pohled', text:'„Na základě toho co jste sdílel/a — vidím podobný vzorec u firem ve vaší situaci. Pracoval jsem s [podobná firma] kde jsme to řešili tím že [přístup]. Jak to rezonuje s vaší realitou?"' },
    questions:['Sdílel jsem konkrétní poznatek','Použil jsem příklad z praxe','Klient potvrdil nebo korigoval hypotézu','Vytvořil jsem pocit že rozumím situaci'],
    tips:{ label:'Jak být relevantní', items:['Mluv o jejich situaci ne o svých službách','Reference > obecné tvrzení','Ptej se „Jak to rezonuje?"','Buď ochotný říct „Tady si nejsem jistý"'] },
    namitky: null
  },
  { id:'offer', label:'Nabídka', title:'Prezentace spolupráce', meta:'30–40 min · Konkrétní návrh',
    script:{ label:'Jak nabídnout', text:'„Vidím tři možné cesty — [možnost A: rychlá diagnostika], [možnost B: projekt], [možnost C: retainer]. Která dává smysl pro váš kontext?"' },
    questions:['Nabídl jsem varianty ne jednu možnost','Zmínil jsem cenu přirozeně','Nechal jsem klienta vybrat','Zmínil jsem reference'],
    tips:{ label:'Cenový rozhovor', items:['Cenu řekni sebevědomě bez omluv','Nikdy nesniž cenu bez změny rozsahu','Vždy vracej k hodnotě a výsledku'] },
    namitky: [
      { q:'„Je to moc drahé."', a:'„Rozumím. Jaký výsledek by tuto investici ospravedlnil?"' },
      { q:'„Potřebuji to probrat s boardem."', a:'„Samozřejmě. Co by potřeboval vidět? Mohu připravit shrnutí přímo pro něj."' },
      { q:'„Nemáme kapacity."', a:'„Kdy by byl správný čas? Co by se muselo stát?"' },
      { q:'„Zvažujeme více dodavatelů."', a:'„Co bude klíčové při výběru? Rád ukážu jak přemýšlíme o vašem problému."' },
      { q:'„Řešíme to interně."', a:'„Jak daleko jste? Někdy má smysl externího partnera pro nezávislý pohled."' },
    ]
  },
  { id:'close', label:'Uzavření', title:'Next step a uzavření', meta:'40–45 min · Konkrétní krok',
    script:{ label:'Jak uzavřít', text:'„Výborně. Co je logický další krok z vaší strany? Z mé pošlu do [datum] návrh smlouvy. Kdy byste se mohli vyjádřit?"' },
    questions:['Dohodli jsme next step s datem','Vím kdo se zapojí do rozhodnutí','Do 24h pošlu follow-up shrnutí','Neopustil jsem schůzku bez závěru'],
    tips:{ label:'Pravidla uzavření', items:['Vždy konkrétní next step — nikdy „ozvu se"','Zájem → smlouva do 48 hodin','Váhání → zjisti co chybí k rozhodnutí','„Koho ve svém okolí by mohlo naše téma zajímat?"'] },
    namitky: null
  },
]

// ─── CONSULTING PRODUKTY INFO ─────────────────────────────────────────────────
const PRODUKTY_INFO_CONSULTING = {
  'Strategický audit': {
    popis: 'Strukturovaná diagnostika strategie, procesů a organizace. Výstup: prioritizovaný akční plán.',
    cena: 'Od 80 000 Kč',
    typ: 'Jednorázový projekt (2–4 týdny)',
    barva: '#534AB7', bg: '#EEEDFE',
    usp: ['Rychlá diagnostika bez dlouhého onboardingu','Nezávislý pohled zvenčí','Konkrétní priority ne obecné doporučení','Výstupní workshop pro management'],
  },
  'HR audit a doporučení': {
    popis: 'Komplexní analýza HR procesů — nábor, onboarding, retence, rozvoj. Doporučení s prioritami na 3, 6 a 12 měsíců.',
    cena: 'Od 60 000 Kč',
    typ: 'Jednorázový projekt (3–4 týdny)',
    barva: '#0F6E56', bg: '#E1F5EE',
    usp: ['Rozhovory s klíčovými lidmi i zaměstnanci','Dotazníkové šetření firemní kultury','Benchmarking vůči trhu','Praktický plán implementace'],
  },
  'Organizační rozvoj': {
    popis: 'Změna struktury, procesů nebo kultury. Od diagnostiky přes design až po implementaci.',
    cena: 'Od 150 000 Kč',
    typ: 'Střednědobý projekt (2–6 měsíců)',
    barva: '#185FA5', bg: '#E6F1FB',
    usp: ['End-to-end doprovázení celou změnou','Zapojení zaměstnanců do designu','Komunikační strategie','Měření adopce a výsledků'],
  },
  'Leadership program': {
    popis: 'Rozvoj manažerů — skupinové workshopy + individuální koučink + praktická zadání.',
    cena: 'Od 120 000 Kč (skupina do 12 osob)',
    typ: 'Program (3–6 měsíců)',
    barva: '#854F0B', bg: '#FAEEDA',
    usp: ['Diagnostika kompetencí na začátku a konci','Obsah stavěný na reálných situacích klienta','Individuální koučink pro každého','Měřitelné výsledky do 90 dní'],
  },
  'Change management': {
    popis: 'Řízení organizační změny — fúze, transformace, digitalizace, restrukturalizace.',
    cena: 'Individuální podle rozsahu',
    typ: 'Dlouhodobý projekt (3–12 měsíců)',
    barva: '#633806', bg: '#FDF3E7',
    usp: ['Strukturovaný framework','Stakeholder management a komunikace','Training manažerů pro vedení změny','Průběžné měření a korekce'],
  },
  'Firemní vzdělávání / workshop': {
    popis: 'Workshop na míru — strategie, leadership, komunikace, prodej, zákaznická zkušenost.',
    cena: 'Od 25 000 Kč / den',
    typ: 'Jednorázový (1–2 dny)',
    barva: '#27500A', bg: '#EAF3DE',
    usp: ['100% obsah na míru','Praktická cvičení ne přednášky','Akční plány účastníků','Možnost follow-up po 30 dnech'],
  },
  'Mentoring managementu': {
    popis: 'Individuální doprovázení CEO, HR ředitele nebo klíčového manažera.',
    cena: 'Od 15 000 Kč / měsíc',
    typ: 'Opakující se (3–12 měsíců)',
    barva: '#791F1F', bg: '#FCEBEB',
    usp: ['Jeden na jednoho','Plná důvěrnost','Kombinace koučinku a poradenství','Rychlá dostupnost při urgentních situacích'],
  },
  'Retainer / měsíční spolupráce': {
    popis: 'Externální strategický nebo HR partner na měsíční bázi.',
    cena: 'Od 20 000 Kč / měsíc',
    typ: 'Opakující se (min. 3 měsíce)',
    barva: '#185FA5', bg: '#E6F1FB',
    usp: ['Rychlá dostupnost bez onboardingu','Flexibilní zaměření podle priorit','Přístup k síti specialistů','Platíte za výsledky'],
  },
}

// ─── REAL ESTATE EMAIL TEMPLATES ──────────────────────────────────────────────
const emailTemplatesRE = {
  'Prodej nemovitosti': {
    'První kontakt': {
      subject: 'Vaše nemovitost — bezplatná konzultace prodeje',
      body: `Dobrý den [Jméno],

dostala se ke mně informace, že uvažujete o prodeji nemovitosti v [lokalita].

Rád bych vám nabídl bezplatnou konzultaci, kde:
• Stanovíme reálnou tržní cenu vaší nemovitosti
• Ukáži vám podobné prodeje v okolí za posledních 6 měsíců
• Navrhnu strategii prodeje šitou na míru

Celé setkání zabere 30–45 minut, bez závazku.

Hodí se vám příští týden?

S pozdravem
[Vaše jméno] | realitní makléř`
    },
    'Po prohlídce': {
      subject: 'Shrnutí dnešní prohlídky — [adresa]',
      body: `Dobrý den [Jméno],

děkuji za dnešní setkání. Rád shrnuji:

🏠 Nemovitost: [adresa]
📐 Dispozice: [dispozice], [plocha] m²
💰 Doporučená prodejní cena: [cena] Kč

Co jsem si z prohlídky odnesl:
• [Pozitiva nemovitosti]
• [Body pro marketing]

Navrhovaný postup:
1. Podpis zprostředkovatelské smlouvy
2. Profesionální fotodokumentace
3. Inzerce na hlavních portálech (Sreality, Bezrealitky, Reality.cz)
4. Aktivní oslovení mé databáze poptávajících

Mám zájem? Kdy se hodí podepsat smlouvu?

S pozdravem
[Vaše jméno]`
    },
    'Follow-up': {
      subject: 'Připomínka — nemovitost [adresa]',
      body: `Dobrý den [Jméno],

píšu, protože jsme se naposledy bavili o prodeji vaší nemovitosti na adrese [adresa].

Trh se momentálně [pohybuje příznivě / stabilizoval] a zájem kupujících v této lokalitě je vysoký.

Rád bych se znovu spojil — máte ještě zájem o nezávaznou konzultaci?

S pozdravem
[Vaše jméno]`
    },
    'Uzavření': {
      subject: 'Smlouva o zprostředkování — [adresa]',
      body: `Dobrý den [Jméno],

v příloze zasílám návrh zprostředkovatelské smlouvy pro nemovitost na adrese [adresa].

Klíčové podmínky:
• Exkluzivita: [X měsíců]
• Provize: [X %] z prodejní ceny
• Cílová cena: [cena] Kč

Smlouvu si prosím prostudujte. Jsem k dispozici pro jakékoli dotazy.

Jakmile potvrdíte, naplánujeme profesionální fotografie a spustíme kampaň.

S pozdravem
[Vaše jméno]`
    }
  },
  'Koupě — zastupuji kupujícího': {
    'První kontakt': {
      subject: 'Vaše poptávka nemovitosti — jsem tu pro vás',
      body: `Dobrý den [Jméno],

děkuji za váš zájem. Rád vám pomohu najít ideální nemovitost v [lokalita].

Na základě vašich požadavků:
• Typ: [typ nemovitosti]
• Lokalita: [oblast]
• Budget: do [cena] Kč
• Dispozice: [dispozice]

Mám v databázi několik nemovitostí, které by mohly odpovídat — rád vám je ukáži osobně nebo virtuálně.

Kdy se vám hodí prohlídka?

S pozdravem
[Vaše jméno]`
    },
    'Po prohlídce': {
      subject: 'Shrnutí prohlídky — [adresa]',
      body: `Dobrý den [Jméno],

děkuji za dnešní prohlídku nemovitosti na adrese [adresa].

Moje hodnocení pro vás:
✅ Plusy: [výhody]
⚠️ Ke zvážení: [možné nevýhody]
💰 Tržní cena: [cena] Kč (doporučuji nabídnout [nabídka] Kč)

Máte zájem podat nabídku? Pomůžu vám vyjednat co nejlepší podmínky.

S pozdravem
[Vaše jméno]`
    },
    'Follow-up': {
      subject: 'Nové nemovitosti odpovídající vašim požadavkům',
      body: `Dobrý den [Jméno],

přidaly se nové nemovitosti v lokalitě [oblast], které odpovídají vašim kritériím.

Vybrané tipy:
1. [Adresa 1] — [dispozice], [plocha] m², [cena] Kč
2. [Adresa 2] — [dispozice], [plocha] m², [cena] Kč

Mám zájem domluvit prohlídky?

S pozdravem
[Vaše jméno]`
    },
    'Uzavření': {
      subject: 'Rezervační smlouva — [adresa]',
      body: `Dobrý den [Jméno],

gratulujeme k výběru nemovitosti! V příloze zasílám návrh rezervační smlouvy.

Nemovitost: [adresa]
Domluvená cena: [cena] Kč
Rezervační záloha: [záloha] Kč
Termín podpisu kupní smlouvy: [datum]

Doporučuji zajistit financování nejpozději do [datum]. V případě hypotéky vám mohu doporučit ověřeného hypotečního poradce.

S pozdravem
[Vaše jméno]`
    }
  },
  'Pronájem': {
    'První kontakt': {
      subject: 'Vaše poptávka pronájmu — [lokalita]',
      body: `Dobrý den [Jméno],

děkuji za kontakt ohledně pronájmu v [lokalita].

Mám k dispozici několik bytů/prostor, které by mohly odpovídat vašim požadavkům:
• Dispozice: [dispozice]
• Max. nájem: [cena] Kč/měsíc
• Dostupnost od: [datum]

Rád domluvím prohlídku — kdy se vám hodí?

S pozdravem
[Vaše jméno]`
    },
    'Po prohlídce': {
      subject: 'Shrnutí prohlídky bytu — [adresa]',
      body: `Dobrý den [Jméno],

děkuji za prohlídku. Shrnutí:

📍 Adresa: [adresa]
📐 [dispozice], [plocha] m²
💰 Nájemné: [cena] Kč/měsíc + zálohy [zálohy] Kč
📅 Dostupné od: [datum]

Máte zájem? Pro rezervaci potřebuji:
1. Váš souhlas
2. Doklady totožnosti
3. Potvrzení o příjmu

Dejte vědět!

S pozdravem
[Vaše jméno]`
    },
    'Follow-up': {
      subject: 'Jak pokračujete s hledáním bytu?',
      body: `Dobrý den [Jméno],

naposled jsme si prohlédli byt na adrese [adresa]. Rád vím, jak jste se rozhodli.

Pokud hledáte dál — mám nové nabídky v dané lokalitě. Stačí napsat.

S pozdravem
[Vaše jméno]`
    },
    'Uzavření': {
      subject: 'Nájemní smlouva — [adresa]',
      body: `Dobrý den [Jméno],

v příloze zasílám návrh nájemní smlouvy pro byt na adrese [adresa].

Nájemné: [cena] Kč/měsíc
Kauce: [kauce] Kč (vrácena po ukončení nájmu)
Termín nastěhování: [datum]

Prosím o prostudování a případné připomínky do [datum].

S pozdravem
[Vaše jméno]`
    }
  }
}

// ─── REAL ESTATE DISCOVERY PHASES ──────────────────────────────────────────────
const phasesRE = [
  { id:'prep', label:'Příprava', title:'Příprava před schůzkou', meta:'5 minut před schůzkou',
    script: null,
    questions:['Vím typ nemovitosti a adresu','Zkontroloval jsem ceny v okolí (Sreality, RK)','Vím motivaci klienta (prodej kvůli čemu?)','Mám s sebou prezentaci RK','Vím tržní dobu prodeje v lokalitě'],
    tips:{ label:'Klíčová příprava', items:['Podívej se na srovnatelné prodeje za 6 měsíců v lokalitě','Zjisti průměrnou dobu prodeje v oblasti','Připrav si 3 klíčové argumenty proč vybrat tebe'] },
    namitky: null
  },
  { id:'open', label:'Otevření', title:'Otevření schůzky', meta:'0–5 min · Navázat důvěru',
    script:{ label:'Úvod', text:'"Dobrý den, jsem rád že se setkáváme osobně. Dnes bych rád pochopil vaši situaci a nemovitost, ukázal vám co vidím na trhu, a společně se rozhodli zda a jak spolupracovat. Bude to asi 45 minut — hodí se vám to tak?"' },
    questions:['Klient je uvolněný a důvěřující','Potvrdili jsme agendu schůzky'],
    tips:{ label:'Budování důvěry', items:['Ptej se na příběh nemovitosti — lidé rádi vyprávějí','Neukazuj cenu dříve než pochopíš situaci','Fokus: pochopit, ne prodat'] },
    namitky: null
  },
  { id:'diag', label:'Diagnostika', title:'Prohlídka a diagnostika', meta:'5–20 min · Pochopit situaci',
    script:{ label:'Otevírací otázka', text:'"Můžete mi říct o nemovitosti víc? Co vás vede k prodeji právě teď?"' },
    questions:['Znám důvod prodeje','Vím o stáří a stavu nemovitosti','Znám plány klienta po prodeji','Vím zda je nemovitost právně čistá','Znám časovou urgenci prodeje','Vím o případné hypotéce nebo zástavě'],
    tips:{ label:'Co hledáš', items:['Urgence = rychlý prodej za dobrou cenu (tvoje silná karta)','Žádná urgence = klient chce max. cenu (zdlouhavé vyjednávání)','Právní komplikace = upozorni a navrhni řešení','Rozvedení/dědictví = citlivě, ale buď konkrétní'] },
    namitky: null
  },
  { id:'cena', label:'Ocenění', title:'Ocenění nemovitosti', meta:'20–30 min · Klíčová fáze',
    script:{ label:'Jak prezentovat cenu', text:'"Na základě srovnatelných prodejů v této lokalitě za posledních 6 měsíců vidím tržní cenu v rozmezí [X–Y Kč]. Doporučuji inzerovat za [Z Kč] — to přitáhne vážné kupující a prodej proběhne nejrychleji. Příliš vysoká cena zchladí zájem a nemovitost ztratí atraktivitu."' },
    questions:['Prezentoval jsem srovnatelné prodeje','Vysvětlil jsem vliv přeceněnosti na délku prodeje','Klient rozumí doporučené ceně','Shodli jsme se na cílovém rozmezí'],
    tips:{ label:'Cenová strategie', items:['Ukáž konkrétní data — ne odhady','Přeceněná nemovitost = stigma na trhu','Ideální: 5 % nad tržní hodnotou jako vyjednávací prostor','Říkej "tržní data" ne "já si myslím"'] },
    namitky: [
      { q:'"Sousedé prodávali za více."', a:'"Kolik a jak dlouho trvalo prodej? Přeceněné nemovitosti leží na trhu měsíce a pak se prodají pod cenou. Chceme prodat dobře a rychle."' },
      { q:'"Potřebuji aspoň X Kč."', a:'"Rozumím. Pojďme spočítat — po odečtení daní, provize a případné hypotéky, kolik skutečně potřebujete mít v ruce?"' },
    ]
  },
  { id:'offer', label:'Nabídka', title:'Prezentace spolupráce', meta:'30–40 min · Co dostanete',
    script:{ label:'Jak prezentovat služby', text:'"Co vám nabízím: profesionální fotografie, homestaging poradenství, inzerci na všech hlavních portálech, aktivní oslovení mé databáze [X] poptávajících, právní servis přes ověřenou advokátní kancelář, a doproázení až k předání klíčů. Moje provize je [X %] z kupní ceny — platíte pouze při úspěšném prodeji."' },
    questions:['Prezentoval jsem konkrétní benefity','Ukázal jsem ukázkové fotografie a marketing','Vysvětlil jsem exkluzivitu a proč je výhodná','Vysvětlil jsem princip provize'],
    tips:{ label:'Klíčové argumenty', items:['Provize = platba za úspěch, ne za snahu','Databáze kupujících = zkratka k prodeji','Právní servis = klid a bezpečí'] },
    namitky: [
      { q:'"Proč exkluzivita?"', a:'"Exkluzivita mi dává jistotu, že mohu investovat maximum — profesionální foto, kampaně, čas. Bez ní makléři nemovitost nabídnou pasivně a soutěží kdo ji prodá první. Výsledek je horší."' },
      { q:'"Jiná RK nabídla nižší provizi."', a:'"Nižší provize znamená méně investic do marketingu. Lepší otázka je: kdo prodá rychleji a za lepší cenu? Rád ukážu reference."' },
      { q:'"Zkusím to prodat sám."', a:'"To je vaše právo. Průzkumy ukazují, že přímý prodej trvá průměrně 2x déle a realizuje se za nižší cenu. Pokud se za 30 dní neprodá, rád se ozvím."' },
    ]
  },
  { id:'close', label:'Uzavření', title:'Uzavření spolupráce', meta:'40–45 min · Next step',
    script:{ label:'Pokud je zájem', text:'"Výborně. Pošlu vám dnes smlouvu o zprostředkování — podíváte se na ni a do pátku mi dejte vědět. Zároveň domluvím fotografa na příští týden. Jakmile jsou fotky hotové, spouštíme inzerci. Obvykle první vážní zájemci přicházejí do 2 týdnů."' },
    questions:['Dohodli jsme konkrétní next step','Klient ví co se bude dít dál','Domluvili jsme termín fotografa','Do 24h pošlu smlouvu a shrnutí'],
    tips:{ label:'Pravidlo uzavření', items:['Vždy konkrétní next step s datem','Zájem → smlouva dnes nebo zítra','Váhání → zjisti co chybí k rozhodnutí','NIKDY nekonči bez dalšího data kontaktu'] },
    namitky: null
  },
]

const EmailTemplates = ({ industry }) => {
  const isRE = industry === 'real-estate'
  const isCons = !isRE && industry !== 'cybersecurity'
  const cfg = getIndustryCfg(industry)
  const activeTemplates = isRE ? emailTemplatesRE : isCons ? emailTemplatesConsulting : emailTemplates
  const activeFaze = isRE ? ['První kontakt','Po prohlídce','Follow-up','Uzavření'] : isCons ? ['První kontakt','Po úvodní schůzce','Follow-up','Uzavření'] : FAZE
  const [produkt, setProdukt] = useState(cfg.produkty[0])
  const [faze, setFaze] = useState(activeFaze[0])
  const [copied, setCopied] = useState(false)

  const t = activeTemplates[produkt]?.[faze]

  const copy = () => {
    if (!t) return
    navigator.clipboard.writeText(`Předmět: ${t.subject}\n\n${t.body}`)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div>
      <div style={{display:'flex',gap:12,marginBottom:20,flexWrap:'wrap',alignItems:'center'}}>
        <div>
          <div style={{fontSize:12,color:'#888',marginBottom:6,fontWeight:500}}>Produkt</div>
          <div style={{display:'flex',gap:4,flexWrap:'wrap'}}>
            {cfg.produkty.map(p => (
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
        {activeFaze.map(f => (
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

// ─── PDF DOKUMENTY ───────────────────────────────────────────────────────────────
const PdfDocuments = () => {
  const [docs, setDocs] = useState([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [filter, setFilter] = useState('')
  const [kategorie, setKategorie] = useState('')

  const fetchDocs = async () => {
    const { data } = await supabase.from('documents').select('*').eq('user_id', session?.user?.id).order('created_at', { ascending: false })
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
      kategorie: kategorie || 'Obecné',
      user_id: session?.user?.id
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


// ─── PRŮVODCE STRATEGIÍ ──────────────────────────────────────────────────────
// ─── PRŮVODCE STRATEGIÍ — INDUSTRY DATA ──────────────────────────────────────

const MESICE_RE = [
  { id: 'm1', label: 'Měsíc 1', sub: 'Průzkum a první mandáty', barva: '#0F6E56', bg: '#E1F5EE' },
  { id: 'm2', label: 'Měsíc 2–3', sub: 'Systém a pipeline', barva: '#534AB7', bg: '#EEEDFE' },
  { id: 'm3', label: 'Měsíc 4–6', sub: 'Růst a referraly', barva: '#185FA5', bg: '#E6F1FB' },
]

const KROKY_RE = [
  { id: 're1', mesic: 'm1', priorita: 'kritická',
    nazev: 'Zmapuj existující kontakty — potenciální prodávající i kupující',
    proc: 'Většina obchodů makléřů pochází z vlastní sítě. Nezačínáš od nuly — zmapuj kdo ve tvé síti uvažuje o prodeji nebo koupi.',
    jak: 'Projdi LinkedIn, telefon, e-mail. Pro každý kontakt: zájem o prodej/koupi? Časový horizont? Lokalita? Přidej do CRM jako lead.',
    cil: 'Min. 20 kontaktů v CRM, každý s kategorií (prodávající/kupující/investor) a follow-up datem.',
    tyden: 1,
  },
  { id: 're2', mesic: 'm1', priorita: 'kritická',
    nazev: 'Nastav CRM a pipeline',
    proc: 'Bez evidence kontaktů ztrácíš obchody. Pipeline = přehled kde je každý klient v procesu.',
    jak: 'Přidej prvních 20 kontaktů. Pipeline: Poptávka → Prohlídka → Nabídka → Rezervace → Podpis. Každý lead má follow-up datum.',
    cil: 'CRM s min. 20 leady, každý správně zařazený v pipeline.',
    tyden: 1,
  },
  { id: 're3', mesic: 'm1', priorita: 'kritická',
    nazev: 'Prvních 10 úvodních schůzek s potenciálními klienty',
    proc: 'Každá schůzka je informace o trhu a příležitost k mandátu. Použi script schůzky v appce.',
    jak: 'Cíl: 3-5 schůzek týdně. Po každé schůzce záznam do CRM do 30 minut. Zaměř se na prodávající — mandát = jistota provize.',
    cil: '10 schůzek, záznamy v CRM, min. 2-3 podepsané mandáty.',
    tyden: 2,
  },
  { id: 're4', mesic: 'm1', priorita: 'vysoká',
    nazev: 'Připrav profesionální prezentaci pro prodávající',
    proc: 'Prodávající vybírají makléře. Profesionální prezentace = důvod proč ty a ne konkurence.',
    jak: 'Prezentace: tvé výsledky, marketingový plán pro jejich nemovitost, realistické ocenění, timeline. Max 10 slajdů nebo 1 stránka.',
    cil: 'Hotová prezentace použitelná na každé schůzce s prodávajícím.',
    tyden: 2,
  },
  { id: 're5', mesic: 'm1', priorita: 'vysoká',
    nazev: 'Bezplatné ocenění jako vstupní hák — 5 nemovitostí',
    proc: 'Bezplatné ocenění je nejlepší způsob jak dostat nohu do dveří. 80% majitelů kteří dostanou profesionální ocenění nakonec prodávají s makléřem.',
    jak: 'Nabídni bezplatné ocenění ve svém okolí. Inzeruj na sociálních sítích. Po ocenění: follow-up s marketingovým plánem.',
    cil: '5 provedených ocenění, min. 1 podepsaný mandát z nich.',
    tyden: '3-4',
  },
  { id: 're6', mesic: 'm1', priorita: 'střední',
    nazev: 'Identifikuj 3 referral partnery',
    proc: 'Hypoteční poradci, právníci, daňoví poradci — každý zná lidi kteří kupují nebo prodávají. Jeden partner = přístup k desítkám klientů.',
    jak: 'Navažu kontakt s hypotečním poradcem, právníkem a stavebním firmou. Navrhni reciprocitu — doporučuj je svým klientům výměnou.',
    cil: '3 aktivní referral partnerství s jasným modelem spolupráce.',
    tyden: '3-4',
  },
  { id: 're7', mesic: 'm1', priorita: 'kritická',
    nazev: 'Uzavři první mandát a první prodej',
    proc: 'Jeden úspěšný prodej = reference, důvěra a motivace. Vše ostatní je teorie.',
    jak: 'Z prvních schůzek vyber nejslibnějšího prodávajícího. Follow-up do 24h po schůzce. Nabídni extra servis: profesionální foto zdarma k prvnímu mandátu.',
    cil: 'Min. 1 podepsaný exkluzivní mandát, nemovitost aktivně inzerovaná.',
    tyden: '3-4',
  },
  { id: 're8', mesic: 'm2', priorita: 'kritická',
    nazev: 'Spusť systematický marketing nemovitostí',
    proc: 'Profesionální prezentace nemovitosti = rychlejší prodej, vyšší cena, spokojený klient = reference.',
    jak: 'Pro každou nemovitost: profesionální fotografie, video/3D tour, popis cílící na správného kupce, inzerce na Sreality + Facebook + Instagram.',
    cil: 'Každá inzerovaná nemovitost má profesionální foto a video, průměrná doba prodeje pod 60 dní.',
    tyden: '5-8',
  },
  { id: 're9', mesic: 'm2', priorita: 'vysoká',
    nazev: 'Nastav emailový newsletter pro databázi kupujících',
    proc: 'Kupující kteří teď nekupují, koupí za 6-12 měsíců. Pravidelný newsletter = zůstaneš v jejich hlavě.',
    jak: 'Měsíční newsletter: nové nemovitosti, trend cen v lokalitě, tipy pro kupující. Segmentuj: kupující bytu, domu, investoři.',
    cil: 'Databáze 100+ kontaktů, newsletter odesílaný měsíčně.',
    tyden: '5-8',
  },
  { id: 're10', mesic: 'm2', priorita: 'vysoká',
    nazev: 'Aktivní social media strategie — osobní brand makléře',
    proc: 'Lidé kupují od lidí. Osobní brand na sociálních sítích generuje inbound leady bez investice do reklamy.',
    jak: '3 posty týdně: prodané nemovitosti (se souhlasem), tipy pro kupující/prodávající, zákulisí práce. Instagram + Facebook. Reels mají největší dosah.',
    cil: 'Min. 500 followerů, 3 inbound poptávky měsíčně ze sociálních sítí.',
    tyden: '5-12',
  },
  { id: 're11', mesic: 'm2', priorita: 'střední',
    nazev: 'Uzavři 2-3 prodeje za měsíc',
    proc: 'Měsíc 2-3 je test jestli máš fungující systém nebo jen štěstí z měsíce 1.',
    jak: 'Pipeline management: každý lead má follow-up datum. Každé pondělí: Follow-up dnes v appce. Žádný kupující nezůstane bez kontaktu déle než 7 dní.',
    cil: '2-3 uzavřené transakce měsíčně, revenue 150 000 - 300 000 Kč provize.',
    tyden: '5-12',
  },
  { id: 're12', mesic: 'm2', priorita: 'střední',
    nazev: 'Spusť program správy nemovitostí jako cross-sell',
    proc: 'Klient co prodal nebo koupil je nejlepší zákazník pro správu nemovitosti. Opakující se pasivní příjem pro tebe i klienta.',
    jak: 'Po uzavření transakce: nabídni správu nemovitosti investorům nebo majitelům s více nemovitostmi. Měsíční paušál za správu.',
    cil: 'Min. 3 nemovitosti ve správě do konce měsíce 3.',
    tyden: '9-12',
  },
  { id: 're13', mesic: 'm3', priorita: 'kritická',
    nazev: 'Referral systém — požádej každého spokojeného klienta o doporučení',
    proc: 'Doporučení od spokojeného klienta má 90% konverzní míru. Je to nejlevnější a nejefektivnější zdroj nových obchodů.',
    jak: 'Po každém uzavřeném prodeji: osobní poděkování + žádost o doporučení. Nabídni odměnu za úspěšné doporučení (dárkový poukaz nebo sleva na příští transakci).',
    cil: 'Min. 30% nových klientů pochází z doporučení od měsíce 4.',
    tyden: '13-24',
  },
  { id: 're14', mesic: 'm3', priorita: 'vysoká',
    nazev: 'Vytvoř případové studie úspěšných prodejů',
    proc: 'Příběh prodeje = nejsilnější marketingový obsah. "Prodali jsme za 15% nad trhovou cenou za 3 týdny" přesvědčí více než jakákoli reklama.',
    jak: 'Pro každý zajímavý prodej: situace → výzva → co jsi udělal → výsledek. Se souhlasem klienta zveřejni na sociálních sítích a webu.',
    cil: '5-10 případových studií, každá sdílená na sociálních sítích.',
    tyden: '13-20',
  },
  { id: 're15', mesic: 'm3', priorita: 'vysoká',
    nazev: 'Rozšiř na investiční poradenství',
    proc: 'Investoři kupují opakovaně a mají vyšší transakce. Jeden investor klient = 3-10 transakcí za rok.',
    jak: 'Nabídni bezplatnou investiční konzultaci: výnos z pronájmu, potenciál zhodnocení, správa portfolia. Zaměř se na klienty co prodali a mají volný kapitál.',
    cil: 'Min. 3 investorské klienty se opakující se spoluprací.',
    tyden: '13-24',
  },
  { id: 're16', mesic: 'm3', priorita: 'střední',
    nazev: 'Lokální event a community strategie',
    proc: 'Makléř = lokální expert. Přednášky a eventy budují autoritu a generují inbound leady pasivně.',
    jak: 'Zorganizuj seminář pro prodávající: "Jak prodat byt za maximální cenu". Spolupracuj s místními podniky a komunitami. Cíl: 1 event za čtvrtletí.',
    cil: '2 eventy do konce měsíce 6, min. 5 leadů z každého.',
    tyden: '17-24',
  },
]

const MESICE_CONS = [
  { id: 'm1', label: 'Měsíc 1', sub: 'Průzkum a první zakázky', barva: '#534AB7', bg: '#EEEDFE' },
  { id: 'm2', label: 'Měsíc 2–3', sub: 'Systém a škálování', barva: '#0F6E56', bg: '#E1F5EE' },
  { id: 'm3', label: 'Měsíc 4–6', sub: 'Retainer a referraly', barva: '#185FA5', bg: '#E6F1FB' },
]

const KROKY_CONS = [
  { id: 'c1', mesic: 'm1', priorita: 'kritická',
    nazev: 'Zmapuj existující kontakty — potenciální klienti a referral partneři',
    proc: 'Většina prvních consulting zakázek pochází z osobní sítě. Nezačínáš od nuly.',
    jak: 'Projdi LinkedIn, telefon, e-mail. Pro každý kontakt: může potřebovat consulting? Kdy? Jaká oblast? Přidej do CRM.',
    cil: 'Min. 20 kontaktů v CRM, každý s oblastí zájmu a follow-up datem.',
    tyden: 1,
  },
  { id: 'c2', mesic: 'm1', priorita: 'kritická',
    nazev: 'Nastav CRM a pipeline',
    proc: 'Bez evidence kontaktů ztrácíš zakázky. Pipeline = přehled kde je každý potenciální klient.',
    jak: 'Přidej prvních 20 kontaktů. Pipeline: Poptávka → Úvodní schůzka → Nabídka → Smlouva → Projekt. Každý lead má follow-up datum.',
    cil: 'CRM s min. 20 leady, každý správně zařazený.',
    tyden: 1,
  },
  { id: 'c3', mesic: 'm1', priorita: 'kritická',
    nazev: 'Prvních 10 úvodních konzultačních schůzek',
    proc: 'Každá schůzka je informace o trhu a příležitost k zakázce. Neprodáváš — diagnostikuješ.',
    jak: 'Cíl: 3-5 schůzek týdně. Použi script schůzky v appce. Po schůzce: záznam do CRM, follow-up email do 24h.',
    cil: '10 schůzek, záznamy v CRM, min. 2-3 vážné poptávky.',
    tyden: 2,
  },
  { id: 'c4', mesic: 'm1', priorita: 'vysoká',
    nazev: 'Připrav nabídkový template pro každou službu',
    proc: 'Profesionální nabídka = důvěra a rychlejší rozhodnutí klienta. Bez šablony ztrácíš čas po každé schůzce.',
    jak: 'Template pro každou hlavní službu: rozsah, metodika, výstupy, cena, timeline. Max 2 strany. Použi šablony emailů v appce.',
    cil: 'Hotové nabídkové šablony pro min. 3 hlavní služby.',
    tyden: 2,
  },
  { id: 'c5', mesic: 'm1', priorita: 'vysoká',
    nazev: 'Bezplatný diagnostický rozhovor jako vstupní hák — 5 firem',
    proc: '45minutový diagnostický rozhovor je nejlepší způsob jak ukázat hodnotu bez rizika pro klienta. 60% konvertuje na placenou zakázku.',
    jak: 'Nabídni bezplatný "Strategický check-up" nebo "HR diagnostiku". Po rozhovoru: písemné shrnutí s 3 doporučeními. Jedno doporučení vyřeš zdarma.',
    cil: '5 provedených diagnostik, min. 1-2 placené zakázky z nich.',
    tyden: '3-4',
  },
  { id: 'c6', mesic: 'm1', priorita: 'střední',
    nazev: 'Identifikuj 3 referral partnery',
    proc: 'Právníci, účetní, investiční poradci, HR agentury — každý zná firmy které potřebují consulting. Jeden partner = přístup k desítkám klientů.',
    jak: 'Navažu kontakt. Navrhni reciprocitu: doporučuješ je svým klientům, oni tebe. Připrav krátké představení co děláš a pro koho.',
    cil: '3 aktivní referral partnerství s jasným modelem spolupráce.',
    tyden: '3-4',
  },
  { id: 'c7', mesic: 'm1', priorita: 'kritická',
    nazev: 'Uzavři první placenou zakázku',
    proc: 'Jeden platící klient dokazuje že model funguje. Vše ostatní je teorie.',
    jak: 'Z diagnostik a schůzek vyber nejslibnějšího. Follow-up do 24h. Nabídni jasný výstup za pevnou cenu. Začni s auditem nebo workshopem jako vstupní zakázkou.',
    cil: 'Min. 1 podepsaná smlouva a uhrazená záloha do konce měsíce 1.',
    tyden: '3-4',
  },
  { id: 'c8', mesic: 'm2', priorita: 'kritická',
    nazev: 'Rozjeď referral síť — formální dohoda s partnery',
    proc: 'Referral je nejlevnější zdroj klientů s nejvyšší konverzní mírou. Musí mít jasný důvod tě doporučovat.',
    jak: 'Pro každého aktivního partnera: domluv schůzku, vysvětli přesně co děláš a pro koho, domluv model spolupráce. Připrav onepager který mohou předat.',
    cil: 'Min. 3 formální partnerství, každé s jasným modelem a prvním doporučením.',
    tyden: '5-8',
  },
  { id: 'c9', mesic: 'm2', priorita: 'vysoká',
    nazev: 'Nastav thought leadership content strategii',
    proc: 'Články a posty o tvé oblasti = inbound leady bez studeného outreachu. Expert content buduje důvěru před první schůzkou.',
    jak: 'LinkedIn: 2-3 posty týdně. Formát: pohled experta na aktuální problém, ne reklama. Cíl: CEO a HR ředitelé. Jeden delší článek měsíčně na LinkedIn nebo firemní blog.',
    cil: 'Min. 500 followerů, 3 inbound poptávky měsíčně z LinkedIn.',
    tyden: '5-12',
  },
  { id: 'c10', mesic: 'm2', priorita: 'vysoká',
    nazev: 'Uzavři 2-3 zakázky za měsíc — systematicky',
    proc: 'Měsíc 2-3 je test jestli máš fungující systém nebo jen štěstí z měsíce 1.',
    jak: 'Pipeline management: každý lead má follow-up datum. Každé pondělí: Follow-up dnes v appce. Žádný kontakt bez odpovědi déle než 7 dní.',
    cil: '2-3 uzavřené zakázky měsíčně, revenue 150 000 - 500 000 Kč.',
    tyden: '5-12',
  },
  { id: 'c11', mesic: 'm2', priorita: 'střední',
    nazev: 'Spusť první webinář nebo workshop pro potenciální klienty',
    proc: 'Webinář generuje warm leads ve velkém. 1 webinář = 30-100 potenciálních klientů najednou.',
    jak: 'Téma: praktický problém tvé cílové skupiny. Délka: 60 minut. Bezplatný přístup, na konci nabídka diagnostiky. Promuj přes LinkedIn a referral partnery.',
    cil: 'Min. 30 registrací, 5+ poptávek po diagnostice.',
    tyden: '7-12',
  },
  { id: 'c12', mesic: 'm2', priorita: 'střední',
    nazev: 'Přidej retainer nabídku ke každé dokončené zakázce',
    proc: 'Retainer = předvídatelný měsíční příjem. Klient co dokončil projekt je nejlepší kandidát na retainer — zná tě a má důvěru.',
    jak: 'Po každé zakázce: follow-up call 2 týdny po výstupu. Projdi výsledky. Nabídni měsíční retainer jako přirozený next step.',
    cil: 'Min. 1-2 klienti na retaineru do konce měsíce 3.',
    tyden: '9-12',
  },
  { id: 'c13', mesic: 'm3', priorita: 'kritická',
    nazev: 'Přejdi do advisory role — pečuj o existující klienty',
    proc: 'Upsell je 5× levnější než nový klient. Klient co viděl výsledky je připraven koupit větší zakázku nebo retainer.',
    jak: 'Pro každého dokončeného klienta: follow-up 30 dní po výstupu. Projdi implementaci doporučení. Nabídni implementační projekt nebo retainer jako next step.',
    cil: 'Min. 30% konverzní míra: jednorázová zakázka → retainer nebo větší projekt.',
    tyden: '13-24',
  },
  { id: 'c14', mesic: 'm3', priorita: 'vysoká',
    nazev: 'Vytvoř případové studie úspěšných projektů',
    proc: 'Případová studie = nejsilnější prodejní nástroj. Konkrétní výsledky pro konkrétní firmu přesvědčí více než jakákoli prezentace.',
    jak: 'Pro každý dokončený projekt: situace → výzva → tvůj přístup → měřitelné výsledky. Se souhlasem klienta sdílej na LinkedIn a webu.',
    cil: '3-5 případových studií připravených k použití v prodeji.',
    tyden: '13-20',
  },
  { id: 'c15', mesic: 'm3', priorita: 'vysoká',
    nazev: 'Spusť přednáškovou strategii — pozicování jako expert',
    proc: 'Přednášky na byznys eventů = pasivní inbound leady. Jeden talk = 10-50 potenciálních klientů najednou.',
    jak: 'Kontaktuj organizátory HR konferencí, manažerských eventů, podnikatelských klubů. Nabídni konkrétní téma s praktickými výstupy. Cíl: 1 přednáška za měsíc.',
    cil: '3+ potvrzené přednášky, min. 5 poptávek z každé.',
    tyden: '13-24',
  },
  { id: 'c16', mesic: 'm3', priorita: 'střední',
    nazev: 'Rozšiř portfolio o skupinové programy',
    proc: 'Skupinové programy (leadership, týmový rozvoj) = vyšší hodinová sazba, menší závislost na jednom klientovi, škálovatelnost.',
    jak: 'Navrhni skupinový program pro 8-12 manažerů: 4-6 workshopů + individuální koučink. Oslovi firmy kde znáš HR ředitele nebo CEO.',
    cil: 'Min. 1 skupinový program prodaný a zahájený do konce měsíce 6.',
    tyden: '17-24',
  },
]

const PLAN_BLOKY_RE = [
  {
    id: 'situace',
    nazev: 'Blok 1 — Kde jsem teď',
    cas: '0:00–0:15',
    barva: '#534AB7',
    uvod: 'Než začneme plánovat, potřebuji pochopit výchozí stav — co fungovalo, co ne.',
    otazky: [
      'Kolik transakcí jsem uzavřel za posledních 6 měsíců a jaká byla průměrná provize?',
      'Odkud pochází většina mých klientů — doporučení, reklama, sociální sítě, přímý kontakt?',
      'Kde je největší problém — získání mandátu, nalezení kupce, nebo uzavření transakce?',
      'Jaká je průměrná doba od prvního kontaktu do uzavření transakce?',
      'Co dělám, co funguje? Co dělám zbytečně?',
    ],
    mujNavrh: 'Na základě analýzy vidím 3 hlavní příležitosti: (1) Systematizovat referral program — spoléhat na náhodu nestačí. (2) Přidat správu nemovitostí jako opakující se příjem. (3) Investovat do osobního brandu na sociálních sítích.',
  },
  {
    id: 'zakaznik',
    nazev: 'Blok 2 — Ideální klient a první mandát',
    cas: '0:15–0:45',
    barva: '#0F6E56',
    uvod: 'Bez jasné definice ideálního klienta trávíš čas s lidmi, kteří nekoupí nebo neprodají.',
    otazky: [
      'Jaký typ nemovitostí a jaká lokalita jsou mou silnou stránkou?',
      'Zaměřuji se více na prodávající nebo kupující — a proč?',
      'Mám kontakty mezi hypotečními poradci, právníky nebo developery (referral partneři)?',
      'Jaká je typická první námitka proč klient neuzavřel mandát se mnou?',
      'Mám databázi kupujících kteří čekají na vhodnou nemovitost?',
    ],
    mujNavrh: 'Navrhovaný 30denní plán: Týden 1 — mapování kontaktů + CRM + mandátová prezentace. Týden 2 — 10 schůzek + 5 bezplatných ocenění. Týden 3-4 — follow-up, podpisy mandátů, první inzerce.',
  },
  {
    id: 'infrastruktura',
    nazev: 'Blok 3 — Marketingová infrastruktura',
    cas: '0:45–1:10',
    barva: '#185FA5',
    uvod: 'Profesionální prezentace nemovitosti = rychlejší prodej, vyšší cena, spokojený klient a reference.',
    otazky: [
      'Používám profesionální fotografii a video pro každou nemovitost?',
      'Kde inzeruji — Sreality, Bezrealitky, sociální sítě, vlastní web?',
      'Mám připravenou prezentaci pro prodávající klienty?',
      'Posílám kupujícím pravidelné updaty o nových nemovitostech?',
      'Jak měřím účinnost jednotlivých marketingových kanálů?',
    ],
    mujNavrh: 'Fáze 1 (měsíc 1-2): CRM + mandátová prezentace + profesionální foto standard. Fáze 2 (měsíc 2-4): sociální sítě + newsletter kupujícím + referral partneři. Fáze 3 (měsíc 4-6): správa nemovitostí + investiční poradenství + eventy.',
  },
  {
    id: 'role',
    nazev: 'Blok 4 — Osobní brand a pozicování',
    cas: '1:10–1:35',
    barva: '#633806',
    uvod: 'Makléř = lokální expert. Lidé kupují nemovitost od makléře kterému věří a kterého znají.',
    otazky: [
      'Mám jasné pozicování — v čem jsem jiný než ostatní makléři?',
      'Jak aktivně používám sociální sítě pro budování osobního brandu?',
      'Sbírám systematicky recenze a hodnocení od spokojených klientů?',
      'Mám na webu nebo sociálních sítích případové studie úspěšných prodejů?',
    ],
    mujNavrh: 'Osobní brand strategie: Instagram + Facebook s 3 posty týdně (prodané nemovitosti, tipy, zákulisí). Cíl za 6 měsíců: 1000 followerů, 3-5 inbound poptávek měsíčně ze sociálních sítí.',
  },
  {
    id: 'upsell',
    nazev: 'Blok 5 — Upsell a opakující se příjem',
    cas: '1:35–1:50',
    barva: '#185FA5',
    uvod: 'Správa nemovitostí a investiční poradenství = předvídatelný měsíční příjem nezávislý na transakcích.',
    otazky: [
      'Nabízím správu nemovitostí — pokud ne, proč?',
      'Mám klienty kteří vlastní více nemovitostí a mohli by ocenit správu portfolia?',
      'Nabízím investiční poradenství — výpočet výnosu, analýza lokality?',
      'Jak systematicky žádám spokojené klienty o doporučení?',
    ],
    mujNavrh: 'Cross-sell strategie: po každé transakci nabídni správu nemovitosti. Po 2-3 transakcích s klientem nabídni investiční konzultaci. Cíl: 20-30% příjmů z opakujících se zdrojů do konce roku.',
  },
  {
    id: 'akcniplan',
    nazev: 'Blok 6 — Výstupy a akční plán',
    cas: '1:50–2:00',
    barva: '#27500A',
    uvod: 'Každý plán bez konkrétních akcí je jen hezká teorie. Odcházím s jasným úkolem na příští týden.',
    otazky: [
      'Co jsem dnes neřešil a měl bych?',
      'Jaká je největší překážka mého růstu v příštích 3 měsících?',
      'Co potřebuji zařídit/nastavit aby plán fungoval?',
    ],
    mujNavrh: 'Akční plán tento týden: přidat 20 kontaktů do CRM, připravit mandátovou prezentaci, domluvit 5 schůzek s potenciálními prodávajícími, kontaktovat 2 hypoteční poradce.',
  },
]

const PLAN_BLOKY_CONS = [
  {
    id: 'situace',
    nazev: 'Blok 1 — Kde jsem teď',
    cas: '0:00–0:15',
    barva: '#534AB7',
    uvod: 'Než začneme plánovat, potřebuji pochopit výchozí stav — co fungovalo, co ne.',
    otazky: [
      'Kolik zakázek jsem uzavřel za posledních 6 měsíců a jaký byl průměrný objem?',
      'Odkud pochází většina mých klientů — doporučení, přímý kontakt, LinkedIn, eventy?',
      'Kde je největší problém — získání klientů, konverze schůzky na zakázku, nebo udržení klienta?',
      'Jaká je průměrná délka vztahu s klientem — jednorázový projekt nebo opakující se spolupráce?',
      'Co dělám, co funguje? Co dělám zbytečně?',
    ],
    mujNavrh: 'Na základě analýzy vidím 3 hlavní příležitosti: (1) Systematizovat referral program. (2) Přidat retainer nabídku ke každé dokončené zakázce. (3) Investovat do thought leadership content na LinkedIn.',
  },
  {
    id: 'zakaznik',
    nazev: 'Blok 2 — Ideální klient a první zakázka',
    cas: '0:15–0:45',
    barva: '#0F6E56',
    uvod: 'Bez jasné definice ideálního klienta trávíš čas s firmami, které nekoupí nebo nemohou zaplatit.',
    otazky: [
      'Jaká je moje specializace — HR, strategie, leadership, change management?',
      'Jaká velikost a odvětví firmy jsou mou silnou stránkou?',
      'Mám kontakty mezi právníky, účetními, investičními poradci nebo HR agenturami (referral partneři)?',
      'Jaká je typická první námitka proč klient nepodepsal smlouvu?',
      'Jaký vstupní produkt funguje nejlépe — audit, workshop, nebo diagnostická schůzka?',
    ],
    mujNavrh: 'Navrhovaný 30denní plán: Týden 1 — mapování kontaktů + CRM + nabídkové šablony. Týden 2 — 10 schůzek + 5 bezplatných diagnostik. Týden 3-4 — follow-up, podpisy smluv, první projekt.',
  },
  {
    id: 'infrastruktura',
    nazev: 'Blok 3 — Consulting infrastruktura',
    cas: '0:45–1:10',
    barva: '#185FA5',
    uvod: 'Bez systémů a nástrojů je každá zakázka stres. Chci se dohodnout co stavíme teď a co může počkat.',
    otazky: [
      'Mám CRM pro sledování kontaktů a pipeline?',
      'Mám připravené nabídkové šablony pro každou hlavní službu?',
      'Používám standardizovanou metodiku pro každý typ zakázky?',
      'Jak měřím spokojenost klientů a sbírám zpětnou vazbu?',
      'Mám kapacitu na více zakázek najednou — nebo pracuji sólo?',
    ],
    mujNavrh: 'Fáze 1 (měsíc 1-2): CRM + nabídkové šablony + diagnostická metodika. Fáze 2 (měsíc 2-4): referral partnerství + LinkedIn content + webinář. Fáze 3 (měsíc 4-6): retainer program + případové studie + přednášky.',
  },
  {
    id: 'role',
    nazev: 'Blok 4 — Osobní brand a thought leadership',
    cas: '1:10–1:35',
    barva: '#633806',
    uvod: 'Klienti kupují od konzultantů kterým věří a které považují za experty. Brand buduj dřív než ho potřebuješ.',
    otazky: [
      'Mám jasné pozicování — v čem jsem jiný než ostatní konzultanti ve stejné oblasti?',
      'Sdílím pravidelně obsah na LinkedIn — případové studie, tipy, pohled experta?',
      'Sbírám systematicky reference od spokojených klientů?',
      'Přednáším na konferencích nebo byznys eventech?',
    ],
    mujNavrh: 'Thought leadership strategie: LinkedIn 2-3 posty týdně (pohled experta, ne reklama), jeden delší článek měsíčně, cíl za 6 měsíců: 3 inbound poptávky měsíčně z LinkedIn bez aktivního outreachu.',
  },
  {
    id: 'retainer',
    nazev: 'Blok 5 — Retainer a opakující se příjem',
    cas: '1:35–1:50',
    barva: '#185FA5',
    uvod: 'Retainer = předvídatelný příjem a hlubší partnerství s klientem. Průměrný retainer klient = 12× vyšší LTV než jednorázová zakázka.',
    otazky: [
      'Nabízím retainer po každé dokončené zakázce — pokud ne, proč?',
      'Jaká je moje retainer nabídka — co přesně klient dostává každý měsíc?',
      'Mám klienty kteří by ocenili průběžný přístup k mé expertíze?',
      'Jak systematicky žádám spokojené klienty o doporučení?',
    ],
    mujNavrh: 'Retainer strategie: po každé zakázce follow-up 2 týdny po výstupu, nabídni měsíční retainer. Obsah retaineru: X hodin konzultací + ad-hoc dostupnost + review priorit. Cíl: 20-30% příjmů z retainerů do konce roku.',
  },
  {
    id: 'akcniplan',
    nazev: 'Blok 6 — Výstupy a akční plán',
    cas: '1:50–2:00',
    barva: '#27500A',
    uvod: 'Každý plán bez konkrétních akcí je jen hezká teorie. Odcházím s jasným úkolem na příští týden.',
    otazky: [
      'Co jsem dnes neřešil a měl bych?',
      'Jaká je největší překážka mého růstu v příštích 3 měsících?',
      'Co potřebuji zařídit aby plán fungoval?',
    ],
    mujNavrh: 'Akční plán tento týden: přidat 20 kontaktů do CRM, připravit nabídkové šablony, domluvit 5 schůzek, kontaktovat 2 potenciální referral partnery.',
  },
]

const MESICE = [
  { id: 'm1', label: 'Měsíc 1', sub: 'Průzkumník a lovec', barva: '#534AB7', bg: '#EEEDFE' },
  { id: 'm2', label: 'Měsíc 2–3', sub: 'Stavitel systému', barva: '#0F6E56', bg: '#E1F5EE' },
  { id: 'm3', label: 'Měsíc 4–6', sub: 'Přechod do KAM', barva: '#185FA5', bg: '#E6F1FB' },
]

const KROKY = [
  // MĚSÍC 1
  {
    id: 'k1', mesic: 'm1', priorita: 'kritická',
    nazev: 'Zmapuj existující warm leads od Radima a Aleše',
    proc: 'Toto je nejrychlejší cesta k prvnímu klientovi. Neprocházej vlastní síť dokud nevyčerpáš to co už Talkey má rozjednáno.',
    jak: 'Domluv si s Radimem a Alešem 1h session. Pro každý kontakt zjisti: kdo to je, kde se zaseklo a proč, co by bylo potřeba pro restart konverzace.',
    cil: 'Seznam min. 10 warm leads s kontextem a navrhnutým next stepem.',
    dynamicke: { klic: 'situace_3', ano: 'Výborně — warm leads existují. Začni tady a ne vlastní sítí.', ne: 'Žádné warm leads — jdeš rovnou na vlastní síť a cold outreach.' },
    tyden: 1,
  },
  {
    id: 'k2', mesic: 'm1', priorita: 'kritická',
    nazev: 'Nastav CRM (riscare appka je připravena)',
    proc: 'Bez evidence kontaktů je každý obchod náhoda. CRM = paměť celého týmu.',
    jak: 'Appka je hotová. Přidej prvních 10 leadů. Nastav follow-up datumy. Domluv se s Radimem a Alešem kdo co přidává.',
    cil: 'Min. 10 leadů v pipeline, každý s follow-up datem a odpovědnou osobou.',
    tyden: 1,
  },
  {
    id: 'k3', mesic: 'm1', priorita: 'kritická',
    nazev: 'Prvních 10 discovery callů',
    proc: 'Každý call je informace. Nemusíš prodávat — potřebuješ pochopit trh a vyzkoušet si script.',
    jak: 'Použi discovery call script v appce. Timer je tam. Po každém callu zapište poznámky do CRM do 30 minut. Cíl: 5-8 callů za týden.',
    cil: '10 callů, 10 záznamů v CRM, min. 2-3 vážní zájemci.',
    dynamicke: { klic: 'zakaznik_1', ano: 'Máte multiplikátory — zařaď je do prvních callů jako prioritu.', ne: 'Žádní multiplikátoři zatím — fokus na přímé klienty.' },
    tyden: 2,
  },
  {
    id: 'k4', mesic: 'm1', priorita: 'vysoká',
    nazev: 'Audit LinkedIn agentury',
    proc: 'Platíte agenturu ale nevíte co dostáváte. Tohle musí být jasné v týdnu 1.',
    jak: 'Vyžádej od agentury: počet followerů (vývoj 6M), engagement rate, počet leadů za 3M, cena za meeting. Pokud nemají data — je to odpověď sama o sobě.',
    cil: 'Jasný report co agentura dodává vs. co stojí. Rozhodnutí: přeorientovat nebo vyměnit.',
    dynamicke: { klic: 'linkedin_2', ano: 'Agentura generuje leady — nech ji být a jen optimalizuj.', ne: 'Agentura negeneruje leady — přeorientuj nebo vyměň ihned.' },
    tyden: 1,
  },
  {
    id: 'k5', mesic: 'm1', priorita: 'vysoká',
    nazev: 'Připrav nabídkový template a onepager',
    proc: 'Bez připraveného dokumentu ztrácíš čas po každém callu a vypadáš neprofesionálně.',
    jak: 'Template: 1-2 strany, jasná cena, co klient dostane, termín zahájení. Onepager pro multiplikátory: jazyk CEO/CFO, bez IT žargonu. Oba dokumenty nahraj do sekce Dokumenty v appce.',
    cil: 'Hotový template a onepager, dostupné celému týmu v appce.',
    tyden: 2,
  },
  {
    id: 'k6', mesic: 'm1', priorita: 'střední',
    nazev: 'Identifikuj 5 multiplikátorů a navažu kontakt',
    proc: 'Jeden multiplikátor = přístup k 5-20 potenciálním klientům. Je to nejefektivnější kanál na škálování.',
    jak: 'Projdi svoji síť: pojišťovací makléři, účetní, daňoví poradci, právníci, IT dodavatelé. Pro každého připrav personalizovanou zprávu. Neříkej "chci tvoje klienty" — říkej "přinesu ti hodnotu navíc pro tvoje klienty".',
    cil: '5 multiplikátorů kontaktováno, min. 3 v aktivní konverzaci, přidáni do CRM jako segment Multiplikátor.',
    tyden: '3-4',
  },
  {
    id: 'k7', mesic: 'm1', priorita: 'kritická',
    nazev: 'Uzavři první obchod — riscare Review NIS2',
    proc: 'Jeden platící klient dokazuje že model funguje. Všechno ostatní je teorie.',
    jak: 'Z 10 discovery callů vyber 2-3 nejslibnější. Follow-up email do 24h. Osobní telefonát. Nabídka. Slevový kód 20% pokud váhají nad cenou (36 000 Kč místo 45 000 Kč).',
    cil: 'Min. 1 podepsaná objednávka a uhrazená záloha do konce měsíce 1.',
    tyden: '3-4',
  },
  // MĚSÍC 2-3
  {
    id: 'k8', mesic: 'm2', priorita: 'kritická',
    nazev: 'Rozjeď referral síť — formální dohoda s multiplikátory',
    proc: 'Multiplikátoři jsou nejlevnější a nejefektivnější zdroj klientů. Musí mít jasný důvod tě doporučovat.',
    jak: 'Pro každého aktivního multiplikátora: domluv schůzku, vysvětli co dostávají jejich klienti, domluv model spolupráce (provize % nebo reciprocita). Připrav pro ně onepager který mohou předat.',
    cil: 'Min. 3 formální partnerství, každý s jasným modelem spolupráce.',
    dynamicke: { klic: 'infrastruktura_3', ano: 'Máte model provizí — použij ho.', ne: 'Model provizí není — navrhni reciprocitu nebo flat fee.' },
    tyden: '5-6',
  },
  {
    id: 'k9', mesic: 'm2', priorita: 'vysoká',
    nazev: 'Nastav emailovou sekvenci pro warm leads',
    proc: '3 emaily, ne newsletter. Cíl je dostat lidi na discovery call.',
    jak: 'Email 1 (den 1): edukační — co NIS2/DORA znamená pro firmy jako oni. Email 2 (den 4): příběh z praxe — co jsme zjistili u podobné firmy. Email 3 (den 8): přímá nabídka Review. Šablony jsou v appce.',
    cil: 'Sekvence nastavená, první batch 20 kontaktů rozeslaný.',
    tyden: '5-6',
  },
  {
    id: 'k10', mesic: 'm2', priorita: 'vysoká',
    nazev: 'Spusť LinkedIn strategii — osobní profily Radima a Aleše',
    proc: 'Firemní stránky nemají dosah. Osobní profily prodávají. Lidé kupují od lidí.',
    jak: 'S Radimem a Alešem: 1-2 posty týdně každý. Formát: příběhy z praxe, ne edukace. Jazyk CEO/CFO. Reaguj na každý komentář do 2h. 5 postů připravených k publikaci je v appce.',
    cil: '10% nárůst followerů za měsíc, min. 3 inbound DM z LinkedIn.',
    dynamicke: { klic: 'linkedin_5', ano: 'Radim a Aleš jsou ochotni — super. Naplánujte si 30 min/týden na obsah.', ne: 'Radim a Aleš nemají čas — najdi ghostwritera nebo napiš obsah ty a oni ho jen schválí.' },
    tyden: '5-8',
  },
  {
    id: 'k11', mesic: 'm2', priorita: 'střední',
    nazev: 'Uzavři 2-4 nové obchody za měsíc',
    proc: 'Měsíc 2 je test jestli máš fungující prodejní systém nebo jen štěstí z měsíce 1.',
    jak: 'Pipeline management: každý lead má datum next follow-up. Každé pondělí ráno otevři Follow-up dnes v appce. Žádný lead nezůstane bez kontaktu déle než 7 dní.',
    cil: '2-4 uzavřené kontrakty, revenue 72 000 - 144 000 Kč bez DPH.',
    tyden: '5-8',
  },
  {
    id: 'k12', mesic: 'm2', priorita: 'střední',
    nazev: 'Připrav a spusť první webinář',
    proc: 'Webinář generuje warm leads ve velkém. 1 webinář = 50-200 registrací potenciálních klientů.',
    jak: 'Téma: "Zjisti za 45 minut jestli spadáš pod NIS2". Délka: 45 min + 15 min Q&A. Radim jako technický expert, ty jako moderátor. Registrace přes LinkedIn event nebo web. Nahrávku použij jako evergreen lead magnet.',
    cil: 'Min. 30 registrací, 10+ discovery callů z webináře.',
    dynamicke: { klic: 'infrastruktura_4', ano: 'Kapacita je — webinář v měsíci 2.', ne: 'Kapacita není — přesuň na měsíc 3.' },
    tyden: '7-8',
  },
  // MĚSÍC 4-6
  {
    id: 'k13', mesic: 'm3', priorita: 'kritická',
    nazev: 'Přejdi do KAM role — pečuj o existující klienty',
    proc: 'Upsell je 5x levnější než nový klient. Klient co má Review a vidí výsledky je připraven koupit Program.',
    jak: 'Pro každého klienta co dokončil Review: follow-up call 30 dní po výstupu. Projdi akční plán — co splnili, co ne. Nabídni Lorenc nebo Program jako přirozený next step.',
    cil: 'Min. 30% konverzní míra Review → Lorenc/Program.',
    dynamicke: { klic: 'role_0', ano: 'Průměrný čas Review→Program znáš — plánuj follow-upy podle toho.', ne: 'Čas neznáš — nastavuji follow-up na 30 dní po výstupu jako default.' },
    tyden: '13-16',
  },
  {
    id: 'k14', mesic: 'm3', priorita: 'vysoká',
    nazev: 'Vytvoř první case studies',
    proc: 'Nic neprodává lépe než reálný příběh reálného klienta. Social proof = nejlevnější marketing.',
    jak: 'Prvních 2-3 klientů co dokončili Review: požádej o souhlas s anonymizovanou case study. Formát: situace → co jsme zjistili → akční plán → výsledek. Nahraj do sekce Dokumenty v appce.',
    cil: '2-3 anonymizované case studies připravené k použití v prodeji.',
    tyden: '13-16',
  },
  {
    id: 'k15', mesic: 'm3', priorita: 'vysoká',
    nazev: 'Spusť LinkedIn Sales Navigator outbound',
    proc: 'Systematický outbound na CEO/CFO/IT ředitele regulovaných firem.',
    jak: 'Filtr: odvětví (energetika, zdravotnictví, IT...), velikost 50-500 zaměstnanců, seniorní role. Personalizovaná zpráva každému — ne template. Max 20 zpráv/den.',
    cil: '100 outbound zpráv/měsíc, 10% response rate, 5 discovery callů.',
    tyden: '13-20',
  },
  {
    id: 'k16', mesic: 'm3', priorita: 'střední',
    nazev: 'Event strategie — první přednáška nebo panel',
    proc: 'Pozicování Talkey jako experta buduje důvěru a generuje inbound leads pasivně.',
    jak: 'Cíl: 1 přednáška nebo panel za měsíc. Témata: NIS2 pro management, osobní odpovědnost ředitelů, DORA pro finanční sektor. Kontaktuj organizátory byznys eventů v Ostravě, Praze, Brně.',
    cil: '2-3 potvrzené přednášky, min. 5 nových leadů z každé.',
    tyden: '17-24',
  },
]

// Inline editovatelný text - klikni pro edit, uloží se automaticky
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

const PruvodceStrategii = ({ industry }) => {
  const isRE = industry === 'real-estate'
  const isCons = !isRE && industry !== 'cybersecurity'
  const MESICE_ACTIVE = isRE ? MESICE_RE : isCons ? MESICE_CONS : MESICE_ACTIVE
  const KROKY_ACTIVE = isRE ? KROKY_RE : isCons ? KROKY_CONS : KROKY_ACTIVE
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
      try {
        const [splRes, odpRes, txtRes, komRes, ordRes] = await Promise.all([
          supabase.from('pruvodce_splneno').select('*').eq('user_id', session?.user?.id),
          supabase.from('strategic_answers').select('*').eq('user_id', session?.user?.id),
          supabase.from('pruvodce_texty').select('*').eq('user_id', session?.user?.id),
          supabase.from('pruvodce_komentare').select('*').eq('user_id', session?.user?.id).order('created_at', { ascending: true }),
          supabase.from('pruvodce_order').select('*').eq('user_id', session?.user?.id),
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
      } catch(e) {
        console.error('Průvodce load error:', e)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const saveText = async (klic, hodnota) => {
    setTexty(prev => ({ ...prev, [klic]: hodnota }))
    const existing = texty[klic] !== undefined
    if (existing) await supabase.from('pruvodce_texty').update({ hodnota }).eq('klic', klic)
    else await supabase.from('pruvodce_texty').insert([{ klic, hodnota, user_id: session?.user?.id }])
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
    else await supabase.from('pruvodce_splneno').insert([{ krok_id: id, splneno: nove, user_id: session?.user?.id }])
  }

  const sendKomentar = async (krokId) => {
    const text = komenText[krokId]?.trim()
    if (!text) return
    setSendingKomen(true)
    const { data } = await supabase.from('pruvodce_komentare').insert([{ krok_id: krokId, autor: komenAutor, text, user_id: session?.user?.id }]).select()
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
    const kroky = KROKY_ACTIVE.filter(k => k.mesic === mid)
    return [...kroky].sort((a, b) => {
      const pa = krokOrder[a.id] ?? KROKY_ACTIVE.findIndex(k => k.id === a.id)
      const pb = krokOrder[b.id] ?? KROKY_ACTIVE.findIndex(k => k.id === b.id)
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

    const allKroky = [...KROKY_ACTIVE]
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
    return saved || KROKY_ACTIVE.find(k => k.id === krokId)?.mesic
  }

  const krokyMesice = getKrokyMesice
  const splnenoMesice = (mid) => krokyMesice(mid).filter(k => splneno[k.id]).length
  const celkemSplneno = KROKY_ACTIVE.filter(k => splneno[k.id]).length
  const prioritaBarva = { 'kritická': '#A32D2D', 'vysoká': '#854F0B', 'střední': '#185FA5' }
  const prioritaBg = { 'kritická': '#FCEBEB', 'vysoká': '#FAEEDA', 'střední': '#E6F1FB' }
  const fmt = (iso) => new Date(iso).toLocaleString('cs-CZ', { day:'numeric', month:'short', hour:'2-digit', minute:'2-digit' })

  if (loading) return <div style={{color:'#aaa',padding:'32px 0',textAlign:'center'}}>Načítám...</div>

  return (
    <div>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:20}}>
        <div style={{fontSize:13,color:'#888'}}>
          Splněno {celkemSplneno} z {KROKY_ACTIVE.length} kroků · <span style={{fontSize:12,color:'#bbb'}}>Texty editovatelné kliknutím · Kroky přesouvatelné tažením</span>
        </div>
        <div style={{background:'#f5f5f3',borderRadius:8,height:8,width:200,overflow:'hidden'}}>
          <div style={{background:'#1D9E75',height:'100%',width:(celkemSplneno/KROKY_ACTIVE.length*100)+'%',transition:'width 0.3s',borderRadius:8}} />
        </div>
      </div>

      <div style={{display:'flex',gap:8,marginBottom:24}}>
        {MESICE_ACTIVE.map(m => {
          const kroky = krokyMesice(m.id)
          const done = splnenoMesice(m.id)
          const active = aktivniMesic === m.id
          return (
            <button key={m.id} onClick={() => setAktivniMesic(m.id)}
              onDragOver={e => { e.preventDefault(); setDragKrokOver('mesic_' + m.id) }}
              onDrop={async e => {
                e.preventDefault()
                if (!dragKrokId) return
                const pozice = KROKY_ACTIVE.findIndex(k => k.id === dragKrokId)
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
          const mesic = MESICE_ACTIVE.find(m => m.id === aktivniMesic)
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
                      {(['Karel','Radim','Aleš']).map(a => (
                        <button key={a} onClick={() => setKomenAutor(a)} style={{
                          padding:'2px 8px',borderRadius:8,fontSize:11,cursor:'pointer',fontFamily:'inherit',
                          border:'0.5px solid '+(komenAutor===a?'#534AB7':'#e0e0e0'),
                          background:komenAutor===a?'#EEEDFE':'#fff',
                          color:komenAutor===a?'#534AB7':'#888',fontWeight:komenAutor===a?500:400
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

// ─── PRODUKTY PŘEHLED ────────────────────────────────────────────────────────

// ─── REAL ESTATE PRODUKTY INFO ──────────────────────────────────────────────
const PRODUKTY_INFO_RE = {
  'Prodej nemovitosti': {
    popis: 'Kompletní zprostředkování prodeje — ocenění, marketing, právní servis, předání klíčů.',
    cena: 'Provize 3–5 % z prodejní ceny',
    typ: 'Provizní spolupráce',
    barva: '#0F6E56', bg: '#E1F5EE',
    emaily: ['První kontakt','Po prohlídce','Follow-up','Uzavření'],
    usp: ['Profesionální fotografie a homestaging','Inzerce na Sreality, Bezrealitky, Reality.cz','Databáze aktivních kupujících','Právní servis od A do Z'],
  },
  'Koupě — zastupuji kupujícího': {
    popis: 'Zastupování kupujícího — hledání, prohlídky, vyjednávání ceny, due diligence, smlouvy.',
    cena: 'Provize 1–3 % z kupní ceny nebo fixní odměna',
    typ: 'Zastupování klienta',
    barva: '#185FA5', bg: '#E6F1FB',
    emaily: ['První kontakt','Po prohlídce','Follow-up','Uzavření'],
    usp: ['Přístup k nemovitostem před zveřejněním','Nezávislé ocenění a due diligence','Vyjednávání nejlepší ceny','Koordinace hypotéky a právníka'],
  },
  'Pronájem': {
    popis: 'Zprostředkování pronájmu — inzerce, výběr nájemníků, smlouvy, předávací protokol.',
    cena: 'Provize 1 měsíční nájem',
    typ: 'Pronájem',
    barva: '#854F0B', bg: '#FAEEDA',
    emaily: ['První kontakt','Po prohlídce','Follow-up','Uzavření'],
    usp: ['Screening nájemníků (platební morálka)','Profesionální inzerce','Nájemní smlouva dle aktuální legislativy','Předávací protokol s foto dokumentací'],
  },
  'Ocenění': {
    popis: 'Tržní ocenění nemovitosti — srovnávací analýza, posudek pro banku nebo dědické řízení.',
    cena: 'Od 3 500 Kč',
    typ: 'Jednorázová služba',
    barva: '#534AB7', bg: '#EEEDFE',
    emaily: ['První kontakt'],
    usp: ['Srovnávací analýza trhu','Posudek akceptovaný bankami','Výstup do 5 pracovních dní'],
  },
  'Správa nemovitosti': {
    popis: 'Kompletní správa pronajímané nemovitosti — komunikace s nájemníky, údržba, platby.',
    cena: '5–10 % z měsíčního nájmu',
    typ: 'Opakující se služba',
    barva: '#27500A', bg: '#EAF3DE',
    emaily: ['První kontakt'],
    usp: ['24/7 komunikace s nájemníky','Koordinace oprav a údržby','Měsíční výpisy a reporting','Daňová optimalizace příjmů z pronájmu'],
  },
  'Investiční poradenství': {
    popis: 'Analýza investičních příležitostí — výnosnost, rizika, financování, cashflow modely.',
    cena: 'Konzultace od 2 500 Kč/hod',
    typ: 'Poradenství',
    barva: '#633806', bg: '#FAEEDA',
    emaily: ['První kontakt'],
    usp: ['Cashflow analýza a ROI výpočty','Přístup k off-market nabídkám','Due diligence před koupí','Daňová struktura investice'],
  },
}

const ProduktyPrehled = ({ industry, session }) => {
  const activeInfo = industry === 'real-estate' ? PRODUKTY_INFO_RE : (industry !== 'cybersecurity') ? PRODUKTY_INFO_CONSULTING : PRODUKTY_INFO
  const [customProdukty, setCustomProdukty] = useState([])
  const [hiddenDefaults, setHiddenDefaults] = useState([])
  const [showAddForm, setShowAddForm] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [newProdukt, setNewProdukt] = useState({ nazev:'', popis:'', cena:'', typ:'', barva:'#534AB7', bg:'#EEEDFE' })
  const [loadingP, setLoadingP] = useState(true)

  useEffect(() => {
    const load = async () => {
      try {
        const { data } = await supabase.from('custom_produkty').select('*').eq('user_id', session?.user?.id).order('poradi')
        if (data) {
          setCustomProdukty(data.filter(p => !p.is_hidden_default))
          setHiddenDefaults(data.filter(p => p.is_hidden_default).map(p => p.nazev))
        }
      } catch(e) { console.error(e) }
      setLoadingP(false)
    }
    load()
  }, [])

  const hideDefault = async (nazev) => {
    setHiddenDefaults(prev => [...prev, nazev])
    await supabase.from('custom_produkty').insert([{ user_id: session?.user?.id, nazev, is_hidden_default: true, popis:'', cena:'', typ:'', barva:'', bg:'' }])
  }

  const showDefault = async (nazev) => {
    setHiddenDefaults(prev => prev.filter(n => n !== nazev))
    await supabase.from('custom_produkty').delete().eq('user_id', session?.user?.id).eq('nazev', nazev).eq('is_hidden_default', true)
  }

  const addProdukt = async () => {
    if (!newProdukt.nazev.trim()) return
    const { data } = await supabase.from('custom_produkty').insert([{
      user_id: session?.user?.id,
      nazev: newProdukt.nazev,
      popis: newProdukt.popis,
      cena: newProdukt.cena,
      typ: newProdukt.typ,
      barva: newProdukt.barva,
      bg: newProdukt.bg,
      is_hidden_default: false,
      poradi: customProdukty.length
    }]).select().single()
    if (data) setCustomProdukty(prev => [...prev, data])
    setNewProdukt({ nazev:'', popis:'', cena:'', typ:'', barva:'#534AB7', bg:'#EEEDFE' })
    setShowAddForm(false)
  }

  const deleteCustom = async (id) => {
    setCustomProdukty(prev => prev.filter(p => p.id !== id))
    await supabase.from('custom_produkty').delete().eq('id', id)
  }

  const BARVY = [
    { barva:'#534AB7', bg:'#EEEDFE', label:'Fialová' },
    { barva:'#0F6E56', bg:'#E1F5EE', label:'Zelená' },
    { barva:'#185FA5', bg:'#E6F1FB', label:'Modrá' },
    { barva:'#854F0B', bg:'#FAEEDA', label:'Oranžová' },
    { barva:'#27500A', bg:'#EAF3DE', label:'Tmavě zelená' },
    { barva:'#791F1F', bg:'#FCEBEB', label:'Červená' },
    { barva:'#633806', bg:'#FDF3E7', label:'Hnědá' },
    { barva:'#185FA5', bg:'#E6F1FB', label:'Modrá 2' },
  ]

  const visibleDefaults = Object.entries(activeInfo).filter(([nazev]) => !hiddenDefaults.includes(nazev))

  return (
    <div>
      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(300px,1fr))',gap:14,marginBottom:14}}>
        {visibleDefaults.map(([nazev, info]) => (
          <div key={nazev} style={{background:'#fff',border:'0.5px solid #e8e8e8',borderRadius:12,overflow:'hidden',position:'relative'}}>
            <button onClick={() => hideDefault(nazev)} title="Odebrat tento produkt"
              style={{position:'absolute',top:8,right:8,background:'none',border:'none',color:'#ccc',cursor:'pointer',fontSize:16,lineHeight:1,zIndex:2,padding:'2px 6px',borderRadius:4}}
              onMouseEnter={e=>e.target.style.color='#e44'} onMouseLeave={e=>e.target.style.color='#ccc'}>×</button>
            <div style={{background:info.bg,borderBottom:'0.5px solid '+info.barva+'33',padding:'14px 18px',display:'flex',justifyContent:'space-between',alignItems:'center',paddingRight:36}}>
              <div style={{fontSize:15,fontWeight:500,color:info.barva}}>{nazev}</div>
              <span style={{fontSize:11,padding:'2px 8px',borderRadius:10,background:'#fff',color:info.barva,border:'0.5px solid '+info.barva+'44'}}>{info.typ}</span>
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

        {customProdukty.filter(p => !p.is_hidden_default).map(p => (
          <div key={p.id} style={{background:'#fff',border:'0.5px solid #e8e8e8',borderRadius:12,overflow:'hidden',position:'relative'}}>
            <button onClick={() => deleteCustom(p.id)} title="Smazat vlastní produkt"
              style={{position:'absolute',top:8,right:8,background:'none',border:'none',color:'#ccc',cursor:'pointer',fontSize:16,lineHeight:1,zIndex:2,padding:'2px 6px',borderRadius:4}}
              onMouseEnter={e=>e.target.style.color='#e44'} onMouseLeave={e=>e.target.style.color='#ccc'}>×</button>
            <div style={{background:p.bg||'#EEEDFE',borderBottom:'0.5px solid '+(p.barva||'#534AB7')+'33',padding:'14px 18px',display:'flex',justifyContent:'space-between',alignItems:'center',paddingRight:36}}>
              <div style={{fontSize:15,fontWeight:500,color:p.barva||'#534AB7'}}>{p.nazev}</div>
              {p.typ && <span style={{fontSize:11,padding:'2px 8px',borderRadius:10,background:'#fff',color:p.barva||'#534AB7',border:'0.5px solid '+(p.barva||'#534AB7')+'44'}}>{p.typ}</span>}
            </div>
            <div style={{padding:'14px 18px'}}>
              <div style={{fontSize:13,color:'#555',lineHeight:1.6,marginBottom:12}}>{p.popis}</div>
              {p.cena && <div style={{display:'flex',alignItems:'center',gap:6}}>
                <span style={{fontSize:11,color:'#aaa'}}>Cena:</span>
                <span style={{fontSize:13,fontWeight:500,color:'#1a1a1a'}}>{p.cena}</span>
              </div>}
            </div>
          </div>
        ))}

        <button onClick={() => setShowAddForm(true)} style={{
          background:'#fafaf8',border:'1.5px dashed #e0e0e0',borderRadius:12,
          display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',
          gap:8,cursor:'pointer',minHeight:160,color:'#aaa',fontFamily:'inherit',
          transition:'border-color 0.15s'
        }} onMouseEnter={e=>e.currentTarget.style.borderColor='#534AB7'} onMouseLeave={e=>e.currentTarget.style.borderColor='#e0e0e0'}>
          <div style={{fontSize:28}}>+</div>
          <div style={{fontSize:13}}>Přidat vlastní produkt / službu</div>
        </button>
      </div>

      {hiddenDefaults.length > 0 && (
        <div style={{marginBottom:20,padding:'12px 16px',background:'#f8f8f6',borderRadius:10,border:'0.5px solid #e0e0e0'}}>
          <div style={{fontSize:12,color:'#aaa',marginBottom:8}}>Skryté výchozí produkty — klikni pro obnovení:</div>
          <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
            {hiddenDefaults.map(n => (
              <button key={n} onClick={() => showDefault(n)} style={{
                padding:'4px 12px',borderRadius:8,border:'0.5px solid #ddd',background:'#fff',
                fontSize:12,color:'#888',cursor:'pointer',fontFamily:'inherit'
              }}>+ {n}</button>
            ))}
          </div>
        </div>
      )}

      {showAddForm && (
        <div style={{background:'#fff',border:'0.5px solid #e0e0e0',borderRadius:12,padding:'20px 24px',marginBottom:20}}>
          <div style={{fontSize:14,fontWeight:600,marginBottom:16}}>Nový produkt / služba</div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,marginBottom:12}}>
            <div>
              <div style={{fontSize:11,color:'#888',marginBottom:4}}>Název *</div>
              <input value={newProdukt.nazev} onChange={e=>setNewProdukt(p=>({...p,nazev:e.target.value}))}
                placeholder="např. Strategický audit"
                style={{width:'100%',padding:'8px 12px',borderRadius:8,border:'0.5px solid #ddd',fontSize:13,fontFamily:'inherit'}} />
            </div>
            <div>
              <div style={{fontSize:11,color:'#888',marginBottom:4}}>Typ / délka</div>
              <input value={newProdukt.typ} onChange={e=>setNewProdukt(p=>({...p,typ:e.target.value}))}
                placeholder="např. Jednorázový (2–4 týdny)"
                style={{width:'100%',padding:'8px 12px',borderRadius:8,border:'0.5px solid #ddd',fontSize:13,fontFamily:'inherit'}} />
            </div>
          </div>
          <div style={{marginBottom:12}}>
            <div style={{fontSize:11,color:'#888',marginBottom:4}}>Popis</div>
            <textarea value={newProdukt.popis} onChange={e=>setNewProdukt(p=>({...p,popis:e.target.value}))}
              placeholder="Krátký popis co produkt zahrnuje..."
              style={{width:'100%',padding:'8px 12px',borderRadius:8,border:'0.5px solid #ddd',fontSize:13,fontFamily:'inherit',resize:'vertical',minHeight:72}} />
          </div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,marginBottom:16}}>
            <div>
              <div style={{fontSize:11,color:'#888',marginBottom:4}}>Cena</div>
              <input value={newProdukt.cena} onChange={e=>setNewProdukt(p=>({...p,cena:e.target.value}))}
                placeholder="např. Od 80 000 Kč"
                style={{width:'100%',padding:'8px 12px',borderRadius:8,border:'0.5px solid #ddd',fontSize:13,fontFamily:'inherit'}} />
            </div>
            <div>
              <div style={{fontSize:11,color:'#888',marginBottom:4}}>Barva</div>
              <div style={{display:'flex',gap:6,flexWrap:'wrap'}}>
                {BARVY.map(b => (
                  <button key={b.barva} onClick={() => setNewProdukt(p=>({...p,barva:b.barva,bg:b.bg}))}
                    title={b.label}
                    style={{width:24,height:24,borderRadius:'50%',background:b.barva,border:newProdukt.barva===b.barva?'2.5px solid #333':'2px solid transparent',cursor:'pointer'}} />
                ))}
              </div>
            </div>
          </div>
          <div style={{display:'flex',gap:8}}>
            <button className="btn accent" onClick={addProdukt}>Přidat produkt</button>
            <button className="btn" onClick={() => { setShowAddForm(false); setNewProdukt({nazev:'',popis:'',cena:'',typ:'',barva:'#534AB7',bg:'#EEEDFE'}) }}>Zrušit</button>
          </div>
        </div>
      )}

      {(industry === 'cybersecurity' || industry === 'real-estate' || industry === 'general' || !industry) && (() => {
        const upsellData = {
          cybersecurity: {
            title: 'Upsell mapa — NIS2 & DORA',
            note: 'Stejná logika platí pro DORA: Check DORA → Lorenc DORA → Program DORA',
            rows: [[
              { label:'riscare Review NIS2', sub:'36 000 Kč · vstupní analýza', bg:'#E1F5EE', color:'#0F6E56', type:'arrow' },
              { label:'Akční plán', sub:'výstup do 2 týdnů', bg:'#f5f5f3', color:'#888', type:'arrow' },
              { label:'Lorenc NIS2', sub:'mentoring · implementace', bg:'#FAEEDA', color:'#854F0B', type:'slash' },
              { label:'Program NIS2', sub:'all-inclusive', bg:'#EEEDFE', color:'#534AB7', type:'end' },
            ]]
          },
          'real-estate': {
            title: 'Upsell mapa — Realitní cesta klienta',
            note: 'Každá transakce je příležitost k dalšímu obchodu — průměrný klient nakupuje 2–3 nemovitosti za život.',
            rows: [
              [
                { label:'Bezplatné ocenění', sub:'vstupní hák · zdarma', bg:'#E1F5EE', color:'#0F6E56', type:'arrow' },
                { label:'Zprostředkování', sub:'provize 3–5 % z ceny', bg:'#EEEDFE', color:'#534AB7', type:'arrow' },
                { label:'Profesionální marketing', sub:'foto, video, staging', bg:'#FAEEDA', color:'#854F0B', type:'arrow' },
                { label:'Právní & admin servis', sub:'smlouvy, úschova', bg:'#E6F1FB', color:'#185FA5', type:'arrow' },
                { label:'Předání & follow-up', sub:'klíče + referral žádost', bg:'#EAF3DE', color:'#27500A', type:'end' },
              ],
              [
                { label:'Cross-sell po transakci', sub:'', bg:'#fff', color:'#aaa', type:'label' },
                { label:'Správa nemovitosti', sub:'pasivní příjem klienta', bg:'#FDF3E7', color:'#633806', type:'arrow' },
                { label:'Investiční poradenství', sub:'další nemovitost', bg:'#FAEEDA', color:'#854F0B', type:'arrow' },
                { label:'Pronájem', sub:'opakující se spolupráce', bg:'#E1F5EE', color:'#0F6E56', type:'end' },
              ]
            ]
          },
          general: {
            title: 'Upsell mapa — Consulting cesta klienta',
            note: 'Zlaté pravidlo: jednorázový projekt → důvěra → retainer. Průměrný consulting klient na retaineru = 12× vyšší LTV než jednorázový projekt.',
            rows: [
              [
                { label:'Diagnostika / audit', sub:'vstup · 60–150 tis. Kč', bg:'#E1F5EE', color:'#0F6E56', type:'arrow' },
                { label:'Workshop / výstup', sub:'doporučení + prioritizace', bg:'#f5f5f3', color:'#888', type:'arrow' },
                { label:'Implementační projekt', sub:'3–6 měsíců · 150–500 tis.', bg:'#EEEDFE', color:'#534AB7', type:'arrow' },
                { label:'Retainer', sub:'měsíční partner · 20–50 tis./m', bg:'#FAEEDA', color:'#854F0B', type:'end' },
              ],
              [
                { label:'Paralelní cross-sell', sub:'', bg:'#fff', color:'#aaa', type:'label' },
                { label:'Leadership program', sub:'tým klienta · 120+ tis.', bg:'#E6F1FB', color:'#185FA5', type:'arrow' },
                { label:'Mentoring managementu', sub:'CEO/HR · 15 tis./m', bg:'#EAF3DE', color:'#27500A', type:'arrow' },
                { label:'Referral na partnery', sub:'síť → nový klient', bg:'#FCEBEB', color:'#791F1F', type:'end' },
              ]
            ]
          }
        }
        const d = upsellData[industry] || upsellData['general']
        const renderItem = (item, i, arr) => (
          <div key={i} style={{display:'flex',alignItems:'center',gap:0}}>
            {item.type === 'label'
              ? <div style={{fontSize:11,color:'#bbb',fontStyle:'italic',minWidth:110,paddingRight:8}}>{item.label}</div>
              : <div style={{background:item.bg,borderRadius:8,padding:'10px 14px',textAlign:'center',minWidth:120,border:'0.5px solid ' + item.color + '22'}}>
                  <div style={{fontSize:11,fontWeight:600,color:item.color}}>{item.label}</div>
                  {item.sub && <div style={{fontSize:10,color:item.color,opacity:0.7,marginTop:2}}>{item.sub}</div>}
                </div>
            }
            {item.type === 'arrow' && <div style={{fontSize:18,color:'#ccc',padding:'0 6px'}}>→</div>}
            {item.type === 'slash' && <div style={{fontSize:18,color:'#ccc',padding:'0 6px'}}>/</div>}
          </div>
        )
        return (
          <div style={{marginTop:24,background:'#fff',border:'0.5px solid #e8e8e8',borderRadius:12,overflow:'hidden'}}>
            <div style={{padding:'14px 24px',borderBottom:'0.5px solid #f0f0f0',fontWeight:500,fontSize:15}}>{d.title}</div>
            <div style={{padding:'20px 24px',overflowX:'auto'}}>
              {d.rows.map((row, ri) => (
                <div key={ri} style={{display:'flex',gap:0,alignItems:'center',minWidth:500,marginBottom: ri < d.rows.length-1 ? 12 : 0}}>
                  {row.map(renderItem)}
                </div>
              ))}
              <div style={{marginTop:14,fontSize:11,color:'#aaa',lineHeight:1.5}}>{d.note}</div>
            </div>
          </div>
        )
      })()}
    </div>
  )
}

// ─── STRATEGICKÝ PLÁN ─────────────────────────────────────────────────────────
const PLAN_BLOKY = [
  {
    id: 'situace',
    nazev: 'Blok 1 — Kde jsme teď',
    cas: '0:00–0:15',
    barva: '#534AB7',
    uvod: 'Než začneme stavět strategii, potřebujeme si říct pravdu o výchozím stavu.',
    otazky: [
      'Existují nějací warm leads z minulosti? Kdo byl kontaktován, co se zaseklo a proč?',
      'Kolik obchodních konverzací proběhlo za posledních 6 měsíců a jaký byl výsledek?',
      'Kde je největší problém — generování leadů, konverze, nebo uzavření?',
      'Proč zatím nemáme platící klienty — vaše intuice?',
      'Co děláme špatně nebo vůbec neděláme?',
    ],
    mujNavrh: 'Na základě toho co jsem prostudoval vidím 3 hlavní mezery: (1) Chybí systematický outreach — spoléháme na inbound a agenturu. (2) Chybí jasný vstupní funnel — kdo kontaktuje koho, kdy a jak. (3) Chybí měřitelnost — nevíme co funguje protože neměříme nic.',
  },
  {
    id: 'zakaznik',
    nazev: 'Blok 2 — Zákazník a první klient do 30 dní',
    cas: '0:15–0:45',
    barva: '#0F6E56',
    uvod: 'Toto je srdce celého meetingu. Bez jasné odpovědi na kdo je náš ideální zákazník je vše ostatní jen teorie.',
    otazky: [
      'Máte kontakty mezi pojišťovacími makléři, účetními, právníky nebo IT dodavateli (multiplikátoři)?',
      'Jak reagují SME firmy v regulovaných odvětvích na outreach — jaká je typická první reakce?',
      'Máme zkušenosti nebo kontakty ve finančním sektoru (DORA)?',
      'Jaké kontakty z vaší strany mi můžete předat jako warm leads?',
      'Kdo technicky vede discovery call — já sám, nebo vždy s vámi?',
      'Kdy a jak zapojujete Radima do obchodního procesu?',
      'Co bylo nejčastější námitka proč klient nekoupil?',
    ],
    mujNavrh: 'Návrh 30denního plánu: Týden 1 — mapování kontaktů + CRM + discovery script. Týden 2 — 10 discovery callů + první outreach na multiplikátory. Týden 3-4 — follow-up, uzavření, první podpis.',
  },
  {
    id: 'infrastruktura',
    nazev: 'Blok 3 — Prodejní infrastruktura',
    cas: '0:45–1:10',
    barva: '#185FA5',
    uvod: 'Bez infrastruktury je každý obchod náhoda. Chci se dohodnout co stavíme teď a co může počkat.',
    otazky: [
      'Máte teď nějakou evidenci kontaktů nebo CRM? (navrhuju Airtable nebo HubSpot Free)',
      'Existuje nabídkový template nebo to tvoříme od nuly?',
      'Existuje onepager pro multiplikátory nebo to tvoříme?',
      'Jaký model partnerství preferujete — provize v %, nebo reciprocita?',
      'Máte kapacitu na webinář v měsíci 2-3? Kdo by ho vedl technicky?',
    ],
    mujNavrh: 'Fáze 1 (měsíc 1-2): CRM + discovery script + nabídkový template + onepager. Fáze 2 (měsíc 2-4): partnerský program + emailová sekvence + webinář. Fáze 3 (měsíc 4-6): case studies + LinkedIn Sales Navigator + event strategie.',
  },
  {
    id: 'role',
    nazev: 'Blok 4 — Moje role měsíc 1–6',
    cas: '1:10–1:35',
    barva: '#633806',
    uvod: 'KAM role dává smysl až když jsou klienti. Chci se dohodnout co přesně dělám a jak to měříme.',
    otazky: [
      'Jaký je průměrný čas mezi Review a rozhodnutím o Programu?',
      'Jaká je typická konverzní míra Review → Program z vaší zkušenosti nebo odhadu?',
      'Kdo vede upsell konverzaci — já jako KAM, nebo vždy vy?',
      'Jak poznáme že jsem připraven přejít do plné KAM role?',
    ],
    mujNavrh: 'Měsíc 1-2: průzkumník + první lovec (cíl: 5-8 callů/týden, 1 uzavřený obchod). Měsíc 2-4: stavitel systému + aktivní prodejce (cíl: 2-4 kontrakty/měsíc). Měsíc 4-6: přechod do KAM role při 5-8 aktivních klientech.',
  },
  {
    id: 'linkedin',
    nazev: 'Blok 5 — LinkedIn agentura',
    cas: '1:35–1:50',
    barva: '#185FA5',
    uvod: 'Platíme agenturu za organic reach ale nevíme jestli to funguje. Potřebujeme data a jasnou strategii.',
    otazky: [
      'Kolik má Talkey/riscare followerů na LinkedIn a jaký byl vývoj za 6 měsíců?',
      'Kolik leadů vygenerovala agentura za posledních 3-6 měsíců?',
      'Jaká je měsíční cena agentury?',
      'Jak jste spokojeni s agenturou dosud — intuitivně?',
      'Chceme agenturu přeorientovat nebo hledáme novou?',
      'Jsme ochotni investovat čas Radima a Aleše do osobního LinkedIn obsahu?',
    ],
    mujNavrh: 'Navrhuji: osobní profily (Radim + Aleš) místo firemní stránky, obsah jazykem CEO/CFO ne IT, příběhy z praxe místo edukace, měřitelný funnel Post→Engagement→DM→Meeting.',
  },
  {
    id: 'akcniplan',
    nazev: 'Blok 6 — Výstupy a akční plán',
    cas: '1:50–2:00',
    barva: '#27500A',
    uvod: 'Každý brainstorming bez konkrétních akcí je jen hezká konverzace. Každý odchází s jasným úkolem.',
    otazky: [
      'Co jsme dnes neřešili a měli bychom?',
      'Jaké je největší riziko celého plánu které vy vidíte a já jsem ho nepojmenoval?',
      'Co potřebuji od vás obou abych v měsíci 1 podával maximální výkon?',
    ],
    mujNavrh: 'Navrhované úkoly: Radim/Aleš předají warm leads do pátku. Karel nastaví CRM do pondělí. Karel připraví discovery script do středy. Karel připraví nabídkový template do středy. Karel+Aleš vyžádají data od agentury do pátku.',
  },
]

const StrategickyPlan = ({ industry }) => {
  const isRE = industry === 'real-estate'
  const isCons = !isRE && industry !== 'cybersecurity'
  const PLAN_BLOKY_ACTIVE = isRE ? PLAN_BLOKY_RE : isCons ? PLAN_BLOKY_CONS : PLAN_BLOKY_ACTIVE
  const [odpovedi, setOdpovedi] = useState({})
  const [ulozeno, setUlozeno] = useState({})
  const [aktivniBlok, setAktivniBlok] = useState('situace')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const loadOdpovedi = async () => {
      const { data } = await supabase.from('strategic_answers').select('*').eq('user_id', session?.user?.id)
      if (data) {
        const map = {}
        data.forEach(r => { map[r.klic] = r.odpoved })
        setOdpovedi(map)
        setUlozeno(map)
      }
    }
    loadOdpovedi()
  }, [])

  const saveOdpoved = async (klic, text) => {
    setSaving(true)
    const existing = ulozeno[klic]
    if (existing !== undefined) {
      await supabase.from('strategic_answers').update({ odpoved: text, updated_at: new Date().toISOString() }).eq('klic', klic)
    } else {
      await supabase.from('strategic_answers').insert([{ klic, odpoved: text, user_id: session?.user?.id }])
    }
    setUlozeno(prev => ({ ...prev, [klic]: text }))
    setSaving(false)
  }

  const blok = PLAN_BLOKY_ACTIVE.find(b => b.id === aktivniBlok)
  const celkemOtazek = PLAN_BLOKY_ACTIVE.reduce((s, b) => s + b.otazky.length, 0)
  const zodpovezeno = Object.keys(ulozeno).filter(k => ulozeno[k]?.trim()).length

  return (
    <div>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:20}}>
        <div>
          <div style={{fontSize:13,color:'#888'}}>Zodpovězeno {zodpovezeno} z {celkemOtazek} otázek · {saving ? 'Ukládám...' : 'Automatické ukládání'}</div>
        </div>
        <div style={{fontSize:12,color:'#aaa'}}>Odpovědi se ukládají automaticky — sdíleno s celým týmem</div>
      </div>

      <div style={{display:'flex',gap:8,marginBottom:20,flexWrap:'wrap'}}>
        {PLAN_BLOKY_ACTIVE.map(b => {
          const zodp = b.otazky.filter((_, i) => ulozeno[b.id + '_' + i]?.trim()).length
          const done = zodp === b.otazky.length
          return (
            <button key={b.id} onClick={() => setAktivniBlok(b.id)} style={{
              padding:'6px 14px',borderRadius:8,fontSize:12,cursor:'pointer',fontFamily:'inherit',
              border:'0.5px solid ' + (aktivniBlok===b.id ? b.barva : '#e0e0e0'),
              background: aktivniBlok===b.id ? b.barva + '18' : done ? '#EAF3DE' : '#fff',
              color: aktivniBlok===b.id ? b.barva : done ? '#27500A' : '#888',
              fontWeight: aktivniBlok===b.id ? 500 : 400
            }}>
              {done ? '✓ ' : ''}{b.nazev.split(' — ')[0]} <span style={{fontSize:11,opacity:0.7}}>({zodp}/{b.otazky.length})</span>
            </button>
          )
        })}
      </div>

      {blok && (
        <div style={{background:'#fff',border:'0.5px solid #e8e8e8',borderRadius:12,overflow:'hidden'}}>
          <div style={{background:blok.barva,padding:'16px 24px'}}>
            <div style={{fontSize:11,color:'rgba(255,255,255,0.7)',marginBottom:4}}>{blok.cas}</div>
            <div style={{fontSize:18,fontWeight:500,color:'#fff'}}>{blok.nazev}</div>
          </div>

          <div style={{padding:'16px 24px',background:'#fafaf8',borderBottom:'0.5px solid #f0f0f0'}}>
            <div style={{fontSize:11,color:'#aaa',marginBottom:4,fontWeight:500,textTransform:'uppercase'}}>Můj vstupní návrh</div>
            <div style={{fontSize:13,color:'#555',lineHeight:1.6}}>{blok.mujNavrh}</div>
          </div>

          <div style={{padding:'20px 24px'}}>
            <div style={{fontSize:13,fontWeight:500,color:'#888',marginBottom:16}}>Otázky — klikněte a zapište odpovědi:</div>
            {blok.otazky.map((otazka, i) => {
              const klic = blok.id + '_' + i
              const val = odpovedi[klic] || ''
              const saved = ulozeno[klic]?.trim()
              return (
                <div key={i} style={{marginBottom:20,borderBottom:'0.5px solid #f5f5f3',paddingBottom:20}}>
                  <div style={{display:'flex',alignItems:'flex-start',gap:10,marginBottom:8}}>
                    <div style={{
                      width:22,height:22,borderRadius:'50%',flexShrink:0,marginTop:1,
                      background: saved ? '#EAF3DE' : blok.barva + '18',
                      display:'flex',alignItems:'center',justifyContent:'center',
                      fontSize:11,fontWeight:600,
                      color: saved ? '#27500A' : blok.barva
                    }}>{saved ? '✓' : (i+1)}</div>
                    <div style={{fontSize:13,color:'#333',lineHeight:1.5,fontWeight:500}}>{otazka}</div>
                  </div>
                  <div style={{paddingLeft:32}}>
                    <textarea
                      value={val}
                      onChange={e => setOdpovedi(prev => ({ ...prev, [klic]: e.target.value }))}
                      onBlur={e => { if(e.target.value !== ulozeno[klic]) saveOdpoved(klic, e.target.value) }}
                      placeholder="Zapište odpověď... (uloží se automaticky po kliknutí jinam)"
                      style={{
                        width:'100%',padding:'8px 12px',borderRadius:8,
                        border:'0.5px solid ' + (saved ? '#5DCAA5' : '#ddd'),
                        fontSize:13,fontFamily:'inherit',resize:'vertical',
                        minHeight:60,color:'#333',background: saved ? '#f8fffe' : '#fff'
                      }}
                    />
                    {saved && <div style={{fontSize:11,color:'#1D9E75',marginTop:4}}>Uloženo</div>}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── GLOBÁLNÍ VYHLEDÁVÁNÍ ────────────────────────────────────────────────────
const GlobalSearch = ({ leads, onOpen }) => {
  const [q, setQ] = useState('')
  const [open, setOpen] = useState(false)

  const results = q.length > 1 ? leads.filter(l =>
    l.firma?.toLowerCase().includes(q.toLowerCase()) ||
    l.osoba?.toLowerCase().includes(q.toLowerCase()) ||
    l.email?.toLowerCase().includes(q.toLowerCase()) ||
    l.poznamky?.toLowerCase().includes(q.toLowerCase())
  ).slice(0, 8) : []

  return (
    <div style={{position:'relative',marginBottom:16}}>
      <div style={{position:'relative'}}>
        <input
          value={q}
          onChange={e => { setQ(e.target.value); setOpen(true) }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 200)}
          placeholder="🔍 Hledat leady, firmy, emaily..."
          style={{
            width:'100%', height:40, padding:'0 14px',
            border:'0.5px solid ' + (q ? '#534AB7' : '#ddd'),
            borderRadius:10, fontSize:14, fontFamily:'inherit',
            background:'#fff', color:'#1a1a1a',
            outline:'none', transition:'border-color 0.15s'
          }}
        />
        {q && (
          <button onClick={() => { setQ(''); setOpen(false) }}
            style={{position:'absolute',right:12,top:'50%',transform:'translateY(-50%)',background:'none',border:'none',color:'#aaa',cursor:'pointer',fontSize:16}}>
            ×
          </button>
        )}
      </div>
      {open && results.length > 0 && (
        <div style={{
          position:'absolute', top:'100%', left:0, right:0, zIndex:100,
          background:'#fff', border:'0.5px solid #e0e0e0', borderRadius:10,
          boxShadow:'0 8px 24px rgba(0,0,0,0.1)', marginTop:4, overflow:'hidden'
        }}>
          {results.map(l => (
            <div key={l.id} onClick={() => { onOpen(l); setQ(''); setOpen(false) }}
              style={{
                padding:'10px 16px', cursor:'pointer', borderBottom:'0.5px solid #f5f5f3',
                display:'flex', alignItems:'center', gap:12
              }}
              onMouseEnter={e => e.currentTarget.style.background='#fafaf8'}
              onMouseLeave={e => e.currentTarget.style.background='#fff'}
            >
              <div style={{width:32,height:32,borderRadius:8,background:'#EEEDFE',display:'flex',alignItems:'center',justifyContent:'center',fontSize:12,fontWeight:600,color:'#534AB7',flexShrink:0}}>
                {l.firma.slice(0,2).toUpperCase()}
              </div>
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontSize:13,fontWeight:500,color:'#1a1a1a'}}>{l.firma}</div>
                <div style={{fontSize:11,color:'#aaa',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>
                  {l.osoba} · {l.stav} · {l.produkt}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      {open && q.length > 1 && results.length === 0 && (
        <div style={{
          position:'absolute', top:'100%', left:0, right:0, zIndex:100,
          background:'#fff', border:'0.5px solid #e0e0e0', borderRadius:10,
          padding:'16px', textAlign:'center', color:'#aaa', fontSize:13,
          boxShadow:'0 8px 24px rgba(0,0,0,0.1)', marginTop:4
        }}>Žádné výsledky pro "{q}"</div>
      )}
    </div>
  )
}

// ─── AI ASISTENT PRO CALL ────────────────────────────────────────────────────
const AiCallBtn = ({ lead }) => {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)

  const prepare = async () => {
    setLoading(true)
    setResult(null)
    try {
      const response = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 1000,
          messages: [{
            role: 'user',
            content: `Připrav mi stručný přehled pro discovery call s touto firmou. Odpovídej v češtině, buď konkrétní a praktický.

Firma: ${lead.firma}
Kontakt: ${lead.osoba || 'neznámý'}, role: ${lead.role || 'neznámá'}
Odvětví: ${lead.odvetvi || 'neznámé'}
Produkt zájem: ${lead.produkt || 'neznámý'}
Segment: ${lead.segment || 'neznámý'}
Poznámky: ${lead.poznamky || 'žádné'}

Vrať strukturovaně:
1. KLÍČOVÉ OTÁZKY (3 konkrétní otázky pro diagnostiku)
2. PRAVDĚPODOBNÉ NÁMITKY (3 nejčastější pro tento typ firmy + krátká odpověď)
3. DOPORUČENÝ VSTUP (jak začít hovor - 2 věty)

Buď stručný, každý bod max 2 řádky.`
          }]
        })
      })
      const data = await response.json()
      const text = data.content?.find(c=>c.type==='text')?.text || 'Chyba při generování'
      setResult(text)
    } catch(e) {
      setResult('Chyba: ' + e.message)
    }
    setLoading(false)
  }

  return (
    <div>
      <button className="btn" style={{color:'#0F6E56',borderColor:'#0F6E56',background:result?'#E1F5EE':'#fff'}} onClick={prepare} disabled={loading}>
        {loading ? '⏳ Generuji...' : '🤖 Připravit call'}
      </button>
      {result && (
        <div style={{
          marginTop:12,padding:'14px 16px',background:'#E1F5EE',
          borderRadius:10,border:'0.5px solid #5DCAA5',fontSize:13,
          color:'#0F6E56',lineHeight:1.7,whiteSpace:'pre-wrap'
        }}>
          <div style={{fontSize:11,color:'#1D9E75',fontWeight:600,marginBottom:8,textTransform:'uppercase'}}>AI příprava na call</div>
          {result}
          <button onClick={()=>setResult(null)} style={{display:'block',marginTop:10,background:'none',border:'none',color:'#1D9E75',fontSize:12,cursor:'pointer',padding:0}}>Zavřít</button>
        </div>
      )}
    </div>
  )
}

// ─── AI FOLLOW-UP EMAIL ──────────────────────────────────────────────────────
const AiEmailBtn = ({ lead }) => {
  const [loading, setLoading] = useState(false)
  const [email, setEmail] = useState(null)
  const [copied, setCopied] = useState(false)

  const generate = async () => {
    setLoading(true)
    setEmail(null)
    try {
      const response = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 1000,
          messages: [{
            role: 'user',
            content: `Napiš personalizovaný follow-up email po discovery callu. Email musí být v češtině, neformální, přirozený — ne robotický. Max 150 slov.

Firma: ${lead.firma}
Kontakt: ${lead.osoba || 'kolego'}, role: ${lead.role || ''}
Produkt: ${lead.produkt || 'riscare Review NIS2'}
Cena: ${lead.cena ? lead.cena.toLocaleString('cs') + ' Kč' : '36 000 Kč'}
Stav: ${lead.stav || ''}
Poznámky z callu: ${lead.poznamky || 'žádné'}
Hlavní námitka: ${lead.namitka || 'žádná'}

Struktura emailu:
- Předmět (1 řádek)
- Prázdný řádek
- Tělo emailu (přirozené, personalizované podle poznámek)
- Podpis: Karel Petros | Talkey a.s. | riscare

Začni přímo předmětem bez jakéhokoliv úvodu.`
          }]
        })
      })
      const data = await response.json()
      const text = data.content?.find(c=>c.type==='text')?.text || 'Chyba při generování'
      setEmail(text)
    } catch(e) {
      setEmail('Chyba: ' + e.message)
    }
    setLoading(false)
  }

  const copy = () => {
    navigator.clipboard.writeText(email)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div style={{marginTop:8}}>
      <button className="btn" style={{color:'#854F0B',borderColor:'#854F0B',background:email?'#FAEEDA':'#fff'}}
        onClick={generate} disabled={loading}>
        {loading ? '⏳ Generuji...' : '✉️ AI follow-up email'}
      </button>
      {email && (
        <div style={{marginTop:12,padding:'14px 16px',background:'#FAEEDA',borderRadius:10,border:'0.5px solid #FAC775'}}>
          <div style={{fontSize:11,color:'#854F0B',fontWeight:600,marginBottom:8,textTransform:'uppercase'}}>Vygenerovaný follow-up email</div>
          <div style={{fontSize:13,color:'#333',lineHeight:1.7,whiteSpace:'pre-wrap',fontFamily:'inherit'}}>{email}</div>
          <div style={{display:'flex',gap:8,marginTop:12}}>
            <button onClick={copy} style={{padding:'6px 14px',borderRadius:8,border:'0.5px solid #854F0B',background:'#fff',color:'#854F0B',fontSize:12,cursor:'pointer',fontFamily:'inherit',fontWeight:500}}>
              {copied ? '✓ Zkopírováno!' : 'Kopírovat'}
            </button>
            <button onClick={generate} style={{padding:'6px 14px',borderRadius:8,border:'0.5px solid #ddd',background:'#fff',color:'#888',fontSize:12,cursor:'pointer',fontFamily:'inherit'}}>
              Přegenerovat
            </button>
            <button onClick={()=>setEmail(null)} style={{padding:'6px 14px',borderRadius:8,border:'none',background:'none',color:'#bbb',fontSize:12,cursor:'pointer',fontFamily:'inherit'}}>
              Zavřít
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── DASHBOARD ───────────────────────────────────────────────────────────────
const Dashboard = ({ leads, onOpen, industry }) => {
  const cfg = getIndustryCfg(industry)
  const isRE = industry === 'real-estate'
  const [widgets, setWidgets] = useState(() => {
    try {
      const s = localStorage.getItem('dashboard_widgets')
      if (s) return JSON.parse(s)
    } catch(e) {}
    return ['metriky','followup','pipeline','koláč','mrtvé','aktivity']
  })
  const [editMode, setEditMode] = useState(false)
  const [dragW, setDragW] = useState(null)
  const [dragWOver, setDragWOver] = useState(null)

  const today = new Date().toISOString().slice(0,10)
  const active = leads.filter(l => !l.stav?.includes('Uzavřeno'))
  const won = leads.filter(l => l.stav === 'Uzavřeno — vyhráno')
  const revenue = won.reduce((s,l) => s+(Number(l.cena)||0), 0)
  const fuDnes = active.filter(l => l.followup && l.followup <= today)
  const mrtvé = active.filter(l => {
    if (!l.followup) return false
    const diff = (new Date(today) - new Date(l.followup)) / 86400000
    return diff >= 14
  })

  const stavCounts = {}
  STAVS.slice(0,7).forEach(s => { stavCounts[s] = leads.filter(l=>l.stav===s).length })

  const segCounts = {}
  leads.forEach(l => { if(l.segment) segCounts[l.segment] = (segCounts[l.segment]||0)+1 })

  const prodCounts = {}
  leads.forEach(l => { if(l.produkt && l.produkt!=='Neznámý') prodCounts[l.produkt] = (prodCounts[l.produkt]||0)+1 })

  const saveWidgets = (w) => {
    setWidgets(w)
    try { localStorage.setItem('dashboard_widgets', JSON.stringify(w)) } catch(e) {}
  }

  const toggleWidget = (id) => {
    const w = widgets.includes(id) ? widgets.filter(x=>x!==id) : [...widgets, id]
    saveWidgets(w)
  }

  const handleDragW = (e, id) => { setDragW(id); e.dataTransfer.effectAllowed='move' }
  const handleDropW = (e, id) => {
    e.preventDefault()
    if (!dragW || dragW===id) { setDragW(null); setDragWOver(null); return }
    const w = [...widgets]
    const fi = w.indexOf(dragW), ti = w.indexOf(id)
    w.splice(fi,1); w.splice(ti,0,dragW)
    saveWidgets(w)
    setDragW(null); setDragWOver(null)
  }

  const aC = { Karel:'#534AB7', Radim:'#0F6E56', Aleš:'#854F0B' }

  // Koláčový graf SVG
  const PieChart = ({ data, title }) => {
    const total = Object.values(data).reduce((s,v)=>s+v,0)
    if (!total) return <div style={{color:'#ccc',fontSize:13,textAlign:'center',padding:'20px 0'}}>Žádná data</div>
    const colors = ['#534AB7','#0F6E56','#185FA5','#854F0B','#A32D2D','#27500A','#633806']
    let angle = 0
    const slices = Object.entries(data).map(([k,v],i) => {
      const pct = v/total
      const startAngle = angle
      angle += pct * 360
      const start = polarToXY(50,50,40,startAngle)
      const end = polarToXY(50,50,40,angle)
      const large = pct > 0.5 ? 1 : 0
      const path = `M50,50 L${start.x},${start.y} A40,40 0 ${large},1 ${end.x},${end.y} Z`
      return { k, v, pct, path, color: colors[i%colors.length] }
    })
    return (
      <div>
        <svg viewBox="0 0 100 100" style={{width:'100%',maxWidth:160,display:'block',margin:'0 auto'}}>
          {slices.map((s,i) => (
            <path key={i} d={s.path} fill={s.color} stroke="#fff" strokeWidth="1" />
          ))}
          <circle cx="50" cy="50" r="20" fill="#fff" />
          <text x="50" y="53" textAnchor="middle" fontSize="8" fill="#333" fontWeight="bold">{total}</text>
        </svg>
        <div style={{display:'flex',flexDirection:'column',gap:4,marginTop:12}}>
          {slices.map((s,i) => (
            <div key={i} style={{display:'flex',alignItems:'center',gap:8,fontSize:12}}>
              <div style={{width:10,height:10,borderRadius:2,background:s.color,flexShrink:0}} />
              <span style={{color:'#555',flex:1,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{s.k}</span>
              <span style={{color:'#888',fontWeight:500}}>{s.v}</span>
            </div>
          ))}
        </div>
      </div>
    )
  }

  const polarToXY = (cx,cy,r,deg) => {
    const rad = (deg-90)*Math.PI/180
    return { x: cx+r*Math.cos(rad), y: cy+r*Math.sin(rad) }
  }

  const BarChart = ({ data }) => {
    const max = Math.max(...Object.values(data), 1)
    return (
      <div style={{display:'flex',flexDirection:'column',gap:6}}>
        {Object.entries(data).filter(([,v])=>v>0).map(([k,v],i) => (
          <div key={k}>
            <div style={{display:'flex',justifyContent:'space-between',fontSize:11,color:'#888',marginBottom:2}}>
              <span style={{overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',maxWidth:'75%'}}>{k}</span>
              <span style={{fontWeight:500,color:'#333'}}>{v}</span>
            </div>
            <div style={{height:6,background:'#f0f0ee',borderRadius:3,overflow:'hidden'}}>
              <div style={{height:'100%',width:(v/max*100)+'%',background:'#534AB7',borderRadius:3,transition:'width 0.5s'}} />
            </div>
          </div>
        ))}
      </div>
    )
  }

  const WIDGET_DEF = {
    metriky: {
      label: 'Klíčové metriky', icon: '📊',
      render: () => (
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
          {[
            {l:'Aktivní leady',v:active.length,sub:'v pipeline',c:'#534AB7'},
            {l:'Uzavřeno',v:won.length,sub:'vyhráno',c:'#27500A'},
            {l:'Revenue',v:revenue.toLocaleString('cs')+' Kč',sub:'celkem',c:'#185FA5'},
            {l:'Konverzní míra',v:leads.length?Math.round(won.length/leads.length*100)+'%':'0%',sub:'win rate',c:'#854F0B'},
          ].map(m => (
            <div key={m.l} style={{background:'#f8f8f6',borderRadius:10,padding:'12px 14px'}}>
              <div style={{fontSize:11,color:'#aaa',marginBottom:4}}>{m.l}</div>
              <div style={{fontSize:20,fontWeight:600,color:m.c}}>{m.v}</div>
              <div style={{fontSize:11,color:'#bbb',marginTop:2}}>{m.sub}</div>
            </div>
          ))}
        </div>
      )
    },
    followup: {
      label: 'Follow-up dnes', icon: '📅',
      render: () => (
        <div>
          {!fuDnes.length && <div style={{color:'#ccc',fontSize:13,textAlign:'center',padding:'16px 0'}}>Žádný follow-up dnes 🎉</div>}
          {fuDnes.slice(0,5).map(l => (
            <div key={l.id} onClick={()=>onOpen(l)} style={{
              display:'flex',alignItems:'center',gap:10,padding:'8px 0',
              borderBottom:'0.5px solid #f5f5f3',cursor:'pointer'
            }}>
              <div style={{width:8,height:8,borderRadius:'50%',background:'#A32D2D',flexShrink:0}} />
              <div style={{flex:1}}>
                <div style={{fontSize:13,fontWeight:500}}>{l.firma}</div>
                <div style={{fontSize:11,color:'#aaa'}}>{l.osoba} · {l.produkt}</div>
              </div>
              <span style={{fontSize:11,color:'#A32D2D',fontWeight:500}}>{l.followup}</span>
            </div>
          ))}
          {fuDnes.length>5 && <div style={{fontSize:12,color:'#aaa',marginTop:8,textAlign:'center'}}>+{fuDnes.length-5} dalších</div>}
        </div>
      )
    },
    pipeline: {
      label: 'Pipeline podle fáze', icon: '🔄',
      render: () => <BarChart data={stavCounts} />
    },
    'koláč': {
      label: 'Produkty — koláčový graf', icon: '🥧',
      render: () => <PieChart data={prodCounts} title="Produkty" />
    },
    'koláč2': {
      label: 'Segmenty — koláčový graf', icon: '🥧',
      render: () => <PieChart data={segCounts} title="Segmenty" />
    },
    mrtvé: {
      label: 'Stagnující leady (14+ dní)', icon: '⚠️',
      render: () => (
        <div>
          {!mrtvé.length && <div style={{color:'#ccc',fontSize:13,textAlign:'center',padding:'16px 0'}}>Žádné stagnující leady 💪</div>}
          {mrtvé.map(l => {
            const dni = Math.round((new Date(today)-new Date(l.followup))/86400000)
            return (
              <div key={l.id} onClick={()=>onOpen(l)} style={{
                display:'flex',alignItems:'center',gap:10,padding:'8px 0',
                borderBottom:'0.5px solid #f5f5f3',cursor:'pointer'
              }}>
                <div style={{width:8,height:8,borderRadius:'50%',background:'#854F0B',flexShrink:0}} />
                <div style={{flex:1}}>
                  <div style={{fontSize:13,fontWeight:500}}>{l.firma}</div>
                  <div style={{fontSize:11,color:'#aaa'}}>{l.stav}</div>
                </div>
                <span style={{fontSize:11,color:'#854F0B',fontWeight:500}}>{dni} dní</span>
              </div>
            )
          })}
        </div>
      )
    },
    aktivity: {
      label: 'Aktivita týmu', icon: '👥',
      render: () => {
        const vedeCounts = {}
        active.forEach(l => { if(l.vede) vedeCounts[l.vede]=(vedeCounts[l.vede]||0)+1 })
        return (
          <div style={{display:'flex',flexDirection:'column',gap:10}}>
            {Object.entries(vedeCounts).map(([k,v]) => (
              <div key={k} style={{display:'flex',alignItems:'center',gap:10}}>
                <div style={{width:32,height:32,borderRadius:'50%',background:(aC[k]||'#888')+'22',display:'flex',alignItems:'center',justifyContent:'center',fontSize:13,fontWeight:600,color:aC[k]||'#666'}}>{k.slice(0,1)}</div>
                <div style={{flex:1}}>
                  <div style={{fontSize:13,fontWeight:500}}>{k}</div>
                  <div style={{fontSize:11,color:'#aaa'}}>{v} aktivních leadů</div>
                </div>
              </div>
            ))}
            {!Object.keys(vedeCounts).length && <div style={{color:'#ccc',fontSize:13,textAlign:'center',padding:'8px 0'}}>Žádná data</div>}
          </div>
        )
      }
    },
    countdown: {
      label: 'Countdown k prvnímu klientovi', icon: '🎯',
      render: () => {
        const startDate = new Date('2026-04-08')
        const targetDate = new Date('2026-05-08')
        const now = new Date()
        const dniZbývá = Math.max(0, Math.round((targetDate-now)/86400000))
        const progress = Math.min(100, Math.round((now-startDate)/(targetDate-startDate)*100))
        const mameKlienta = won.length > 0
        return (
          <div style={{textAlign:'center',padding:'8px 0'}}>
            {mameKlienta ? (
              <div>
                <div style={{fontSize:40,marginBottom:8}}>🏆</div>
                <div style={{fontSize:16,fontWeight:600,color:'#27500A'}}>Máme prvního klienta!</div>
                <div style={{fontSize:13,color:'#888',marginTop:4}}>{won[0]?.firma}</div>
              </div>
            ) : (
              <div>
                <div style={{fontSize:48,fontWeight:700,color:'#534AB7',lineHeight:1}}>{dniZbývá}</div>
                <div style={{fontSize:13,color:'#888',marginTop:4}}>dní do cíle — první klient</div>
                <div style={{margin:'16px 0 4px',height:8,background:'#f0f0ee',borderRadius:4,overflow:'hidden'}}>
                  <div style={{height:'100%',width:progress+'%',background:'linear-gradient(90deg,#534AB7,#1D9E75)',borderRadius:4,transition:'width 0.5s'}} />
                </div>
                <div style={{fontSize:11,color:'#aaa'}}>{progress}% cesty uběhlo</div>
              </div>
            )}
          </div>
        )
      }
    },
  }

  const ALL_WIDGETS = Object.keys(WIDGET_DEF)

  return (
    <div>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:20}}>
        <div style={{fontSize:13,color:'#888'}}>
          {new Date().toLocaleDateString('cs-CZ',{weekday:'long',day:'numeric',month:'long'})}
        </div>
        <button onClick={()=>setEditMode(!editMode)} style={{
          padding:'6px 14px',borderRadius:8,fontSize:13,cursor:'pointer',fontFamily:'inherit',
          border:'0.5px solid '+(editMode?'#534AB7':'#e0e0e0'),
          background:editMode?'#EEEDFE':'#fff',
          color:editMode?'#534AB7':'#888'
        }}>{editMode?'✓ Hotovo':'✎ Upravit'}</button>
      </div>

      {editMode && (
        <div style={{background:'#f8f8f6',borderRadius:12,padding:'14px 16px',marginBottom:20}}>
          <div style={{fontSize:12,color:'#888',marginBottom:10,fontWeight:500}}>Widgety — zaškrtni co chceš vidět, přesuň pro změnu pořadí</div>
          <div style={{display:'flex',gap:6,flexWrap:'wrap'}}>
            {ALL_WIDGETS.map(id => (
              <button key={id} onClick={()=>toggleWidget(id)} style={{
                padding:'5px 12px',borderRadius:8,fontSize:12,cursor:'pointer',fontFamily:'inherit',
                border:'0.5px solid '+(widgets.includes(id)?'#534AB7':'#e0e0e0'),
                background:widgets.includes(id)?'#EEEDFE':'#fff',
                color:widgets.includes(id)?'#534AB7':'#888'
              }}>{WIDGET_DEF[id]?.icon} {WIDGET_DEF[id]?.label}</button>
            ))}
          </div>
        </div>
      )}

      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(300px,1fr))',gap:16}}>
        {widgets.filter(id=>WIDGET_DEF[id]).map(id => {
          const w = WIDGET_DEF[id]
          const isDragging = dragW===id
          const isOver = dragWOver===id
          return (
            <div
              key={id}
              draggable={editMode}
              onDragStart={e=>handleDragW(e,id)}
              onDragOver={e=>{e.preventDefault();setDragWOver(id)}}
              onDrop={e=>handleDropW(e,id)}
              onDragEnd={()=>{setDragW(null);setDragWOver(null)}}
              style={{
                background:'#fff',border:'0.5px solid '+(isOver?'#534AB7':'#e8e8e8'),
                borderRadius:12,overflow:'hidden',
                opacity:isDragging?0.5:1,
                cursor:editMode?'grab':'default',
                transform:isOver?'scale(1.02)':'none',
                transition:'transform 0.1s,border-color 0.1s'
              }}
            >
              <div style={{padding:'12px 16px',borderBottom:'0.5px solid #f5f5f3',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                <div style={{fontSize:13,fontWeight:500,color:'#333'}}>{w.icon} {w.label}</div>
                {editMode && <span style={{fontSize:11,color:'#ccc'}}>⠿ přetáhni</span>}
              </div>
              <div style={{padding:'14px 16px'}}>{w.render()}</div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── ÚKOLY ───────────────────────────────────────────────────────────────────
const UKOL_STAVS = ['todo', 'in_progress', 'hotovo']
const UKOL_STAV_LABEL = { todo: 'K udělání', in_progress: 'Probíhá', hotovo: 'Hotovo' }
const UKOL_STAV_COLOR = { todo: '#185FA5', in_progress: '#854F0B', hotovo: '#27500A' }
const UKOL_STAV_BG = { todo: '#E6F1FB', in_progress: '#FAEEDA', hotovo: '#EAF3DE' }

const UkolModal = ({ ukol, leads, onSave, onClose, teamMembers }) => {
  const activeTeam = (teamMembers && teamMembers.length > 0) ? teamMembers : ['Karel','Radim','Aleš']
  const [form, setForm] = useState(ukol || {
    nazev: '', popis: '', kdo: activeTeam[0] || 'Karel', do_kdy: '', stav: 'todo',
    lead_id: '', novy_stav_leadu: '', zdroj: '', zdroj_id: ''
  })
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{maxWidth:520}}>
        <div className="modal-head">
          <h2>{ukol ? 'Upravit úkol' : 'Nový úkol'}</h2>
          <button className="close-btn" onClick={onClose}>&times;</button>
        </div>
        <div className="modal-body">
          <div className="form-row"><label>Název úkolu *</label>
            <input value={form.nazev} onChange={e=>set('nazev',e.target.value)} placeholder="Co je potřeba udělat..." />
          </div>
          <div className="form-row"><label>Popis</label>
            <textarea value={form.popis} onChange={e=>set('popis',e.target.value)} placeholder="Detaily, kontext..." style={{height:72}} />
          </div>
          <div className="form-grid">
            <div className="form-row"><label>Kdo to dělá</label>
              <select value={form.kdo} onChange={e=>set('kdo',e.target.value)}>
                {activeTeam.map(o=><option key={o}>{o}</option>)}
              </select>
            </div>
            <div className="form-row"><label>Do kdy</label>
              <input type="date" value={form.do_kdy} onChange={e=>set('do_kdy',e.target.value)} />
            </div>
          </div>
          <div className="form-grid">
            <div className="form-row"><label>Stav</label>
              <select value={form.stav} onChange={e=>set('stav',e.target.value)}>
                {UKOL_STAVS.map(s=><option key={s} value={s}>{UKOL_STAV_LABEL[s]}</option>)}
              </select>
            </div>
            <div className="form-row"><label>Propojit s leadem</label>
              <select value={form.lead_id} onChange={e=>set('lead_id',e.target.value)}>
                <option value="">— žádný —</option>
                {leads.map(l=><option key={l.id} value={l.id}>{l.firma}</option>)}
              </select>
            </div>
          </div>
          {form.lead_id && (
            <div className="form-row">
              <label>Po splnění změnit stav leadu na</label>
              <select value={form.novy_stav_leadu} onChange={e=>set('novy_stav_leadu',e.target.value)}>
                <option value="">— neměnit —</option>
                {['Lead','Kontaktováno','Discovery call domluven','Discovery call proběhl',
                  'Nabídka odeslána','Vyjednávání','Uzavřeno — vyhráno','Uzavřeno — prohráno','Odloženo'
                ].map(s=><option key={s}>{s}</option>)}
              </select>
            </div>
          )}
          {form.zdroj && (
            <div style={{fontSize:12,color:'#aaa',background:'#f5f5f3',padding:'8px 12px',borderRadius:8}}>
              Propojeno: {form.zdroj === 'pruvodce' ? 'Průvodce strategií' : form.zdroj}
              {form.zdroj_nazev ? ` — ${form.zdroj_nazev}` : ''}
            </div>
          )}
        </div>
        <div className="modal-foot">
          {ukol && <button className="btn danger" onClick={() => { if(window.confirm('Smazat?')) onSave(null, true) }}>Smazat</button>}
          <button className="btn" style={{color:'#0F6E56',borderColor:'#0F6E56'}} onClick={() => {
            if (!form.do_kdy) { alert('Nastav nejdřív deadline'); return }
            const lead = leads.find(l => l.id === form.lead_id)
            const start = new Date(form.do_kdy + 'T09:00:00')
            const end = new Date(form.do_kdy + 'T09:30:00')
            const fmt = (d) => d.toISOString().replace(/[-:]/g,'').slice(0,15) + 'Z'
            const title = encodeURIComponent((form.nazev||'Úkol') + (lead ? ' — ' + lead.firma : ''))
            const details = encodeURIComponent(
              (form.popis ? 'Popis: ' + form.popis + '\n' : '') +
              'Zodpovídá: ' + (form.kdo||'') + '\n' +
              (lead ? 'Firma: ' + lead.firma + '\n' : '') +
              'CRM: https://crm-two-lemon.vercel.app'
            )
            window.open('https://calendar.google.com/calendar/render?action=TEMPLATE&text=' + title + '&dates=' + fmt(start) + '/' + fmt(end) + '&details=' + details, '_blank')
          }}>📅 Kalendář</button>
          <button className="btn" onClick={onClose}>Zrušit</button>
          <button className="btn accent" onClick={() => { if(!form.nazev.trim()){alert('Zadej název');return} onSave(form) }}>Uložit</button>
        </div>
      </div>
    </div>
  )
}

const UkolyView = ({ leads, onLeadChange, teamMembers }) => {
  const safeTeam = teamMembers && teamMembers.length > 0 ? teamMembers : ['Karel','Radim','Aleš']
  const [ukoly, setUkoly] = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(null)
  const [filtrKdo, setFiltrKdo] = useState('')
  const [filtrStav, setFiltrStav] = useState('')
  const [filtrLead, setFiltrLead] = useState('')
  const [search, setSearch] = useState('')

  const today = new Date().toISOString().slice(0,10)

  const fetchUkoly = async () => {
    const { data } = await supabase.from('ukoly').select('*').eq('user_id', session?.user?.id).order('created_at', { ascending: false })
    setUkoly(data || [])
    setLoading(false)
  }

  useEffect(() => { fetchUkoly() }, [])

  const saveUkol = async (form, smazat) => {
    if (smazat) {
      await supabase.from('ukoly').delete().eq('id', modal.id)
      setModal(null)
      fetchUkoly()
      return
    }

    const bylHotovo = modal?.stav === 'hotovo'
    const jeHotovo = form.stav === 'hotovo'
    const stavSeZmenil = !bylHotovo && jeHotovo

    if (modal?.id) {
      await supabase.from('ukoly').update(form).eq('id', modal.id)
    } else {
      await supabase.from('ukoly').insert([{ ...form, user_id: session?.user?.id }])
    }

    // Pokud se úkol označil jako hotový a má lead a nový stav
    if (stavSeZmenil && form.lead_id && form.novy_stav_leadu) {
      await supabase.from('leads').update({ stav: form.novy_stav_leadu }).eq('id', form.lead_id)
      await supabase.from('comments').insert([{
        lead_id: form.lead_id,
        autor: form.kdo,
        text: 'Úkol splněn: ' + form.nazev + (form.popis ? ' — ' + form.popis : ''),
        user_id: session?.user?.id
      }])
      if (onLeadChange) onLeadChange()
    }

    setModal(null)
    fetchUkoly()
  }

  const toggleStav = async (ukol) => {
    const novyStav = ukol.stav === 'hotovo' ? 'todo' : ukol.stav === 'todo' ? 'in_progress' : 'hotovo'
    const bylHotovo = ukol.stav === 'hotovo'
    const jeHotovo = novyStav === 'hotovo'

    await supabase.from('ukoly').update({ stav: novyStav }).eq('id', ukol.id)

    if (!bylHotovo && jeHotovo && ukol.lead_id && ukol.novy_stav_leadu) {
      await supabase.from('leads').update({ stav: ukol.novy_stav_leadu }).eq('id', ukol.lead_id)
      await supabase.from('comments').insert([{
        lead_id: ukol.lead_id,
        autor: ukol.kdo,
        text: 'Úkol splněn: ' + ukol.nazev,
        user_id: session?.user?.id
      }])
      if (onLeadChange) onLeadChange()
    }

    fetchUkoly()
  }

  const filtered = ukoly.filter(u => {
    if (search && !u.nazev.toLowerCase().includes(search.toLowerCase())) return false
    if (filtrKdo && u.kdo !== filtrKdo) return false
    if (filtrStav && u.stav !== filtrStav) return false
    if (filtrLead && u.lead_id !== filtrLead) return false
    return true
  })

  const todo = filtered.filter(u => u.stav === 'todo')
  const inProgress = filtered.filter(u => u.stav === 'in_progress')
  const hotovo = filtered.filter(u => u.stav === 'hotovo')
  const dnes = filtered.filter(u => u.do_kdy === today && u.stav !== 'hotovo')
  const poTerminu = filtered.filter(u => u.do_kdy && u.do_kdy < today && u.stav !== 'hotovo')

  const aC = { Karel:'#534AB7', Radim:'#0F6E56', Ales:'#854F0B', Aleš:'#854F0B' }

  const UkolKarta = ({ u }) => {
    const lead = leads.find(l => l.id === u.lead_id)
    const overdue = u.do_kdy && u.do_kdy < today && u.stav !== 'hotovo'
    const dnesTermin = u.do_kdy === today && u.stav !== 'hotovo'
    return (
      <div style={{
        background:'#fff', border:'0.5px solid ' + (u.stav==='hotovo'?'#5DCAA5':'#e8e8e8'),
        borderRadius:10, padding:'12px 14px', marginBottom:8,
        opacity: u.stav==='hotovo' ? 0.7 : 1
      }}>
        <div style={{display:'flex',alignItems:'flex-start',gap:10}}>
          <button onClick={() => toggleStav(u)} style={{
            width:22,height:22,borderRadius:'50%',flexShrink:0,marginTop:2,cursor:'pointer',
            border:'0.5px solid ' + (u.stav==='hotovo'?'#1D9E75':u.stav==='in_progress'?'#854F0B':'#ddd'),
            background: u.stav==='hotovo'?'#1D9E75':u.stav==='in_progress'?'#FAEEDA':'#fff',
            color: u.stav==='hotovo'?'#fff':'transparent',fontSize:11,
            display:'flex',alignItems:'center',justifyContent:'center'
          }}>{u.stav==='hotovo'?'✓':u.stav==='in_progress'?'▶':''}</button>
          <div style={{flex:1,minWidth:0}}>
            <div style={{fontSize:13,fontWeight:500,color:u.stav==='hotovo'?'#aaa':'#1a1a1a',
              textDecoration:u.stav==='hotovo'?'line-through':'none',marginBottom:3}}>
              {u.nazev}
            </div>
            {u.popis && <div style={{fontSize:12,color:'#888',marginBottom:4,lineHeight:1.5}}>{u.popis}</div>}
            <div style={{display:'flex',gap:6,flexWrap:'wrap',alignItems:'center'}}>
              <span style={{fontSize:11,padding:'1px 7px',borderRadius:10,
                background:(aC[u.kdo]||'#888')+'18',color:aC[u.kdo]||'#666'}}>{u.kdo}</span>
              {u.priorita && u.priorita !== 'Střední' && (
                <span style={{fontSize:11,padding:'1px 7px',borderRadius:10,
                  background:(PRIORITY_BG[u.priorita]||'#f0f0f0'),color:(PRIORITY_COLORS[u.priorita]||'#888')}}>
                  {u.priorita}
                </span>
              )}
              {u.typ_ukolu && <span style={{fontSize:11,color:'#aaa'}}>{u.typ_ukolu}</span>}
              {u.do_kdy && (
                <span style={{fontSize:11,color:overdue?'#A32D2D':dnesTermin?'#854F0B':'#aaa',fontWeight:overdue||dnesTermin?500:400}}>
                  📅 {u.do_kdy}{overdue?' — po termínu!':dnesTermin?' — dnes!':''}
                </span>
              )}
              {lead && (
                <span style={{fontSize:11,color:'#534AB7',background:'#EEEDFE',padding:'1px 7px',borderRadius:10}}>
                  🔗 {lead.firma}
                </span>
              )}
              {lead?.email && (
                <a href={'mailto:'+lead.email} onClick={e=>e.stopPropagation()}
                  style={{fontSize:11,color:'#185FA5',background:'#E6F1FB',padding:'1px 7px',borderRadius:10,textDecoration:'none'}}>
                  ✉️ Email
                </a>
              )}
              {u.zdroj === 'pruvodce' && (
                <span style={{fontSize:11,color:'#0F6E56',background:'#E1F5EE',padding:'1px 7px',borderRadius:10}}>
                  🗺️ Průvodce
                </span>
              )}
            </div>
          </div>
          <button onClick={() => setModal(u)} style={{background:'none',border:'none',color:'#ccc',cursor:'pointer',fontSize:16,padding:'0 4px'}}>✎</button>
        </div>
      </div>
    )
  }

  const celkem = ukoly.filter(u=>u.stav!=='hotovo').length

  return (
    <div>
      <div style={{display:'flex',gap:8,marginBottom:16,flexWrap:'wrap',alignItems:'center'}}>
        <input placeholder="Hledat..." value={search} onChange={e=>setSearch(e.target.value)}
          style={{height:34,padding:'0 12px',border:'0.5px solid #ddd',borderRadius:8,fontSize:13,width:160,fontFamily:'inherit'}} />
        <select value={filtrKdo} onChange={e=>setFiltrKdo(e.target.value)}
          style={{height:34,padding:'0 12px',border:'0.5px solid #ddd',borderRadius:8,fontSize:13,fontFamily:'inherit',background:'#fff'}}>
          <option value="">Všichni</option>
          {safeTeam.map(o=><option key={o}>{o}</option>)}
        </select>
        <select value={filtrStav} onChange={e=>setFiltrStav(e.target.value)}
          style={{height:34,padding:'0 12px',border:'0.5px solid #ddd',borderRadius:8,fontSize:13,fontFamily:'inherit',background:'#fff'}}>
          <option value="">Všechny stavy</option>
          {UKOL_STAVS.map(s=><option key={s} value={s}>{UKOL_STAV_LABEL[s]}</option>)}
        </select>
        <select value={filtrLead} onChange={e=>setFiltrLead(e.target.value)}
          style={{height:34,padding:'0 12px',border:'0.5px solid #ddd',borderRadius:8,fontSize:13,fontFamily:'inherit',background:'#fff'}}>
          <option value="">Všechny leady</option>
          {leads.map(l=><option key={l.id} value={l.id}>{l.firma}</option>)}
        </select>
        <button className="btn accent" onClick={() => setModal({})}>+ Nový úkol</button>
      </div>

      <div className="metrics" style={{marginBottom:20}}>
        <div className="metric-card"><div className="label">Aktivní úkoly</div><div className="val">{celkem}</div></div>
        <div className={`metric-card ${poTerminu.length>0?'alert':''}`}><div className="label">Po termínu</div><div className="val">{poTerminu.length}</div></div>
        <div className="metric-card"><div className="label">Dnes</div><div className="val">{dnes.length}</div></div>
        <div className="metric-card"><div className="label">Hotovo celkem</div><div className="val">{ukoly.filter(u=>u.stav==='hotovo').length}</div></div>
      </div>

      {loading && <div style={{color:'#aaa',padding:'32px',textAlign:'center'}}>Načítám...</div>}

      {!loading && (
        <div style={{display:'grid',gridTemplateColumns:'repeat(3,minmax(0,1fr))',gap:16}}>
          {[
            {stavKey:'todo', label:'K udělání', items:todo, barva:'#185FA5', bg:'#E6F1FB'},
            {stavKey:'in_progress', label:'Probíhá', items:inProgress, barva:'#854F0B', bg:'#FAEEDA'},
            {stavKey:'hotovo', label:'Hotovo', items:hotovo, barva:'#27500A', bg:'#EAF3DE'},
          ].map(col => (
            <div key={col.stavKey}>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:10}}>
                <span style={{fontSize:12,fontWeight:500,color:col.barva,background:col.bg,padding:'3px 10px',borderRadius:10}}>{col.label}</span>
                <span style={{fontSize:12,color:'#aaa'}}>{col.items.length}</span>
              </div>
              {!col.items.length && <div style={{fontSize:12,color:'#ccc',textAlign:'center',padding:'16px 0'}}>Prázdné</div>}
              {col.items.map(u => <UkolKarta key={u.id} u={u} />)}
            </div>
          ))}
        </div>
      )}

      {modal !== null && (
        <UkolModal
          ukol={modal.id ? modal : null}
          leads={leads}
          onSave={saveUkol}
          onClose={() => setModal(null)}
          teamMembers={teamMembers}
        />
      )}
    </div>
  )
}

// Globální hook pro vytvoření úkolu z jakéhokoliv místa
const useCreateUkol = (leads, onUkolCreated) => {
  const [showModal, setShowModal] = useState(false)
  const [defaultValues, setDefaultValues] = useState({})

  const openUkol = (defaults) => {
    setDefaultValues(defaults || {})
    setShowModal(true)
  }

  const saveUkol = async (form) => {
    await supabase.from('ukoly').insert([{ ...defaultValues, ...form, user_id: session?.user?.id }])
    setShowModal(false)
    if (onUkolCreated) onUkolCreated()
  }

  const modal = showModal ? (
    <UkolModal
      ukol={defaultValues}
      leads={leads}
      onSave={saveUkol}
      onClose={() => setShowModal(false)}
    />
  ) : null

  return { openUkol, modal }
}


// ─── KALENDÁŘ ─────────────────────────────────────────────────────────────────
const KalendarView = ({ leads, teamMembers, userProfile, session }) => {
  const [udalosti, setUdalosti] = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(null)
  const [pohled, setPohled] = useState('mesic') // mesic | tyden | seznam
  const [sdilenyPohled, setSdilenyPohled] = useState(false)
  const [dnesniDen, setDnesniDen] = useState(new Date())
  const [vybraneDatum, setVybraneDatum] = useState(null)

  const TYP_BARVY = {
    schuzka: { bg:'#EEEDFE', color:'#534AB7', icon:'🤝' },
    call: { bg:'#E1F5EE', color:'#0F6E56', icon:'📞' },
    demo: { bg:'#FAEEDA', color:'#854F0B', icon:'💻' },
    deadline: { bg:'#FCEBEB', color:'#791F1F', icon:'⚠️' },
    jine: { bg:'#f5f5f3', color:'#888', icon:'📌' },
  }

  const fetchUdalosti = async () => {
    try {
      const { data } = await supabase
        .from('kalendar_udalosti')
        .select('*')
        .order('datum', { ascending: true })
      setUdalosti(data || [])
    } catch(e) { console.error(e) }
    setLoading(false)
  }

  useEffect(() => { fetchUdalosti() }, [])

  const saveUdalost = async (form, smazat) => {
    if (smazat) {
      await supabase.from('kalendar_udalosti').delete().eq('id', modal.id)
      setModal(null)
      fetchUdalosti()
      return
    }
    if (modal?.id) {
      await supabase.from('kalendar_udalosti').update({ ...form, user_id: session?.user?.id }).eq('id', modal.id)
    } else {
      await supabase.from('kalendar_udalosti').insert([{ ...form, user_id: session?.user?.id }])
    }
    setModal(null)
    fetchUdalosti()
  }

  const getDnyMesice = (rok, mesic) => {
    const prvniDen = new Date(rok, mesic, 1)
    const posledniDen = new Date(rok, mesic + 1, 0)
    const dni = []
    const startDen = prvniDen.getDay() === 0 ? 6 : prvniDen.getDay() - 1
    for (let i = 0; i < startDen; i++) {
      const d = new Date(rok, mesic, -startDen + i + 1)
      dni.push({ datum: d, aktualni: false })
    }
    for (let i = 1; i <= posledniDen.getDate(); i++) {
      dni.push({ datum: new Date(rok, mesic, i), aktualni: true })
    }
    while (dni.length % 7 !== 0) {
      const last = dni[dni.length - 1].datum
      dni.push({ datum: new Date(last.getTime() + 86400000), aktualni: false })
    }
    return dni
  }

  const formatDate = (d) => d.toISOString().slice(0, 10)
  const dnesStr = formatDate(new Date())
  const rok = dnesniDen.getFullYear()
  const mesic = dnesniDen.getMonth()
  const MESICE_NAZVY = ['Leden','Únor','Březen','Duben','Květen','Červen','Červenec','Srpen','Září','Říjen','Listopad','Prosinec']
  const DNY = ['Po','Út','St','Čt','Pá','So','Ne']

  const udalostiDne = (datStr) => udalosti.filter(u => {
    if (sdilenyPohled) return u.datum === datStr
    return u.datum === datStr && (u.user_id === session?.user?.id || u.sdilena)
  })

  const dni = getDnyMesice(rok, mesic)

  // Týdenní pohled
  const getStartOfWeek = (d) => {
    const day = d.getDay()
    const diff = day === 0 ? -6 : 1 - day
    return new Date(d.getFullYear(), d.getMonth(), d.getDate() + diff)
  }
  const startTydne = getStartOfWeek(dnesniDen)
  const tyden = Array.from({length: 7}, (_, i) => new Date(startTydne.getTime() + i * 86400000))
  const HODINY = Array.from({length: 14}, (_, i) => i + 7) // 7:00 - 20:00

  return (
    <div>
      {/* Toolbar */}
      <div style={{display:'flex',gap:8,marginBottom:16,alignItems:'center',flexWrap:'wrap'}}>
        <div style={{display:'flex',gap:4,background:'#f5f5f3',borderRadius:8,padding:3}}>
          {['mesic','tyden','seznam'].map(p => (
            <button key={p} onClick={() => setPohled(p)} style={{
              padding:'5px 14px',borderRadius:6,border:'none',cursor:'pointer',
              fontSize:12,fontFamily:'inherit',fontWeight:pohled===p?500:400,
              background:pohled===p?'#fff':'transparent',
              color:pohled===p?'#1a1a1a':'#888',
              boxShadow:pohled===p?'0 1px 3px rgba(0,0,0,0.1)':'none'
            }}>{p === 'mesic' ? 'Měsíc' : p === 'tyden' ? 'Týden' : 'Seznam'}</button>
          ))}
        </div>

        <div style={{display:'flex',gap:4}}>
          <button onClick={() => {
            const d = new Date(dnesniDen)
            if (pohled === 'mesic') d.setMonth(d.getMonth() - 1)
            else d.setDate(d.getDate() - 7)
            setDnesniDen(d)
          }} style={{padding:'5px 10px',borderRadius:8,border:'0.5px solid #e0e0e0',background:'#fff',cursor:'pointer',fontSize:14}}>‹</button>
          <button onClick={() => setDnesniDen(new Date())} style={{
            padding:'5px 12px',borderRadius:8,border:'0.5px solid #e0e0e0',
            background:'#fff',cursor:'pointer',fontSize:12,fontFamily:'inherit'
          }}>Dnes</button>
          <button onClick={() => {
            const d = new Date(dnesniDen)
            if (pohled === 'mesic') d.setMonth(d.getMonth() + 1)
            else d.setDate(d.getDate() + 7)
            setDnesniDen(d)
          }} style={{padding:'5px 10px',borderRadius:8,border:'0.5px solid #e0e0e0',background:'#fff',cursor:'pointer',fontSize:14}}>›</button>
        </div>

        <div style={{fontWeight:500,fontSize:15}}>
          {pohled === 'tyden'
            ? `${formatDate(startTydne)} — ${formatDate(tyden[6])}`
            : `${MESICE_NAZVY[mesic]} ${rok}`
          }
        </div>

        <div style={{marginLeft:'auto',display:'flex',gap:8,alignItems:'center'}}>
          <label style={{display:'flex',alignItems:'center',gap:6,fontSize:12,color:'#888',cursor:'pointer'}}>
            <input type="checkbox" checked={sdilenyPohled} onChange={e => setSdilenyPohled(e.target.checked)} />
            Sdílený týmový pohled
          </label>
          <button className="btn accent" onClick={() => setModal({ datum: vybraneDatum || dnesStr })}>+ Nová událost</button>
        </div>
      </div>

      {/* Legenda typů */}
      <div style={{display:'flex',gap:8,marginBottom:14,flexWrap:'wrap'}}>
        {Object.entries(TYP_BARVY).map(([typ, b]) => (
          <span key={typ} style={{fontSize:11,padding:'2px 10px',borderRadius:10,background:b.bg,color:b.color}}>
            {b.icon} {typ.charAt(0).toUpperCase() + typ.slice(1)}
          </span>
        ))}
      </div>

      {/* MĚSÍČNÍ POHLED */}
      {pohled === 'mesic' && (
        <div style={{background:'#fff',border:'0.5px solid #e8e8e8',borderRadius:12,overflow:'hidden'}}>
          <div style={{display:'grid',gridTemplateColumns:'repeat(7,1fr)',borderBottom:'0.5px solid #f0f0f0'}}>
            {DNY.map(d => (
              <div key={d} style={{padding:'8px 0',textAlign:'center',fontSize:11,fontWeight:500,color:'#888',borderRight:'0.5px solid #f8f8f8'}}>{d}</div>
            ))}
          </div>
          <div style={{display:'grid',gridTemplateColumns:'repeat(7,1fr)'}}>
            {dni.map((den, i) => {
              const datStr = formatDate(den.datum)
              const denUdalosti = udalostiDne(datStr)
              const jeDnes = datStr === dnesStr
              return (
                <div key={i} onClick={() => { setVybraneDatum(datStr); setModal({ datum: datStr }) }}
                  style={{
                    minHeight:90,padding:'6px 8px',
                    borderRight:'0.5px solid #f8f8f8',
                    borderBottom:'0.5px solid #f8f8f8',
                    background: !den.aktualni ? '#fafaf8' : jeDnes ? '#EEEDFE' : '#fff',
                    cursor:'pointer',opacity:den.aktualni?1:0.4,
                    transition:'background 0.1s'
                  }}
                  onMouseEnter={e => { if(den.aktualni) e.currentTarget.style.background = jeDnes ? '#E8E7FD' : '#fafaf8' }}
                  onMouseLeave={e => { e.currentTarget.style.background = !den.aktualni ? '#fafaf8' : jeDnes ? '#EEEDFE' : '#fff' }}
                >
                  <div style={{
                    fontSize:12,fontWeight:jeDnes?700:400,
                    color:jeDnes?'#534AB7':'#1a1a1a',
                    marginBottom:4,
                    ...(jeDnes ? {
                      width:22,height:22,borderRadius:'50%',background:'#534AB7',
                      color:'#fff',display:'flex',alignItems:'center',justifyContent:'center'
                    } : {})
                  }}>{den.datum.getDate()}</div>
                  {denUdalosti.slice(0, 3).map(u => {
                    const b = TYP_BARVY[u.typ] || TYP_BARVY.jine
                    return (
                      <div key={u.id} onClick={e => { e.stopPropagation(); setModal(u) }}
                        style={{fontSize:10,padding:'2px 6px',borderRadius:4,background:b.bg,color:b.color,
                          marginBottom:2,overflow:'hidden',whiteSpace:'nowrap',textOverflow:'ellipsis',cursor:'pointer'}}>
                        {b.icon} {u.nazev}
                      </div>
                    )
                  })}
                  {denUdalosti.length > 3 && <div style={{fontSize:10,color:'#aaa'}}>+{denUdalosti.length-3} další</div>}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* TÝDENNÍ POHLED */}
      {pohled === 'tyden' && (
        <div style={{background:'#fff',border:'0.5px solid #e8e8e8',borderRadius:12,overflow:'hidden'}}>
          <div style={{display:'grid',gridTemplateColumns:'50px repeat(7,1fr)',borderBottom:'0.5px solid #f0f0f0'}}>
            <div />
            {tyden.map((d, i) => {
              const jeDnes = formatDate(d) === dnesStr
              return (
                <div key={i} style={{padding:'8px 4px',textAlign:'center',borderLeft:'0.5px solid #f0f0f0',
                  background:jeDnes?'#EEEDFE':'#fff'}}>
                  <div style={{fontSize:11,color:'#888'}}>{DNY[i]}</div>
                  <div style={{fontSize:16,fontWeight:jeDnes?700:400,color:jeDnes?'#534AB7':'#1a1a1a'}}>{d.getDate()}</div>
                </div>
              )
            })}
          </div>
          <div style={{maxHeight:500,overflowY:'auto'}}>
            {HODINY.map(hodina => (
              <div key={hodina} style={{display:'grid',gridTemplateColumns:'50px repeat(7,1fr)',borderBottom:'0.5px solid #f8f8f8',minHeight:48}}>
                <div style={{padding:'4px 8px',fontSize:11,color:'#bbb',paddingTop:6}}>{hodina}:00</div>
                {tyden.map((d, di) => {
                  const datStr = formatDate(d)
                  const denUdalosti = udalostiDne(datStr).filter(u => {
                    if (!u.cas_od) return false
                    const h = parseInt(u.cas_od.split(':')[0])
                    return h === hodina
                  })
                  return (
                    <div key={di} onClick={() => setModal({ datum: datStr, cas_od: `${String(hodina).padStart(2,'0')}:00` })}
                      style={{borderLeft:'0.5px solid #f0f0f0',padding:'2px 4px',cursor:'pointer',
                        background: formatDate(d) === dnesStr ? '#EEEDFE20' : 'transparent'}}
                      onMouseEnter={e => e.currentTarget.style.background='#f5f5f3'}
                      onMouseLeave={e => e.currentTarget.style.background = formatDate(d) === dnesStr ? '#EEEDFE20' : 'transparent'}
                    >
                      {denUdalosti.map(u => {
                        const b = TYP_BARVY[u.typ] || TYP_BARVY.jine
                        return (
                          <div key={u.id} onClick={e => { e.stopPropagation(); setModal(u) }}
                            style={{fontSize:10,padding:'3px 6px',borderRadius:4,background:b.bg,color:b.color,
                              marginBottom:2,cursor:'pointer',borderLeft:`2px solid ${b.color}`}}>
                            {u.cas_od?.slice(0,5)} {u.nazev}
                          </div>
                        )
                      })}
                    </div>
                  )
                })}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SEZNAM POHLED */}
      {pohled === 'seznam' && (
        <div>
          {loading && <div style={{color:'#aaa',padding:32,textAlign:'center'}}>Načítám...</div>}
          {!loading && udalosti.length === 0 && (
            <div style={{textAlign:'center',padding:48,color:'#bbb'}}>
              <div style={{fontSize:32,marginBottom:8}}>📅</div>
              <div>Žádné události — přidej první kliknutím na "+ Nová událost"</div>
            </div>
          )}
          {Object.entries(
            udalosti
              .filter(u => sdilenyPohled || u.user_id === session?.user?.id || u.sdilena)
              .reduce((acc, u) => {
                if (!acc[u.datum]) acc[u.datum] = []
                acc[u.datum].push(u)
                return acc
              }, {})
          ).sort(([a],[b]) => a.localeCompare(b)).map(([datum, denUdalosti]) => (
            <div key={datum} style={{marginBottom:16}}>
              <div style={{fontSize:12,fontWeight:600,color:'#888',marginBottom:8,textTransform:'uppercase',letterSpacing:'0.05em'}}>
                {datum === dnesStr ? '📍 Dnes' : new Date(datum + 'T12:00:00').toLocaleDateString('cs-CZ', {weekday:'long',day:'numeric',month:'long'})}
              </div>
              {denUdalosti.sort((a,b) => (a.cas_od||'').localeCompare(b.cas_od||'')).map(u => {
                const b = TYP_BARVY[u.typ] || TYP_BARVY.jine
                const lead = leads.find(l => l.id === u.lead_id)
                return (
                  <div key={u.id} onClick={() => setModal(u)}
                    style={{display:'flex',gap:12,padding:'12px 16px',background:'#fff',
                      border:'0.5px solid #e8e8e8',borderRadius:10,marginBottom:6,cursor:'pointer',
                      borderLeft:`3px solid ${b.color}`}}
                    onMouseEnter={e => e.currentTarget.style.background='#fafaf8'}
                    onMouseLeave={e => e.currentTarget.style.background='#fff'}
                  >
                    <div style={{fontSize:20}}>{b.icon}</div>
                    <div style={{flex:1}}>
                      <div style={{fontWeight:500,fontSize:13,marginBottom:2}}>{u.nazev}</div>
                      {u.popis && <div style={{fontSize:12,color:'#888'}}>{u.popis}</div>}
                      <div style={{display:'flex',gap:8,marginTop:4,flexWrap:'wrap'}}>
                        {u.cas_od && <span style={{fontSize:11,color:'#aaa'}}>🕐 {u.cas_od.slice(0,5)}{u.cas_do ? ' — ' + u.cas_do.slice(0,5) : ''}</span>}
                        {lead && <span style={{fontSize:11,color:'#534AB7',background:'#EEEDFE',padding:'1px 8px',borderRadius:8}}>🔗 {lead.firma}</span>}
                        {u.sdilena && <span style={{fontSize:11,color:'#0F6E56',background:'#E1F5EE',padding:'1px 8px',borderRadius:8}}>👥 Sdílená</span>}
                        <span style={{fontSize:11,padding:'1px 8px',borderRadius:8,background:b.bg,color:b.color}}>{u.typ}</span>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          ))}
        </div>
      )}

      {/* MODAL */}
      {modal !== null && (
        <KalendarModal
          udalost={modal?.id ? modal : null}
          defaultDatum={modal?.datum || dnesStr}
          defaultCas={modal?.cas_od || ''}
          leads={leads}
          onSave={saveUdalost}
          onClose={() => setModal(null)}
        />
      )}
    </div>
  )
}

const KalendarModal = ({ udalost, defaultDatum, defaultCas, leads, onSave, onClose }) => {
  const [form, setForm] = useState(udalost || {
    nazev: '', popis: '', datum: defaultDatum, cas_od: defaultCas,
    cas_do: '', typ: 'schuzka', lead_id: '', sdilena: false, barva: '#534AB7'
  })
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{maxWidth:480}}>
        <div className="modal-head">
          <h2>{udalost ? 'Upravit událost' : 'Nová událost'}</h2>
          <button className="close-btn" onClick={onClose}>&times;</button>
        </div>
        <div className="modal-body">
          <div className="form-row"><label>Název *</label>
            <input value={form.nazev} onChange={e=>set('nazev',e.target.value)} placeholder="Schůzka s klientem..." autoFocus />
          </div>
          <div className="form-grid">
            <div className="form-row"><label>Typ</label>
              <select value={form.typ} onChange={e=>set('typ',e.target.value)}>
                {['schuzka','call','demo','deadline','jine'].map(t => <option key={t} value={t}>{t.charAt(0).toUpperCase()+t.slice(1)}</option>)}
              </select>
            </div>
            <div className="form-row"><label>Datum</label>
              <input type="date" value={form.datum} onChange={e=>set('datum',e.target.value)} />
            </div>
          </div>
          <div className="form-grid">
            <div className="form-row"><label>Čas od</label>
              <input type="time" value={form.cas_od} onChange={e=>set('cas_od',e.target.value)} />
            </div>
            <div className="form-row"><label>Čas do</label>
              <input type="time" value={form.cas_do} onChange={e=>set('cas_do',e.target.value)} />
            </div>
          </div>
          <div className="form-row"><label>Popis</label>
            <textarea value={form.popis} onChange={e=>set('popis',e.target.value)} placeholder="Agenda, poznámky..." style={{height:72}} />
          </div>
          <div className="form-row"><label>Propojit s leadem</label>
            <select value={form.lead_id} onChange={e=>set('lead_id',e.target.value)}>
              <option value="">— žádný —</option>
              {leads.map(l => <option key={l.id} value={l.id}>{l.firma}</option>)}
            </select>
          </div>
          <div style={{display:'flex',alignItems:'center',gap:8,padding:'8px 0'}}>
            <input type="checkbox" id="sdilena" checked={form.sdilena} onChange={e=>set('sdilena',e.target.checked)} />
            <label htmlFor="sdilena" style={{fontSize:13,cursor:'pointer'}}>
              👥 Sdílená událost — vidí ji celý tým
            </label>
          </div>
          <div style={{display:'flex',gap:8,marginTop:4}}>
            {['#534AB7','#0F6E56','#185FA5','#854F0B','#791F1F','#27500A'].map(c => (
              <button key={c} onClick={() => set('barva',c)} style={{
                width:24,height:24,borderRadius:'50%',background:c,cursor:'pointer',border:'none',
                outline:form.barva===c?'2.5px solid #333':'2px solid transparent',outlineOffset:2
              }} />
            ))}
          </div>
        </div>
        <div className="modal-foot">
          {udalost && <button className="btn danger" onClick={() => { if(window.confirm('Smazat událost?')) onSave(null,true) }}>Smazat</button>}
          <button className="btn" onClick={onClose}>Zrušit</button>
          <button className="btn accent" onClick={() => { if(!form.nazev.trim()){alert('Zadej název');return} onSave(form) }}>Uložit</button>
        </div>
      </div>
    </div>
  )
}

// ─── HLAVNÍ APP ───────────────────────────────────────────────────────────────
class ErrorBoundary extends React.Component {
  constructor(props) { super(props); this.state = { error: null } }
  static getDerivedStateFromError(e) { return { error: e } }
  render() {
    if (this.state.error) return (
      <div style={{padding:40,fontFamily:'sans-serif',color:'#333'}}>
        <h2 style={{color:'#A32D2D'}}>⚠️ Chyba aplikace</h2>
        <pre style={{background:'#f5f5f3',padding:20,borderRadius:8,fontSize:12,overflow:'auto'}}>{this.state.error?.message}</pre>
        <button onClick={() => window.location.reload()} style={{marginTop:16,padding:'8px 20px',background:'#534AB7',color:'#fff',border:'none',borderRadius:8,cursor:'pointer'}}>Obnovit stránku</button>
      </div>
    )
    return this.props.children
  }
}

export default function App() {
  // AUTH STATE
  const [session, setSession] = useState(null)
  const [authMode, setAuthMode] = useState('login') // login | register | forgot | confirm
  const [authEmail, setAuthEmail] = useState('')
  const [authPw, setAuthPw] = useState('')
  const [authPw2, setAuthPw2] = useState('')
  const [authName, setAuthName] = useState('')
  const [authIndustry, setAuthIndustry] = useState('')
  const [authErr, setAuthErr] = useState('')
  const [authLoading, setAuthLoading] = useState(false)
  const [authMsg, setAuthMsg] = useState('')
  const [userProfile, setUserProfile] = useState(null)

  const [leads, setLeads] = useState([])
  const [loading, setLoading] = useState(false)
  const [tab, setTab] = useState('dashboard')

  const switchTab = (id) => {
    setTab(id)
    setDrawerOpen(false)
  }
  const [teamMembers, setTeamMembers] = useState([])
  const [showTeamModal, setShowTeamModal] = useState(false)
  const [newMemberName, setNewMemberName] = useState('')

  // Load team members from Supabase profiles.team_members
  const loadTeamMembers = async (profile) => {
    if (!profile) return
    const myName = profile.full_name || profile.email || 'Já'
    const saved = profile.team_members ? profile.team_members.split(',').map(s => s.trim()).filter(Boolean) : []
    const all = [myName, ...saved.filter(n => n !== myName)]
    setTeamMembers(all)
  }
  const [drawerOpen, setDrawerOpen] = useState(false)
  const DEFAULT_NAV = ['dashboard','kanban','table','followup','ukoly','kalendar','multiplikatori','discovery','email','dokumenty','strategie','produkty','pruvodce']
  const [navOrder, setNavOrder] = useState(() => {
    try {
      const saved = localStorage.getItem('riscare_nav_order')
      if (saved) {
        const parsed = JSON.parse(saved)
        const allIds = ['dashboard','kanban','table','followup','ukoly','kalendar','multiplikatori','discovery','email','dokumenty','strategie','produkty','pruvodce']
        const valid = parsed.filter(id => allIds.includes(id))
        const missing = allIds.filter(id => !valid.includes(id))
        return [...valid, ...missing]
      }
    } catch(e) {}
    return ['dashboard','kanban','table','followup','ukoly','kalendar','multiplikatori','discovery','email','dokumenty','strategie','produkty','pruvodce']
  })
  const [dragNavId, setDragNavId] = useState(null)
  const [dragNavOver, setDragNavOver] = useState(null)
  const [modal, setModal] = useState(null) // null | 'new' | lead object
  const [detail, setDetail] = useState(null) // lead object pro detail s komentáři
  const [search, setSearch] = useState('')
  const [filtrSeg, setFiltrSeg] = useState('')
  const [filtrProd, setFiltrProd] = useState('')
  const [filtrVede, setFiltrVede] = useState('')

  // AUTH FUNCTIONS
  const doLogin = async () => {
    setAuthErr(''); setAuthLoading(true)
    const { error } = await supabase.auth.signInWithPassword({ email: authEmail, password: authPw })
    if (error) setAuthErr(error.message === 'Invalid login credentials' ? 'Nesprávný email nebo heslo' : error.message)
    setAuthLoading(false)
  }

  const doRegister = async () => {
    setAuthErr('')
    if (!authName.trim()) return setAuthErr('Zadejte vaše jméno')
    if (authPw.length < 8) return setAuthErr('Heslo musí mít alespoň 8 znaků')
    if (authPw !== authPw2) return setAuthErr('Hesla se neshodují')
    setAuthLoading(true)
    const { error } = await supabase.auth.signUp({
      email: authEmail,
      password: authPw,
      options: { data: { full_name: authName, industry: authIndustry } }
    })
    if (error) setAuthErr(error.message)
    else { setAuthMode('confirm') }
    setAuthLoading(false)
  }

  const doForgot = async () => {
    setAuthErr(''); setAuthLoading(true)
    const { error } = await supabase.auth.resetPasswordForEmail(authEmail, {
      redirectTo: window.location.origin
    })
    if (error) setAuthErr(error.message)
    else setAuthMsg('Email s odkazem pro reset hesla byl odeslán na ' + authEmail)
    setAuthLoading(false)
  }

  const doLogout = async () => {
    await supabase.auth.signOut()
    setSession(null)
    setUserProfile(null)
  }



  // Listen na auth state changes
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setSession(session))
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
    })
    return () => subscription.unsubscribe()
  }, [])

  // Načíst/vytvořit profil uživatele
  useEffect(() => {
    if (!session) return
    const loadProfile = async () => {
      const { data } = await supabase.from('profiles').select('*').eq('id', session.user.id).single()
      if (data) {
        setUserProfile(data)
        loadTeamMembers(data)
        // Zkontrolovat paywall
      } else {
        const trialEnd = new Date()
        trialEnd.setDate(trialEnd.getDate() + 7)
        const meta = session.user.user_metadata || {}
        const { data: newProfile } = await supabase.from('profiles').insert([{
          id: session.user.id,
          email: session.user.email,
          full_name: meta.full_name || '',
          industry: meta.industry || 'general',
          trial_ends_at: trialEnd.toISOString(),
          subscription_status: 'trial'
        }]).select().single()
        if (newProfile) { setUserProfile(newProfile); loadTeamMembers(newProfile) }
      }
    }
    loadProfile()
  }, [session])

  const fetchLeads = useCallback(async () => {
    if (!session) return
    setLoading(true)
    const { data } = await supabase.from('leads').select('*').eq('user_id', session.user.id).order('created_at', { ascending: false })
    setLeads(data || [])
    setLoading(false)
  }, [session])

  const onLeadChange = useCallback(() => { fetchLeads() }, [fetchLeads])

  useEffect(() => {
    if (session) {
      fetchLeads()
      requestPushPermission()
    }
  }, [session, fetchLeads])

  // Push notifikace pro follow-up dnes
  useEffect(() => {
    if (!session || !leads.length) return
    const today = new Date().toISOString().slice(0,10)
    const fuDnes = leads.filter(l => l.followup === today && !l.stav?.includes('Uzavřeno'))
    if (fuDnes.length > 0 && !sessionStorage.getItem('push_fu_' + today)) {
      sessionStorage.setItem('push_fu_' + today, '1')
      sendPushNotification(
        '📅 Follow-up dnes — ' + fuDnes.length + ' lead' + (fuDnes.length > 1 ? 'ů' : ''),
        fuDnes.slice(0,3).map(l => l.firma).join(', ') + (fuDnes.length > 3 ? ' a další...' : ''),
      )
    }
  }, [leads, session])

  // Kontrola mrtvých leadů - při každém načtení
  useEffect(() => {
    if (!session || !leads.length) return
    const today = new Date().toISOString().slice(0,10)
    const mrtve = leads.filter(l => {
      if (l.stav?.includes('Uzavřeno')) return false
      if (!l.followup) return false
      const diff = (new Date(today) - new Date(l.followup)) / 86400000
      return diff >= 14
    })
    if (mrtve.length > 0 && !sessionStorage.getItem('mrtve_notified_' + today)) {
      sessionStorage.setItem('mrtve_notified_' + today, '1')
      sendSlack('⚠️ *Stagnující leady — ' + today + '*\n' +
        mrtve.map(l => '• *' + l.firma + '* — ' + Math.round((new Date(today)-new Date(l.followup))/86400000) + ' dní bez aktivity').join('\n') +
        '\n\n👉 https://crm-two-lemon.vercel.app')
    }
  }, [leads, session])

  // Týdenní Slack report každý pátek
  useEffect(() => {
    if (!session || !leads.length) return
    const day = new Date().getDay()
    const today = new Date().toISOString().slice(0,10)
    if (day === 5 && !sessionStorage.getItem('weekly_report_' + today)) {
      sessionStorage.setItem('weekly_report_' + today, '1')
      const won = leads.filter(l => l.stav === 'Uzavřeno — vyhráno')
      const active = leads.filter(l => !l.stav?.includes('Uzavřeno'))
      const rev = won.reduce((s,l) => s+(Number(l.cena)||0), 0)
      sendSlack('📊 *Týdenní CEO report — ' + today + '*\n\n' +
        '*Aktivní leady:* ' + active.length + '\n' +
        '*Uzavřeno celkem:* ' + won.length + '\n' +
        '*Revenue celkem:* ' + rev.toLocaleString('cs') + ' Kč\n' +
        '\n👉 https://crm-two-lemon.vercel.app')
    }
  }, [leads, session])

  const saveLead = async (form) => {
    try {
      const cleanForm = { ...form, user_id: session?.user?.id }
      delete cleanForm.id
      delete cleanForm.created_at
      if (modal && modal.id) {
        const { error } = await supabase.from('leads').update(cleanForm).eq('id', modal.id)
        if (error) { alert('Chyba update: ' + error.message); console.error(error); return }
        if (modal.stav !== cleanForm.stav) {
          await slackZmenaStavu(cleanForm.firma, modal.stav, cleanForm.stav, cleanForm.vede)
        }
      } else {
        const { error } = await supabase.from('leads').insert([cleanForm])
        if (error) { alert('Chyba insert: ' + error.message); console.error(error); return }
        await slackNovyLead(cleanForm)
        sendPushNotification('🆕 Nový lead přidán', cleanForm.firma + ' — ' + (cleanForm.produkt||''))
      }
      setModal(null)
      setDetail(null)
      fetchLeads()
    } catch(e) {
      alert('Neočekávaná chyba: ' + e.message)
      console.error(e)
    }
  }

  const deleteLead = async (id) => {
    await supabase.from('leads').delete().eq('id', id)
    setModal(null)
    fetchLeads()
  }

  const changeStav = async (lead, newStav) => {
    const { error } = await supabase.from('leads').update({ stav: newStav }).eq('id', lead.id)
    if (!error) {
      await slackZmenaStavu(lead.firma, lead.stav, newStav, lead.vede)
      fetchLeads()
    }
  }

  const filtered = leads.filter(l => {
    if (search && !l.firma?.toLowerCase().includes(search.toLowerCase()) && !l.osoba?.toLowerCase().includes(search.toLowerCase())) return false
    if (filtrSeg && l.segment !== filtrSeg) return false
    if (filtrProd && l.produkt !== filtrProd) return false
    if (filtrVede && l.vede !== filtrVede) return false
    return true
  })

  const t = today()
  const active = leads.filter(l => !l.stav?.includes('Uzavřeno'))
  const won = leads.filter(l => l.stav === 'Uzavřeno — vyhráno')
  const rev = won.reduce((s,l) => s + (Number(l.cena)||0), 0)
  const fuCount = active.filter(l => l.followup && l.followup <= t).length

  const NAV = [
    { id:'dashboard', icon:'📊', label:'Dashboard' },
    { id:'kanban', icon:'⬛', label: (userProfile?.industry || 'general') === 'real-estate' ? 'Pipeline' : 'Kanban' },
    { id:'table', icon:'☰', label: (userProfile?.industry||'general')==='cybersecurity' ? 'Tabulka' : 'Přehled klientů' },
    { id:'followup', icon:'📅', label: (userProfile?.industry || 'general') === 'real-estate' ? 'Dnešní akce' : 'Follow-up dnes' },
    { id:'ukoly', icon:'✅', label:'Úkoly' },
    { id:'kalendar', icon:'📅', label: 'Kalendář' },
    { id:'multiplikatori', icon:'🤝', label: (userProfile?.industry || 'general') === 'real-estate' ? 'Partneři / referrali' : 'Multiplikátoři' },
    { id:'discovery', icon:'📞', label: (userProfile?.industry || 'general') === 'real-estate' ? 'Script schůzky' : 'Discovery script' },
    { id:'email', icon:'✉️', label:'Email šablony' },
    { id:'dokumenty', icon:'📄', label:'Dokumenty' },
    { id:'strategie', icon:'🎯', label:'Strategický plán' },
    { id:'produkty', icon:'📦', label: (userProfile?.industry || 'general') === 'real-estate' ? 'Nabídky / produkty' : 'Produkty' },
    { id:'pruvodce', icon:'🗺️', label:'Průvodce strategií' },
  ]

  // AUTH SCREENS
  if (!session) return (
    <div className="login-wrap">
      <div className="login-card">
        <div className="auth-logo-block">
          <div className="auth-brand-name">MIKOMI <span>OS</span></div>
          <div className="auth-brand-sub">Systém, který proměňuje potenciál v revenue.</div>
        </div>

        {authMode === 'confirm' && (
          <div style={{textAlign:'center',padding:'16px 0'}}>
            <div style={{fontSize:44,marginBottom:12}}>📧</div>
            <div style={{fontWeight:700,fontSize:17,marginBottom:8}}>Zkontrolujte svůj email</div>
            <div style={{fontSize:13,color:'#888',lineHeight:1.7}}>
              Poslali jsme potvrzovací odkaz na<br/>
              <strong style={{color:'#333'}}>{authEmail}</strong><br/><br/>
              Klikněte na odkaz v emailu pro aktivaci účtu.<br/>
              Poté se přihlaste níže.
            </div>
            <button className="auth-link" style={{marginTop:20}} onClick={() => setAuthMode('login')}>
              Přejít na přihlášení →
            </button>
          </div>
        )}

        {authMode === 'forgot' && (
          <>
            <div style={{fontSize:13,color:'#888',textAlign:'center',marginBottom:16}}>
              Zadejte email a pošleme vám odkaz pro reset hesla.
            </div>
            <input className="auth-inp" type="email" placeholder="Váš email" value={authEmail}
              onChange={e => setAuthEmail(e.target.value)} autoFocus
              onKeyDown={e => e.key==='Enter' && doForgot()} />
            {authMsg && <div className="auth-success">{authMsg}</div>}
            {authErr && <div className="login-error">{authErr}</div>}
            <button className="btn-primary" onClick={doForgot} disabled={authLoading}>
              {authLoading ? 'Odesílám...' : 'Odeslat odkaz pro reset'}
            </button>
            <button className="auth-link" onClick={() => { setAuthMode('login'); setAuthErr(''); setAuthMsg('') }}>
              ← Zpět na přihlášení
            </button>
          </>
        )}

        {authMode === 'login' && (
          <>
            <input className="auth-inp" type="email" placeholder="Email" value={authEmail}
              onChange={e => setAuthEmail(e.target.value)} autoFocus />
            <input className="auth-inp" type="password" placeholder="Heslo" value={authPw}
              onChange={e => setAuthPw(e.target.value)}
              onKeyDown={e => e.key==='Enter' && doLogin()} />
            {authErr && <div className="login-error">{authErr}</div>}
            <button className="btn-primary" onClick={doLogin} disabled={authLoading}>
              {authLoading ? 'Přihlašuji...' : 'Přihlásit se →'}
            </button>
            <button className="auth-link" onClick={() => { setAuthMode('forgot'); setAuthErr(''); setAuthMsg('') }}>
              Zapomněli jste heslo?
            </button>
            <div className="auth-divider">— nebo —</div>
            <button className="btn-secondary-outline" onClick={() => { setAuthMode('register'); setAuthErr('') }}>
              Vytvořit účet zdarma · 7 dní trial
            </button>
          </>
        )}

        {authMode === 'register' && (
          <>
            <div style={{background:'#f0fdf4',border:'1px solid #bbf7d0',borderRadius:8,padding:'10px 14px',fontSize:13,color:'#166534',marginBottom:4}}>
              ✅ 7 dní zdarma · poté 497 Kč/měsíc · zrušit kdykoli
            </div>
            <input className="auth-inp" type="text" placeholder="Vaše jméno" value={authName}
              onChange={e => setAuthName(e.target.value)} autoFocus />
            <input className="auth-inp" type="email" placeholder="Email" value={authEmail}
              onChange={e => setAuthEmail(e.target.value)} />
            <input className="auth-inp" type="password" placeholder="Heslo (min. 8 znaků)" value={authPw}
              onChange={e => setAuthPw(e.target.value)} />
            <input className="auth-inp" type="password" placeholder="Potvrďte heslo" value={authPw2}
              onChange={e => setAuthPw2(e.target.value)}
              onKeyDown={e => e.key==='Enter' && doRegister()} />
            <div style={{marginBottom:4}}>
              <div style={{fontSize:12,color:'#888',marginBottom:8,fontWeight:500}}>Vyberte vaše odvětví *</div>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:8}}>
                {[
                  {val:'cybersecurity', icon:'🛡️', label:'Kyberbezpečnost'},
                  {val:'real-estate', icon:'🏠', label:'Reality'},
                  {val:'general', icon:'🏢', label:'Jiné'},
                ].map(o => (
                  <button key={o.val} type="button"
                    onClick={() => setAuthIndustry(o.val)}
                    style={{
                      padding:'14px 8px', border: authIndustry===o.val ? '2px solid #534AB7' : '1.5px solid #e5e5e5',
                      borderRadius:10, background: authIndustry===o.val ? '#f0eeff' : '#fafafa',
                      cursor:'pointer', textAlign:'center', transition:'all .15s',
                      color: authIndustry===o.val ? '#534AB7' : '#555',
                    }}>
                    <div style={{fontSize:24,marginBottom:4}}>{o.icon}</div>
                    <div style={{fontSize:12,fontWeight:600,whiteSpace:'pre-line',lineHeight:1.3}}>{o.label}</div>
                  </button>
                ))}
              </div>
            </div>
            {authErr && <div className="login-error">{authErr}</div>}
            <button className="btn-primary" onClick={doRegister} disabled={authLoading}>
              {authLoading ? 'Vytvářím účet...' : 'Začít 7 dní zdarma →'}
            </button>
            <div style={{fontSize:11,color:'#aaa',textAlign:'center',lineHeight:1.6}}>
              Po registraci obdržíte potvrzovací email.<br/>
              Kreditní karta není potřeba pro trial.
            </div>
            <button className="auth-link" onClick={() => { setAuthMode('login'); setAuthErr('') }}>
              Již máte účet? Přihlásit se
            </button>
          </>
        )}
      </div>
    </div>
  )

  // PAYWALL SCREEN

  return (
    <div className="app-layout">

      {/* Mobile top bar */}
      <div className="mobile-topbar">
        <div style={{display:'flex',alignItems:'center',gap:0}}>
          <span className="mob-logo">MIKOMI OS</span>
          <span className="mob-tab"> · {{kanban:'Pipeline',table:'Tabulka',followup:'Follow-up',ukoly:'Úkoly',kalendar:'Kalendář',multiplikatori:'Multiplikátoři',discovery:'Discovery',email:'Emaily',dokumenty:'Dokumenty',strategie:'Strategie',produkty:'Produkty',pruvodce:'Průvodce'}[tab]||tab}</span>
        </div>
        <button className="hamburger-btn" onClick={() => setDrawerOpen(true)} aria-label="Menu">
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
                <div className="logo" style={{color:'#534AB7',fontWeight:600,fontSize:15}}>MIKOMI OS</div>
                <div style={{fontSize:11,color:'#999',marginTop:2}}>Systém, který proměňuje potenciál v revenue.</div>
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
              <div style={{fontWeight:600}}>{userProfile?.full_name || session?.user?.email || "Uživatel"}</div>
              {userProfile?.subscription_status === 'trial' && (
                <div style={{fontSize:11,color:'#f59e0b',marginTop:2}}>⏳ Trial: {trialDaysLeft(userProfile)} dní zbývá</div>
              )}
              {userProfile?.subscription_status === 'active' && (
                <div style={{fontSize:11,color:'#10b981',marginTop:2}}>✓ Aktivní předplatné</div>
              )}
              <button className="logout-btn" onClick={() => { doLogout(); setDrawerOpen(false) }}>Odhlásit se</button>
            </div>
          </div>
        </div>
      )}

      <div className="sidebar">
        <div className="sidebar-logo">
          <div className="logo">MIKOMI OS</div>
          <div className="sub">Systém, který proměňuje potenciál v revenue.</div>
        </div>
        {navOrder.map((nid, idx) => {
          const n = NAV.find(x => x.id === nid)
          if (!n) return null
          return (
            <div
              key={n.id}
              draggable
              onDragStart={e => { e.dataTransfer.effectAllowed='move'; setDragNavId(n.id) }}
              onDragOver={e => { e.preventDefault(); setDragNavOver(n.id) }}
              onDrop={e => {
                e.preventDefault()
                if (dragNavId && dragNavId !== n.id) {
                  const newOrder = [...navOrder]
                  const fromIdx = newOrder.indexOf(dragNavId)
                  const toIdx = newOrder.indexOf(n.id)
                  newOrder.splice(fromIdx, 1)
                  newOrder.splice(toIdx, 0, dragNavId)
                  setNavOrder(newOrder)
                  try { localStorage.setItem('riscare_nav_order', JSON.stringify(newOrder)) } catch(e) {}
                }
                setDragNavId(null); setDragNavOver(null)
              }}
              onDragEnd={() => { setDragNavId(null); setDragNavOver(null) }}
              className={`nav-item ${tab===n.id?'active':''}`}
              onClick={() => switchTab(n.id)}
              style={{
                cursor:'grab',
                background: dragNavOver===n.id && dragNavId!==n.id ? '#f0eeff' : undefined,
                borderLeft: dragNavOver===n.id && dragNavId!==n.id ? '3px solid #534AB7' : undefined,
                opacity: dragNavId===n.id ? 0.5 : 1,
              }}
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
          <div>{userProfile?.full_name || session?.user?.email || "Uživatel"}</div>
          <button className="logout-btn" style={{marginBottom:4}} onClick={() => setShowTeamModal(true)}>👥 Správa týmu</button>
          <button className="logout-btn" style={{marginBottom:4}} onClick={async () => {
            const ok = await requestPushPermission()
            alert(ok ? '✓ Push notifikace povoleny!' : 'Notifikace nejsou povoleny — povol je v nastavení prohlížeče.')
          }}>🔔 Notifikace</button>
          <button className="logout-btn" onClick={() => doLogout()}>Odhlásit se</button>
        </div>

        {showTeamModal && (
          <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowTeamModal(false)}>
            <div className="modal" style={{maxWidth:400}}>
              <div className="modal-head">
                <h2>👥 Správa týmu</h2>
                <button className="close-btn" onClick={() => setShowTeamModal(false)}>×</button>
              </div>
              <div className="modal-body">
                <div style={{fontSize:13,color:'#888',marginBottom:12}}>
                  Tato jména se zobrazí v poli "Kdo vede obchod". Vaše jméno je vždy první.
                </div>
                <div style={{marginBottom:16}}>
                  {teamMembers.map((m, i) => (
                    <div key={m} style={{display:'flex',alignItems:'center',gap:8,marginBottom:6,padding:'8px 12px',background:'#f8f8f6',borderRadius:8,border:'0.5px solid #e0e0e0'}}>
                      <span style={{flex:1,fontSize:13,fontWeight: i===0 ? 500 : 400}}>{m}{i===0 ? ' (vy)' : ''}</span>
                      {i > 0 && (
                        <button onClick={async () => {
                          const newMembers = teamMembers.filter((_,idx) => idx !== i)
                          setTeamMembers(newMembers)
                          const myName = teamMembers[0]
                          const others = newMembers.slice(1).join(',')
                          await supabase.from('profiles').update({ team_members: others }).eq('id', session.user.id)
                        }} style={{background:'none',border:'none',color:'#ccc',cursor:'pointer',fontSize:16,padding:'0 4px'}}>×</button>
                      )}
                    </div>
                  ))}
                </div>
                <div style={{display:'flex',gap:8}}>
                  <input
                    value={newMemberName}
                    onChange={e => setNewMemberName(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && newMemberName.trim() && (async () => {
                      const name = newMemberName.trim()
                      if (teamMembers.includes(name)) return
                      const newMembers = [...teamMembers, name]
                      setTeamMembers(newMembers)
                      setNewMemberName('')
                      const others = newMembers.slice(1).join(',')
                      await supabase.from('profiles').update({ team_members: others }).eq('id', session.user.id)
                    })()}
                    placeholder="Jméno nového člena..."
                    style={{flex:1,padding:'8px 12px',borderRadius:8,border:'0.5px solid #ddd',fontSize:13,fontFamily:'inherit'}}
                  />
                  <button className="btn accent" onClick={async () => {
                    const name = newMemberName.trim()
                    if (!name || teamMembers.includes(name)) return
                    const newMembers = [...teamMembers, name]
                    setTeamMembers(newMembers)
                    setNewMemberName('')
                    const others = newMembers.slice(1).join(',')
                    await supabase.from('profiles').update({ team_members: others }).eq('id', session.user.id)
                  }}>Přidat</button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="main">
        <div className="page-header">
          <h1>{{dashboard:'Dashboard',kanban:'Pipeline',table:'Všechny leady',followup:'Follow-up dnes',ukoly:'Úkoly',kalendar:'Kalendář',multiplikatori:'Multiplikátoři',discovery:'Discovery call script',email:'Email šablony',dokumenty:'Dokumenty',strategie:'Strategický plán prodeje',produkty:'Portfolio produktů',pruvodce:'Průvodce strategií'}[tab]}</h1>
          <p>{{dashboard:'Přehled všeho na jednom místě — přizpůsobitelný',kanban:'Vizuální přehled obchodů podle fáze',table:'Kompletní seznam s filtry',followup:'Leady které čekají na tvůj kontakt',ukoly:'Propojené úkoly — splnění automaticky aktualizuje lead',kalendar:'Osobní i sdílený týmový pohled na schůzky a cally',multiplikatori:'Partneři a zprostředkovatelé',discovery:'Průvodce pro 30minutový prodejní hovor',email:'Šablony připravené k odeslání',dokumenty:'Factsheets, nabídky a další PDF',strategie:'Strategický brainstorming — odpovědi se ukládají automaticky',produkty:'Přehled produktů a služeb s popisky a cenami',pruvodce:'Krok za krokem — co dělat a kdy. Sdílené pro celý tým.'}[tab]}</p>
        </div>

        {['kanban','table','followup','multiplikatori'].includes(tab) && (
          <>
            <GlobalSearch leads={leads} onOpen={setDetail} />
            <div className="metrics">
              <div className="metric-card"><div className="label">Aktivní leady</div><div className="val">{active.length}</div><div className="sub">v pipeline</div></div>
              <div className="metric-card"><div className="label">Uzavřeno</div><div className="val">{won.length}</div><div className="sub">vyhráno</div></div>
              <div className="metric-card"><div className="label">Revenue</div><div className="val">{rev.toLocaleString('cs')}</div><div className="sub">Kč</div></div>
              <div className={`metric-card ${fuCount>0?'alert':''}`}><div className="label">Follow-up dnes</div><div className="val">{fuCount}</div><div className="sub">čeká</div></div>
            </div>
            <div className="toolbar">
              <input placeholder="Hledat..." value={search} onChange={e=>setSearch(e.target.value)} style={{width:160}} />
              <select value={filtrSeg} onChange={e=>setFiltrSeg(e.target.value)}>
                <option value="">Všechny segmenty</option>
                {getIndustryCfg(userProfile?.industry||'general').segmenty.map(o=><option key={o}>{o}</option>)}
              </select>
              <select value={filtrProd} onChange={e=>setFiltrProd(e.target.value)}>
                <option value="">Všechny produkty</option>
                {getIndustryCfg(userProfile?.industry||'general').produkty.map(o=><option key={o}>{o}</option>)}
              </select>
              <select value={filtrVede} onChange={e=>setFiltrVede(e.target.value)}>
                <option value="">Všichni</option>
                {teamMembers.map(o=><option key={o}>{o}</option>)}
              </select>
              <button className="btn accent" onClick={() => setModal('new')}>{(userProfile?.industry||'general')==='real-estate' ? '+ Nový klient' : (userProfile?.industry||'general')==='cybersecurity' ? '+ Nový lead' : '+ Nový projekt'}</button>
        <button className="btn" onClick={() => {
          const cols = ['Firma','Osoba','Role','Segment','Email','Produkt','Stav','Cena','Vede','Follow-up']
          const rows = filtered.map(l => [l.firma,l.osoba,l.role,l.segment,l.email,l.produkt,l.stav,l.cena,l.vede,l.followup])
          const escape = v => '"' + String(v||'').replace(/"/g,'""') + '"'
          const sep = String.fromCharCode(13,10)
          const csv = [cols,...rows].map(r=>r.map(escape).join(',')).join(sep)
          const bom = String.fromCharCode(0xFEFF)
          const blob = new Blob([bom+csv], {type:'text/csv;charset=utf-8'})
          const url = URL.createObjectURL(blob)
          const a = document.createElement('a')
          a.href = url; a.download = 'mikomi-leady-'+new Date().toISOString().slice(0,10)+'.csv'
          a.click(); URL.revokeObjectURL(url)
        }}>⬇ Export CSV</button>
            </div>
          </>
        )}

        {loading && <div className="loading">Načítám data...</div>}
        {!loading && tab==='kanban' && <KanbanView leads={filtered} onOpen={setDetail} onStavChange={changeStav} industry={userProfile?.industry || 'general'} />}
        {!loading && tab==='table' && <TableView leads={filtered} onOpen={setDetail} />}
        {!loading && tab==='followup' && <FollowupView leads={filtered} onOpen={setDetail} />}
        {!loading && tab==='multiplikatori' && <MultiplikatoriView leads={filtered} onOpen={setDetail} />}
        {tab==='discovery' && <DiscoveryScript industry={userProfile?.industry || 'general'} />}
        {tab==='email' && <EmailTemplates industry={userProfile?.industry || 'general'} />}
        {tab==='dokumenty' && <PdfDocuments />}
        {tab==='dashboard' && <Dashboard leads={leads} onOpen={setDetail} industry={userProfile?.industry || 'general'} />}
        {tab==='ukoly' && <UkolyView leads={leads} onLeadChange={onLeadChange} teamMembers={teamMembers} />}
        {tab==='kalendar' && <KalendarView leads={leads} teamMembers={teamMembers} userProfile={userProfile} session={session} />}
        {tab==='strategie' && <StrategickyPlan industry={userProfile?.industry || 'general'} />}
        {tab==='pruvodce' && <PruvodceStrategii industry={userProfile?.industry || 'general'} />}
        {tab==='produkty' && <ProduktyPrehled industry={userProfile?.industry || 'general'} session={session} />}
      </div>

      {detail && (
        <LeadDetail
          lead={detail}
          onEdit={(l) => { setDetail(null); setModal(l) }}
          onClose={() => setDetail(null)}
        />
      )}

      {modal && (
        <LeadModal
          lead={modal === 'new' ? null : modal}
          onSave={async (form) => { await saveLead(form); if(detail) setDetail({...detail,...form}) }}
          onDelete={deleteLead}
          onClose={() => setModal(null)}
          industry={userProfile?.industry || 'general'}
          teamMembers={teamMembers}
        />
      )}
    </div>
  )
}
