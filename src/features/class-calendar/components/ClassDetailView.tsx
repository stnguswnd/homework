"use client";

import { useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import { formatDue } from "@/lib/format";
import { cn } from "@/lib/utils";
import {
  classCalendarRepository,
  homeworkTypeLabel
} from "@/features/class-calendar/repositories/classCalendarRepository";
import type {
  ClassCalendarState,
  ClassHomeworkType,
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
  const [activeTab, setActiveTab] = useState<ClassDetailTab>("overview");
  const [selectedDate, setSelectedDate] = useState("2026-05-23");
  const [calendarState, setCalendarState] = useState(initialCalendarState);
  const [isHomeworkModalOpen, setIsHomeworkModalOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    setCalendarState(classCalendarRepository.loadState());
  }, []);

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

  function createHomework(formData: FormData) {
    const title = String(formData.get("title") ?? "").trim();
    if (!title) {
      setToast("숙제 제목을 입력해주세요.");
      return;
    }
    const ensured = ensureScheduleDay(calendarState, classItem.id, selectedDate);
    const result = classCalendarRepository.createHomeworkFromCalendar(
      {
        classId: classItem.id,
        scheduleDayId: ensured.day.id,
        assignedDate: selectedDate,
        studentIds: students.map((student) => student.id),
        title,
        type: String(formData.get("type")) as ClassHomeworkType,
        description: String(formData.get("description") ?? ""),
        dueAt: String(formData.get("dueAt") ?? ""),
        passageText: String(formData.get("passageText") ?? ""),
        audioFileName: String(formData.get("audioFileName") ?? ""),
        status: String(formData.get("status")) as "draft" | "published"
      },
      ensured.state
    );
    setCalendarState(result.state);
    setIsHomeworkModalOpen(false);
    setActiveTab("homework");
    setToast("숙제가 생성되고 학생별 배정이 만들어졌습니다.");
  }

  return (
    <div className="relative">
      {toast && <div className="fixed right-4 top-4 z-50 rounded-md bg-ink px-4 py-3 text-sm font-semibold text-white shadow-soft">{toast}</div>}
      <p className="mb-5 text-slate-600">{classItem.description}</p>
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

      {activeTab === "overview" && <ClassOverviewTab classItem={classItem} students={students} homeworkCount={homeworkRows.length} />}
      {activeTab === "calendar" && (
        <CalendarTab
          classItem={classItem}
          days={getMonthDays(selectedDate)}
          selectedDate={selectedDate}
          selectedDay={selectedDay}
          scheduleDays={classScheduleDays}
          calendarState={calendarState}
          onSelectDate={setSelectedDate}
          onMoveMonth={(offset) => setSelectedDate(moveMonth(selectedDate, offset))}
          onSave={updateScheduleDay}
          onOpenHomework={() => setIsHomeworkModalOpen(true)}
        />
      )}
      {activeTab === "homework" && <HomeworkStatusTab rows={homeworkRows} classId={classItem.id} />}

      {isHomeworkModalOpen && (
        <HomeworkModal
          selectedDate={selectedDate}
          onClose={() => setIsHomeworkModalOpen(false)}
          onSubmit={createHomework}
        />
      )}
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
              {selectedHomework.length === 0 ? <p className="text-sm text-slate-500">등록된 숙제가 없습니다.</p> : selectedHomework.map((homework) => <div key={homework.id} className="rounded-md border border-line p-3"><p className="font-semibold">{homework.title}</p><p className="text-sm text-slate-500">{homeworkTypeLabel(homework.type)} / {formatDue(homework.dueAt)}</p></div>)}
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
        <table className="w-full min-w-[820px] text-left text-sm">
          <thead className="text-slate-500"><tr><th className="py-2">숙제명</th><th>생성일</th><th>마감일</th><th>유형</th><th>상태</th><th>제출률</th><th>상세보기</th></tr></thead>
          <tbody>
            {rows.map(({ assignment, submittedCount, totalCount }) => (
              <tr key={assignment.id} className="border-t border-line">
                <td className="py-3 font-semibold">{assignment.title}</td>
                <td>{assignment.assignedDate}</td>
                <td>{formatDue(assignment.dueAt)}</td>
                <td>{homeworkTypeLabel(assignment.type)}</td>
                <td><Badge tone={assignment.status === "published" ? "green" : "gray"}>{assignment.status === "published" ? "게시됨" : assignment.status}</Badge></td>
                <td>{submittedCount}/{totalCount}</td>
                <td><Button href={`/teacher/classes/${classId}/assignments/${assignment.id}`} variant="secondary">상세보기</Button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

function HomeworkModal({
  selectedDate,
  onClose,
  onSubmit
}: {
  selectedDate: string;
  onClose: () => void;
  onSubmit: (formData: FormData) => void;
}) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/35 p-4" role="dialog" aria-modal="true">
      <form action={onSubmit} className="max-h-[90vh] w-full max-w-2xl overflow-auto rounded-lg bg-white p-5 shadow-soft">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div><p className="text-sm text-slate-500">{selectedDate}</p><h2 className="text-lg font-bold">날짜별 숙제 추가</h2></div>
          <button type="button" className="rounded-md px-3 py-2 text-sm font-semibold text-slate-500 hover:bg-slate-100" onClick={onClose}>닫기</button>
        </div>
        <div className="grid gap-4">
          <label className="grid gap-2 text-sm font-semibold">숙제 제목<Input name="title" required defaultValue="Unit 1 본문 녹음 숙제" /></label>
          <div className="grid gap-4 md:grid-cols-3">
            <label className="grid gap-2 text-sm font-semibold">숙제 유형<Select name="type"><option value="listening_recording">듣기/녹음</option><option value="writing">라이팅</option><option value="vocabulary">단어</option><option value="general">일반</option></Select></label>
            <label className="grid gap-2 text-sm font-semibold">마감일<Input name="dueAt" type="date" defaultValue="2026-05-25" /></label>
            <label className="grid gap-2 text-sm font-semibold">상태<Select name="status"><option value="published">게시됨</option><option value="draft">초안</option></Select></label>
          </div>
          <label className="grid gap-2 text-sm font-semibold">설명<Textarea name="description" defaultValue="학생에게 보일 숙제 안내입니다." /></label>
          <label className="grid gap-2 text-sm font-semibold">지문<Textarea name="passageText" placeholder="듣기/녹음 과제일 경우 입력" /></label>
          <label className="grid gap-2 text-sm font-semibold">MP3 파일명<Input name="audioFileName" placeholder="unit1_native.mp3" /></label>
          <div className="flex justify-end gap-2"><Button type="button" variant="secondary" onClick={onClose}>취소</Button><Button type="submit">숙제 생성</Button></div>
        </div>
      </form>
    </div>
  );
}
