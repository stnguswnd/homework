import { NextResponse } from "next/server";
import { deleteTest, updateTest } from "@/lib/dashboardData";
import { requireTeacherSession } from "@/server/teacher/session";

export const runtime = "nodejs";

export async function PATCH(request: Request, context: { params: Promise<{ testId: string }> }) {
  const { teacherId } = await requireTeacherSession();
  const { testId } = await context.params;
  const body = await request.json().catch(() => ({}));
  await updateTest(teacherId, testId, body);
  return NextResponse.json({ ok: true });
}

export async function DELETE(_request: Request, context: { params: Promise<{ testId: string }> }) {
  const { teacherId } = await requireTeacherSession();
  const { testId } = await context.params;
  await deleteTest(teacherId, testId);
  return NextResponse.json({ ok: true });
}
