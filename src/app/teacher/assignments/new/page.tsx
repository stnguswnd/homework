"use client";

import { useRouter } from "next/navigation";
import { TeacherLayout } from "@/components/layout/TeacherLayout";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import { mockRepository } from "@/mocks/mockRepository";

export default function NewAssignmentPage() {
  const router = useRouter();

  return (
    <TeacherLayout title="숙제 생성">
      <Card>
        <form
          className="grid gap-5"
          onSubmit={(event) => {
            event.preventDefault();
            router.push("/teacher/assignments/assignment-1");
          }}
        >
          <div className="grid gap-4 md:grid-cols-2">
            <label className="grid gap-2 text-sm font-semibold">숙제 제목<Input defaultValue="Discovery Unit 1 Speaking Homework" /></label>
            <label className="grid gap-2 text-sm font-semibold">대상 반<Select>{mockRepository.getClasses().map((classItem) => <option key={classItem.id}>{classItem.name}</option>)}</Select></label>
            <label className="grid gap-2 text-sm font-semibold">마감일<Input type="date" defaultValue="2026-05-25" /></label>
            <label className="grid gap-2 text-sm font-semibold">원어민 MP3<Input type="file" accept="audio/*" /></label>
          </div>
          <label className="grid gap-2 text-sm font-semibold">설명<Textarea defaultValue="원어민 음성을 듣고 같은 속도로 읽어 보세요." /></label>
          <div className="grid gap-4 md:grid-cols-2">
            <label className="grid gap-2 text-sm font-semibold">지문 제목<Input defaultValue="A Day at the Museum" /></label>
            <div className="grid grid-cols-2 gap-3">
              <label className="grid gap-2 text-sm font-semibold">최소 녹음 시간<Input type="number" defaultValue="3" /></label>
              <label className="grid gap-2 text-sm font-semibold">최대 녹음 시간<Input type="number" defaultValue="120" /></label>
            </div>
          </div>
          <label className="grid gap-2 text-sm font-semibold">지문 내용<Textarea defaultValue="I went to the museum with my family. We saw old paintings, shiny stones, and a big dinosaur. My favorite part was the space room." /></label>
          <div className="flex justify-end gap-2"><Button href="/teacher/assignments" variant="secondary">취소</Button><Button type="submit">저장</Button></div>
        </form>
      </Card>
    </TeacherLayout>
  );
}
