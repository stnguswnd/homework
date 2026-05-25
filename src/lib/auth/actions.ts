"use server";

import { randomUUID } from "crypto";
import { redirect } from "next/navigation";

import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { createSession, destroySession, getDestinationForRole, type UserRole } from "@/lib/auth/session";
import { postgresPool, query } from "@/lib/postgres";

type ActionState = {
  error?: string;
};

type LoginUserRow = {
  id: string;
  username: string;
  password_hash: string;
  role: UserRole;
  display_name: string;
  linked_student_id: string | null;
};

function normalizeRole(value: FormDataEntryValue | null): UserRole | null {
  if (value === "teacher" || value === "student" || value === "parent") {
    return value;
  }

  return null;
}

export async function loginAction(_previousState: ActionState, formData: FormData): Promise<ActionState> {
  const username = String(formData.get("username") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!username || !password) {
    return { error: "아이디와 비밀번호를 입력해 주세요." };
  }

  const result = await query<LoginUserRow>(
    `
      select id, username, password_hash, role, display_name, linked_student_id
      from app_users
      where username = $1
      limit 1
    `,
    [username],
  );
  const user = result.rows[0];

  if (!user || !verifyPassword(password, user.password_hash)) {
    return { error: "아이디 또는 비밀번호가 올바르지 않습니다." };
  }

  await createSession({
    id: user.id,
    username: user.username,
    role: user.role,
    displayName: user.display_name,
    linkedStudentId: user.linked_student_id,
  });

  redirect(getDestinationForRole(user.role));
}

export async function signupAction(_previousState: ActionState, formData: FormData): Promise<ActionState> {
  const username = String(formData.get("username") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const displayName = String(formData.get("displayName") ?? "").trim();
  const role = normalizeRole(formData.get("role"));
  const studentLoginId = String(formData.get("studentLoginId") ?? "").trim();

  if (!username || !password || !displayName || !role) {
    return { error: "필수 항목을 모두 입력해 주세요." };
  }

  if (password.length < 8) {
    return { error: "비밀번호는 8자 이상이어야 합니다." };
  }

  if ((role === "student" || role === "parent") && !studentLoginId) {
    return { error: "학생 또는 부모님 계정은 학생 로그인 ID를 입력해야 합니다." };
  }

  const client = await postgresPool.connect();

  try {
    await client.query("begin");

    const existing = await client.query("select id from app_users where username = $1 limit 1", [username]);
    if (existing.rows[0]) {
      await client.query("rollback");
      return { error: "이미 사용 중인 아이디입니다." };
    }

    let linkedStudentId: string | null = null;

    if (role === "student" || role === "parent") {
      const student = await client.query<{ id: string }>("select id from students where student_login_id = $1 limit 1", [studentLoginId]);

      if (!student.rows[0]) {
        await client.query("rollback");
        return { error: "학생 로그인 ID를 찾을 수 없습니다. 강사가 학생을 먼저 등록해야 합니다." };
      }

      linkedStudentId = student.rows[0].id;
    }

    const userId = randomUUID();

    await client.query(
      `
        insert into app_users (id, username, password_hash, role, display_name, linked_student_id)
        values ($1, $2, $3, $4, $5, $6)
      `,
      [userId, username, hashPassword(password), role, displayName, linkedStudentId],
    );

    if (role === "teacher") {
      await client.query(
        `
          insert into teachers (id, app_user_id, email, display_name, role)
          values ($1, $2, $3, $4, 'teacher')
        `,
        [`teacher-${userId.slice(0, 8)}`, userId, username, displayName],
      );
    }

    if (role === "student" && linkedStudentId) {
      await client.query("update students set app_user_id = $1, updated_at = now() where id = $2", [userId, linkedStudentId]);
    }

    await client.query("commit");

    await createSession({
      id: userId,
      username,
      role,
      displayName,
      linkedStudentId,
    });
  } catch (error) {
    await client.query("rollback");
    console.error(error);
    return { error: "회원가입 중 오류가 발생했습니다. DB 스키마가 적용됐는지 확인해 주세요." };
  } finally {
    client.release();
  }

  redirect(getDestinationForRole(role));
}

export async function logoutAction() {
  await destroySession();
  redirect("/login");
}
