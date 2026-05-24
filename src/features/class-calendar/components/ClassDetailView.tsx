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

type SubjectName = "Phonics" | "AL" | "AR";
type ClassDetailTab = "overview" | "calendar" | "exams";

const tabs: Array<{ id: ClassDetailTab; label: string }> = [
  { id: "overview", label: "기본 관리" },
  { id: "calendar", label: "캘린더/진도관리" },
  { id: "exams", label: "시험 이력" }
];

const subjectList: Array<{ name: SubjectName; schedule: string }> = [
  { name: "Phonics", schedule: "월요일 17:00" },
  { name: "AL", schedule: "수요일 17:00" },
  { name: "AR", schedule: "금요일 17:00" }
];

function mockSubjectScore(studentId: string, subject: SubjectName) {
  const base = studentId.charCodeAt(studentId.length - 1) || 70;
  const offset = subject === "Phonics" ? 4 : subject === "AL" ? 9 : 13;
  return Math.min(100, 60 + ((base + offset) % 36));
}

function subjectAssignments(assignments: ClassCalendarState["assignments"], subject: SubjectName) {
  return assignments.filter((assignment) => {
    if (subject === "Phonics") return assignment.type === "vocabulary";
    if (subject === "AL") return assignment.type === "listening_recording" || assignment.type === "free_speaking";
    return assignment.type === "sentence_shadowing" || assignment.type === "image_speaking";
  });
}

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

      {activeTab === "overview" && <ClassOverviewTab classItem={currentClass} students={students} homeworkCount={homeworkRows.length} calendarState={calendarState} />}
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
      {activeTab === "exams" && <ExamHistoryTab students={students} classId={classItem.id} />}
    </div>
  );
}

