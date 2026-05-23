"use client";

import { useRouter } from "next/navigation";
import { StudentLayout } from "@/components/layout/StudentLayout";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";

export default function StudentEntryPage() {
  const router = useRouter();
  return (
    <StudentLayout title="입장">
      <Card>
        <h1 className="text-2xl font-bold">숙제 시작하기</h1>
        <p className="mt-2 text-slate-600">Access code를 입력하거나 목업 학생으로 바로 들어갑니다.</p>
        <form className="mt-6 grid gap-3" onSubmit={(event) => { event.preventDefault(); router.push("/student/home"); }}>
          <Input placeholder="예: JIWOO24" />
          <Button type="submit" className="min-h-12 text-base">입장하기</Button>
          <Button href="/teacher/dashboard" variant="secondary">강사 화면으로</Button>
        </form>
      </Card>
    </StudentLayout>
  );
}
