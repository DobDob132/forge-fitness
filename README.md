# FORGE – installierbare Fitness-App

App-Adresse: https://forge-fitness-felix.felix-dober740007.chatgpt.site

Die bisherige Trainings-App wurde um Supabase-Konten, private Cloud-Speicherung, Freunde und Installation auf Android/iPhone ergänzt. Die ursprüngliche FORGE.html bleibt unverändert.

## Installation

- Android: Link in Chrome öffnen und „App installieren“ oder „Zum Startbildschirm hinzufügen“ wählen.
- iPhone: Link in Safari öffnen, Teilen → „Zum Home-Bildschirm“.
- Ohne Konto fortfahren: Daten bleiben lokal im Browser.
- Mit Konto: Anmeldung über das Profilsymbol; Trainingsdaten werden privat synchronisiert.

WICHTIG: Für Registrierungsbestätigung und Passwort-Reset fehlt noch der eigene Mailanbieter. Die kostenlose Vorbereitung steht in EINRICHTUNG.md. Neue Konten bestätigen sich danach mit einem sechsstelligen Code direkt in FORGE. Erst nach Einrichtung und echtem Mailtest die Registrierung an Freunde weitergeben.

## Bisherige Daten

In der alten App unter Einstellungen als JSON exportieren. Neue App öffnen, gewünschtes Konto anmelden und dort importieren. Browserdaten sind an die jeweilige Adresse gebunden; die neue Website kann die Daten der alten lokalen HTML-Datei nicht automatisch lesen. Import fragt vor dem Ersetzen und legt eine lokale Sicherung an. Gastdaten werden niemals automatisch hochgeladen.

## Synchronisierung

Änderungen werden lokal gespeichert und bei Verbindung mit Supabase synchronisiert. Bereits geladene Konten funktionieren offline; die erste Anmeldung benötigt Internet. Im Profil zeigt der Status ausstehende Änderungen. „Jetzt synchronisieren“ lädt auch Änderungen anderer Geräte. Bei gleichzeitigen Änderungen fragt FORGE, welche Version übernommen wird, und sichert beide Fassungen lokal. Vor Gerätewechsel synchronisieren. Während eines laufenden Trainings werden neuere Cloud-Daten nicht automatisch eingeblendet.

Browserdaten löschen entfernt Gastdaten und lokale Sicherungen. Abgemeldete Konten behalten getrennte lokale Zwischenspeicher; auf gemeinsam genutzten Geräten anschließend Browserdaten löschen. Der Einstellungs-Reset betrifft Trainingsdaten, nicht das Benutzerkonto.

## Freunde

Im Profil den privaten Freundescode teilen oder erhaltenen Code eingeben. Anfragen können angenommen/abgelehnt und Kontakte entfernt werden. Freunde sehen nur Anzeigenamen und Beziehungsstatus, keine E-Mail-, Körper- oder Trainingsdaten. Die bisherige Community-Demo bleibt Demo.

Eigene Trainingspläne lassen sich an angenommene Freunde senden. Der Empfänger übernimmt sie als unabhängige Kopie und kann sie ändern, ohne den Plan des Absenders zu verändern. Im Profil können Freunde außerdem eine Wochen-Challenge mit einem Ziel von 1 bis 14 Trainings starten. Sichtbar sind nur der Challenge-Fortschritt und Anzeigenamen; Trainingsdetails bleiben privat.

## Training und Darstellung

- Angefangene Trainings können gespeichert und auf der Startseite exakt beim letzten Satz fortgesetzt oder verworfen werden.
- Nach früheren Einheiten empfiehlt FORGE bei passenden Wiederholungsbereichen das nächste Gewicht oder das Beibehalten des aktuellen Gewichts.
- Jeder Übung kann im Planeditor eine persönliche Technik- oder Geräte-Notiz hinzugefügt werden.
- Das Wochenziel ist zwischen 1 und 14 Trainings einstellbar und wird auf der Startseite angezeigt.
- Gewichte lassen sich in den Einstellungen zwischen kg und lb umschalten. Gespeichert wird intern weiterhin in kg, damit beim Wechsel keine Trainingsdaten verfälscht werden.
- Auf Handys bleibt die Hauptnavigation erreichbar am unteren Bildschirmrand.

## Dateien

- index.html, css/, js/: aufgeteilte Oberfläche und App-Logik.
- js/cloud.js, storage.js, config.js: Anmeldung, Speicherung und öffentlicher Supabase-Schlüssel.
- vendor/, manifest.webmanifest, sw.js, assets/: Offline-Bibliotheken und Installation.
- supabase/schema.sql: Tabellen, Zugriffsschutz und Datenbankfunktionen.
- scripts/build.cjs, package.json, pnpm-lock.yaml: Build; tests/: lokale Speichertests.

Zur Entwicklung einen HTTP-Server verwenden. Abhängigkeiten mit pnpm installieren, dann pnpm build und pnpm test. Der Build liegt in dist/. Niemals einen service_role-Schlüssel in die App schreiben; der vorhandene veröffentlichbare Schlüssel ist absichtlich öffentlich und durch Datenbankregeln abgesichert.

Electron ist für diese Handy-App nicht erforderlich. App-Store-Veröffentlichung und native Push-Erinnerungen sind nicht enthalten.

