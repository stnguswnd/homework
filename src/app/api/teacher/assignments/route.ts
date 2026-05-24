import { randomUUID } from "crypto";
import { NextResponse } from "next/server";
import type { PoolClient } from "pg";

import { postgresPool, query } from "@/lib/postgres";
import { createSupabaseAdminClient } from "@/lib/supabase/server";
import { storageBuckets } from "@/lib/supabase/storage";
import { mockTeacherId } from "@/server/teacher/mockTeacher";

export const runtime = "nodejs";

type AssignmentRow = {
  id: string;
  title: string;
  description: string | null;
  assignment_type: string;
  assignment_subject: string;
  image_url: string | null;
  image_storage_path: string | null;
  image_file_name: string | null;
  status: string;
  item_id: string | null;
  item_type: string | null;
  passage_title: string | null;
  passage_text: string | null;
  audio_url: string | null;
  audio_storage_path: string | null;
  audio_file_name: string | null;
  min_recording_sec: number | null;
  max_recording_sec: number | null;
  updated_at: Date;
};

type AssignmentTargetInput = {
  classId: string;
  dueDate: string;
  dueTime: string;
  visibility: "draft" | "published";
  targetMode: "all" | "partial";
  selectedStudents: string[];
};

type StudentTargetRow = {
  id: string;
};

type ClassTargetRow = {
  id: string;
  student_count: number;
};

type AssignmentListRow = {
  id: string;
  title: string;
  description: string | null;
  assignment_type: string;
  assignment_subject: string;
  status: string;
  class_names: string[] | null;
  class_summaries: Array<{
    classId: string;
    className: string;
    dueAt: string | null;
    targetCount: number;
    submittedCount: number;
  }> | null;
  target_count: number;
  submitted_count: number;
  due_at: Date | null;
  updated_at: Date;
};

function safeFileName(fileName: string) {
  return fileName.replace(/[^a-zA-Z0-9._-]/g, "_") || `${randomUUID()}`;
}

function itemTypeFor(type: string) {
  if (["listening_recording", "image_speaking", "sentence_shadowing", "free_speaking"].includes(type)) {
    return type;
  }
  if (type === "writing") return "writing_prompt";
  if (type === "quiz") return "quiz_question";
  return "listening_recording";
}

async function signedUrl(bucket: string, path: string | null) {
  if (!path) return "";
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase.storage.from(bucket).createSignedUrl(path, 60 * 60);
  return error ? "" : data.signedUrl;
}

async function mapAssignment(row: AssignmentRow) {
  return {
    id: row.id,
    title: row.title,
    description: row.description ?? "",
    type: row.assignment_type,
    subject: row.assignment_subject,
    status: row.status,
    imageUrl: (await signedUrl(storageBuckets.images, row.image_storage_path)) || row.image_url || "",
    imageStoragePath: row.image_storage_path ?? undefined,
    imageFileName: row.image_file_name ?? undefined,
    item: {
      id: row.item_id,
      type: row.item_type,
      title: row.passage_title ?? "",
      passageText: row.passage_text ?? "",
      audioUrl: (await signedUrl(storageBuckets.audio, row.audio_storage_path)) || row.audio_url || "",
      audioStoragePath: row.audio_storage_path ?? undefined,
      audioFileName: row.audio_file_name ?? "",
      minRecordingSec: String(row.min_recording_sec ?? 0),
      maxRecordingSec: String(row.max_recording_sec ?? 120),
    },
    updatedAt: row.updated_at.toISOString(),
  };
}

