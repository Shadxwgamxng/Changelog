import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { assignableRoles, can, canAssignRole, canEditEvent, canManageUser } from "../permissions";

const actor = (role: "SUPERADMIN" | "ADMIN" | "TEAMLEITUNG" | "MITGLIED", id: string = role) => ({ id, role });

describe("permissions", () => {
  it("members have no management permissions", () => {
    for (const p of ["members.manage", "events.create", "equipment.manage", "announcements.create", "audit.view", "team.edit"] as const) {
      assert.equal(can(actor("MITGLIED"), p), false, p);
    }
  });
  it("team lead can create events/announcements but not manage members", () => {
    assert.equal(can(actor("TEAMLEITUNG"), "events.create"), true);
    assert.equal(can(actor("TEAMLEITUNG"), "announcements.create"), true);
    assert.equal(can(actor("TEAMLEITUNG"), "members.manage"), false);
    assert.equal(can(actor("TEAMLEITUNG"), "members.viewNotes"), false);
  });
  it("admin cannot manage other admins or superadmins, superadmin can", () => {
    assert.equal(canManageUser(actor("ADMIN", "a"), actor("ADMIN", "b")), false);
    assert.equal(canManageUser(actor("ADMIN", "a"), actor("SUPERADMIN", "s")), false);
    assert.equal(canManageUser(actor("ADMIN", "a"), actor("TEAMLEITUNG", "t")), true);
    assert.equal(canManageUser(actor("SUPERADMIN", "s"), actor("ADMIN", "a")), true);
    assert.equal(canManageUser(actor("ADMIN", "a"), actor("ADMIN", "a")), false);
  });
  it("prevents privilege escalation via role assignment", () => {
    assert.equal(canAssignRole(actor("ADMIN"), "SUPERADMIN"), false);
    assert.equal(canAssignRole(actor("ADMIN"), "ADMIN"), false);
    assert.deepEqual(assignableRoles(actor("ADMIN")).sort(), ["MITGLIED", "TEAMLEITUNG"]);
    assert.equal(canAssignRole(actor("SUPERADMIN"), "SUPERADMIN"), true);
    assert.deepEqual(assignableRoles(actor("TEAMLEITUNG")), []);
  });
  it("team lead edits only own events", () => {
    const lead = actor("TEAMLEITUNG", "lead");
    assert.equal(canEditEvent(lead, { createdById: "lead" }), true);
    assert.equal(canEditEvent(lead, { createdById: "other" }), false);
    assert.equal(canEditEvent(actor("ADMIN"), { createdById: "other" }), true);
    assert.equal(canEditEvent(actor("MITGLIED"), { createdById: "MITGLIED" }), false);
  });
});
