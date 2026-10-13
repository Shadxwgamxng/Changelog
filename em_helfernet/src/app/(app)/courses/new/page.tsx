import { requireCtx } from "@/server/session";
import { PageHeader } from "@/components/ui";
import { forbidden } from "@/server/errors";
import { courseFormOptions } from "@/server/services/courses";
import { parseBerlinLocal } from "@/lib/dates";
import { createCourseAction } from "../actions";
import { CourseForm } from "../course-form";

export const metadata = { title: "Lehrgang anlegen" };

export default async function NewCourse() {
  const ctx = await requireCtx();
  const o = await courseFormOptions(ctx);
  if (!o.units.length) throw forbidden();
  const d = new Date(Date.now() + 21 * 86_400_000).toISOString().slice(0, 10);
  return (<><PageHeader title="Lehrgang anlegen" back={{ href: "/courses", label: "Lehrgänge" }} /><CourseForm action={createCourseAction} units={o.units} qualTypes={o.qualTypes} helpers={o.helpers} submit="Lehrgang anlegen" defaults={{ unitId: o.units[0].id, startsAt: parseBerlinLocal(`${d}T09:00`)!, endsAt: parseBerlinLocal(`${d}T17:00`)! }} /></>);
}