async function getAssignmentRow(id: string) {
  const result = await query<AssignmentRow>(
    `
      select
        a.id,
        a.title,
        a.description,
        a.assignment_type,
        a.assignment_subject,
        a.image_url,
        a.image_storage_path,
        a.image_file_name,
        a.status,
        ai.id as item_id,
        ai.item_type,
        ai.title as passage_title,
        ai.passage_text,
        ai.audio_url,
        ai.audio_storage_path,
        ai.audio_file_name,
        ai.min_recording_sec,
        ai.max_recording_sec,
        a.updated_at
      from assignments a
      left join assignment_items ai on ai.assignment_id = a.id and ai.order_index = 1
      where a.id = $1 and a.teacher_id = $2
      limit 1
    `,
    [id, mockTeacherId],
  );

  return result.rows[0] ?? null;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id")?.trim();

  if (!id) {
    const result = await query<AssignmentListRow>(
      `
        with class_summary as (
          select
            at.assignment_id,
            at.class_id,
            coalesce(c.name, '미지정 반') as class_name,
            count(distinct at.student_id)::int as target_count,
            count(distinct at.student_id) filter (where at.status in ('submitted', 'late'))::int as submitted_count,
            min(at.due_at) as due_at
          from assignment_targets at
          join assignments a on a.id = at.assignment_id
          left join classes c on c.id = at.class_id and c.teacher_id = a.teacher_id
          where a.teacher_id = $1
          group by at.assignment_id, at.class_id, c.name
        )
        select
          a.id,
          a.title,
          a.description,
          a.assignment_type,
          a.assignment_subject,
          a.status,
          coalesce(array_remove(array_agg(distinct cs.class_name), null), array[]::text[]) as class_names,
          coalesce(
            jsonb_agg(
              jsonb_build_object(
                'classId', cs.class_id,
                'className', cs.class_name,
                'dueAt', cs.due_at,
                'targetCount', cs.target_count,
                'submittedCount', cs.submitted_count
              )
              order by cs.class_name
            ) filter (where cs.class_id is not null),
            '[]'::jsonb
          ) as class_summaries,
          coalesce(sum(cs.target_count), 0)::int as target_count,
          coalesce(sum(cs.submitted_count), 0)::int as submitted_count,
          coalesce(min(cs.due_at), a.due_at) as due_at,
          a.updated_at
        from assignments a
        left join class_summary cs on cs.assignment_id = a.id
        where a.teacher_id = $1
        group by a.id
        order by a.updated_at desc
      `,
      [mockTeacherId],
    );

    return NextResponse.json({
      assignments: result.rows.map((row) => ({
        id: row.id,
        title: row.title,
        description: row.description ?? "",
        assignmentType: row.assignment_type,
        assignmentSubject: row.assignment_subject,
        status: row.status,
        classNames: row.class_names ?? [],
        classSummaries: row.class_summaries ?? [],
        targetCount: row.target_count,
        submittedCount: row.submitted_count,
        unsubmittedCount: Math.max(row.target_count - row.submitted_count, 0),
        dueAt: row.due_at?.toISOString() ?? null,
        updatedAt: row.updated_at.toISOString(),
      })),
    });
  }

  const row = await getAssignmentRow(id);
  return NextResponse.json({ assignment: row ? await mapAssignment(row) : null });
}

