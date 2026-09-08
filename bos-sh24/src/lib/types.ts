// SQLite unterstützt keine nativen Enums – Prisma speichert diese Felder als String.
// Diese Union-Typen bilden die gültigen Werte für Typsicherheit in der Anwendung ab.

export type Role = "VISITOR" | "USER" | "EDITOR" | "ADMIN";
export type UserStatus = "ACTIVE" | "BLOCKED";
export type PostStatus = "DRAFT" | "SCHEDULED" | "PUBLISHED" | "ARCHIVED";
export type ContactStatus = "NEW" | "IN_PROGRESS" | "DONE";
