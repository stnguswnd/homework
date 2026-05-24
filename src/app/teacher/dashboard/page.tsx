"use client";

import { useMemo, useState } from "react";
import { TeacherLayout } from "@/components/layout/TeacherLayout";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { formatDue } from "@/lib/format";
import { mockRepository } from "@/mocks/mockRepository";
import type { Student } from "@/types/student";

type ScheduleType = "class_schedule" | "homework_due";
type ScheduleStatus = "scheduled" | "due_today" | "closed";

type ScheduleHomework = {
  id: string;
  title: string;
  typeLabel: string;
  dueLabel: string;
};

type BaseSchedule = {
  id: string;
  date: string;
  dayLabel: string;
  dateLabel: string;
  type: ScheduleType;
  typeLabel: string;
  title: string;
  status: ScheduleStatus;
  statusLabel: string;
  memo: string;
};

type ClassSchedule = BaseSchedule & {
  type: "class_schedule";
  classId: string;
  classHref: string;
  startTime: string;
  endTime: string;
  hasClass: boolean;
  bookTitle: string;
  progressTitle: string;
  progressMemo: string;
  nextPrep: string;
  homeworkCount: number;
  homeworks: ScheduleHomework[];
};

type HomeworkDueSchedule = BaseSchedule & {
  type: "homework_due";
  classId: string;
  classHref: string;
  homeworkHref: string;
  submissionsHref: string;
  time: string;
  homeworkTypeLabel: string;
  relatedClass: string;
  relatedHomework: string;
  targetStudentCount: number;
  submittedCount: number;
  unsubmittedCount: number;
};

type DashboardSchedule = ClassSchedule | HomeworkDueSchedule;

