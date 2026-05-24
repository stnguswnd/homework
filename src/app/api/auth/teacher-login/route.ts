import { NextResponse } from "next/server";

import { verifyPassword } from "@/lib/auth/password";
import { createSession, type UserRole } from "@/lib/auth/session";
import { query } from "@/lib/postgres";

export const runtime = "nodejs";

type LoginUserRow = {
  id: string;
  username: string;
  password_hash: string;
  role: UserRole;
  display_name: string;
  linked_student_id: string | null;
};

export async function POST(request: Request) {
  const body = await request.json().catch(() => null) as { username?: string; password?: string } | null;
  const username = body?.username?.trim();
  const password = body?.password ?? "";

  if (!username || !password) {
    return NextResponse.json({ error: "아이디와 비밀번호를 입력해 주세요." }, { status: 400 });
  }

  const result = await query<LoginUserRow>(
    `
      select id, username, password_hash, role, display_name, linked_student_id
      from app_users
      where username = $1 and role = 'teacher'
      limit 1
    `,
    [username],
  );
  const user = result.rows[0];

  if (!user || !verifyPassword(password, user.password_hash)) {
    return NextResponse.json({ error: "아이디 또는 비밀번호가 올바르지 않습니다." }, { status: 401 });
  }

  await createSession({
    id: user.id,
    username: user.username,
    role: user.role,
    displayName: user.display_name,
    linkedStudentId: user.linked_student_id,
  });

  return NextResponse.json({
    user: {
      id: user.id,
      username: user.username,
      role: user.role,
      displayName: user.display_name,
    },
  });
}
