# FORGE – installierbare Fitness-App

App-Adresse: https://dobdob132.github.io/forge-fitness/

Die bisherige Trainings-App wurde um Supabase-Konten, private Cloud-Speicherung, Freunde und Installation auf Android/iPhone ergänzt. Die ursprüngliche FORGE.html bleibt unverändert.

## Installation

- Android: Link in Chrome öffnen und „App installieren“ oder „Zum Startbildschirm hinzufügen“ wählen.
- iPhone: Link in Safari öffnen, Teilen → „Zum Home-Bildschirm“.
- In eingebetteten Browsern (zum Beispiel ChatGPT oder Messenger) zuerst „Link kopieren“ wählen und die Adresse direkt in Chrome, Edge oder Safari öffnen. FORGE wird als Web-App installiert; es gibt keine separate APK-Datei.
- Falls nach einer Aktualisierung noch eine alte Oberfläche erscheint, die Seite im Browser neu laden beziehungsweise die installierte App schließen und erneut öffnen. Trainingsdaten bleiben dabei gespeichert.
- Ohne Konto fortfahren: Daten bleiben lokal im Browser.
- Mit Konto: Anmeldung über das Profilsymbol; Trainingsdaten werden privat synchronisiert.

Neue Konten können vorerst ohne E-Mail-Bestätigung sofort verwendet werden. Passwort-Zurücksetzen ist deshalb ebenfalls vorerst ausgeblendet. Die spätere Einrichtung eines eigenen Mailanbieters ist in EINRICHTUNG.md vorbereitet.

## Bisherige Daten

In der alten App unter Einstellungen als JSON exportieren. Neue App öffnen, gewünschtes Konto anmelden und dort importieren. Browserdaten sind an die jeweilige Adresse gebunden; die neue Website kann die Daten der alten lokalen HTML-Datei nicht automatisch lesen. Import fragt vor dem Ersetzen und legt eine lokale Sicherung an. Gastdaten werden niemals automatisch hochgeladen.

## Synchronisierung

Änderungen werden lokal gespeichert und bei Verbindung mit Supabase synchronisiert. Bereits geladene Konten funktionieren offline; die erste Anmeldung benötigt Internet. Im Profil zeigt der Status ausstehende Änderungen. „Jetzt synchronisieren“ lädt auch Änderungen anderer Geräte. Bei gleichzeitigen Änderungen fragt FORGE, welche Version übernommen wird, und sichert beide Fassungen lokal. Vor Gerätewechsel synchronisieren. Während eines laufenden Trainings werden neuere Cloud-Daten nicht automatisch eingeblendet.

Browserdaten löschen entfernt Gastdaten und lokale Sicherungen. Abgemeldete Konten behalten getrennte lokale Zwischenspeicher; auf gemeinsam genutzten Geräten anschließend Browserdaten löschen. Der Einstellungs-Reset betrifft Trainingsdaten, nicht das Benutzerkonto.

## Freunde

Im eigenen Freunde-Reiter den privaten Freundescode teilen oder erhaltenen Code eingeben. Anfragen können angenommen/abgelehnt und Kontakte entfernt werden. Freunde sehen nur Anzeigenamen und Beziehungsstatus, keine E-Mail-, Körper- oder Trainingsdaten. Veröffentlichte Pläne unter „Entdecken“ lassen sich ansehen, als eigene Kopie übernehmen und direkt als aktiver Trainingsplan verwenden.

Eigene Trainingspläne lassen sich an angenommene Freunde senden. Der Empfänger übernimmt sie als unabhängige Kopie und kann sie ändern, ohne den Plan des Absenders zu verändern. Challenges laufen 7, 14 oder 30 Tage und können Trainings, Sätze, Minuten, Kalorien oder bewegtes Gewicht zählen. Einladungen, laufende Challenges und Verlauf sind getrennt. Sichtbar sind nur der aggregierte Challenge-Fortschritt und Anzeigenamen; Trainingsdetails bleiben privat.

Der Wochenrückblick im Challenge-Reiter zählt laufende und in dieser Woche beendete Challenges sowie Siege und Unentschieden. Er verwendet ausschließlich die ohnehin für angenommene Challenges sichtbaren Ergebnisse.

## Training und Darstellung

- Freie Aktivitäten können als Vorlagen gespeichert und direkt von der Startseite aus wieder geöffnet werden. Die Vorlage enthält Art, Dauer, Distanz, Belastung und Notiz.
- Eine Belastungsskala von 1 bis 10 verfeinert nach dem Training die Kalorien-Schätzung. Diese bleibt ein Schätzwert, keine Messung.
- Die Statistik zeigt persönliche Rekorde für Maximalgewicht je Übung, längste Distanz je Aktivität und beste Laufpace.

