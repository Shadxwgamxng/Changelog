-- Web-Push entfällt (reine Web-Anwendung ohne App)
DROP TABLE IF EXISTS "PushSubscription";
ALTER TABLE "NotificationPreference" DROP COLUMN IF EXISTS "push";