const dashboardWeeklySchedules: DashboardSchedule[] = [
  {
    id: "sch-1",
    date: "2026-05-24",
    dayLabel: "일",
    dateLabel: "5/24",
    startTime: "04:00 PM",
    endTime: "05:20 PM",
    type: "class_schedule",
    classId: "class-a",
    classHref: "/teacher/classes/class-a",
    typeLabel: "수업",
    title: "월수 Basic Speaking",
    status: "scheduled",
    statusLabel: "예정",
    hasClass: true,
    bookTitle: "e-future Discovery 4.1",
    progressTitle: "Unit 1 A Day at the Museum",
    progressMemo: "본문 듣기와 핵심 표현 shadowing 진행",
    nextPrep: "Unit 1 단어 복습",
    homeworkCount: 3,
    homeworks: [
      { id: "hw-1", title: "Unit 1 본문 녹음 숙제", typeLabel: "듣기/녹음", dueLabel: "5월 25일 오후 11:59" },
      { id: "hw-2", title: "Unit 1 단어 숙제", typeLabel: "단어", dueLabel: "5월 25일 오후 11:59" },
      { id: "hw-3", title: "Unit 1 표현 따라 읽기", typeLabel: "문장 따라 읽기", dueLabel: "5월 26일 오후 11:59" }
    ],
    memo: "오늘 진행 예정인 수업입니다."
  },
  {
    id: "sch-2",
    date: "2026-05-24",
    dayLabel: "일",
    dateLabel: "5/24",
    time: "23:59",
    type: "homework_due",
    classId: "class-a",
    classHref: "/teacher/classes/class-a",
    homeworkHref: "/teacher/assignments/assignment-1",
    submissionsHref: "/teacher/assignments/assignment-1/submissions",
    typeLabel: "숙제 마감",
    title: "Unit 1 본문 녹음 숙제",
    homeworkTypeLabel: "듣기/녹음",
    relatedClass: "월수 Basic Speaking",
    relatedHomework: "Unit 1 본문 녹음 숙제",
    targetStudentCount: 8,
    submittedCount: 2,
    unsubmittedCount: 6,
    status: "due_today",
    statusLabel: "오늘 마감",
    memo: "오늘까지 제출해야 하는 녹음 숙제입니다."
  },
  {
    id: "sch-3",
    date: "2026-05-25",
    dayLabel: "월",
    dateLabel: "5/25",
    startTime: "05:00 PM",
    endTime: "06:20 PM",
    type: "class_schedule",
    classId: "class-b",
    classHref: "/teacher/classes/class-b",
    typeLabel: "수업",
    title: "화목 Reading Plus",
    status: "scheduled",
    statusLabel: "예정",
    hasClass: true,
    bookTitle: "e-future Discovery 4.1",
    progressTitle: "Unit 1 Key Expressions",
    progressMemo: "박물관 관련 표현 말하기 연습과 짧은 발표 진행",
    nextPrep: "Unit 1 Workbook p.12 확인",
    homeworkCount: 2,
    homeworks: [
      { id: "hw-4", title: "Discovery Unit 1 Speaking Homework", typeLabel: "듣기/녹음", dueLabel: "5월 26일 오후 11:59" },
      { id: "hw-5", title: "Unit 1 표현 녹음", typeLabel: "자유 말하기", dueLabel: "5월 27일 오후 11:59" }
    ],
    memo: "화목 리딩 플러스 수업입니다."
  },
  {
    id: "sch-4",
    date: "2026-05-25",
    dayLabel: "월",
    dateLabel: "5/25",
    time: "23:59",
    type: "homework_due",
    classId: "class-b",
    classHref: "/teacher/classes/class-b",
    homeworkHref: "/teacher/assignments/assignment-2",
    submissionsHref: "/teacher/assignments/assignment-2/submissions",
    typeLabel: "숙제 마감",
    title: "Reading Plus Shadowing 03",
    homeworkTypeLabel: "문장 따라 읽기",
    relatedClass: "화목 Reading Plus",
    relatedHomework: "Reading Plus Shadowing 03",
    targetStudentCount: 6,
    submittedCount: 0,
    unsubmittedCount: 6,
    status: "scheduled",
    statusLabel: "예정",
    memo: "리딩 플러스 shadowing 숙제 마감 일정입니다."
  },
  {
    id: "sch-5",
    date: "2026-05-26",
    dayLabel: "화",
    dateLabel: "5/26",
    startTime: "04:00 PM",
    endTime: "05:20 PM",
    type: "class_schedule",
    classId: "class-a",
    classHref: "/teacher/classes/class-a",
    typeLabel: "수업",
    title: "월수 Basic Speaking",
    status: "scheduled",
    statusLabel: "예정",
    hasClass: true,
    bookTitle: "Reading Plus Starter",
    progressTitle: "Chapter 3 Main Idea",
    progressMemo: "본문 읽기 후 중심 문장 찾기와 짧은 요약 훈련",
    nextPrep: "Chapter 3 단어 테스트 준비",
    homeworkCount: 1,
    homeworks: [
      { id: "hw-6", title: "Reading Plus Shadowing 03", typeLabel: "문장 따라 읽기", dueLabel: "5월 28일 오후 11:59" }
    ],
    memo: "월수반 리딩 진도 수업입니다."
  },
  {
    id: "sch-6",
    date: "2026-05-27",
    dayLabel: "수",
    dateLabel: "5/27",
    time: "22:00",
    type: "homework_due",
    classId: "class-a",
    classHref: "/teacher/classes/class-a",
    homeworkHref: "/teacher/assignments",
    submissionsHref: "/teacher/assignments",
    typeLabel: "숙제 마감",
    title: "Picture Talk Practice",
    homeworkTypeLabel: "이미지 보고 말하기",
    relatedClass: "월수 Basic Speaking",
    relatedHomework: "Picture Talk Practice",
    targetStudentCount: 10,
    submittedCount: 5,
    unsubmittedCount: 5,
    status: "scheduled",
    statusLabel: "예정",
    memo: "이미지를 보고 말하는 숙제 마감입니다."
  },
  {
    id: "sch-7",
    date: "2026-05-29",
    dayLabel: "금",
    dateLabel: "5/29",
    startTime: "06:30 PM",
    endTime: "07:50 PM",
    type: "class_schedule",
    classId: "class-b",
    classHref: "/teacher/classes/class-b",
    typeLabel: "수업",
    title: "화목 Reading Plus",
    status: "scheduled",
    statusLabel: "예정",
    hasClass: true,
    bookTitle: "Reading Plus Intermediate",
    progressTitle: "Shadowing 03 Fluency Check",
    progressMemo: "문장 단위 shadowing 후 억양과 속도 피드백",
    nextPrep: "Shadowing 04 음원 미리 듣기",
    homeworkCount: 1,
    homeworks: [
      { id: "hw-7", title: "Reading Plus Shadowing 03", typeLabel: "문장 따라 읽기", dueLabel: "5월 28일 오후 11:59" }
    ],
    memo: "리딩 플러스 심화반 수업입니다."
  },
  {
    id: "sch-8",
    date: "2026-05-28",
    dayLabel: "목",
    dateLabel: "5/28",
    time: "23:59",
    type: "homework_due",
    classId: "class-b",
    classHref: "/teacher/classes/class-b",
    homeworkHref: "/teacher/assignments/assignment-2",
    submissionsHref: "/teacher/assignments/assignment-2/submissions",
    typeLabel: "숙제 마감",
    title: "Reading Plus Shadowing 03",
    homeworkTypeLabel: "문장 따라 읽기",
    relatedClass: "화목 Reading Plus",
    relatedHomework: "Reading Plus Shadowing 03",
    targetStudentCount: 7,
    submittedCount: 0,
    unsubmittedCount: 7,
    status: "scheduled",
    statusLabel: "예정",
    memo: "문장을 듣고 자연스럽게 따라 읽는 숙제입니다."
  }
];

