-- Throw-away SQL fuer Beta-Test: zwei Test-User komplett aus D1 entfernen,
-- damit der Free-Signup-Flow von vorne durchgespielt werden kann.
--
-- Reihenfolge: children zuerst (FK-Constraints), users zuletzt.
-- Auth-Tokens haengen an email_lower (nicht user_id).
--
-- NICHT als Migration laufen lassen — dieses File liegt ausserhalb
-- von migrations/ und ist throw-away.

DELETE FROM sessions
 WHERE user_id IN (SELECT id FROM users WHERE email_lower IN ('budweiser.belinda@gmail.com', 'dao@triltsch-online.de'));

DELETE FROM devices
 WHERE user_id IN (SELECT id FROM users WHERE email_lower IN ('budweiser.belinda@gmail.com', 'dao@triltsch-online.de'));

DELETE FROM entitlements
 WHERE user_id IN (SELECT id FROM users WHERE email_lower IN ('budweiser.belinda@gmail.com', 'dao@triltsch-online.de'));

DELETE FROM subscriptions
 WHERE user_id IN (SELECT id FROM users WHERE email_lower IN ('budweiser.belinda@gmail.com', 'dao@triltsch-online.de'));

DELETE FROM email_otp_active
 WHERE email_lower IN ('budweiser.belinda@gmail.com', 'dao@triltsch-online.de');

DELETE FROM email_otp_tokens
 WHERE email_lower IN ('budweiser.belinda@gmail.com', 'dao@triltsch-online.de');

DELETE FROM users
 WHERE email_lower IN ('budweiser.belinda@gmail.com', 'dao@triltsch-online.de');
