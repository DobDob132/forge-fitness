# Mailversand kostenlos vorbereiten

Stand: 20. September 2026. Neues Supabase-Projekt FORGE, Organisation Fitness App, Frankfurt. Login, private Trainingsdaten, Planfreigaben und Freunde-Challenges sind eingerichtet. Echte Bestätigungs-/Reset-Mails sind noch nicht eingerichtet.

## Brevo Free vorbereiten

Brevo Free bietet laut Anbieter bis zu 300 E-Mails täglich. Kein kostenpflichtiges Paket buchen. Ein eigenes Konto und verifizierter Absender sind erforderlich. Für Domain-Authentifizierung wird Zugriff auf die DNS-Einstellungen einer eigenen Domain benötigt. Falls keine Domain vorhanden ist, verfügbare Absenderoptionen zuerst im kostenlosen Konto prüfen; ein Domain-Kauf wäre nicht automatisch kostenlos und wurde nicht beauftragt.

1. Kostenloses Brevo-Konto erstellen.
2. Absender verifizieren und Domain nach den dort angezeigten DNS-Anweisungen authentifizieren.
3. Unter SMTP einen SMTP-Schlüssel erzeugen; den dort angezeigten SMTP-Login verwenden.
4. Schlüssel direkt in Supabase eintragen, niemals in Chat, Code oder Git.

Offizielle Quellen:
- https://help.brevo.com/hc/en-us/articles/208580669-FAQs-What-are-the-limits-of-the-Free-plan
- https://help.brevo.com/hc/en-us/articles/7924908994450-Send-transactional-emails-using-Brevo-SMTP

## Supabase konfigurieren

https://supabase.com/dashboard/project/wschcxpyktsxpsyeouva

Authentication → E-Mail/SMTP → eigenen SMTP-Server aktivieren:

| Feld | Wert |
| --- | --- |
| Sender name | FORGE |
| Sender email | Dein verifizierter Absender |
| Host | smtp-relay.brevo.com |
| Port | 587 |
| Username | SMTP-Login aus Brevo |
| Password | SMTP-Schlüssel aus Brevo, kein API-Schlüssel |

E-Mail-Bestätigung aktiviert lassen. Supabases eingebauter Testversand ist auf autorisierte Team-Adressen und ein sehr kleines Kontingent begrenzt und ungeeignet für Freunde. Nach SMTP-Einrichtung auch Supabases Versandlimit prüfen und innerhalb der kostenlosen Kontingente belassen.

Quelle: https://supabase.com/docs/guides/auth/auth-smtp

## Bestätigungscode statt Bestätigungslink

In Authentication → Email Templates → Confirm signup den Inhalt durch die Datei `supabase/email-confirmation-template.html` ersetzen. Entscheidend ist `{{ .Token }}`: Dadurch erhält der Nutzer einen sechsstelligen Code und gibt ihn direkt in FORGE ein. Diese Anpassung ist bei einem neuen kostenlosen Supabase-Projekt nur mit eigenem SMTP-Anbieter möglich.

## Rücksprungadresse

Authentication → URL Configuration:

- Site URL: https://dobdob132.github.io/forge-fitness/
- Erlaubte Redirect URL: https://dobdob132.github.io/forge-fitness/index.html

Diese Einstellungen sind noch nicht automatisch gesetzt worden. Bei eigener Domain später beide Werte anpassen.

## Abschließender Mailtest

Mit eigener zweiter E-Mail-Adresse registrieren, den sechsstelligen Code direkt in FORGE eingeben und prüfen, dass das Konto sofort geöffnet wird. Danach „Passwort vergessen“ testen, Link öffnen, neues Passwort setzen und damit anmelden. Spam-Ordner prüfen. Erst danach Freunde einladen. Oberfläche und echte Passwortänderung wurden getestet; echte Zustellung mangels Mailanbieter noch nicht.

## Kosten und Datenschutz

Kein kostenpflichtiger Maildienst oder App-Store-Vertrag wurde gebucht. Supabase wurde mit bestätigtem Projektpreis 0 pro Monat angelegt. Kostenlose Kontingente bleiben begrenzt; keine kostenpflichtigen Upgrades ohne bewusste Entscheidung. Freunde benötigen keinen zusätzlichen Dienst.

Trainingsdaten sind nur dem jeweiligen Konto zugänglich. Vor breiter öffentlicher Nutzung eigene Kontakt-/Datenschutzhinweise und einen Prozess für Kontolöschung ergänzen. Kontolöschung ist aktuell über Supabase-Administration möglich.
