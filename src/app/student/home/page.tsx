import { redirect } from "next/navigation";

import { StudentLayout } from "@/components/layout/StudentLayout";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { studentAssignmentRepository } from "@/features/assignments/repositories/studentAssignmentRepository";
import { getStudentCalendarEvents, getStudentTestResults, getStudentUpcomingTests, getStudentVisibleNotices } from "@/lib/dashboardData";
import { formatTimeRange } from "@/lib/calendarTypes";
import { assignmentTypeLabel as formatAssignmentTypeLabel } from "@/lib/assignmentTypes";
import { query } from "@/lib/postgres";
import { getStudentSession } from "@/server/auth/studentSession";

import { StudentCalendarClient, type StudentCalendarEvent } from "./StudentCalendarClient";
import { StudentNoticeCarousel } from "./StudentNoticeCarousel";

type AssignmentWithTarget = Awaited<ReturnType<typeof studentAssignmentRepository.getAssignmentsForStudent>>[number] & {
  targetStatus?: string;
};

type StudentProfileRow = {
  name: string;
  class_names: string[];
};

type Notice = {
  id: string;
  title: string;
  content: string;
  imageUrl: string | null;
  createdAt: string;
  targetType?: string;
};

type UpcomingTest = {
  id: string;
  title: string;
  subject: string;
  date: string;
  startTime?: string | null;
  endTime?: string | null;
  scope: string;
};

type TestResult = {
  id: string;
  title: string;
  subject: string;
  date: string;
  startTime?: string | null;
  endTime?: string | null;
  score: number | null;
  result: "PASS" | "NonPASS";
  teacherMemo: string | null;
};

function assignmentTypeLabel(type: string) {
  return formatAssignmentTypeLabel(type);
}

function subjectForAssignment(assignment: AssignmentWithTarget) {
  return assignment.assignmentSubject ?? "Phonics";
}

function homeworkStatus(assignment: AssignmentWithTarget) {
  if (assignment.targetStatus === "reviewed" || assignment.targetStatus === "completed") return "completed";
  if (assignment.targetStatus === "returned") return "returned";
  if (assignment.submittedAt || assignment.targetStatus === "submitted" || assignment.targetStatus === "pending_review") return "pending_review";
  return "incomplete";
}

function homeworkStatusLabel(status: string) {
  if (status === "pending_review") return "검토대기중";
  if (status === "completed") return "숙제완료";
  if (status === "returned") return "반려";
  return "미완료";
}

function homeworkStatusTone(status: string): "green" | "yellow" | "red" | "gray" {
  if (status === "pending_review") return "yellow";
  if (status === "completed") return "green";
  if (status === "returned") return "red";
  return "gray";
}

function formatDate(value?: string | null) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("ko-KR", { year: "numeric", month: "long", day: "numeric" }).format(new Date(`${value.slice(0, 10)}T00:00:00`));
}

function formatDateTime(value?: string | null) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("ko-KR", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "Asia/Seoul" }).format(new Date(value));
}

async function getStudentProfile(studentId: string, teacherId: string) {
  const result = await query<StudentProfileRow>(
    `
      select
        s.name,
        coalesce(array_remove(array_agg(c.name order by c.name), null), array[]::text[]) as class_names
      from students s
      left join class_memberships cm on cm.student_id = s.id
      left join classes c on c.id = cm.class_id and c.teacher_id = s.teacher_id and c.status = 'active'
      where s.id = $1 and s.teacher_id = $2
      group by s.id
    `,
    [studentId, teacherId],
  );
  return result.rows[0] ?? { name: "학생", class_names: [] };
}

export default async function StudentHomePage() {
  const session = await getStudentSession();

  if (!session) {
    redirect("/login");
  }

  const [assignments, profile, notices, calendarEvents, upcomingTests, testResults] = await Promise.all([
    studentAssignmentRepository.getAssignmentsForStudent(session.studentId, session.teacherId) as Promise<AssignmentWithTarget[]>,
    getStudentProfile(session.studentId, session.teacherId),
    getStudentVisibleNotices(session.studentId, session.teacherId) as Promise<Notice[]>,
    getStudentCalendarEvents(session.studentId, session.teacherId, "2026-05-01", "2026-06-07") as Promise<StudentCalendarEvent[]>,
    getStudentUpcomingTests(session.studentId, session.teacherId) as Promise<UpcomingTest[]>,
    getStudentTestResults(session.studentId, session.teacherId) as Promise<TestResult[]>,
  ]);

  return (
    <StudentLayout title="학생 홈">
      <div className="grid gap-6">
        <StudentNoticeCarousel notices={notices} />
        <StudentTeamHeader studentName={profile.name} classNames={profile.class_names} />
        <WeeklyHomeworkSection assignments={assignments} />
        <div className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
          <StudentCalendarClient events={calendarEvents} />
          <TestResultSection upcomingTests={upcomingTests} results={testResults} />
        </div>
      </div>
    </StudentLayout>
  );
}

function StudentTeamHeader({ studentName, classNames }: { studentName: string; classNames: string[] }) {
  return (
    <Card className="bg-slate-50">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-bold text-slate-500">내 반</p>
          <h2 className="mt-1 text-xl font-extrabold">{classNames[0] ?? "배정된 반 없음"}</h2>
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge tone="blue">{studentName}</Badge>
          {classNames.slice(1).map((name) => (
            <Badge key={name}>{name}</Badge>
          ))}
        </div>
      </div>
    </Card>
  );
}

