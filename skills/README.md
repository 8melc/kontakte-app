# InTouch Skills

Hier liegen Skills, die Claude in **dein Voice-Gelaber → SQL** verwandeln, das du in den Supabase-SQL-Editor einfügen kannst. **Keine API-Kosten** — du nutzt einfach dein normales Claude-Abo.

## Workflow

1. 📱 **iPhone**: Du redest in eine Notiz, ein Doc, oder direkt in die Claude-iOS-App rein (Diktat-Funktion, kostenlos).
2. 🤖 **Claude**: Sag oder schreib was passiert ist. Claude kennt deine DB-Struktur durch den Skill.
3. 📋 **SQL kopieren**: Claude gibt dir einen sauberen SQL-Block.
4. 💾 **Supabase**: SQL-Editor öffnen → einfügen → Run. Fertig.

Empfohlener Rhythmus: **alle 3 Tage** oder **einmal die Woche**, je nachdem wie viel passiert.

## Die zwei Wege, den Skill zu nutzen

### Option A — Claude.ai Project (empfohlen für iPhone)

1. Geh auf [claude.ai](https://claude.ai) → **Projects** → **+ Create project**
2. Name: `InTouch`
3. Custom instructions: kopier den **kompletten Inhalt** von `skills/intouch-sql/SKILL.md` rein
4. Speichern

Ab jetzt: jedes Mal wenn du in dem Project schreibst/redest, weiß Claude den Kontext und gibt dir SQL. Die Claude-iOS-App unterstützt Projects nativ — perfekt für unterwegs.

### Option B — Claude Code Skill (für Power-User am Desktop)

Falls du Claude Code lokal nutzt, leg den Skill als Markdown ab:

```bash
mkdir -p ~/.claude/skills/intouch-sql
cp skills/intouch-sql/SKILL.md ~/.claude/skills/intouch-sql/
```

Dann erkennt Claude Code beim Reden über Kontakte automatisch den Skill und aktiviert ihn.

## Was der Skill kann

Du sagst irgendwas wie:
- *"Heute Jonas getroffen, Kaffee, war gut"* → `UPDATE kontakte SET last_contact = CURRENT_DATE, note = note || '...'`
- *"Letzten Sonntag Papa angerufen"* → Datum-Berechnung + Update
- *"Hab Felix Weber kennengelernt, Geburtstag 8. Oktober"* → `INSERT INTO kontakte`
- *"Mamas Geburtstag ist jährlich am 22.3."* → `INSERT INTO anlaesse` mit `wiederkehrend = true`
- *"Muss noch Geschenk für Oma besorgen, 2 Wochen Vorlauf"* → Anlass + Aktion mit Vorlauf
- *"Hab das Geschenk gekauft"* → markiert die Aufgabe als erledigt

## Sicherheits-Garantien des Skills

- ✅ **Nie** automatisches `DELETE`/`DROP`/`TRUNCATE`/`ALTER`
- ✅ Alles in `BEGIN; … COMMIT;` Block — du kannst Run abbrechen und nichts ist passiert
- ✅ `note`-Feld wird **immer angehängt**, nie überschrieben
- ✅ Bei mehrdeutigen Namen (mehrere Annas) → Hinweis statt blindem Update
- ✅ Personen-Match über `ILIKE` — du musst keine IDs kennen

## Wo SQL einfügen?

1. Supabase Dashboard → dein Projekt
2. Linke Seitenleiste → **SQL Editor** (Icon mit ›_)
3. **+ New query**
4. SQL einfügen → **Run**
5. Sollte "Success. No rows returned" oder ähnlich anzeigen.

Wenn was schiefläuft: keine Sorge — durch den `BEGIN; ... COMMIT;`-Wrap kannst du jederzeit `ROLLBACK;` als letzten Befehl statt `COMMIT;` ausführen, dann passiert nichts.
