"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import { formatDue } from "@/lib/format";
import { cn } from "@/lib/utils";
import { mockRepository } from "@/mocks/mockRepository";
import {
  classCalendarRepository,
  homeworkTypeLabel
} from "@/features/class-calendar/repositories/classCalendarRepository";
import type {
  CalendarAssignment,
  ClassCalendarState,
  ClassScheduleDay
} from "@/features/class-calendar/types/classCalendar";
import type { Class } from "@/types/class";
import type { Student } from "@/types/student";

type ClassDetailTab = "overview" | "calendar" | "homework";

const tabs: Array<{ id: ClassDetailTab; label: string }> = [
  { id: "overview", label: "기본 관리" },
  { id: "calendar", label: "캘린더/진도관리" },
  { id: "homework", label: "숙제 현황" }
];

function isoDate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getMonthDays(baseDate: string) {
  const base = new Date(`${baseDate}T00:00:00`);
  const year = base.getFullYear();
  const month = base.getMonth();
  const last = new Date(year, month + 1, 0).getDate();
  return Array.from({ length: last }, (_, index) => isoDate(new Date(year, month, index + 1)));
}

function moveMonth(baseDate: string, offset: number) {
  const base = new Date(`${baseDate}T00:00:00`);
  return isoDate(new Date(base.getFullYear(), base.getMonth() + offset, 1));
}

function homeworkStatusLabel(status: CalendarAssignment["status"]) {
  if (status === "published") return "게시됨";
  if (status === "draft") return "나만 보기";
  return "종료";
}

function homeworkStatusTone(status: CalendarAssignment["status"]) {
  if (status === "published") return "green";
  if (status === "draft") return "gray";
  return "yellow";
}

function dueDayLabel(value?: string) {
  if (!value) return "-";
  const today = new Date("2026-05-24T00:00:00");
  const due = new Date(value);
  const diff = Math.ceil((new Date(due.getFullYear(), due.getMonth(), due.getDate()).getTime() - today.getTime()) / (24 * 60 * 60 * 1000));
  if (diff === 0) return "오늘 마감";
  return diff > 0 ? `D-${diff}` : `D+${Math.abs(diff)}`;
}

function ensureScheduleDay(state: ClassCalendarState, classId: string, date: string) {
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

export function ClassDetailView({
  classItem,
  students,
  initialCalendarState
}: {
  classItem: Class;
  students: Student[];
  initialCalendarState: ClassCalendarState;
}) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<ClassDetailTab>("overview");
  const [currentClass, setCurrentClass] = useState(classItem);
  const [selectedDate, setSelectedDate] = useState("2026-05-23");
  const [calendarState, setCalendarState] = useState(initialCalendarState);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    setCurrentClass(mockRepository.getClassById(classItem.id) ?? classItem);
    setCalendarState(classCalendarRepository.loadState());
  }, [classItem]);

  useEffect(() => {
    if (!toast) return;
    const id = window.setTimeout(() => setToast(null), 2200);
    return () => window.clearTimeout(id);
  }, [toast]);

  const classScheduleDays = useMemo(
    () => calendarState.scheduleDays.filter((day) => day.classId === classItem.id),
    [calendarState.scheduleDays, classItem.id]
  );
  const selectedDay = classScheduleDays.find((day) => day.date === selectedDate);
  const homeworkRows = classCalendarRepository.getClassHomeworkRows(classItem.id, students, calendarState);

  function updateScheduleDay(input: Partial<ClassScheduleDay>) {
    const ensured = ensureScheduleDay(calendarState, classItem.id, selectedDate);
    const nextDays = ensured.state.scheduleDays.map((day) =>
      day.id === ensured.day.id ? { ...day, ...input } : day
    );
    const nextState = { ...ensured.state, scheduleDays: nextDays };
    setCalendarState(nextState);
    classCalendarRepository.saveState(nextState);
    setToast("진도 기록이 저장되었습니다.");
  }

  return (
    <div className="relative">
      {toast && <div className="fixed right-4 top-4 z-50 rounded-md bg-ink px-4 py-3 text-sm font-semibold text-white shadow-soft">{toast}</div>}
      <p className="mb-5 text-slate-600">{currentClass.description}</p>
      <div className="mb-5 overflow-x-auto border-b border-line">
        <div className="flex min-w-max gap-5">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              className={cn(
                "border-b-2 px-1 py-3 text-sm font-bold",
                activeTab === tab.id ? "border-action text-action" : "border-transparent text-slate-500"
              )}
              aria-selected={activeTab === tab.id}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {activeTab === "overview" && <ClassOverviewTab classItem={currentClass} students={students} homeworkCount={homeworkRows.length} />}
      {activeTab === "calendar" && (
        <CalendarTab
          classItem={currentClass}
          days={getMonthDays(selectedDate)}
          selectedDate={selectedDate}
          selectedDay={selectedDay}
          scheduleDays={classScheduleDays}
          calendarState={calendarState}
          onSelectDate={setSelectedDate}
          onMoveMonth={(offset) => setSelectedDate(moveMonth(selectedDate, offset))}
          onSave={updateScheduleDay}
          onOpenHomework={() => router.push(`/teacher/assignments/new?classId=${classItem.id}&date=${selectedDate}`)}
        />
      )}
      {activeTab === "homework" && <HomeworkStatusTab rows={homeworkRows} classId={classItem.id} />}
    </div>
  );
}

