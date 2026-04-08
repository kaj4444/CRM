# -*- coding: utf-8 -*-
with open('src/App.js', 'r', encoding='utf-8') as f:
    content = f.read()

old_start = "const emailTemplates = ["
end_marker = "const EmailTemplates = () => {"
idx = content.find(old_start)
idx_end = content.find(end_marker)
old_section = content[idx:idx_end]

new_section = """const PRODUKTY = ['Review NIS2','Check DORA','Program NIS2','Program DORA','Lorenc NIS2','Lorenc DORA','Kyber.testy']
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

"""

if old_section in content:
    content = content.replace(old_section, new_section)
    with open('src/App.js', 'w', encoding='utf-8') as f:
        f.write(content)
    print("OK")
else:
    print("ERROR - old_section nenalezen")