const baseWeekDays = [
  { date: "2026-05-25", dayLabel: "월", dateLabel: "5/25" },
  { date: "2026-05-26", dayLabel: "화", dateLabel: "5/26" },
  { date: "2026-05-27", dayLabel: "수", dateLabel: "5/27" },
  { date: "2026-05-28", dayLabel: "목", dateLabel: "5/28" },
  { date: "2026-05-29", dayLabel: "금", dateLabel: "5/29" }
];

const weekStartDate = "2026-05-24";

function addDaysToIso(date: string, days: number) {
  const [year, month, day] = date.split("-").map(Number);
  const nextDate = new Date(Date.UTC(year, month - 1, day + days));
  const nextYear = nextDate.getUTCFullYear();
  const nextMonth = String(nextDate.getUTCMonth() + 1).padStart(2, "0");
  const nextDay = String(nextDate.getUTCDate()).padStart(2, "0");
  return `${nextYear}-${nextMonth}-${nextDay}`;
}

function formatDateLabel(date: string) {
  const [, month, day] = date.split("-");
  return `${Number(month)}/${Number(day)}`;
}

function formatWeekRange(weekOffset: number) {
  const start = addDaysToIso(weekStartDate, weekOffset * 7);
  const end = addDaysToIso(start, 6);
  return `${start.replaceAll("-", ".")} - ${end.replaceAll("-", ".")}`;
}

function typeTone(type: ScheduleType) {
  if (type === "class_schedule") return "blue";
  return "yellow";
}

function statusTone(status: DashboardSchedule["status"]) {
  if (status === "due_today") return "yellow";
  if (status === "closed") return "red";
  return "gray";
}

export default function TeacherDashboardPage() {
  const summary = mockRepository.getTeacherDashboardSummary();
  const classes = mockRepository.getClasses();
  const [calendarFilter, setCalendarFilter] = useState<"week" | "homework">("week");
  const [weekOffset, setWeekOffset] = useState(0);
  const [selectedSchedule, setSelectedSchedule] = useState<DashboardSchedule | null>(null);
  const pendingReviewCount = summary.recentSubmissions.filter((submission) => submission.status === "submitted").length;

  const selectedWeekDays = useMemo(
    () =>
      baseWeekDays.map((day, index) => {
        const date = addDaysToIso(day.date, weekOffset * 7);
        return { ...day, date, dateLabel: formatDateLabel(date) };
      }),
    [weekOffset]
  );

  const metrics: Array<[string, number]> = [
    ["총 반 수", summary.classCount],
    ["총 학생 수", summary.studentCount],
    ["이번 주 일정", dashboardWeeklySchedules.length],
    ["오늘 마감", dashboardWeeklySchedules.filter((item) => item.type === "homework_due" && item.status === "due_today").length],
    ["확인 대기", pendingReviewCount]
  ];

  const filteredSchedules = useMemo(() => {
    if (calendarFilter === "homework") return dashboardWeeklySchedules.filter((item) => item.type === "homework_due");
    return dashboardWeeklySchedules;
  }, [calendarFilter]);

  return (
    <TeacherLayout title="대시보드">
      <SummaryCards metrics={metrics} />
      <div className="mt-6">
        <WeeklyCalendarCard
          filter={calendarFilter}
          setFilter={setCalendarFilter}
          schedules={filteredSchedules}
          days={selectedWeekDays}
          weekRangeLabel={formatWeekRange(weekOffset)}
          onPrevWeek={() => setWeekOffset((value) => value - 1)}
          onNextWeek={() => setWeekOffset((value) => value + 1)}
          onThisWeek={() => {
            setWeekOffset(0);
            setCalendarFilter("week");
          }}
          onSelect={setSelectedSchedule}
        />
      </div>
      <ClassStudentSummary classes={classes} />
      {selectedSchedule && <ScheduleDetailPanel schedule={selectedSchedule} onClose={() => setSelectedSchedule(null)} />}
    </TeacherLayout>
  );
}

