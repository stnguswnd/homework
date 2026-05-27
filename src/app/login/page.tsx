import { redirect } from "next/navigation";

import { LoginForm } from "@/app/login/LoginForm";
import { Card } from "@/components/ui/Card";
import { getCurrentUser, getDestinationForRole } from "@/lib/auth/session";
import { getStudentSession } from "@/server/auth/studentSession";

export default async function LoginPage() {
  const [user, studentSession] = await Promise.all([getCurrentUser(), getStudentSession()]);

  if (user) {
    redirect(getDestinationForRole(user.role));
  }

  if (studentSession) {
    redirect("/student/home");
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-paper px-4 py-10">
      <Card className="w-full max-w-md">
        <div className="mb-6">
          <p className="text-sm font-semibold text-action">Janetimes Studio</p>
          <h1 className="mt-1 text-2xl font-bold text-ink">로그인</h1>
          <p className="mt-2 text-sm text-slate-600">
            강사는 강사 계정으로, 학생은 강사가 만들어준 학생 아이디와 비밀번호로 로그인합니다.
          </p>
        </div>
        <LoginForm />
      </Card>
    </main>
  );
}
