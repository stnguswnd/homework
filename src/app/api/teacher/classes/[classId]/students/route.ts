import { NextResponse } from "next/server";

import { query } from "@/lib/postgres";
import { mockTeacherId } from "@/server/teacher/mockTeacher";

export const runtime = "nodejs";

export async function GET(_request: Request, context: { params: Promise<{ classId: string }> }) {
  const { classId } = await context.params;
  const result = await query(
    `
      select s.id, s.name, s.student_login_id as "studentLoginId", s.school_name as "schoolName", s.grade, s.status
      from students s
      join class_memberships cm on cm.student_id = s.id
      join classes c on c.id = cm.class_id
      where c.id = $1 and c.teacher_id = $2
      order by s.name
    `,
    [classId, mockTeacherId],
  );
  return NextResponse.json({ students: result.rows });
}
