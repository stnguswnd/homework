import { NextResponse } from "next/server";

import { query } from "@/lib/postgres";
import { requireTeacherSession } from "@/server/teacher/session";

export const runtime = "nodejs";

type Params = {
  params: Promise<{ classId: string }>;
};

type ClassHistoryCounts = {
  scheduleCount: number;
  eventCount: number;
  assignmentCount: number;
  targetCount: number;
  testCount: number;
  testResultCount: number;
  noticeTargetCount: number;
};

const historyTables: Array<{ table: string; key: keyof ClassHistoryCounts }> = [
  { table: "class_schedule_days", key: "scheduleCount" },
  { table: "class_calendar_events", key: "eventCount" },
  { table: "assignments", key: "assignmentCount" },
  { table: "assignment_targets", key: "targetCount" },
  { table: "tests", key: "testCount" },
  { table: "test_results", key: "testResultCount" },
  { table: "notice_targets", key: "noticeTargetCount" },
];

function emptyCounts(): ClassHistoryCounts {
  return {
    scheduleCount: 0,
    eventCount: 0,
    assignmentCount: 0,
    targetCount: 0,
    testCount: 0,
    testResultCount: 0,
    noticeTargetCount: 0,
  };
}

async function getClassHistoryCounts(classId: string) {
  const counts = emptyCounts();

  for (const item of historyTables) {
    const exists = await query<{ exists: string | null }>("select to_regclass($1) as exists", [`public.${item.table}`]);
    if (!exists.rows[0]?.exists) continue;

    const result = await query<{ count: string }>(`select count(*)::text as count from ${item.table} where class_id = $1`, [classId]);
    counts[item.key] = Number(result.rows[0]?.count ?? 0);
  }

  return counts;
}

function hasHistory(counts: ClassHistoryCounts) {
  return Object.values(counts).some((count) => count > 0);
}

export async function GET(request: Request, { params }: Params) {
  const { teacherId } = await requireTeacherSession();
  const { classId } = await params;
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

  const url = new URL(request.url);
  if (url.searchParams.get("deletePreview") === "1") {
    const counts = await getClassHistoryCounts(classId);
    const archived = hasHistory(counts);
    return NextResponse.json({
      ok: true,
      deleted: !archived,
      archived,
      reason: archived ? "has_history" : "no_history",
      counts,
    });
  }

  return NextResponse.json({ class: result.rows[0] });
}

export async function DELETE(_request: Request, { params }: Params) {
  const { teacherId } = await requireTeacherSession();
  const { classId } = await params;
  const existing = await query("select id from classes where id = $1 and teacher_id = $2 limit 1", [classId, teacherId]);

  if (!existing.rows[0]) {
    return NextResponse.json({ error: "반을 찾을 수 없습니다." }, { status: 404 });
  }

  const counts = await getClassHistoryCounts(classId);
  if (hasHistory(counts)) {
    await query("update classes set status = 'archived', updated_at = now() where id = $1 and teacher_id = $2", [classId, teacherId]);
    return NextResponse.json({
      ok: true,
      deleted: false,
      archived: true,
      reason: "has_history",
      counts,
    });
  }

  await query("delete from classes where id = $1 and teacher_id = $2", [classId, teacherId]);
  return NextResponse.json({
    ok: true,
    deleted: true,
    archived: false,
    reason: "no_history",
  });
}