function ClassOverviewTab({
  classItem,
  students,
  homeworkCount,
  calendarState
}: {
  classItem: Class;
  students: Student[];
  homeworkCount: number;
  calendarState: ClassCalendarState;
}) {
  return (
    <div className="grid gap-4">
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
        <SubmissionHistorySummary students={students} calendarState={calendarState} classId={classItem.id} />
      </div>
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

function SubmissionHistorySummary({
  students,
  calendarState,
  classId
}: {
  students: Student[];
  calendarState: ClassCalendarState;
  classId: string;
}) {
  const classAssignments = calendarState.assignments.filter((assignment) => assignment.classId === classId);

  return (
    <Card>
      <div className="mb-4">
        <h2 className="text-lg font-bold">제출 이력</h2>
        <p className="mt-1 text-sm text-slate-500">과목별 숙제 안에서 학생별 제출 상태를 확인합니다.</p>
      </div>
      <div className="overflow-x-auto pb-2">
        <div className="flex min-w-max gap-4">
          {subjectList.map((subject) => (
            <SubjectSubmissionCard
              key={subject.name}
              subject={subject}
              students={students}
              assignments={classAssignments}
              targets={calendarState.assignmentTargets}
            />
          ))}
        </div>
      </div>
    </Card>
  );
}

function SubjectSubmissionCard({
  subject,
  students,
  assignments,
  targets
}: {
  subject: { name: SubjectName; schedule: string };
  students: Student[];
  assignments: ClassCalendarState["assignments"];
  targets: ClassCalendarState["assignmentTargets"];
}) {
  const filteredAssignments = subjectAssignments(assignments, subject.name);

  return (
    <section className="w-[360px] shrink-0 rounded-md border border-line bg-white p-3">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h3 className="font-bold">{subject.name}</h3>
        <Badge tone="blue">{filteredAssignments.length}개</Badge>
      </div>
      <div className="grid gap-3">
        {filteredAssignments.length === 0 ? (
          <p className="rounded-md border border-dashed border-line p-4 text-center text-sm text-slate-500">이 과목에 연결된 숙제가 없습니다.</p>
        ) : (
          filteredAssignments.map((assignment) => {
            const submittedStudents = students.filter((student) => {
              const target = targets.find((item) => item.assignmentId === assignment.id && item.studentId === student.id);
              return target?.status === "submitted" || target?.status === "late";
            });
            const missingStudents = students.filter((student) => {
              const target = targets.find((item) => item.assignmentId === assignment.id && item.studentId === student.id);
              return !target || target.status === "assigned";
            });

            return (
              <article key={assignment.id} className="rounded-md border border-line bg-slate-50 p-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h4 className="truncate font-bold">{assignment.title}</h4>
                    <p className="mt-1 text-xs text-slate-500">{formatDue(assignment.dueAt)}</p>
                  </div>
                  <Badge tone={homeworkStatusTone(assignment.status)}>{homeworkStatusLabel(assignment.status)}</Badge>
                </div>
                <div className="mt-3 grid gap-2 text-sm">
                  <div className="grid grid-cols-[64px_1fr] gap-2">
                    <p className="pt-1 text-xs font-bold text-blue-700">제출</p>
                    <div className="flex min-w-0 flex-wrap gap-1.5">
                      {submittedStudents.length > 0 ? submittedStudents.map((student) => <StudentStatusPill key={`${assignment.id}-${student.id}-submitted`} student={student} tone="submitted" />) : <span className="text-xs text-slate-400">없음</span>}
                    </div>
                  </div>
                  <div className="grid grid-cols-[64px_1fr] gap-2 border-t border-line pt-2">
                    <p className="pt-1 text-xs font-bold text-red-700">미완료</p>
                    <div className="flex min-w-0 flex-wrap gap-1.5">
                      {missingStudents.length > 0 ? missingStudents.map((student) => <StudentStatusPill key={`${assignment.id}-${student.id}-missing`} student={student} tone="missing" />) : <span className="text-xs text-slate-400">없음</span>}
                    </div>
                  </div>
                </div>
              </article>
            );
          })
        )}
      </div>
    </section>
  );
}

function StudentStatusPill({ student, tone }: { student: Student; tone: "submitted" | "missing" }) {
  return (
    <Button href={`/teacher/students/${student.id}`} variant="ghost" className={`min-h-0 max-w-full rounded-full border px-3 py-1.5 text-sm font-bold ${tone === "submitted" ? "border-blue-100 bg-blue-50 text-blue-700 hover:bg-blue-100" : "border-red-100 bg-red-50 text-red-700 hover:bg-red-100"}`}>
      <span className="truncate">{student.name}</span>
    </Button>
  );
}

function ExamHistoryTab({
  students,
  classId
}: {
  students: Student[];
  classId: string;
}) {
  return (
    <div className="grid gap-4">
      <Card>
        <h2 className="text-lg font-bold">시험 이력</h2>
        <p className="mt-1 text-sm text-slate-500">과목별 시험 점수를 학생 단위로 기재하고 관리합니다.</p>
      </Card>
      <div className="grid gap-4 lg:grid-cols-2 2xl:grid-cols-3">
        {subjectList.map((subject) => (
          <ExamHistoryCard key={subject.name} subject={subject} students={students} classId={classId} />
        ))}
      </div>
    </div>
  );
}

function ExamHistoryCard({
  subject,
  students,
  classId
}: {
  subject: { name: SubjectName; schedule: string };
  students: Student[];
  classId: string;
}) {
  return (
    <section className="flex min-h-[460px] flex-col rounded-lg border border-line bg-white p-4 shadow-soft">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-xl font-bold">{subject.name}</h3>
          <p className="mt-1 text-sm font-semibold text-slate-500">{subject.schedule}</p>
        </div>
        <Button type="button" variant="secondary" className="min-h-9 px-3 py-1.5 text-xs">시험 추가</Button>
      </div>
      <div className="mt-4 grid gap-3">
        {students.map((student) => {
          return (
            <article key={student.id} className="rounded-md border border-line bg-slate-50 p-3">
              <div className="flex items-center justify-between gap-3">
                <h4 className="font-bold">{student.name}</h4>
                <label className="flex items-center gap-2 text-xs font-bold text-slate-500">
                  시험 점수
                  <Input className="h-9 w-20 bg-white text-right" type="number" min={0} max={100} defaultValue={mockSubjectScore(student.id, subject.name)} />
                </label>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-slate-500">
                <div className="rounded-md bg-white p-2">
                  <p className="font-bold text-slate-700">최근 시험</p>
                  <p className="mt-1">2026-05-2{student.id.slice(-1)}</p>
                </div>
                <div className="rounded-md bg-white p-2">
                  <p className="font-bold text-slate-700">반영 반</p>
                  <p className="mt-1">{classId}</p>
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
