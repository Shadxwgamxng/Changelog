-- =========================================================
-- POLICEVOICEAI - DATENBANKSCHEMA
-- =========================================================
-- Enthaelt ausschliesslich Daten fuer NPC-Zivilisten (Punkt 8/9/19) und den
-- Gespraechsverlauf (Punkt 5/6). Diese Tabellen sind bewusst unabhaengig von
-- FivePDs eigener Citizen-Datenbank, damit PoliceVoiceAI auch ohne
-- Kenntnis der internen FivePD-Tabellenstruktur funktioniert. Falls FivePD
-- passende Exports bereitstellt, kann integrations/fivepd.lua stattdessen
-- echte FivePD-Datensaetze verwenden (siehe Config.FivePD.useNativeCitizenLookup).

CREATE TABLE IF NOT EXISTS `policevoiceai_npc_citizens` (
    `npc_id` VARCHAR(64) NOT NULL,
    `first_name` VARCHAR(64) NOT NULL,
    `last_name` VARCHAR(64) NOT NULL,
    `dob` DATE NULL,
    `occupation` VARCHAR(128) NULL,
    `address` VARCHAR(255) NULL,
    `license_status` ENUM('valid', 'suspended', 'none') NOT NULL DEFAULT 'valid',
    `vehicle_model` VARCHAR(64) NULL,
    `vehicle_plate` VARCHAR(16) NULL,
    `has_warrant` TINYINT(1) NOT NULL DEFAULT 0,
    `warrant_reason` VARCHAR(255) NULL,
    -- Liste bisheriger Vorfaelle, z.B. [{"date":"2023-04-01","charge":"Diebstahl"}]
    `criminal_record` JSON NULL,
    `persona_key` VARCHAR(64) NOT NULL DEFAULT 'friendly_citizen',
    -- {cooperation, aggression, honesty, nervousness, intelligence, criminality, confidence}
    `personality` JSON NOT NULL,
    -- {gender, age, accent, speed, pitch, providerVoiceId}
    `voice_profile` JSON NOT NULL,
    -- Verborgene Grundwahrheiten, die der NPC je nach honesty verschweigen/leugnen
    -- kann (Punkt 18), z.B. {"owns_bag": true, "was_at_scene": true}. Werden NIE
    -- direkt an die KI als "das ist wahr" UND "das darfst du erzaehlen" gegeben -
    -- der Conversation Manager entscheidet situativ, siehe server/conversation_manager.lua
    `secrets` JSON NULL,
    `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`npc_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `policevoiceai_conversations` (
    `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
    `conversation_id` VARCHAR(64) NOT NULL,
    `npc_id` VARCHAR(64) NOT NULL,
    `player_identifier` VARCHAR(96) NULL,
    -- z.B. traffic_stop, callout_domestic, general
    `situation` VARCHAR(64) NOT NULL DEFAULT 'general',
    -- {reason, officerUnit, location, vehicle, ...}
    `situation_context` JSON NULL,
    `status` ENUM('active', 'ended') NOT NULL DEFAULT 'active',
    `started_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `ended_at` TIMESTAMP NULL,
    PRIMARY KEY (`id`),
    UNIQUE KEY `uniq_conversation_id` (`conversation_id`),
    KEY `idx_npc_id` (`npc_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `policevoiceai_conversation_messages` (
    `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
    `conversation_id` VARCHAR(64) NOT NULL,
    `role` ENUM('officer', 'npc') NOT NULL,
    `message` TEXT NOT NULL,
    `emotion` VARCHAR(32) NULL,
    `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    KEY `idx_conversation_id` (`conversation_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `policevoiceai_audit_log` (
    `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
    `actor` VARCHAR(96) NULL,
    `action` VARCHAR(64) NOT NULL,
    `details` JSON NULL,
    `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
