-- Meldeschluss je Dienst und Zeiträume für Meldung und Einteilung (Teilzeit-Meldungen)
ALTER TABLE "Shift" ADD COLUMN "signupDeadline" TIMESTAMP(3);
ALTER TABLE "ShiftAssignment" ADD COLUMN "availableFrom" TIMESTAMP(3),
  ADD COLUMN "availableTo" TIMESTAMP(3),
  ADD COLUMN "plannedFrom" TIMESTAMP(3),
  ADD COLUMN "plannedTo" TIMESTAMP(3);