function ClassOverviewTab({ classItem, students, homeworkCount }: { classItem: Class; students: Student[]; homeworkCount: number }) {
  return (
    <div className="grid gap-4 xl:grid-cols-[1fr_360px]">
      <div className="grid gap-4">
        <div className="grid gap-4 md:grid-cols-3">
          <Card><p className="text-sm text-slate-500">반 이름</p><p className="mt-2 text-xl font-bold">{classItem.name}</p></Card>
          <Card><p className="text-sm text-slate-500">학생 수</p><p className="mt-2 text-xl font-bold">{students.length}명</p></Card>
          <Card><p className="text-sm text-slate-500">캘린더 숙제</p><p className="mt-2 text-xl font-bold">{homeworkCount}개</p></Card>
        </div>
        <Card>
          <p className="text-sm text-slate-500">반 설명</p>
          <p className="mt-2">{classItem.description ?? "-"}</p>
        </Card>
        <Card>
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold">학생 목록</h2>
            <Button variant="secondary">학생 추가</Button>
          </div>
          <div className="mt-4 grid gap-2">
            {students.map((student) => (
              <div key={student.id} className="flex items-center justify-between rounded-md border border-line p-3">
                <span className="font-semibold">{student.name}</span>
                <div className="flex gap-2"><Badge>{student.accessCode}</Badge><Badge tone={student.status === "active" ? "green" : "gray"}>{student.status}</Badge></div>
              </div>
            ))}
          </div>
        </Card>
      </div>
      <Card>
        <label className="grid gap-2 text-sm font-semibold">
          반 운영 메모
          <Textarea defaultValue="월수반은 녹음 과제 제출 리마인드가 필요합니다." />
        </label>
        <div className="mt-4 flex justify-end"><Button>메모 저장</Button></div>
      </Card>
    </div>
  );
}

