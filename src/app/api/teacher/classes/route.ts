import { randomUUID } from "crypto";
import { NextResponse } from "next/server";

import { query } from "@/lib/postgres";
import { mockTeacherId } from "@/server/teacher/mockTeacher";

export const runtime = "nodejs";

type ClassRow = {
  id: string;
  name: string;
  description: string | null;
  status: "active" | "archived";
  student_count: number;
  students: Array<{ id: string; name: string }>;
  created_at: Date;
};

function slugify(value: string) {
  const slug = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9가-힣]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug || randomUUID().slice(0, 8);
}

function mapClass(row: ClassRow) {
  return {
    id: row.id,
    teacherId: mockTeacherId,
    name: row.name,
    description: row.description ?? "",
    status: row.status,
    studentCount: row.student_count,
    students: row.students,
    createdAt: row.created_at.toISOString(),
  };
}

export async function GET() {
  const result = await query<ClassRow>(
    `
      select
        c.id,
        c.name,
        c.description,
        c.status,
        c.created_at,
        count(distinct s.id)::int as student_count,
        coalesce(
          json_agg(
            distinct jsonb_build_object('id', s.id, 'name', s.name)
          ) filter (where s.id is not null),
          '[]'::json
        ) as students
      from classes c
      left join class_memberships cm on cm.class_id = c.id
      left join students s on s.id = cm.student_id and s.teacher_id = c.teacher_id
      where c.teacher_id = $1
      group by c.id
      order by c.created_at asc
    `,
    [mockTeacherId],
  );

  return NextResponse.json(result.rows.map(mapClass));
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null) as {
    name?: string;
    description?: string;
    status?: "active" | "archived";
  } | null;

  const name = body?.name?.trim();
  if (!name) {
    return NextResponse.json({ error: "반 이름을 입력해주세요." }, { status: 400 });
  }

  const duplicate = await query(
    "select id from classes where teacher_id = $1 and lower(name) = lower($2) limit 1",
    [mockTeacherId, name],
  );
  if (duplicate.rows[0]) {
    return NextResponse.json({ error: "이미 같은 이름의 반이 있습니다." }, { status: 409 });
  }

  try {
    const result = await query<ClassRow>(
      `
        insert into classes (id, teacher_id, name, description, status)
        values ($1, $2, $3, $4, $5)
        returning id, name, description, status, created_at, 0::int as student_count, '[]'::json as students
      `,
      [
        `class-${slugify(name)}-${randomUUID().slice(0, 6)}`,
        mockTeacherId,
        name,
        body?.description?.trim() || null,
        body?.status ?? "active",
      ],
    );

    return NextResponse.json(mapClass(result.rows[0]), { status: 201 });
  } catch (error) {
    if ((error as { code?: string }).code === "23505") {
      return NextResponse.json({ error: "이미 같은 이름의 반이 있습니다." }, { status: 409 });
    }
    console.error(error);
    return NextResponse.json({ error: "반 생성 중 오류가 발생했습니다." }, { status: 500 });
  }
}
