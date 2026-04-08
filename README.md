# riscare CRM — Návod nasazení

Celý proces trvá cca 20–30 minut. Nepotřebuješ žádné technické znalosti.

---

## KROK 1 — Supabase (databáze, zdarma)

1. Jdi na **supabase.com** → Sign up (účet zdarma)
2. Klikni **New project**
   - Organization: vytvoř novou nebo použij existující
   - Name: `riscare-crm`
   - Database password: vymysli si (ulož si ho)
   - Region: `Central EU (Frankfurt)`
3. Počkej ~2 minuty než se projekt vytvoří
4. Jdi do **SQL Editor** (levý panel)
5. Zkopíruj celý obsah souboru `supabase_setup.sql` a klikni **Run**
6. Jdi do **Settings → API**
7. Zkopíruj si tyto dvě hodnoty:
   - **Project URL** (vypadá jako `https://abcdefgh.supabase.co`)
   - **anon public key** (dlouhý řetězec začínající `eyJ...`)

---

## KROK 2 — GitHub (uložení kódu, zdarma)

1. Jdi na **github.com** → přihlaš se (nebo vytvoř účet)
2. Klikni **+** → **New repository**
   - Repository name: `riscare-crm`
   - Private: ✓ (zaškrtni)
   - Klikni **Create repository**
3. Na svém počítači:
   - Stáhni si složku `riscare-crm` z tohoto chatu
   - Otevři terminál (Mac: Terminal, Windows: Command Prompt)
   - Naviguj do složky: `cd cesta/k/riscare-crm`
   - Spusť:
     ```
     git init
     git add .
     git commit -m "Initial commit"
     git remote add origin https://github.com/TVUJ_GITHUB/riscare-crm.git
     git push -u origin main
     ```

---

## KROK 3 — Vercel (hosting, zdarma)

1. Jdi na **vercel.com** → Sign up (přihlaš se přes GitHub)
2. Klikni **Add New → Project**
3. Najdi a vyber repository `riscare-crm`
4. Klikni **Import**
5. V sekci **Environment Variables** přidej tyto tři:

   | Name | Value |
   |---|---|
   | `REACT_APP_SUPABASE_URL` | tvůj Project URL z Supabase |
   | `REACT_APP_SUPABASE_ANON_KEY` | tvůj anon key z Supabase |
   | `REACT_APP_PASSWORD` | heslo které chceš mít (např. `riscare2026`) |

6. Klikni **Deploy**
7. Počkej ~2 minuty
8. Dostaneš URL ve stylu `riscare-crm.vercel.app`

---

## HOTOVO

Appka běží na URL od Vercelu. Sdílíš ji s Radimem a Alešem — stačí URL + heslo.

Všichni tři vidí stejná data v reálném čase.

---

## Vlastní doména (volitelné)

Pokud chceš `crm.riscare.cz` nebo `crm.talkey.cz`:
1. V Vercelu jdi do projektu → **Settings → Domains**
2. Přidej svou doménu
3. Vercel ti řekne co nastavit u DNS poskytovatele

---

## Aktualizace appky

Kdykoliv chceš změnit co appka dělá:
1. Uprav soubory lokálně
2. `git add . && git commit -m "Popis změny" && git push`
3. Vercel automaticky nasadí novou verzi za ~1 minutu

---

## Cena

- Supabase: zdarma (až 50 000 řádků, 500 MB)
- Vercel: zdarma
- Celkem: 0 Kč / měsíc

Při růstu týmu nad 10 lidí nebo 50 000 leadů: Supabase Pro = $25/měsíc.
