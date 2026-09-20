# FORGE Prüfbericht

Stand: 20. September 2026.

## Erfolgreiche Prüfungen

- 31 Vergleichspunkte gegen die ursprüngliche FORGE.html: Trainingsdaten, Pläne, Workout-Abschluss, XP, Einstellungen, Import/Export und Diagramm-Konfigurationen stimmen abzüglich der ausdrücklich entfernten Farbauswahl und der neuen Geräteeinstellungen im Gastmodus überein. 70 weiterhin benötigte ursprüngliche globale Funktionen vorhanden; nur `applyThemeColor` wurde mit der Farbauswahl entfernt. Chart.js zusätzlich tatsächlich ausgeführt.
- 4 lokale Speichertests: Gastdaten erhalten, Konten getrennt, Sicherung und Kontowechsel ohne fremde Gastdaten zu verändern.
- 22 Prüfungen mit echten temporären Supabase-Konten: Login, eigene Daten, fremde/ anonyme Zugriffe abgewiesen, Eigentümermanipulation abgewiesen, Profile nicht frei auflistbar, Freunde und Berechtigungen, keine Freigabe von Trainingsdaten, zweites Gerät, Versionskonflikt samt Auflösung, Offline-Speicherung und Synchronisierung, Kontowechsel, Offline-App/Diagramme, Manifest und Entfernen von Freunden.
- 10 zusätzliche Prüfungen: falscher Login, Registrierungs-/Reset-Oberfläche, manuelles Laden neuerer Cloud-Daten, Offline-Konto, HTML-Einschleusung über importierte Pläne verhindert, kontobezogener Cloud-Reset, mobile/Desktop-Layouts, Recovery-Rücksprung mit echter Passwortänderung, keine JavaScript-Laufzeitfehler.
- Aktualisierungsprüfung: Registrierung wechselt zum sechsstelligen Bestätigungscode, erneutes Senden funktioniert, falsche/abgelaufene Codes werden verständlich erklärt, die drei neuen Trainingseinstellungen werden gespeichert, mobile Darstellung bleibt ohne Laufzeitfehler.
- 11 Datenbankprüfungen für die neuen Freunde-Funktionen: Planfreigabe mit Notiz, einmalige Übernahme, Challenge-Einladung, Annahme, Fortschrittsbegrenzung und Entfernen. Ein drittes Konto konnte weder fremde Freigaben noch Challenges lesen oder verändern.
- 8 Oberflächenprüfungen für die neuen Trainingsfunktionen: Wochenziel, kg/lb-Umrechnung, Progressionsvorschlag, Übungsnotizen, Speichern und Fortsetzen eines Trainings sowie feste mobile Navigation. Keine JavaScript-Laufzeitfehler.

Mail-Endpunkte für Registrierung, Codeprüfung, erneutes Senden und Reset-Anforderung wurden in Oberflächentests simuliert. Login, Datenbank, Freundschaften und Passwortänderung verwendeten echte Backend-Zugriffe. Vorübergehende Testkonten sind nicht Bestandteil der ausgelieferten App.

## Grenzen

- Echte Mailzustellung noch nicht eingerichtet/geprüft. EINRICHTUNG.md beschreibt SMTP, die Code-Mailvorlage sowie noch einzutragende Site URL und Redirect-Freigabe.
- Mobile Ansicht bei 390 Pixeln, Desktop bei 1200 Pixeln mit Chromium/Edge geprüft. Keine Installation auf physischen iPhones/Android-Geräten behauptet; auf euren Geräten abschließend erproben.
- Supabase-Sicherheitscheck: keine offenen Tabellen/RLS-Probleme. Hinweis auf deaktivierten Schutz gegen bereits geleakte Passwörter; kein kostenpflichtiges Upgrade vorgenommen.
- Bestehende Community-Demodaten bleiben Demo.

## Änderungen

Konto-Oberfläche, kontogetrennte Speicherung, Synchronisierung mit Versionsprüfung, Freunde, Installation und Offline-Bibliotheken ergänzt. Die Registrierung bestätigt neue Konten mit einem Code direkt in der App. Planfreigaben und private Wochen-Challenges ergänzen die Freunde-Funktion. Unterbrochene Trainings, Wochenziele, Progressionsvorschläge, Übungsnotizen, kg/lb und eine mobile Navigation wurden ergänzt. Die freie Theme-Farbe wurde entfernt; Display-Sperre, Vibration und optionaler Pausenton sind einstellbar. Die dunkel-orange Gestaltung erhielt dezente Tiefen-, Fokus- und Berührungseffekte. Importierter/Cloud-Text wird sicher vor HTML-Darstellung maskiert. Trainingsberechnungen und XP-Regeln wurden beibehalten. Die ursprüngliche einzelne HTML-Datei wurde nicht überschrieben.