function CalendarTab({
  classItem,
  days,
  selectedDate,
  selectedDay,
  scheduleDays,
  calendarState,
  onSelectDate,
  onMoveMonth,
  onSave,
  onOpenHomework
}: {
  classItem: Class;
  days: string[];
  selectedDate: string;
  selectedDay?: ClassScheduleDay;
  scheduleDays: ClassScheduleDay[];
  calendarState: ClassCalendarState;
  onSelectDate: (date: string) => void;
  onMoveMonth: (offset: number) => void;
  onSave: (input: Partial<ClassScheduleDay>) => void;
  onOpenHomework: () => void;
}) {
  const [draft, setDraft] = useState<Partial<ClassScheduleDay>>(selectedDay ?? { hasClass: true });

  useEffect(() => {
    setDraft(selectedDay ?? { hasClass: true, startTime: "16:00", endTime: "17:20" });
  }, [selectedDay, selectedDate]);

  const monthTitle = new Intl.DateTimeFormat("ko-KR", { year: "numeric", month: "long" }).format(new Date(`${selectedDate}T00:00:00`));
  const selectedHomework = calendarState.assignments.filter((assignment) => selectedDay?.homeworkIds.includes(assignment.id));

  return (
    <div className="grid gap-4 xl:grid-cols-[1fr_420px]">
      <Card>
        <div className="flex items-center justify-between gap-3">
          <Button variant="secondary" onClick={() => onMoveMonth(-1)} aria-label="이전달로 이동">이전달</Button>
          <h2 className="text-lg font-bold">{monthTitle}</h2>
          <Button variant="secondary" onClick={() => onMoveMonth(1)} aria-label="다음달로 이동">다음달</Button>
        </div>
        <div className="mt-4 grid grid-cols-7 gap-2">
          {["일", "월", "화", "수", "목", "금", "토"].map((day) => <div key={day} className="text-center text-xs font-bold text-slate-500">{day}</div>)}
          {days.map((date) => {
            const scheduleDay = scheduleDays.find((day) => day.date === date);
            const hasHomework = scheduleDay?.homeworkIds.length;
            return (
              <button
                key={date}
                className={cn(
                  "min-h-20 rounded-md border p-2 text-left text-sm hover:border-action",
                  date === selectedDate ? "border-action bg-blue-50" : "border-line bg-white"
                )}
                onClick={() => onSelectDate(date)}
              >
                <span className="font-bold">{Number(date.slice(-2))}</span>
                <div className="mt-2 grid gap-1">
                  {scheduleDay?.hasClass && <Badge tone="blue">수업</Badge>}
                  {Boolean(hasHomework) && <Badge tone="yellow">숙제 {hasHomework}</Badge>}
                </div>
              </button>
            );
          })}
        </div>
      </Card>
      <Card>
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-sm text-slate-500">{classItem.name}</p>
            <h2 className="text-lg font-bold">{selectedDate}</h2>
          </div>
          <Button onClick={onOpenHomework}>숙제 추가</Button>
        </div>
        <div className="mt-4 grid gap-4">
          <label className="grid gap-2 text-sm font-semibold">수업 여부<Select value={draft.hasClass ? "yes" : "no"} onChange={(event) => setDraft({ ...draft, hasClass: event.target.value === "yes" })}><option value="yes">수업 있음</option><option value="no">수업 없음</option></Select></label>
          <div className="grid grid-cols-2 gap-3">
            <label className="grid gap-2 text-sm font-semibold">시작<Input type="time" value={draft.startTime ?? ""} onChange={(event) => setDraft({ ...draft, startTime: event.target.value })} /></label>
            <label className="grid gap-2 text-sm font-semibold">종료<Input type="time" value={draft.endTime ?? ""} onChange={(event) => setDraft({ ...draft, endTime: event.target.value })} /></label>
          </div>
          <label className="grid gap-2 text-sm font-semibold">교재<Input value={draft.bookTitle ?? ""} onChange={(event) => setDraft({ ...draft, bookTitle: event.target.value })} placeholder="e-future Discovery 4.1" /></label>
          <label className="grid gap-2 text-sm font-semibold">오늘 진도<Input value={draft.progressTitle ?? ""} onChange={(event) => setDraft({ ...draft, progressTitle: event.target.value })} placeholder="Unit 1 A Day at the Museum" /></label>
          <label className="grid gap-2 text-sm font-semibold">수업 내용<Textarea value={draft.progressMemo ?? ""} onChange={(event) => setDraft({ ...draft, progressMemo: event.target.value })} placeholder="학생에게 공유해도 되는 수업 요약을 적어주세요." /></label>
          <label className="grid gap-2 text-sm font-semibold">다음 준비<Textarea value={draft.nextPrep ?? ""} onChange={(event) => setDraft({ ...draft, nextPrep: event.target.value })} placeholder="다음 수업 전 준비할 내용을 적어주세요." /></label>
          <Button onClick={() => onSave(draft)}>진도 저장</Button>
          <div className="border-t border-line pt-4">
            <p className="mb-2 text-sm font-bold">이 날짜 숙제</p>
            <div className="grid gap-2">
              {selectedHomework.length === 0 ? <p className="text-sm text-slate-500">등록된 숙제가 없습니다.</p> : selectedHomework.map((homework) => <div key={homework.id} className="rounded-md border border-line p-3">{homework.imageUrl && <img src={homework.imageUrl} alt="" className="mb-3 h-24 w-full rounded-md object-contain bg-slate-50" />}<p className="font-semibold">{homework.title}</p><p className="text-sm text-slate-500">{homeworkTypeLabel(homework.type)} / {formatDue(homework.dueAt)}</p></div>)}
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}

function HomeworkStatusTab({
  rows,
  classId
}: {
  rows: ReturnType<typeof classCalendarRepository.getClassHomeworkRows>;
  classId: string;
}) {
  if (rows.length === 0) {
    return <Card><p className="text-sm text-slate-500">아직 등록된 숙제가 없습니다.</p></Card>;
  }
  return (
    <Card>
      <h2 className="text-lg font-bold">반 숙제 현황</h2>
      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[980px] text-left text-sm">
          <thead className="text-slate-500"><tr><th className="py-2">숙제명</th><th>마감</th><th>유형</th><th>상태</th><th>제출 현황</th><th>피드백</th><th>관리</th></tr></thead>
          <tbody>
            {rows.map(({ assignment, submittedCount, totalCount }) => {
              const missingCount = Math.max(0, totalCount - submittedCount);
              const progress = totalCount === 0 ? 0 : Math.round((submittedCount / totalCount) * 100);
              const feedbackNeeded = submittedCount;
              const feedbackDone = 0;
              return (
                <tr key={assignment.id} className="border-t border-line align-top">
                  <td className="py-3">
                    <p className="font-semibold">{assignment.title}</p>
                    <p className="mt-1 max-w-xs text-sm text-slate-500">{assignment.description || "학생에게 보일 숙제 안내입니다."}</p>
                  </td>
                  <td><p>{formatDue(assignment.dueAt)}</p><p className="mt-1 text-xs font-semibold text-slate-500">{dueDayLabel(assignment.dueAt)}</p></td>
                  <td><Badge>{homeworkTypeLabel(assignment.type)}</Badge></td>
                  <td><Badge tone={homeworkStatusTone(assignment.status)}>{homeworkStatusLabel(assignment.status)}</Badge></td>
                  <td>
                    <p>대상 {totalCount}명 · 제출 {submittedCount}명 · 미제출 {missingCount}명</p>
                    <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-action" style={{ width: `${progress}%` }} /></div>
                  </td>
                  <td><p>피드백 필요 {feedbackNeeded}명</p><p className="mt-1 text-slate-500">피드백 완료 {feedbackDone}명</p></td>
                  <td><Button href={`/teacher/assignments?calendarAssignmentId=${assignment.id}`} variant="secondary">숙제 관리로</Button></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