- Angefangene Trainings können gespeichert und auf der Startseite exakt beim letzten Satz fortgesetzt oder verworfen werden.
- „Training abschließen“ beendet die Einheit endgültig. „Für später speichern“ lässt sie ausdrücklich fortsetzbar.
- Freie Trainings wie Joggen, Gehen, Radfahren, Wandern, Schwimmen, Rudern oder Tennis lassen sich mit Dauer, Belastung, optionaler Distanz und Notiz erfassen.
- Der Kalorienverbrauch ist eine Schätzung aus persönlichen Angaben, Dauer und Aktivitätsintensität. Für Erwachsene wird der Ruheumsatz nach [Mifflin–St Jeor](https://pubmed.ncbi.nlm.nih.gov/2305711/) mit Intensitätsfaktoren nach dem [2024 Adult Compendium](https://pacompendium.com/adult-compendium/) kombiniert. Unter 18 Jahren nutzt FORGE stattdessen eine allgemeine gewichtsbezogene MET-Schätzung. Krafttrainings-Kalorien werden nur als grobe Schätzung gleichmäßig auf erfasste Sätze verteilt; Messgeräte oder medizinische Messungen ersetzt dies nicht.
- Der Pausentimer orientiert sich an der tatsächlichen Uhrzeit und korrigiert sich nach Hintergrundpausen. Ton und Vibration sind in den Einstellungen einzeln testbar; Geräte ohne Vibrations-API können nicht vibrieren.
- Bei Wiederholungs- und Zeitbereichen nutzt FORGE eine ruhige doppelte Progression: Zuerst steigt das vorgeschlagene Ergebnis schrittweise bis zum oberen Ziel. Erst nach zwei stabilen Einheiten erhöht sich das vorgeschlagene Gewicht; zugleich beginnen die Wiederholungen wieder am unteren Ziel. Die maximalen Schritte für Gewicht, Wiederholungen und Sekunden sind einstellbar.
- Zwei frei wählbare Buchstaben tragen während des Trainings sofort das untere oder obere Ziel ein, schließen den Satz ab und starten die Pause. Voreingestellt sind D für Minimum und F für Maximum.
- Jeder Übung kann im Planeditor eine persönliche Technik- oder Geräte-Notiz hinzugefügt werden.
- Das Wochenziel ist zwischen 1 und 14 Trainings einstellbar und wird auf der Startseite angezeigt.
- Gewichte lassen sich in den Einstellungen zwischen kg und lb umschalten. Gespeichert wird intern weiterhin in kg, damit beim Wechsel keine Trainingsdaten verfälscht werden.
- Auf Handys bleibt die Hauptnavigation erreichbar am unteren Bildschirmrand.

## Version 1.9.0

- Nach Ablauf eines Übungs-Timers erscheint direkt ein eigener Button, um die eingetragene Zeit zu bestätigen und den Satz abzuschließen.
- Übung und Satz bleiben auch während der Pause sichtbar.
- Die Trainingshistorie ist standardmäßig nach Jahren und Monaten gegliedert und lässt sich nach einem Tag oder Monat filtern.
- Die Updateinfos zeigen nur noch die drei neuesten Versionen; kleine Wartungsupdates werden knapp als Fehlerbehebungen zusammengefasst.

## Version 1.8.2

- Die Hinweise für Minimum- und Maximum-Tastenkürzel stehen nun direkt unter dem Wiederholungs- beziehungsweise Zeitfeld statt unter dem Gewichtsfeld.

## Version 1.8.1

- Der Einstellungsinhalt scrollt nun unabhängig von der Speicherleiste, sodass die untersten Felder auf jeder Bildschirmgröße vollständig erreichbar bleiben.
- Dauerhaft sichtbare Feldbeschriftungen und Einheiten kennzeichnen im Training Gewicht, Wiederholungen und Sekunden auch dann eindeutig, wenn bereits Werte eingetragen sind.

## Version 1.8.0

- Einstellungen sind in fünf übersichtliche Reiter gegliedert und lassen sich durchsuchen; ungespeicherte Änderungen werden sichtbar markiert.
- Die installierte Version und Updateinfos sind direkt im Einstellungskopf sowie im Bereich „Daten & Info“ erreichbar.
- Pausensignale besitzen auswählbare Vibrationsmuster, Geräte-Diagnose, optionalen Ton-Ersatz und einen deutlichen visuellen Hinweis.
- Auf Smartphones zeigen zwei Schnellschaltflächen automatisch die Minimal- und Maximalwerte der aktuellen Übung und schließen den Satz direkt ab.

## Version 1.7.0

- Neue, frei wählbare Laptop-Tastenkürzel für minimale und maximale Wiederholungen beziehungsweise Sekunden.
- Ein Tastendruck trägt das Ziel ein, bestätigt den Satz und startet direkt die Pause.
- Doppelte Progression erhöht Wiederholungen oder Zeit in kleinen Schritten und erst danach das Gewicht; alle Maximalschritte sind einstellbar.

## Version 1.6.0

- Zeitübungen übernehmen die abgelaufene Zeit automatisch in das Satz-Ergebnis.
- Rückgängig, XP-Anzeige, Planvalidierung, Rangliste, Statistikhilfe und Aktualisierung alter App-Stände wurden korrigiert.

## Version 1.5.2

- Die Anmeldung wird nicht mehr durch das versteckte Benutzername-Pflichtfeld blockiert.

## Version 1.5.0

- Rückgängig ist während der Satzpause verfügbar.
- Wiederholungseingaben für Seitenübungen sind eindeutig als „pro Seite“ beschriftet.
- Zeitübungen besitzen einen einstellbaren Timer direkt in der App.
- Die Gewichtsempfehlung ist konservativer und erhöht das Gewicht nicht mehr automatisch.

## Dateien

- index.html, css/, js/: aufgeteilte Oberfläche und App-Logik.
- js/cloud.js, storage.js, config.js: Anmeldung, Speicherung und öffentlicher Supabase-Schlüssel.
- vendor/, manifest.webmanifest, sw.js, assets/: Offline-Bibliotheken und Installation.
- supabase/schema.sql: Tabellen, Zugriffsschutz und Datenbankfunktionen.
- scripts/build.cjs, package.json, pnpm-lock.yaml: Build; tests/: lokale Speichertests.

Zur Entwicklung einen HTTP-Server verwenden. Abhängigkeiten mit pnpm installieren, dann pnpm build und pnpm test. Der Build liegt in dist/. Niemals einen service_role-Schlüssel in die App schreiben; der vorhandene veröffentlichbare Schlüssel ist absichtlich öffentlich und durch Datenbankregeln abgesichert.

Electron ist für diese Handy-App nicht erforderlich. App-Store-Veröffentlichung und native Push-Erinnerungen sind nicht enthalten.
