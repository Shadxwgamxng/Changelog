-- =========================================================
-- ALARM24 - DATENBANKSTRUKTUR
-- =========================================================

CREATE TABLE IF NOT EXISTS `alarm24_users` (
    `id`            INT UNSIGNED NOT NULL AUTO_INCREMENT,
    `identifier`    VARCHAR(80) NOT NULL,
    `name`          VARCHAR(100) NOT NULL DEFAULT '',
    `organization`  VARCHAR(100) NOT NULL DEFAULT '',
    `active`        TINYINT(1) NOT NULL DEFAULT 1,
    `availability`  VARCHAR(20) NOT NULL DEFAULT 'READY',
    `created_at`    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at`    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    UNIQUE KEY `uq_alarm24_users_identifier` (`identifier`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `alarm24_alarms` (
    `id`            INT UNSIGNED NOT NULL AUTO_INCREMENT,
    `operation_id`  VARCHAR(80) NOT NULL COMMENT 'Einsatz-ID aus EmergencyDispatch',
    `keyword`       VARCHAR(150) NOT NULL DEFAULT '',
    `description`   TEXT NULL,
    `location`      VARCHAR(255) NULL,
    `coords_x`      FLOAT NULL,
    `coords_y`      FLOAT NULL,
    `coords_z`      FLOAT NULL,
    `priority`      VARCHAR(30) NULL,
    `organization`  VARCHAR(100) NULL,
    `extra`         TEXT NULL,
    `alarm_time`    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `created_at`    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    KEY `idx_alarm24_alarms_operation_id` (`operation_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `alarm24_alarm_recipients` (
    `id`            INT UNSIGNED NOT NULL AUTO_INCREMENT,
    `alarm_id`      INT UNSIGNED NOT NULL,
    `identifier`    VARCHAR(80) NOT NULL,
    `user_id`       INT UNSIGNED NULL,
    `dedupe_key`    VARCHAR(191) NOT NULL COMMENT 'operationId + identifier, verhindert doppelte Alarme',
    `seen`          TINYINT(1) NOT NULL DEFAULT 0,
    `created_at`    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    UNIQUE KEY `uq_alarm24_recipients_dedupe` (`dedupe_key`),
    KEY `idx_alarm24_recipients_alarm_id` (`alarm_id`),
    KEY `idx_alarm24_recipients_identifier` (`identifier`),
    CONSTRAINT `fk_alarm24_recipients_alarm`
        FOREIGN KEY (`alarm_id`) REFERENCES `alarm24_alarms` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `alarm24_alarm_responses` (
    `id`            INT UNSIGNED NOT NULL AUTO_INCREMENT,
    `recipient_id`  INT UNSIGNED NOT NULL,
    `alarm_id`      INT UNSIGNED NOT NULL,
    `identifier`    VARCHAR(80) NOT NULL,
    `status`        VARCHAR(30) NOT NULL DEFAULT 'NO_RESPONSE',
    `responded_at`  DATETIME NULL,
    `created_at`    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at`    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    UNIQUE KEY `uq_alarm24_responses_recipient` (`recipient_id`),
    KEY `idx_alarm24_responses_alarm_id` (`alarm_id`),
    KEY `idx_alarm24_responses_identifier` (`identifier`),
    CONSTRAINT `fk_alarm24_responses_recipient`
        FOREIGN KEY (`recipient_id`) REFERENCES `alarm24_alarm_recipients` (`id`) ON DELETE CASCADE,
    CONSTRAINT `fk_alarm24_responses_alarm`
        FOREIGN KEY (`alarm_id`) REFERENCES `alarm24_alarms` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `alarm24_notifications` (
    `id`            INT UNSIGNED NOT NULL AUTO_INCREMENT,
    `identifier`    VARCHAR(80) NOT NULL,
    `alarm_id`      INT UNSIGNED NOT NULL,
    `delivered`     TINYINT(1) NOT NULL DEFAULT 0,
    `delivered_at`  DATETIME NULL,
    `created_at`    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    KEY `idx_alarm24_notifications_identifier` (`identifier`),
    KEY `idx_alarm24_notifications_alarm_id` (`alarm_id`),
    CONSTRAINT `fk_alarm24_notifications_alarm`
        FOREIGN KEY (`alarm_id`) REFERENCES `alarm24_alarms` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `alarm24_settings` (
    `id`            INT UNSIGNED NOT NULL AUTO_INCREMENT,
    `identifier`    VARCHAR(80) NOT NULL,
    `setting_key`   VARCHAR(80) NOT NULL,
    `setting_value` TEXT NULL,
    `updated_at`    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    UNIQUE KEY `uq_alarm24_settings_identifier_key` (`identifier`, `setting_key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `alarm24_audit_logs` (
    `id`            INT UNSIGNED NOT NULL AUTO_INCREMENT,
    `actor`         VARCHAR(80) NULL COMMENT 'Identifier des Ausloesers (Admin, System, EmergencyDispatch)',
    `action`        VARCHAR(80) NOT NULL,
    `details`       TEXT NULL,
    `created_at`    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
