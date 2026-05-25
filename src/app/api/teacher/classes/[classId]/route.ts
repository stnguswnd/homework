import { NextResponse } from "next/server";

import { query } from "@/lib/postgres";
import { requireTeacherSession } from "@/server/teacher/session";

export const runtime = "nodejs";

export async function GET(_request: Request, context: { params: Promise<{ classId: string }> }) {
  const { teacherId } = await requireTeacherSession();
  const { classId } = await context.params;
  const result = await query(
    `
      select id, teacher_id, name, description, status, created_at
      from classes
      where id = $1 and teacher_id = $2
      limit 1
    `,
    [classId, teacherId],
  );

  if (!result.rows[0]) return NextResponse.json({ error: "반을 찾을 수 없습니다." }, { status: 404 });
  return NextResponse.json({ class: result.rows[0] });
}
