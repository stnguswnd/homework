import { NextResponse } from "next/server";

import { query } from "@/lib/postgres";
import { createSupabaseAdminClient } from "@/lib/supabase/server";
import { storageBuckets } from "@/lib/supabase/storage";
import { requireStudentSession } from "@/server/auth/studentSession";

export const runtime = "nodejs";

type AssignmentItemRow = {
  id: string;
  assignment_id: string;
  item_type: string;
  title: string | null;
  passage_text: string;
  audio_url: string | null;
  audio_file_name: string | null;
  audio_storage_path: string | null;
  image_url: string | null;
  image_storage_path: string | null;
  order_index: number;
  min_recording_sec: number;
  max_recording_sec: number;
};

type AssignmentRow = {
  id: string;
  title: string;
  description: string | null;
  assignment_type: string;
  image_url: string | null;
  image_storage_path: string | null;
  due_at: Date | null;
  target_status: string;
  created_at: Date;
  items: AssignmentItemRow[] | null;
};

async function signedUrl(bucket: string, path: string | null) {
  if (!path) return "";
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase.storage.from(bucket).createSignedUrl(path, 60 * 60);
  return error ? "" : data.signedUrl;
}

export async function GET() {
  let session;
  try {
    session = await requireStudentSession();
  } catch {
    return NextResponse.json({ error: "학생 로그인이 필요합니다." }, { status: 401 });
  }

  const result = await query<AssignmentRow>(
    `
      select
        a.id,
        a.title,
        a.description,
        a.assignment_type,
        a.image_url,
        a.image_storage_path,
        coalesce(at.due_at, a.due_at) as due_at,
        at.status as target_status,
        a.created_at,
        coalesce(
          json_agg(
            json_build_object(
              'id', ai.id,
              'assignment_id', ai.assignment_id,
              'item_type', ai.item_type,
              'title', ai.title,
              'passage_text', ai.passage_text,
              'audio_url', ai.audio_url,
              'audio_file_name', ai.audio_file_name,
              'audio_storage_path', ai.audio_storage_path,
              'image_url', ai.image_url,
              'image_storage_path', ai.image_storage_path,
              'order_index', ai.order_index,
              'min_recording_sec', ai.min_recording_sec,
              'max_recording_sec', ai.max_recording_sec
            )
            order by ai.order_index
          ) filter (where ai.id is not null),
          '[]'::json
        ) as items
      from assignment_targets at
      join assignments a on a.id = at.assignment_id
      left join assignment_items ai on ai.assignment_id = a.id
      where at.student_id = $1
      group by a.id, at.status, at.due_at
      order by coalesce(at.due_at, a.due_at, a.created_at) asc
    `,
    [session.studentId],
  );

  const assignments = await Promise.all(
    result.rows.map(async (row) => ({
      id: row.id,
      title: row.title,
      description: row.description ?? undefined,
      assignmentType: row.assignment_type,
      imageUrl: ((await signedUrl(storageBuckets.images, row.image_storage_path)) || row.image_url) ?? undefined,
      imageStoragePath: row.image_storage_path ?? undefined,
      dueAt: row.due_at?.toISOString(),
      status: row.target_status,
      createdAt: row.created_at.toISOString(),
      items: await Promise.all((row.items ?? []).map(async (item) => ({
        id: item.id,
        assignmentId: item.assignment_id,
        itemType: item.item_type,
        title: item.title ?? undefined,
        passageText: item.passage_text,
        audioUrl: ((await signedUrl(storageBuckets.audio, item.audio_storage_path)) || item.audio_url) ?? undefined,
        audioFileName: item.audio_file_name ?? undefined,
        audioStoragePath: item.audio_storage_path ?? undefined,
        imageUrl: item.image_url ?? undefined,
        imageStoragePath: item.image_storage_path ?? undefined,
        orderIndex: item.order_index,
        minRecordingSec: item.min_recording_sec,
        maxRecordingSec: item.max_recording_sec,
      }))),
    })),
  );

  return NextResponse.json(assignments);
}