export async function POST(request: Request) {
  const formData = await request.formData();
  const id = String(formData.get("id") ?? "").trim() || `assignment-${randomUUID()}`;
  const title = String(formData.get("title") ?? "").trim();
  const type = String(formData.get("type") ?? "listening_recording").trim();
  const subject = String(formData.get("subject") ?? subjectForType(type)).trim();
  const description = String(formData.get("description") ?? "").trim();
  const passageTitle = String(formData.get("passageTitle") ?? "").trim();
  const passageText = String(formData.get("passageText") ?? "").trim();
  const minRecordingSec = Number(formData.get("minRecordingSec") ?? 0);
  const maxRecordingSec = Number(formData.get("maxRecordingSec") ?? 120);
  const imageFile = formData.get("imageFile");
  const audioFile = formData.get("audioFile");
  const targetAssignments = parseTargetAssignments(formData.get("assignments"));

  if (!title) {
    return NextResponse.json({ error: "과제 제목을 입력해 주세요." }, { status: 400 });
  }

  const supabase = createSupabaseAdminClient();
  let imageUrl: string | null = null;
  let imageStoragePath: string | null = null;
  let imageFileName: string | null = null;
  let audioUrl: string | null = null;
  let audioStoragePath: string | null = null;
  let audioFileName: string | null = String(formData.get("audioFileName") ?? "").trim() || null;

  if (imageFile instanceof File) {
    imageFileName = safeFileName(imageFile.name);
    imageStoragePath = `assignments/${id}/images/${imageFileName}`;
    const { error } = await supabase.storage.from(storageBuckets.images).upload(
      imageStoragePath,
      Buffer.from(await imageFile.arrayBuffer()),
      { contentType: imageFile.type || "image/png", upsert: true },
    );

    if (error) {
      console.error(error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    imageUrl = supabase.storage.from(storageBuckets.images).getPublicUrl(imageStoragePath).data.publicUrl;
  }

  if (audioFile instanceof File) {
    audioFileName = safeFileName(audioFile.name);
    audioStoragePath = `assignments/${id}/audio/${audioFileName}`;
    const { error } = await supabase.storage.from(storageBuckets.audio).upload(
      audioStoragePath,
      Buffer.from(await audioFile.arrayBuffer()),
      { contentType: audioFile.type || "audio/mpeg", upsert: true },
    );

    if (error) {
      console.error(error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    audioUrl = supabase.storage.from(storageBuckets.audio).getPublicUrl(audioStoragePath).data.publicUrl;
  }

  const client = await postgresPool.connect();
  let assignedCount = 0;
  const classCounts: Array<{ classId: string; selectedCount: number }> = [];

  try {
    await client.query("begin");

    const firstTarget = targetAssignments[0];
    const assignmentStatus = targetAssignments.length > 0
      ? (targetAssignments.some((item) => item.visibility === "published") ? "published" : "draft")
      : "draft";
    const assignmentDueAt = firstTarget ? toDueAt(firstTarget.dueDate, firstTarget.dueTime) : null;
    const assignmentClassId = targetAssignments.length === 1 ? targetAssignments[0].classId : null;

    for (const targetAssignment of targetAssignments) {
      const classResult = await client.query<ClassTargetRow>(
        `
          select c.id, count(distinct s.id)::int as student_count
          from classes c
          left join class_memberships cm on cm.class_id = c.id
          left join students s on s.id = cm.student_id and s.teacher_id = c.teacher_id and s.status = 'active'
          where c.id = $1 and c.teacher_id = $2 and c.status = 'active'
          group by c.id
        `,
        [targetAssignment.classId, mockTeacherId],
      );
      const classRow = classResult.rows[0];
      if (!classRow) {
        await client.query("rollback");
        return NextResponse.json({ error: "선택한 반을 찾을 수 없습니다." }, { status: 400 });
      }
      if (targetAssignment.targetMode === "all" && classRow.student_count === 0) {
        await client.query("rollback");
        return NextResponse.json({ error: "선택한 반에 배정할 학생이 없습니다." }, { status: 400 });
      }
      if (targetAssignment.targetMode === "partial" && targetAssignment.selectedStudents.length === 0) {
        await client.query("rollback");
        return NextResponse.json({ error: "일부 학생 배정은 학생을 최소 1명 선택해야 합니다." }, { status: 400 });
      }
    }

    await client.query(
      `
        insert into assignments (
          id, teacher_id, class_id, title, description, assignment_type, assignment_subject,
          image_url, image_storage_path, image_file_name, due_at, status
        )
        values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        on conflict (id)
        do update set
          class_id = excluded.class_id,
          title = excluded.title,
          description = excluded.description,
          assignment_type = excluded.assignment_type,
          assignment_subject = excluded.assignment_subject,
          image_url = coalesce(excluded.image_url, assignments.image_url),
          image_storage_path = coalesce(excluded.image_storage_path, assignments.image_storage_path),
          image_file_name = coalesce(excluded.image_file_name, assignments.image_file_name),
          due_at = coalesce(excluded.due_at, assignments.due_at),
          status = excluded.status,
          updated_at = now()
      `,
      [id, mockTeacherId, assignmentClassId, title, description || null, type, subject || subjectForType(type), imageUrl, imageStoragePath, imageFileName, assignmentDueAt, assignmentStatus],
    );

    await client.query(
      `
        insert into assignment_items (
          id, assignment_id, item_type, title, passage_text, audio_url, audio_storage_path,
          audio_file_name, order_index, min_recording_sec, max_recording_sec
        )
        values ($1, $2, $3, $4, $5, $6, $7, $8, 1, $9, $10)
        on conflict (assignment_id, order_index)
        do update set
          item_type = excluded.item_type,
          title = excluded.title,
          passage_text = excluded.passage_text,
          audio_url = coalesce(excluded.audio_url, assignment_items.audio_url),
          audio_storage_path = coalesce(excluded.audio_storage_path, assignment_items.audio_storage_path),
          audio_file_name = coalesce(excluded.audio_file_name, assignment_items.audio_file_name),
          min_recording_sec = excluded.min_recording_sec,
          max_recording_sec = excluded.max_recording_sec,
          updated_at = now()
      `,
      [
        `${id}-item-1`,
        id,
        itemTypeFor(type),
        passageTitle || null,
        passageText,
        audioUrl,
        audioStoragePath,
        audioFileName,
        Number.isFinite(minRecordingSec) ? minRecordingSec : 0,
        Number.isFinite(maxRecordingSec) ? maxRecordingSec : 120,
      ],
    );

    for (const targetAssignment of targetAssignments) {
      const dueAt = toDueAt(targetAssignment.dueDate, targetAssignment.dueTime);
      const students = await findTargetStudents(client, targetAssignment);
      if (students.length === 0) {
        await client.query("rollback");
        return NextResponse.json({ error: "배정 대상 학생을 찾을 수 없습니다." }, { status: 400 });
      }
      classCounts.push({ classId: targetAssignment.classId, selectedCount: students.length });

      for (const student of students) {
        await client.query(
          `
            insert into assignment_targets (id, assignment_id, class_id, student_id, status, due_at)
            values ($1, $2, $3, $4, 'assigned', $5)
            on conflict (assignment_id, student_id)
            do update set
              class_id = excluded.class_id,
              due_at = excluded.due_at,
              status = case
                when assignment_targets.status in ('submitted', 'late') then assignment_targets.status
                else 'assigned'
              end,
              updated_at = now()
          `,
          [`target-${randomUUID()}`, id, targetAssignment.classId, student.id, dueAt],
        );
        assignedCount += 1;
      }
    }

    await client.query("commit");
  } catch (error) {
    await client.query("rollback");
    console.error(error);
    return NextResponse.json({ error: "과제 저장 중 오류가 발생했습니다." }, { status: 500 });
  } finally {
    client.release();
  }

  const row = await getAssignmentRow(id);
  return NextResponse.json({
    assignment: row ? await mapAssignment(row) : null,
    uploaded: {
      image: Boolean(imageStoragePath),
      audio: Boolean(audioStoragePath),
    },
    assignedCount,
    classCounts,
  });
}

function subjectForType(type: string) {
  if (type === "vocabulary") return "Phonics";
  if (type === "sentence_shadowing" || type === "image_speaking") return "AR";
  return "AL";
}

function parseTargetAssignments(value: FormDataEntryValue | null): AssignmentTargetInput[] {
  if (typeof value !== "string" || !value.trim()) return [];
  try {
    const parsed = JSON.parse(value) as AssignmentTargetInput[];
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item) => item.classId && item.dueDate);
  } catch {
    return [];
  }
}

function toDueAt(date: string, time: string) {
  if (!date) return null;
  return `${date}T${time || "23:59"}:00+09:00`;
}

async function findTargetStudents(
  client: PoolClient,
  target: AssignmentTargetInput,
) {
  if (target.targetMode === "partial" && target.selectedStudents.length > 0) {
    const result = await client.query<StudentTargetRow>(
      `
        select distinct s.id
        from students s
        join class_memberships cm on cm.student_id = s.id
        where s.teacher_id = $1
          and s.status = 'active'
          and cm.class_id = $2
          and s.id = any($3::text[])
      `,
      [mockTeacherId, target.classId, target.selectedStudents],
    );
    return result.rows;
  }

  const result = await client.query<StudentTargetRow>(
    `
      select distinct s.id
      from students s
      join class_memberships cm on cm.student_id = s.id
      where s.teacher_id = $1
        and s.status = 'active'
        and cm.class_id = $2
    `,
    [mockTeacherId, target.classId],
  );
  return result.rows;
}
