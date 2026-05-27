"use client";

import { useRouter } from "next/navigation";
import { StudentLayout } from "@/components/layout/StudentLayout";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";

export default function StudentEntryPage() {
  const router = useRouter();
  return (
    <StudentLayout title="입장">
      <div className="mx-auto max-w-[820px] py-8 md:py-14">
        <Card className="rounded-[var(--radius-panel)] p-6 shadow-panel md:p-8">
        <Badge tone="green">Student Access</Badge>
        <h1 className="mt-4 text-[clamp(2.2rem,6vw,3.6rem)] font-bold leading-[1.3]">숙제 시작하기</h1>
        <p className="mt-3 text-base leading-7 text-[#5b655d]">Access code를 입력하거나 목업 학생으로 바로 들어갑니다.</p>
        <form className="mt-6 grid gap-3" onSubmit={(event) => { event.preventDefault(); router.push("/student/home"); }}>
          <Input placeholder="예: JIWOO24" />
          <Button type="submit" className="min-h-12 text-base">입장하기</Button>
          <Button href="/teacher/dashboard" variant="secondary">강사 화면으로</Button>
        </form>
        </Card>
      </div>
    </StudentLayout>
  );
}
