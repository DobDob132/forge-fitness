# FORGE – Code- und Sicherheitsprüfung

Stand: 25. November 2026, Version 1.13.0.

Geprüft: alle eigenen JavaScript-Module der aktuellen GitHub-Fassung, HTML, Installation/Service Worker, Build, Veröffentlichung, SQL-Schema sowie beide tatsächlich bereitgestellten Edge Functions. Der Hauptordner enthielt noch einen älteren Stand; die aktuelle Fassung bildet die Grundlage der Reparaturen.

## Reparaturen

- Veraltete Cloud-Antworten werden nach Kontowechsel/Abmeldung verworfen. Fehlgeschlagenes Abmelden sperrt das Konto nicht mehr. Laufende Übungstimer werden beim Datenwechsel beendet.
- Gemeinsame Prüfung für importierte und heruntergeladene Kontodaten: Pläne, Logs, Sätze, Körperdaten, Einstellungen, XP, Aktivitätsvorlagen und gespeicherte Trainings. Beschädigtes JSON wird im Original gesichert; Start bleibt möglich.
- Sicherungen mit gleichem Zeitstempel bleiben getrennt. Fehlgeschlagenes lokales Speichern wird angezeigt.
- Doppelklick auf einen Satz kann ihn nicht doppelt erfassen. Rückgängig beendet den laufenden Pausentimer.
- Gespeicherte Trainings enthalten ihre ursprünglichen Übungen und reine Trainingszeit. Planänderungen und spätere Fortsetzung verfälschen den Ablauf nicht mehr. Aufwärmphase/Eingaben bleiben erhalten; Verwerfen kann die gespeicherte XP-Ausgangslage nach Neustart wiederherstellen.
- Übungsnamen wie __proto__, constructor und toString bringen Verlauf und Zusammenfassung nicht mehr zum Absturz. Wörterbücher werden ohne geerbte Einträge verwendet.
- Kalorienverteilung enthält keine negativen Einzelwerte und erhält die Summe. Zeitangaben lösen keine falschen 1RM-Rekorde aus; eine Wiederholung entspricht dem tatsächlichen Gewicht. Cardio-Ergebnisse erzeugen kein NaN beim Volumen.
- SQL-Planprüfung weist fehlende Felder und null-Satz-/Gewichtswerte ab, auch bei alten Freigabe-Endpunkten. Extreme Level-Werte können die Freundesrangliste nicht mehr blockieren.
- Kontolöschung prüft serverseitig die Bestätigung und widerruft Refresh-Sitzungen. Lokale Kontosicherungen werden entfernt. Bereits ausgestellte Access-Tokens laufen grundsätzlich erst mit ihrer JWT-Laufzeit aus; private Daten bleiben durch RLS, Fremdschlüssel und Benutzerprüfungen geschützt.
- GitHub Pages führt Tests/Build aus und veröffentlicht ausschließlich dist/. Die versionierten Browserbibliotheken ermöglichen den CI-Build ohne Paketinstallation.

## Verifikation

- Automatisierte Node-Tests einschließlich neuer Regressionsfälle für Sitzungswechsel, Imports, beschädigten Speicher, Doppelklick, Rückgängig, Fortsetzen, 1RM, Kalorien und Kontolöschung.
- Build, JavaScript-Syntaxprüfung und Kontrolle referenzierter App-Dateien.
- Echte Supabase-Tests in zurückgerollter Transaktion: eigenes Speichern, Versionszähler/-konflikt, fremde Eigentümer/Datensätze/Profile, Freundschaften und fremde Annahmeversuche, anonyme Zugriffe und extreme Level-Werte. Keine Testkonten bleiben zurück. Wiederholbar mit tests/database-audit.sql.
- Reale SQL-Prüfung akzeptiert gültige Pläne und weist fehlende/null-Felder ab; vorhandener öffentlicher Plan bleibt gültig.
- FORGE aus pausiertem Zustand wiederhergestellt; ACTIVE_HEALTHY bestätigt. Alle sechs öffentlichen Tabellen besitzen RLS. Health-Check ohne Hinweise. Acht Hinweise auf bisher ungenutzte Indizes wurden geprüft; Indizes bleiben erhalten.

## Grenzen

- Supabase-Schutz gegen geleakte Passwörter bleibt deaktiviert. Kein kostenpflichtiger Tarif wurde aktiviert. https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection
- SMTP-/E-Mail-Bestätigung unverändert; keine neue Prüfung echter Mailzustellung.
- Kein Login mit einem echten Benutzerpasswort. Auth-/Sitzungsabläufe automatisiert simuliert; Datenbankberechtigungen gegen echtes Backend geprüft.
- Lokale Browserprüfung durch nicht erreichbare Entwicklungsadresse blockiert. Keine physische Android-/iPhone-Installation getestet.
- npm-Sicherheitsabfrage durch DNS-/Netzwerkbeschränkung blockiert. Bestehende exakt gepinnte Bibliotheken und Lockdatei beibehalten; kein vollständiger aktueller Abhängigkeits-Audit behauptet.
- Eine Codeprüfung garantiert keine vollständige Fehler- oder Sicherheitslückenfreiheit.
