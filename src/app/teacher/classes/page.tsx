"use client";

import { useState } from "react";
import { TeacherLayout } from "@/components/layout/TeacherLayout";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { mockRepository } from "@/mocks/mockRepository";
import type { Class } from "@/types/class";

export default function ClassesPage() {
  const [classes, setClasses] = useState<Class[]>(() => mockRepository.getClasses());
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [message, setMessage] = useState("");

  function createClass(formData: FormData) {
    const name = String(formData.get("name") ?? "").trim();
    if (!name) {
      setMessage("반 이름을 입력해주세요.");
      return;
    }
    const classItem = mockRepository.createClass({
      name,
      description: String(formData.get("description") ?? "").trim()
    });
    setClasses((current) => [classItem, ...current]);
    setIsCreateOpen(false);
    setMessage("반이 생성되었습니다.");
  }

  return (
    <TeacherLayout title="반 목록">
      <div className="mb-4 flex items-center justify-between gap-3">
        <p className="text-sm font-semibold text-slate-500">{message}</p>
        <Button onClick={() => setIsCreateOpen(true)}>반 만들기</Button>
      </div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {classes.map((classItem) => (
          <Card key={classItem.id}>
            <div className="flex items-start justify-between gap-3">
              <h2 className="text-lg font-bold">{classItem.name}</h2>
              <Badge tone={classItem.status === "active" ? "green" : "gray"}>{classItem.status}</Badge>
            </div>
            <p className="mt-2 text-sm text-slate-600">{classItem.description}</p>
            <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
              <div><dt className="text-slate-500">학생</dt><dd className="font-bold">{classItem.studentCount}명</dd></div>
              <div><dt className="text-slate-500">진행 숙제</dt><dd className="font-bold">{classItem.activeAssignmentCount}개</dd></div>
            </dl>
            <Button href={`/teacher/classes/${classItem.id}`} className="mt-4 w-full" variant="secondary">상세 보기</Button>
          </Card>
        ))}
      </div>
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/35 p-4" role="dialog" aria-modal="true">
          <form action={createClass} className="w-full max-w-lg rounded-lg bg-white p-5 shadow-soft">
            <div className="mb-4 flex items-center justify-between gap-3">
              <h2 className="text-lg font-bold">반 만들기</h2>
              <button type="button" className="rounded-md px-3 py-2 text-sm font-semibold text-slate-500 hover:bg-slate-100" onClick={() => setIsCreateOpen(false)}>닫기</button>
            </div>
            <div className="grid gap-4">
              <label className="grid gap-2 text-sm font-semibold">반 이름<Input name="name" required placeholder="월수 Basic Speaking" /></label>
              <label className="grid gap-2 text-sm font-semibold">반 설명<Textarea name="description" placeholder="초등 4-5학년 말하기 기초반" /></label>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="secondary" onClick={() => setIsCreateOpen(false)}>취소</Button>
                <Button type="submit">생성</Button>
              </div>
            </div>
          </form>
        </div>
      )}
    </TeacherLayout>
  );
}
