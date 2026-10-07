"use server";
import { redirect } from "next/navigation";
import { action, formObject, json, str } from "@/server/action";
import * as E from "@/server/services/events";

export const createEventAction = action(async (ctx, f) => { const e = await E.createEvent(ctx, { ...formObject(f), tasks: json(f, "tasks", []) }); redirect(`/events/${e.id}`); });
export const updateEventAction = action(async (ctx, f) => { const id = str(f, "id"); await E.updateEvent(ctx, id, { ...formObject(f), tasks: json(f, "tasks", []) }); redirect(`/events/${id}`); });
export const cancelEventAction = action(async (ctx, f) => { await E.cancelEvent(ctx, str(f, "id")); return "Veranstaltung abgesagt."; });
export const toggleTaskAction = action(async (ctx, f) => { await E.toggleEventTask(ctx, str(f, "taskId")); });
