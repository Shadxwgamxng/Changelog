import { requireCtx } from "@/server/session";
import { PageHeader } from "@/components/ui";
import { forbidden } from "@/server/errors";
import { courseFormOptions, getCourse } from "@/server/services/courses";
import { updateCourseAction } from "../../actions";
import { CourseForm } from "../../course-form";

export const metadata = { title: "Lehrgang bearbeiten" };

export default async function EditCourse({ params }: { params: Promise<{ id: string }> }) {
  const ctx = await requireCtx();
  const c = await getCourse(ctx, (await params).id);
  if (!c.perms.manage || c.status !== "GEPLANT") throw forbidden();
  const o = await courseFormOptions(ctx);
  const units = o.units.some((u) => u.id === c.unitId) ? o.units : [...o.units, { id: c.unitId, name: c.unitName }];
  return (<><PageHeader title="Lehrgang bearbeiten" back={{ href: `/courses/${c.id}`, label: c.title }} /><CourseForm action={updateCourseAction} units={units} qualTypes={o.qualTypes} helpers={o.helpers} submit="Speichern" defaults={c} /></>);
}
