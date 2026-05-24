"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { cn } from "@/lib/utils";

type LoginMode = "teacher" | "student";

export function LoginForm() {
  const router = useRouter();
  const [mode, setMode] = useState<LoginMode>("teacher");
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();

  function submit(formData: FormData) {
    setError("");
    startTransition(async () => {
      const endpoint = mode === "teacher" ? "/api/auth/teacher-login" : "/api/auth/student-login";
      const body = mode === "teacher"
        ? {
            username: String(formData.get("loginId") ?? "").trim(),
            password: String(formData.get("password") ?? ""),
          }
        : {
            studentLoginId: String(formData.get("loginId") ?? "").trim(),
            password: String(formData.get("password") ?? ""),
          };

      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        setError(data.error ?? "로그인에 실패했습니다.");
        return;
      }

      router.replace(mode === "teacher" ? "/teacher/dashboard" : "/student/home");
      router.refresh();
    });
  }

  return (
    <div className="grid gap-4">
      <div className="grid grid-cols-2 rounded-md border border-line bg-slate-50 p-1">
        {(["teacher", "student"] as const).map((item) => (
          <button
            key={item}
            type="button"
            className={cn(
              "rounded px-3 py-2 text-sm font-bold",
              mode === item ? "bg-white text-ink shadow-sm" : "text-slate-500",
            )}
            onClick={() => {
              setMode(item);
              setError("");
            }}
          >
            {item === "teacher" ? "강사" : "학생"}
          </button>
        ))}
      </div>

      <form action={submit} className="grid gap-4">
        <label className="grid gap-2 text-sm font-semibold text-slate-700">
          {mode === "teacher" ? "강사 아이디" : "학생 아이디"}
          <Input name="loginId" autoComplete="username" placeholder={mode === "teacher" ? "teacher" : "JIWOO24"} required />
        </label>
        <label className="grid gap-2 text-sm font-semibold text-slate-700">
          비밀번호
          <Input name="password" type="password" autoComplete="current-password" placeholder={mode === "teacher" ? "teacher123" : "student123"} required />
        </label>
        {error ? <p className="text-sm font-semibold text-danger">{error}</p> : null}
        <Button type="submit" className="min-h-12 text-base" disabled={pending}>
          {pending ? "로그인 중..." : "로그인"}
        </Button>
      </form>
    </div>
  );
}