function WeeklyHomeworkSection({ assignments }: { assignments: AssignmentWithTarget[] }) {
  const weeklyAssignments = assignments.slice(0, 3);
  return (
    <section>
      <div className="mb-3 flex items-end justify-between gap-3">
        <div>
          <h2 className="text-2xl font-extrabold">이번주 숙제</h2>
          <p className="mt-1 text-sm text-slate-500">이번 주에 해야 할 숙제를 확인하고 제출해 주세요.</p>
        </div>
      </div>
      {weeklyAssignments.length === 0 ? (
        <Card>
          <p className="text-sm text-slate-500">이번주 숙제가 없습니다.</p>
        </Card>
      ) : (
        <div className="grid gap-4 lg:grid-cols-3">
          {weeklyAssignments.map((assignment) => (
            <HomeworkSubjectCard key={assignment.id} assignment={assignment} />
          ))}
        </div>
      )}
    </section>
  );
}

function HomeworkSubjectCard({ assignment }: { assignment: AssignmentWithTarget }) {
  const status = homeworkStatus(assignment);
  const item = assignment.items[0];
  const needsResubmit = assignment.targetStatus === "returned";
  const hasSubmitted = Boolean(assignment.submittedAt);
  const href = hasSubmitted && !needsResubmit ? `/student/assignments/${assignment.id}/complete` : `/student/assignments/${assignment.id}`;
  const buttonLabel = needsResubmit ? "다시 제출하기" : hasSubmitted ? "제출 내용 보기" : "숙제하기";
  const homeworkItems = [
    item?.title ?? assignment.title,
    assignment.description ?? assignmentTypeLabel(assignment.assignmentType),
    item?.passageText ? "녹음 과제 제출" : "숙제 제출",
  ];

  return (
    <Card className="flex min-h-[320px] flex-col">
      <div className="flex items-start justify-between gap-3">
        <div>
          <Badge tone="blue">{subjectForAssignment(assignment)}</Badge>
          <p className="mt-2 text-sm font-semibold text-slate-500">수업 시간</p>
          <p className="text-sm font-bold text-ink">반 캘린더에서 확인</p>
        </div>
        {assignment.dueAt && <Badge tone="yellow">마감 {formatDateTime(assignment.dueAt)}</Badge>}
      </div>
      <div className="mt-5 flex-1">
        <h3 className="text-lg font-bold">이번주 숙제</h3>
        <div className="mt-3 grid gap-2">
          {homeworkItems.map((itemText) => (
            <div key={itemText} className="rounded-md border border-line bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-700">
              {itemText}
            </div>
          ))}
        </div>
      </div>
      <div className="mt-5 rounded-lg bg-paper p-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-bold">숙제 상태</span>
          <Badge tone={homeworkStatusTone(status)}>{homeworkStatusLabel(status)}</Badge>
        </div>
        {(status === "completed" || status === "returned") && assignment.teacherComment && (
          <p className="mt-2 text-sm leading-6 text-slate-700">선생님 메모: {assignment.teacherComment}</p>
        )}
        {assignment.submittedAt && <p className="mt-2 text-xs font-semibold text-slate-500">제출 {formatDateTime(assignment.submittedAt)}</p>}
      </div>
      <Button href={href} className="mt-4 min-h-12 w-full">
        {buttonLabel}
      </Button>
    </Card>
  );
}

function TestResultSection({ upcomingTests, results }: { upcomingTests: UpcomingTest[]; results: TestResult[] }) {
  return (
    <section>
      <h2 className="mb-3 text-2xl font-extrabold">시험 결과</h2>
      <div className="grid gap-4">
        <UpcomingTestCard test={upcomingTests[0]} />
        <TestHistoryList results={results} />
      </div>
    </section>
  );
}

function UpcomingTestCard({ test }: { test?: UpcomingTest }) {
  return (
    <Card>
      <h3 className="text-lg font-bold">다가오는 시험</h3>
      {!test ? (
        <p className="mt-3 text-sm text-slate-500">예정된 시험이 없습니다.</p>
      ) : (
        <div className="mt-4 rounded-lg bg-blue-50 p-4">
          <Badge tone="blue">{test.subject}</Badge>
          <h4 className="mt-3 text-lg font-extrabold">{test.title}</h4>
          <p className="mt-1 text-sm font-semibold text-slate-700">{formatDate(test.date)} · {formatTimeRange(test.startTime, test.endTime)}</p>
          <p className="mt-2 text-sm text-slate-600">범위: {test.scope || "-"}</p>
        </div>
      )}
    </Card>
  );
}

function TestHistoryList({ results }: { results: TestResult[] }) {
  return (
    <Card>
      <h3 className="text-lg font-bold">시험 히스토리</h3>
      {results.length === 0 ? (
        <p className="mt-3 text-sm text-slate-500">아직 시험 결과가 없습니다.</p>
      ) : (
        <div className="mt-4 grid gap-3">
          {results.map((result) => (
            <article key={result.id} className="rounded-md border border-line p-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h4 className="font-bold">{result.title}</h4>
                  <p className="mt-1 text-sm text-slate-500">
                    {result.subject} · {formatDate(result.date)} · {formatTimeRange(result.startTime, result.endTime)}
                  </p>
                </div>
                <div className="text-right">
                  <Badge tone={result.result === "PASS" ? "green" : "red"}>{result.result}</Badge>
                  <p className="mt-2 text-lg font-extrabold">{result.score ?? "-"}점</p>
                </div>
              </div>
              {result.teacherMemo && <p className="mt-3 rounded-md bg-slate-50 p-2 text-sm text-slate-600">선생님 메모: {result.teacherMemo}</p>}
            </article>
          ))}
        </div>
      )}
    </Card>
  );
}