function SummaryCards({ metrics }: { metrics: Array<[string, number]> }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
      {metrics.map(([label, value]) => (
        <Card key={label}>
          <p className="text-sm text-slate-500">{label}</p>
          <p className="mt-2 text-3xl font-bold">{value}</p>
        </Card>
      ))}
    </div>
  );
}

function WeeklyCalendarCard({
  filter,
  setFilter,
  schedules,
  days,
  weekRangeLabel,
  onPrevWeek,
  onNextWeek,
  onThisWeek,
  onSelect
}: {
  filter: "week" | "homework";
  setFilter: (filter: "week" | "homework") => void;
  schedules: DashboardSchedule[];
  days: Array<{ date: string; dayLabel: string; dateLabel: string }>;
  weekRangeLabel: string;
  onPrevWeek: () => void;
  onNextWeek: () => void;
  onThisWeek: () => void;
  onSelect: (schedule: DashboardSchedule) => void;
}) {
  return (
    <Card>
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-lg font-bold">이번 주 캘린더</h2>
          <p className="mt-1 text-sm text-slate-500">수업 시간표, 진도 요약, 숙제 마감을 한 주 단위로 확인합니다.</p>
        </div>
      </div>
      <div className="mt-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-2">
          <Button type="button" variant="secondary" onClick={onPrevWeek}>이전주</Button>
          <p className="min-w-[190px] text-center text-sm font-bold text-slate-700">{weekRangeLabel}</p>
          <Button type="button" variant="secondary" onClick={onNextWeek}>다음주</Button>
        </div>
        <div className="flex flex-wrap gap-2">
          <button className={`rounded-md px-3 py-2 text-sm font-bold ${filter === "week" ? "bg-action text-white" : "border border-line bg-white text-slate-600"}`} onClick={onThisWeek}>이번 주</button>
          <button className={`rounded-md px-3 py-2 text-sm font-bold ${filter === "homework" ? "bg-action text-white" : "border border-line bg-white text-slate-600"}`} onClick={() => setFilter("homework")}>숙제만 보기</button>
        </div>
      </div>
      <div className="mt-4 overflow-x-auto pb-2">
        <div className="grid min-w-max grid-flow-col auto-cols-[minmax(250px,280px)] gap-3">
        {days.map((day) => (
          <WeeklyCalendarDayColumn key={day.date} day={day} schedules={schedules.filter((item) => item.date === day.date)} onSelect={onSelect} />
        ))}
        </div>
      </div>
    </Card>
  );
}

function WeeklyCalendarDayColumn({
  day,
  schedules,
  onSelect
}: {
  day: { date: string; dayLabel: string; dateLabel: string };
  schedules: DashboardSchedule[];
  onSelect: (schedule: DashboardSchedule) => void;
}) {
  return (
    <div className="min-w-0 rounded-md border border-line bg-white p-3">
      <div className="flex items-center justify-between">
        <h3 className="font-bold">{day.dayLabel} {day.dateLabel}</h3>
      </div>
      <div className="mt-3 grid max-h-80 gap-2 overflow-y-auto pr-1">
        {schedules.length === 0 ? (
          <p className="px-1 py-2 text-sm text-slate-400">일정 없음</p>
        ) : (
          schedules
            .slice()
            .sort((a, b) => getScheduleTime(a).localeCompare(getScheduleTime(b)))
            .map((schedule) => <WeeklyScheduleItem key={schedule.id} schedule={schedule} onSelect={onSelect} />)
        )}
      </div>
    </div>
  );
}

