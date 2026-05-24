"use client";

import { Suspense, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { TeacherLayout } from "@/components/layout/TeacherLayout";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import { classCalendarRepository } from "@/features/class-calendar/repositories/classCalendarRepository";
import type { ClassHomeworkType, ClassScheduleDay } from "@/features/class-calendar/types/classCalendar";
import { mockRepository } from "@/mocks/mockRepository";

const DEFAULT_HOMEWORK_IMAGE_URL = "/mock-images/alphabet-cards.svg";

function ensureScheduleDay(classId: string, date: string) {
  const state = classCalendarRepository.loadState();
  const existing = state.scheduleDays.find((day) => day.classId === classId && day.date === date);
  if (existing) return { state, day: existing };
  const day: ClassScheduleDay = {
    id: `schedule-${classId}-${date}`,
    classId,
    date,
    hasClass: true,
    startTime: "16:00",
    endTime: "17:20",
    homeworkIds: []
  };
  return { state: { ...state, scheduleDays: [...state.scheduleDays, day] }, day };
}

function buildDueAt(date: string, time: string) {
  if (!date) return "";
  return `${date}T${time || "23:59"}:00`;
}

export default function NewAssignmentPage() {
  return (
    <Suspense fallback={<TeacherLayout title="숙제 생성"><Card><p className="text-sm text-slate-500">숙제 생성 화면을 불러오는 중입니다.</p></Card></TeacherLayout>}>
      <NewAssignmentForm />
    </Suspense>
  );
}

function NewAssignmentForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const classes = useMemo(() => mockRepository.getClasses(), []);
  const editAssignment = useMemo(() => {
    const assignmentId = searchParams.get("assignmentId");
    return assignmentId ? mockRepository.getAssignmentById(assignmentId) : undefined;
  }, [searchParams]);
  const isEditing = Boolean(editAssignment);
  const selectedClassId = searchParams.get("classId") ?? editAssignment?.classId ?? classes[0]?.id ?? "";
  const selectedDate = searchParams.get("date");
  const [message, setMessage] = useState("");
  const [imagePreview, setImagePreview] = useState(DEFAULT_HOMEWORK_IMAGE_URL);
  const editDueDate = editAssignment?.dueAt?.slice(0, 10) ?? "2026-05-25";
  const editDueTime = editAssignment?.dueAt?.match(/T(\d{2}:\d{2})/)?.[1] ?? "23:59";
  const editItem = editAssignment?.items[0];

  function previewImage(file?: File) {
    if (!file) {
      setImagePreview(DEFAULT_HOMEWORK_IMAGE_URL);
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") setImagePreview(reader.result);
    };
    reader.readAsDataURL(file);
  }

  return (
    <TeacherLayout title={isEditing ? "숙제 수정" : "숙제 생성"}>
      <Card>
        <form
          className="grid gap-5"
          onSubmit={(event) => {
            event.preventDefault();
            const formData = new FormData(event.currentTarget);
            const classId = String(formData.get("classId") ?? selectedClassId);
            const title = String(formData.get("title") ?? "").trim();
            const dueAt = buildDueAt(String(formData.get("dueDate") ?? ""), String(formData.get("dueTime") ?? ""));
            if (!classId) {
              setMessage("대상 반을 먼저 만들어주세요.");
              return;
            }
            if (!title) {
              setMessage("숙제 제목을 입력해주세요.");
              return;
            }
            if (selectedDate) {
              const ensured = ensureScheduleDay(classId, selectedDate);
              classCalendarRepository.createHomeworkFromCalendar(
                {
                  classId,
                  scheduleDayId: ensured.day.id,
                  assignedDate: selectedDate,
                  studentIds: mockRepository.getStudentsByClassId(classId).map((student) => student.id),
                  title,
                  type: String(formData.get("type")) as ClassHomeworkType,
                  description: String(formData.get("description") ?? ""),
                  imageUrl: imagePreview,
                  dueAt,
                  passageText: String(formData.get("passageText") ?? ""),
                  audioFileName: String(formData.get("audioFileName") ?? ""),
                  status: String(formData.get("status") ?? "published") as "draft" | "published" | "closed"
                },
                ensured.state
              );
              router.push(`/teacher/classes/${classId}`);
              return;
            }
            if (editAssignment) {
              router.push(`/teacher/assignments/${editAssignment.id}`);
              return;
            }
            router.push("/teacher/assignments/assignment-1");
          }}
        >
          {message && <p className="rounded-md bg-red-50 px-3 py-2 text-sm font-semibold text-danger">{message}</p>}
          <div className="grid gap-4 md:grid-cols-2">
            <label className="grid gap-2 text-sm font-semibold">숙제 제목<Input name="title" defaultValue={editAssignment?.title ?? "Discovery Unit 1 Speaking Homework"} /></label>
            <label className="grid gap-2 text-sm font-semibold">대상 반<Select name="classId" defaultValue={selectedClassId}>{classes.map((classItem) => <option key={classItem.id} value={classItem.id}>{classItem.name}</option>)}</Select></label>
            <label className="grid gap-2 text-sm font-semibold">마감일<Input name="dueDate" type="date" defaultValue={editDueDate} /></label>
            <label className="grid gap-2 text-sm font-semibold">마감 시간<Input name="dueTime" type="time" defaultValue={editDueTime} /></label>
            <label className="grid gap-2 text-sm font-semibold">숙제 유형<Select name="type" defaultValue={editAssignment?.assignmentType ?? "listening_recording"}><option value="listening_recording">듣기/녹음</option><option value="writing">라이팅</option><option value="quiz">퀴즈</option><option value="vocabulary">단어</option><option value="general">일반</option></Select></label>
            <label className="grid gap-2 text-sm font-semibold">공개 상태<Select name="status" defaultValue={editAssignment?.status === "closed" || editAssignment?.status === "archived" ? editAssignment.status : editAssignment?.status ?? "published"}><option value="published">게시됨</option><option value="draft">나만 보기</option><option value="closed">종료</option></Select></label>
            <label className="grid gap-2 text-sm font-semibold">원어민 MP3<Input type="file" accept="audio/*" /></label>
          </div>
          <label className="grid gap-2 text-sm font-semibold">설명<Textarea name="description" defaultValue={editAssignment?.description ?? "원어민 음성을 듣고 같은 속도로 읽어 보세요."} /></label>
          <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
            <label className="grid gap-2 text-sm font-semibold">
              숙제 이미지
              <Input
                type="file"
                accept="image/*"
                onChange={(event) => previewImage(event.target.files?.[0])}
              />
            </label>
            <div className="grid gap-2 text-sm font-semibold">
              이미지 미리보기
              <div className="overflow-hidden rounded-md border border-line bg-slate-50">
                <img src={imagePreview} alt="숙제 이미지 미리보기" className="h-40 w-full object-contain" />
              </div>
            </div>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <label className="grid gap-2 text-sm font-semibold">지문 제목<Input defaultValue={editItem?.title ?? "A Day at the Museum"} /></label>
            <div className="grid grid-cols-2 gap-3">
              <label className="grid gap-2 text-sm font-semibold">최소 녹음 시간<Input type="number" defaultValue={editItem?.minRecordingSec ?? 3} /></label>
              <label className="grid gap-2 text-sm font-semibold">최대 녹음 시간<Input type="number" defaultValue={editItem?.maxRecordingSec ?? 120} /></label>
            </div>
          </div>
          <label className="grid gap-2 text-sm font-semibold">지문 내용<Textarea name="passageText" defaultValue={editItem?.passageText ?? "I went to the museum with my family. We saw old paintings, shiny stones, and a big dinosaur. My favorite part was the space room."} /></label>
          <label className="grid gap-2 text-sm font-semibold">MP3 파일명<Input name="audioFileName" defaultValue={editItem?.audioFileName ?? ""} placeholder="unit1_native.mp3" /></label>
          <div className="flex justify-end gap-2"><Button href={editAssignment ? `/teacher/assignments/${editAssignment.id}` : "/teacher/assignments"} variant="secondary">취소</Button><Button type="submit">{isEditing ? "수정 저장" : "저장"}</Button></div>
        </form>
      </Card>
    </TeacherLayout>
  );
}