function getScheduleTime(schedule: DashboardSchedule) {
  return schedule.type === "class_schedule" ? schedule.startTime : schedule.time;
}

function WeeklyScheduleItem({ schedule, onSelect }: { schedule: DashboardSchedule; onSelect: (schedule: DashboardSchedule) => void }) {
  if (schedule.type === "class_schedule") {
    return (
      <button className="min-w-0 rounded-md border border-line bg-white p-3 text-left text-sm transition hover:border-action" onClick={() => onSelect(schedule)}>
        <div className="flex min-w-0 items-center gap-2">
          <span className="shrink-0 text-xs font-bold text-slate-600">{schedule.startTime} - {schedule.endTime}</span>
          <Badge tone={typeTone(schedule.type)}>{schedule.typeLabel}</Badge>
        </div>
        <p className="mt-2 truncate font-bold">{schedule.title}</p>
        <p className="mt-1 truncate text-xs text-slate-500">{schedule.bookTitle}</p>
        <p className="mt-1 truncate text-xs font-semibold text-slate-700">{schedule.progressTitle}</p>
        <p className="mt-2 text-xs font-bold text-blue-600">숙제 {schedule.homeworkCount}개</p>
      </button>
    );
  }

  return (
    <button className="min-w-0 rounded-md border border-line bg-white p-3 text-left text-sm transition hover:border-action" onClick={() => onSelect(schedule)}>
      <div className="flex items-center gap-2">
        <span className="shrink-0 font-bold">{schedule.time}</span>
        <Badge tone={typeTone(schedule.type)}>{schedule.typeLabel}</Badge>
      </div>
      <p className="mt-2 truncate font-semibold">{schedule.title}</p>
      <p className="mt-1 truncate text-xs text-slate-500">{schedule.homeworkTypeLabel}</p>
      <div className="mt-2"><Badge tone={statusTone(schedule.status)}>{schedule.statusLabel}</Badge></div>
    </button>
  );
}

function ScheduleDetailPanel({ schedule, onClose }: { schedule: DashboardSchedule; onClose: () => void }) {
  const isClassSchedule = schedule.type === "class_schedule";
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/35 p-4" role="dialog" aria-modal="true">
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-lg bg-white p-5 shadow-soft">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold">{schedule.title}</h2>
            <p className="mt-1 text-sm text-slate-500">{schedule.date}</p>
          </div>
          <button className="rounded-md px-3 py-2 text-sm font-semibold text-slate-500 hover:bg-slate-100" onClick={onClose}>닫기</button>
        </div>
        {isClassSchedule ? <ClassScheduleDetail schedule={schedule} /> : <HomeworkDueDetail schedule={schedule} />}
      </div>
    </div>
  );
}

function ClassScheduleDetail({ schedule }: { schedule: ClassSchedule }) {
  return (
    <>
      <dl className="mt-4 grid gap-3 text-sm">
        <DetailItem label="수업 여부" value={schedule.hasClass ? "수업 있음" : "수업 없음"} />
        <DetailItem label="시간" value={`${schedule.startTime} - ${schedule.endTime}`} />
        <DetailItem label="교재" value={schedule.bookTitle} />
        <DetailItem label="오늘 진도" value={schedule.progressTitle} />
        <DetailItem label="수업 내용" value={schedule.progressMemo} />
        <DetailItem label="다음 준비" value={schedule.nextPrep} />
        <DetailItem label="메모" value={schedule.memo} />
      </dl>
      <div className="mt-5 rounded-md border border-line bg-slate-50 p-4">
        <h3 className="font-bold">이 날짜 숙제</h3>
        <div className="mt-3 grid gap-2">
          {schedule.homeworks.map((homework) => (
            <div key={homework.id} className="rounded-md bg-white p-3 text-sm">
              <p className="font-semibold">{homework.title}</p>
              <p className="mt-1 text-xs text-slate-500">{homework.typeLabel} / {homework.dueLabel}</p>
            </div>
          ))}
        </div>
      </div>
      <div className="mt-5 flex justify-end">
        <Button href={schedule.classHref}>반 상세 페이지로 이동</Button>
      </div>
    </>
  );
}

function HomeworkDueDetail({ schedule }: { schedule: HomeworkDueSchedule }) {
  return (
    <>
      <dl className="mt-4 grid gap-3 text-sm">
        <DetailItem label="숙제명" value={schedule.title} />
        <DetailItem label="숙제 유형" value={schedule.homeworkTypeLabel} />
        <DetailItem label="마감일" value={`${schedule.dayLabel} ${schedule.dateLabel} ${schedule.time}`} />
        <DetailItem label="관련 반" value={schedule.relatedClass} />
        <DetailItem label="제출 현황" value={`대상 ${schedule.targetStudentCount}명 / 제출 ${schedule.submittedCount}명 / 미제출 ${schedule.unsubmittedCount}명`} />
        <DetailItem label="상태" value={schedule.statusLabel} />
        <DetailItem label="메모" value={schedule.memo} />
      </dl>
      <div className="mt-5 grid gap-2 sm:grid-cols-2">
        <Button href={schedule.homeworkHref} variant="secondary">숙제 상세 보기</Button>
        <Button href={schedule.submissionsHref}>제출 현황 보기</Button>
      </div>
    </>
  );
}

function DetailItem({ label, value }: { label: string; value: string }) {
  return <div className="grid grid-cols-[100px_1fr] gap-3"><dt className="font-bold text-slate-500">{label}</dt><dd>{value}</dd></div>;
}

function ClassStudentSummary({ classes }: { classes: ReturnType<typeof mockRepository.getClasses> }) {
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const selectedAssignments = selectedStudent ? mockRepository.getStudentAssignments(selectedStudent.id) : [];

  return (
    <div className="mt-6">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="text-lg font-bold">반별 학생</h2>
        <Button href="/teacher/students" variant="secondary">학생 관리로</Button>
      </div>
      <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
        {classes.map((classItem) => {
          const students = mockRepository.getStudentsByClassId(classItem.id);
          return (
            <Card key={classItem.id}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="font-bold">{classItem.name}</h3>
                  <p className="mt-1 line-clamp-1 text-sm text-slate-500">{classItem.description}</p>
                </div>
                <Badge tone={classItem.status === "active" ? "green" : "gray"}>{classItem.status === "active" ? "운영중" : "보관"}</Badge>
              </div>
              <p className="mt-3 text-sm font-semibold">학생 {students.length}명</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {students.map((student) => (
                  <button
                    key={student.id}
                    className="rounded-full border border-line bg-white px-3 py-1 text-sm font-semibold hover:border-action hover:text-action"
                    onClick={() => setSelectedStudent(student)}
                  >
                    {student.name}
                  </button>
                ))}
              </div>
              <Button href={`/teacher/classes/${classItem.id}`} className="mt-4 w-full" variant="secondary">반 상세 보기</Button>
            </Card>
          );
        })}
      </div>
      {selectedStudent && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/35 p-4" role="dialog" aria-modal="true">
          <div className="w-full max-w-2xl rounded-lg bg-white p-5 shadow-soft">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold">{selectedStudent.name} 과제 현황</h2>
                <p className="mt-1 text-sm text-slate-500">과제를 누르면 숙제 상세 페이지로 이동합니다.</p>
              </div>
              <button className="rounded-md px-3 py-2 text-sm font-semibold text-slate-500 hover:bg-slate-100" onClick={() => setSelectedStudent(null)}>닫기</button>
            </div>
            <div className="mt-4 grid gap-2">
              {selectedAssignments.map((assignment) => (
                <Button key={assignment.id} href={`/teacher/assignments/${assignment.id}`} variant="secondary" className="justify-between">
                  <span className="truncate">{assignment.title}</span>
                  <span className="ml-3 shrink-0 text-xs text-slate-500">{formatDue(assignment.dueAt)}</span>
                </Button>
              ))}
              {selectedAssignments.length === 0 && <p className="rounded-md border border-dashed border-line p-4 text-center text-sm text-slate-500">배정된 과제가 없습니다.</p>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
