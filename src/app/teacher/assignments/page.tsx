"use client";

import { Suspense, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { TeacherLayout } from "@/components/layout/TeacherLayout";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import {
  classCalendarRepository,
  homeworkTypeLabel
} from "@/features/class-calendar/repositories/classCalendarRepository";
import { formatDateTime, formatDue } from "@/lib/format";

type PageMode = "list" | "assignmentDetail" | "submissionDetail" | "homeworkDetail";
type HomeworkStatus = "published" | "draft";
type Subject = "Phonics" | "AL" | "AR";
type SubmissionStatus = "submitted" | "not_submitted" | "late";
type FeedbackStatus = "needed" | "done" | "none";

type ClassRow = { id: string; name: string; description: string };
type Homework = { id: string; title: string; description: string; type: string; subject: Subject; status: HomeworkStatus };
type Assignment = {
  id: string;
  homeworkId: string;
  classId: string;
  assignedAt: string;
  dueAt: string;
  status: HomeworkStatus;
  targetStudentCount: number;
  submittedCount: number;
  unsubmittedCount: number;
  feedbackNeededCount: number;
  feedbackDoneCount: number;
};
type Submission = {
  id: string;
  assignmentId: string;
  studentId: string;
  studentName: string;
  status: SubmissionStatus;
  submittedAt: string | null;
  hasAudio: boolean;
  feedbackStatus: FeedbackStatus;
};

const classes: ClassRow[] = [
  { id: "class_1", name: "월수 Basic Speaking", description: "초등 4-5학년 말하기 기초반" },
  { id: "class_2", name: "화목 Basic Speaking", description: "초등 4-5학년 말하기 기초반" },
  { id: "class_3", name: "초등 Reading A", description: "초등 리딩 A반" },
  { id: "class_4", name: "초등 Reading B", description: "초등 리딩 B반" },
  { id: "class_5", name: "화목 Reading Plus", description: "리딩 플러스 심화반" }
];

const homeworks: Homework[] = [
  { id: "hw_1", title: "Discovery Unit 1 Speaking Homework", description: "원어민 음성을 듣고 같은 속도로 읽어 보세요.", type: "듣기/녹음", subject: "AL", status: "published" },
  { id: "hw_2", title: "Reading Plus Shadowing 03", description: "문장을 듣고 자연스럽게 따라 읽습니다.", type: "문장 따라 읽기", subject: "AR", status: "published" },
  { id: "hw_3", title: "Picture Talk Practice", description: "이미지를 보고 보이는 내용을 영어로 설명합니다.", type: "이미지 보고 말하기", subject: "Phonics", status: "draft" }
];

const assignments: Assignment[] = [
  { id: "as_1", homeworkId: "hw_1", classId: "class_1", assignedAt: "2026-05-23T09:00:00", dueAt: "2026-05-25T23:59:00", status: "published", targetStudentCount: 8, submittedCount: 2, unsubmittedCount: 6, feedbackNeededCount: 2, feedbackDoneCount: 0 },
  { id: "as_2", homeworkId: "hw_1", classId: "class_2", assignedAt: "2026-05-23T09:00:00", dueAt: "2026-05-26T23:59:00", status: "published", targetStudentCount: 6, submittedCount: 0, unsubmittedCount: 6, feedbackNeededCount: 0, feedbackDoneCount: 0 },
  { id: "as_3", homeworkId: "hw_1", classId: "class_3", assignedAt: "2026-05-23T09:00:00", dueAt: "2026-05-27T22:00:00", status: "published", targetStudentCount: 10, submittedCount: 5, unsubmittedCount: 5, feedbackNeededCount: 3, feedbackDoneCount: 2 },
  { id: "as_4", homeworkId: "hw_2", classId: "class_5", assignedAt: "2026-05-24T09:00:00", dueAt: "2026-05-28T23:59:00", status: "published", targetStudentCount: 7, submittedCount: 0, unsubmittedCount: 7, feedbackNeededCount: 0, feedbackDoneCount: 0 },
  { id: "as_5", homeworkId: "hw_3", classId: "class_4", assignedAt: "2026-05-24T09:00:00", dueAt: "2026-05-30T21:00:00", status: "draft", targetStudentCount: 9, submittedCount: 0, unsubmittedCount: 9, feedbackNeededCount: 0, feedbackDoneCount: 0 }
];

const submissions: Submission[] = [
  { id: "sub_1", assignmentId: "as_1", studentId: "stu_1", studentName: "이지우", status: "submitted", submittedAt: "2026-05-25T20:10:00", hasAudio: true, feedbackStatus: "needed" },
  { id: "sub_2", assignmentId: "as_1", studentId: "stu_2", studentName: "박서준", status: "not_submitted", submittedAt: null, hasAudio: false, feedbackStatus: "none" },
  { id: "sub_3", assignmentId: "as_1", studentId: "stu_3", studentName: "최하윤", status: "submitted", submittedAt: "2026-05-25T21:30:00", hasAudio: true, feedbackStatus: "done" },
  { id: "sub_4", assignmentId: "as_3", studentId: "stu_4", studentName: "정도윤", status: "late", submittedAt: "2026-05-28T01:12:00", hasAudio: true, feedbackStatus: "needed" },
  { id: "sub_5", assignmentId: "as_3", studentId: "stu_5", studentName: "한아린", status: "submitted", submittedAt: "2026-05-27T20:40:00", hasAudio: true, feedbackStatus: "done" }
];

const classFilterOptions = ["전체 반", ...classes.map((classItem) => classItem.name)];
const subjectFilterOptions = ["전체 과목", "Phonics", "AL", "AR"];
const statusFilterOptions = ["전체", "published", "draft", "마감 임박", "마감 지남", "미제출 있음"];
const sortOptions = ["최신순", "마감 임박순", "제출률 낮은 순", "제출률 높은 순"];

function progressPercent(assignment: Assignment) {
  return assignment.targetStudentCount === 0 ? 0 : Math.round((assignment.submittedCount / assignment.targetStudentCount) * 100);
}

function statusTone(status: HomeworkStatus) {
  return status === "published" ? "green" : "gray";
}

function submissionLabel(status: SubmissionStatus) {
  if (status === "submitted") return "제출 완료";
  if (status === "late") return "지각 제출";
  return "미제출";
}

function submissionTone(status: SubmissionStatus) {
  if (status === "submitted") return "green";
  if (status === "late") return "yellow";
  return "red";
}

function feedbackLabel(status: FeedbackStatus) {
  if (status === "needed") return "피드백 필요";
  if (status === "done") return "피드백 완료";
  return "미작성";
}

function feedbackTone(status: FeedbackStatus) {
  if (status === "needed") return "yellow";
  if (status === "done") return "green";
  return "gray";
}

function isDueSoon(dueAt: string) {
  const now = new Date("2026-05-24T00:00:00");
  const due = new Date(dueAt);
  const diffMs = due.getTime() - now.getTime();
  return diffMs >= 0 && diffMs <= 3 * 24 * 60 * 60 * 1000;
}

function isPastDue(dueAt: string) {
  return new Date(dueAt).getTime() < new Date("2026-05-24T00:00:00").getTime();
}

export default function AssignmentsPage() {
  return (
    <Suspense fallback={<TeacherLayout title="숙제 목록"><Card><p className="text-sm text-slate-500">숙제 목록을 불러오는 중입니다.</p></Card></TeacherLayout>}>
      <AssignmentsPageContent />
    </Suspense>
  );
}

function AssignmentsPageContent() {
  const searchParams = useSearchParams();
  const [pageMode, setPageMode] = useState<PageMode>("list");
  const [selectedAssignmentId, setSelectedAssignmentId] = useState("as_1");
  const [selectedHomeworkId, setSelectedHomeworkId] = useState("hw_1");
  const calendarAssignmentId = searchParams.get("calendarAssignmentId") ?? "";
  const focusAssignmentId = searchParams.get("assignmentId") ?? "";
  const [query, setQuery] = useState("");
  const [classFilter, setClassFilter] = useState("전체 반");
  const [subjectFilter, setSubjectFilter] = useState("전체 과목");
  const [statusFilter, setStatusFilter] = useState("전체");
  const [sort, setSort] = useState("최신순");

  const assignmentRows = useMemo(() => {
    const rows = assignments
      .map((assignment) => ({
        assignment,
        homework: homeworks.find((homework) => homework.id === assignment.homeworkId),
        classItem: classes.find((classItem) => classItem.id === assignment.classId)
      }))
      .filter((row): row is { assignment: Assignment; homework: Homework; classItem: ClassRow } => Boolean(row.homework && row.classItem));
    return rows
      .filter(({ assignment, homework, classItem }) => {
        const matchesQuery = !query.trim() || homework.title.toLowerCase().includes(query.trim().toLowerCase());
        const matchesClass = classFilter === "전체 반" || classItem.name === classFilter;
        const matchesSubject = subjectFilter === "전체 과목" || homework.subject === subjectFilter;
        const matchesStatus =
          statusFilter === "전체" ||
          assignment.status === statusFilter ||
          (statusFilter === "마감 임박" && isDueSoon(assignment.dueAt)) ||
          (statusFilter === "마감 지남" && isPastDue(assignment.dueAt)) ||
          (statusFilter === "미제출 있음" && assignment.unsubmittedCount > 0);
        return matchesQuery && matchesClass && matchesSubject && matchesStatus;
      })
      .sort((a, b) => {
        if (sort === "마감 임박순") return new Date(a.assignment.dueAt).getTime() - new Date(b.assignment.dueAt).getTime();
        if (sort === "제출률 낮은 순") return progressPercent(a.assignment) - progressPercent(b.assignment);
        if (sort === "제출률 높은 순") return progressPercent(b.assignment) - progressPercent(a.assignment);
        return new Date(b.assignment.assignedAt).getTime() - new Date(a.assignment.assignedAt).getTime();
      });
  }, [classFilter, query, sort, statusFilter, subjectFilter]);

  const homeworkRows = useMemo(() => {
    return homeworks
      .map((homework) => {
        const related = assignmentRows.filter((row) => row.homework.id === homework.id);
        return {
          homework,
          rows: related,
          targetCount: related.reduce((sum, row) => sum + row.assignment.targetStudentCount, 0),
          submittedCount: related.reduce((sum, row) => sum + row.assignment.submittedCount, 0),
          unsubmittedCount: related.reduce((sum, row) => sum + row.assignment.unsubmittedCount, 0)
        };
      })
      .filter((row) => row.rows.length > 0);
  }, [assignmentRows]);

  function openSubmissionDetail(assignmentId: string) {
    setSelectedAssignmentId(assignmentId);
    setPageMode("submissionDetail");
  }

  function openAssignmentDetail(assignmentId: string) {
    setSelectedAssignmentId(assignmentId);
    setPageMode("assignmentDetail");
  }

  function openHomeworkDetail(homeworkId: string) {
    setSelectedHomeworkId(homeworkId);
    setPageMode("homeworkDetail");
  }

  if (calendarAssignmentId || focusAssignmentId) {
    const calendarState = classCalendarRepository.loadState();
    const targetCalendarId = calendarAssignmentId || focusAssignmentId;
    const calendarAssignment = classCalendarRepository.getAssignmentById(targetCalendarId, calendarState);
    const targets = classCalendarRepository.getTargetsByAssignmentId(targetCalendarId, calendarState);
    if (calendarAssignment) {
      return (
        <TeacherLayout title="숙제 관리">
          <CalendarAssignmentFocus assignment={calendarAssignment} targets={targets} />
        </TeacherLayout>
      );
    }

    const regularAssignment = assignments.find((assignment) => assignment.id === focusAssignmentId);
    if (regularAssignment) {
      const homework = homeworks.find((item) => item.id === regularAssignment.homeworkId) ?? homeworks[0];
      const classItem = classes.find((item) => item.id === regularAssignment.classId) ?? classes[0];
      return (
        <TeacherLayout title="숙제 관리">
          <AssignmentFocus assignment={regularAssignment} homework={homework} classItem={classItem} />
        </TeacherLayout>
      );
    }
  }

  if (pageMode === "assignmentDetail") {
    return (
      <TeacherLayout title="배정 상세">
        <AssignmentOverviewDetail assignmentId={selectedAssignmentId} onBack={() => setPageMode("list")} onOpenSubmissions={openSubmissionDetail} />
      </TeacherLayout>
    );
  }

  if (pageMode === "homeworkDetail") {
    return (
      <TeacherLayout title="숙제 상세">
        <HomeworkOverviewDetail homeworkId={selectedHomeworkId} onBack={() => setPageMode("list")} onOpenAssignment={openAssignmentDetail} />
      </TeacherLayout>
    );
  }

  if (pageMode === "submissionDetail") {
    return (
      <TeacherLayout title="제출 관리">
        <AssignmentSubmissionDetail assignmentId={selectedAssignmentId} onBack={() => setPageMode("list")} />
      </TeacherLayout>
    );
  }

  return (
    <TeacherLayout title="숙제 목록">
      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 className="text-lg font-bold">숙제별 보기</h2>
          <p className="mt-1 text-sm text-slate-500">숙제 템플릿 기준으로 과목과 반별 배정 현황을 확인합니다.</p>
        </div>
        <Button href="/teacher/assignments/new">숙제 만들기</Button>
      </div>

      <Card className="mb-4">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
          <label className="grid gap-2 text-sm font-semibold">숙제 검색<Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="숙제명 검색" /></label>
          <label className="grid gap-2 text-sm font-semibold">과목 필터<Select value={subjectFilter} onChange={(event) => setSubjectFilter(event.target.value)}>{subjectFilterOptions.map((item) => <option key={item}>{item}</option>)}</Select></label>
          <label className="grid gap-2 text-sm font-semibold">반 필터<Select value={classFilter} onChange={(event) => setClassFilter(event.target.value)}>{classFilterOptions.map((item) => <option key={item}>{item}</option>)}</Select></label>
          <label className="grid gap-2 text-sm font-semibold">상태 필터<Select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>{statusFilterOptions.map((item) => <option key={item}>{item}</option>)}</Select></label>
          <label className="grid gap-2 text-sm font-semibold">정렬<Select value={sort} onChange={(event) => setSort(event.target.value)}>{sortOptions.map((item) => <option key={item}>{item}</option>)}</Select></label>
        </div>
      </Card>

      <div className="grid gap-4">
        {homeworkRows.map((row) => <HomeworkCard key={row.homework.id} {...row} onOpenHomeworkDetail={openHomeworkDetail} onOpenAssignmentDetail={openAssignmentDetail} onOpenSubmissionDetail={openSubmissionDetail} />)}
      </div>
    </TeacherLayout>
  );
}

function CalendarAssignmentFocus({
  assignment,
  targets
}: {
  assignment: NonNullable<ReturnType<typeof classCalendarRepository.getAssignmentById>>;
  targets: ReturnType<typeof classCalendarRepository.getTargetsByAssignmentId>;
}) {
  const submittedCount = targets.filter((target) => target.status === "submitted" || target.status === "late").length;
  const missingCount = Math.max(0, targets.length - submittedCount);
  const feedbackNeeded = targets.filter((target) => target.status !== "assigned" && !target.reviewed).length;
  const feedbackDone = targets.filter((target) => target.reviewed).length;
  const progress = targets.length === 0 ? 0 : Math.round((submittedCount / targets.length) * 100);

  return (
    <div className="grid gap-4">
      <div className="flex justify-end">
        <Button href="/teacher/assignments" variant="secondary">전체 숙제 목록</Button>
      </div>
      <Card>
        <div className="grid gap-4 lg:grid-cols-[1fr_auto]">
          <div>
            <div className="flex flex-wrap gap-2">
              <Badge tone="blue">{homeworkTypeLabel(assignment.type)}</Badge>
              <Badge tone={assignment.status === "published" ? "green" : "gray"}>{assignment.status === "published" ? "게시됨" : "나만 보기"}</Badge>
              <Badge tone="yellow">마감: {formatDue(assignment.dueAt)}</Badge>
            </div>
            <h2 className="mt-3 text-xl font-bold">{assignment.title}</h2>
            <p className="mt-2 text-slate-600">{assignment.description || "학생에게 보일 숙제 안내입니다."}</p>
          </div>
          <div className="grid gap-2 sm:flex lg:grid">
            <Button href={`/teacher/assignments/new?calendarAssignmentId=${assignment.id}&classId=${assignment.classId}`} variant="secondary">내용 수정</Button>
            <Button href={`/teacher/assignments/new?calendarAssignmentId=${assignment.id}&classId=${assignment.classId}&mode=assignment`} variant="secondary">배정 수정</Button>
          </div>
        </div>
      </Card>
      <div className="grid gap-3 md:grid-cols-4">
        <Metric label="대상 학생 수" value={targets.length} />
        <Metric label="제출 완료 수" value={submittedCount} />
        <Metric label="미제출 수" value={missingCount} />
        <Metric label="제출률" value={progress} suffix="%" />
      </div>
      <Card>
        <h3 className="text-lg font-bold">이 숙제 제출/피드백 요약</h3>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <div className="rounded-md border border-line bg-slate-50 p-4">
            <p className="text-sm text-slate-500">피드백 필요</p>
            <p className="mt-2 text-2xl font-bold">{feedbackNeeded}명</p>
          </div>
          <div className="rounded-md border border-line bg-slate-50 p-4">
            <p className="text-sm text-slate-500">피드백 완료</p>
            <p className="mt-2 text-2xl font-bold">{feedbackDone}명</p>
          </div>
        </div>
      </Card>
    </div>
  );
}

function AssignmentFocus({
  assignment,
  homework,
  classItem
}: {
  assignment: Assignment;
  homework: Homework;
  classItem: ClassRow;
}) {
  const progress = progressPercent(assignment);
  return (
    <div className="grid gap-4">
      <div className="flex justify-end">
        <Button href="/teacher/assignments" variant="secondary">전체 숙제 목록</Button>
      </div>
      <Card>
        <div className="grid gap-4 lg:grid-cols-[1fr_auto]">
          <div>
            <div className="flex flex-wrap gap-2">
              <Badge tone="blue">{homework.subject}</Badge>
              <Badge>{homework.type}</Badge>
              <Badge tone={statusTone(assignment.status)}>{assignment.status === "published" ? "게시됨" : "임시저장"}</Badge>
              <Badge tone="yellow">마감: {formatDue(assignment.dueAt)}</Badge>
            </div>
            <h2 className="mt-3 text-xl font-bold">{homework.title}</h2>
            <p className="mt-2 text-slate-600">{homework.description}</p>
            <p className="mt-3 text-sm font-semibold text-action">{classItem.name}</p>
          </div>
          <div className="grid gap-2 sm:flex lg:grid">
            <Button href={`/teacher/assignments/new?assignmentId=${homework.id}`} variant="secondary">내용 수정</Button>
            <Button href={`/teacher/assignments/new?assignmentId=${homework.id}&assignmentTarget=${assignment.id}`} variant="secondary">배정 수정</Button>
          </div>
        </div>
      </Card>
      <div className="grid gap-3 md:grid-cols-4">
        <Metric label="대상 학생 수" value={assignment.targetStudentCount} />
        <Metric label="제출 완료 수" value={assignment.submittedCount} />
        <Metric label="미제출 수" value={assignment.unsubmittedCount} />
        <Metric label="제출률" value={progress} suffix="%" />
      </div>
      <Card>
        <h3 className="text-lg font-bold">이 숙제 반별 제출 요약</h3>
        <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-100">
          <div className="h-full rounded-full bg-action" style={{ width: `${progress}%` }} />
        </div>
        <p className="mt-3 text-sm text-slate-600">피드백 필요 {assignment.feedbackNeededCount}명 · 피드백 완료 {assignment.feedbackDoneCount}명</p>
      </Card>
    </div>
  );
}

function AssignmentCard({
  assignment,
  homework,
  classItem,
  onOpenAssignmentDetail,
  onOpenSubmissionDetail
}: {
  assignment: Assignment;
  homework: Homework;
  classItem: ClassRow;
  onOpenAssignmentDetail: (assignmentId: string) => void;
  onOpenSubmissionDetail: (assignmentId: string) => void;
}) {
  const progress = progressPercent(assignment);
  return (
    <Card>
      <div className="grid gap-4 xl:grid-cols-[1fr_auto]">
        <div className="min-w-0">
          <p className="text-sm font-bold text-action">{classItem.name}</p>
          <h2 className="mt-1 text-lg font-bold">{homework.title}</h2>
          <p className="mt-1 text-sm text-slate-600">{homework.description}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Badge>{homework.type}</Badge>
            <Badge tone="yellow">마감: {formatDue(assignment.dueAt)}</Badge>
            <Badge tone={statusTone(assignment.status)}>{assignment.status}</Badge>
          </div>
          <div className="mt-4 grid gap-2 text-sm">
            <p>대상 {assignment.targetStudentCount}명 · 제출 {assignment.submittedCount}명 · 미제출 {assignment.unsubmittedCount}명</p>
            <div className="h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-action" style={{ width: `${progress}%` }} /></div>
            <p className="font-semibold text-slate-600">진행률 {progress}%</p>
          </div>
        </div>
        <div className="grid gap-2 sm:flex xl:grid xl:min-w-36">
          <Button type="button" variant="secondary" onClick={() => onOpenAssignmentDetail(assignment.id)}>상세</Button>
          <Button href={`/teacher/assignments/new?assignmentId=${homework.id}&assignmentTarget=${assignment.id}`} variant="secondary">배정 수정</Button>
          {assignment.status === "draft" ? (
            <Button type="button" disabled>게시 후 확인 가능</Button>
          ) : (
            <Button type="button" onClick={() => onOpenSubmissionDetail(assignment.id)}>제출 현황</Button>
          )}
        </div>
      </div>
    </Card>
  );
}

function HomeworkCard({
  homework,
  rows,
  targetCount,
  submittedCount,
  unsubmittedCount,
  onOpenHomeworkDetail,
  onOpenAssignmentDetail,
  onOpenSubmissionDetail
}: {
  homework: Homework;
  rows: Array<{ assignment: Assignment; homework: Homework; classItem: ClassRow }>;
  targetCount: number;
  submittedCount: number;
  unsubmittedCount: number;
  onOpenHomeworkDetail: (homeworkId: string) => void;
  onOpenAssignmentDetail: (assignmentId: string) => void;
  onOpenSubmissionDetail: (assignmentId: string) => void;
}) {
  return (
    <Card>
      <div className="grid gap-4 xl:grid-cols-[1fr_auto]">
        <div className="min-w-0">
          <h2 className="text-lg font-bold">{homework.title}</h2>
          <p className="mt-1 text-sm text-slate-600">{homework.description}</p>
          <div className="mt-3 flex flex-wrap gap-2"><Badge tone="blue">{homework.subject}</Badge><Badge>{homework.type}</Badge><Badge tone={statusTone(homework.status)}>{homework.status}</Badge></div>
          <p className="mt-4 text-sm font-semibold">배정 {rows.length}개 · 대상 {targetCount}명 · 제출 {submittedCount}명 · 미제출 {unsubmittedCount}명</p>
          <div className="mt-4 rounded-md border border-line">
            <div className="border-b border-line bg-slate-50 px-3 py-2 text-sm font-bold">반별 요약</div>
            {rows.map(({ assignment, classItem }) => {
              const progress = progressPercent(assignment);
              return (
                <div key={assignment.id} className="grid gap-2 border-b border-line px-3 py-3 text-sm last:border-b-0 lg:grid-cols-[1fr_190px_110px_90px_auto] lg:items-center">
                  <span className="font-semibold">{classItem.name}</span>
                  <span>마감 {formatDue(assignment.dueAt)}</span>
                  <span>제출 {assignment.submittedCount}/{assignment.targetStudentCount}명</span>
                  <span>{progress}%</span>
                  <Button type="button" variant="secondary" onClick={() => onOpenSubmissionDetail(assignment.id)} disabled={assignment.status === "draft"}>{assignment.status === "draft" ? "게시 후 확인" : "현황 보기"}</Button>
                </div>
              );
            })}
          </div>
        </div>
        <div className="grid gap-2 sm:grid-cols-3 xl:min-w-32 xl:grid-cols-1">
          <Button type="button" variant="secondary" onClick={() => onOpenHomeworkDetail(homework.id)}>상세</Button>
          <Button href={`/teacher/assignments/new?assignmentId=${homework.id}`} variant="secondary">내용 수정</Button>
          <Button href={`/teacher/assignments/new?assignmentId=${homework.id}`} variant="secondary">다시 배정</Button>
        </div>
      </div>
    </Card>
  );
}

function AssignmentOverviewDetail({
  assignmentId,
  onBack,
  onOpenSubmissions
}: {
  assignmentId: string;
  onBack: () => void;
  onOpenSubmissions: (assignmentId: string) => void;
}) {
  const assignment = assignments.find((item) => item.id === assignmentId) ?? assignments[0];
  const homework = homeworks.find((item) => item.id === assignment.homeworkId) ?? homeworks[0];
  const classItem = classes.find((item) => item.id === assignment.classId) ?? classes[0];
  const progress = progressPercent(assignment);

  return (
    <div className="grid gap-4">
      <Card>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-sm font-bold text-action">{classItem.name}</p>
            <h2 className="mt-1 text-xl font-bold">{homework.title}</h2>
            <p className="mt-2 text-slate-600">{homework.description}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Badge tone="blue">{homework.subject}</Badge>
              <Badge>{homework.type}</Badge>
              <Badge tone={statusTone(assignment.status)}>{assignment.status === "published" ? "게시됨" : "임시저장"}</Badge>
              <Badge tone="yellow">마감: {formatDue(assignment.dueAt)}</Badge>
              <Badge>배정일: {assignment.assignedAt.slice(0, 10)}</Badge>
            </div>
          </div>
          <div className="grid gap-2 sm:flex lg:grid">
            <Button type="button" variant="secondary" onClick={onBack}>목록으로</Button>
            <Button href={`/teacher/assignments/new?assignmentId=${homework.id}&assignmentTarget=${assignment.id}`} variant="secondary">배정 수정</Button>
            <Button type="button" onClick={() => onOpenSubmissions(assignment.id)} disabled={assignment.status === "draft"}>{assignment.status === "draft" ? "게시 후 확인" : "제출 현황"}</Button>
          </div>
        </div>
      </Card>
      <div className="grid gap-3 md:grid-cols-4">
        <Metric label="대상 학생 수" value={assignment.targetStudentCount} />
        <Metric label="제출 완료 수" value={assignment.submittedCount} />
        <Metric label="미제출 수" value={assignment.unsubmittedCount} />
        <Metric label="제출률" value={progress} suffix="%" />
      </div>
      <Card>
        <h3 className="text-lg font-bold">숙제 내용</h3>
        <dl className="mt-4 grid gap-3 text-sm">
          <DetailRow label="과목" value={homework.subject} />
          <DetailRow label="숙제 유형" value={homework.type} />
          <DetailRow label="공개 상태" value={homework.status === "published" ? "게시됨" : "임시저장"} />
          <DetailRow label="배정 반" value={classItem.name} />
          <DetailRow label="설명" value={homework.description} />
        </dl>
      </Card>
    </div>
  );
}

function HomeworkOverviewDetail({
  homeworkId,
  onBack,
  onOpenAssignment
}: {
  homeworkId: string;
  onBack: () => void;
  onOpenAssignment: (assignmentId: string) => void;
}) {
  const homework = homeworks.find((item) => item.id === homeworkId) ?? homeworks[0];
  const rows = assignments
    .filter((assignment) => assignment.homeworkId === homework.id)
    .map((assignment) => ({
      assignment,
      classItem: classes.find((classItem) => classItem.id === assignment.classId) ?? classes[0]
    }));
  const targetCount = rows.reduce((sum, row) => sum + row.assignment.targetStudentCount, 0);
  const submittedCount = rows.reduce((sum, row) => sum + row.assignment.submittedCount, 0);
  const unsubmittedCount = rows.reduce((sum, row) => sum + row.assignment.unsubmittedCount, 0);

  return (
    <div className="grid gap-4">
      <Card>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h2 className="text-xl font-bold">{homework.title}</h2>
            <p className="mt-2 text-slate-600">{homework.description}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Badge tone="blue">{homework.subject}</Badge>
              <Badge>{homework.type}</Badge>
              <Badge tone={statusTone(homework.status)}>{homework.status === "published" ? "게시됨" : "임시저장"}</Badge>
            </div>
          </div>
          <div className="grid gap-2 sm:flex lg:grid">
            <Button type="button" variant="secondary" onClick={onBack}>목록으로</Button>
            <Button href={`/teacher/assignments/new?assignmentId=${homework.id}`} variant="secondary">내용 수정</Button>
            <Button href={`/teacher/assignments/new?assignmentId=${homework.id}`}>다시 배정</Button>
          </div>
        </div>
      </Card>
      <div className="grid gap-3 md:grid-cols-4">
        <Metric label="배정 반 수" value={rows.length} />
        <Metric label="전체 대상" value={targetCount} />
        <Metric label="전체 제출" value={submittedCount} />
        <Metric label="전체 미제출" value={unsubmittedCount} />
      </div>
      <Card>
        <h3 className="text-lg font-bold">반별 배정</h3>
        <div className="mt-4 grid gap-2">
          {rows.map(({ assignment, classItem }) => (
            <div key={assignment.id} className="grid gap-2 rounded-md border border-line p-3 text-sm lg:grid-cols-[1fr_180px_130px_auto] lg:items-center">
              <p className="font-semibold">{classItem.name}</p>
              <p>마감 {formatDue(assignment.dueAt)}</p>
              <p>제출 {assignment.submittedCount}/{assignment.targetStudentCount}명</p>
              <Button type="button" variant="secondary" onClick={() => onOpenAssignment(assignment.id)}>배정 상세</Button>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

function AssignmentSubmissionDetail({ assignmentId, onBack }: { assignmentId: string; onBack: () => void }) {
  const assignment = assignments.find((item) => item.id === assignmentId) ?? assignments[0];
  const homework = homeworks.find((item) => item.id === assignment.homeworkId) ?? homeworks[0];
  const classItem = classes.find((item) => item.id === assignment.classId) ?? classes[0];
  const [studentQuery, setStudentQuery] = useState("");
  const [submitFilter, setSubmitFilter] = useState("전체");
  const [feedbackFilter, setFeedbackFilter] = useState("전체");
  const rows = submissions.filter((submission) => submission.assignmentId === assignment.id);
  const paddedRows: Submission[] = rows.length >= assignment.targetStudentCount ? rows : [
    ...rows,
    ...Array.from({ length: assignment.targetStudentCount - rows.length }, (_, index) => ({
      id: `${assignment.id}-mock-${index}`,
      assignmentId: assignment.id,
      studentId: `mock-${index}`,
      studentName: ["김민준", "이서연", "박지훈", "최유진", "정하윤", "오지후", "한아린", "유재영"][index % 8],
      status: "not_submitted" as const,
      submittedAt: null,
      hasAudio: false,
      feedbackStatus: "none" as const
    }))
  ];
  const filteredRows = paddedRows.filter((row) => {
    const matchesName = !studentQuery.trim() || row.studentName.includes(studentQuery.trim());
    const matchesSubmit = submitFilter === "전체" || submissionLabel(row.status) === submitFilter;
    const matchesFeedback = feedbackFilter === "전체" || feedbackLabel(row.feedbackStatus) === feedbackFilter;
    return matchesName && matchesSubmit && matchesFeedback;
  });
  const lateCount = paddedRows.filter((row) => row.status === "late").length;

  return (
    <div className="grid gap-4">
      <Card>
        <div className="grid gap-4 lg:grid-cols-[1fr_auto]">
          <div>
            <h2 className="text-xl font-bold">{homework.title}</h2>
            <p className="mt-2 text-slate-600">{homework.description}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Badge tone="blue">반: {classItem.name}</Badge>
              <Badge tone="blue">{homework.subject}</Badge>
              <Badge>{homework.type}</Badge>
              <Badge tone={statusTone(assignment.status)}>{assignment.status === "published" ? "게시됨" : "임시저장"}</Badge>
              <Badge>생성일: {assignment.assignedAt.slice(0, 10)}</Badge>
              <Badge tone="yellow">마감: {formatDue(assignment.dueAt)}</Badge>
            </div>
          </div>
          <div className="grid gap-2 sm:flex lg:grid">
            <Button type="button" variant="secondary" onClick={onBack}>반 목록으로</Button>
            <Button href={`/teacher/assignments/new?assignmentId=${homework.id}`} variant="secondary">숙제 수정하기</Button>
            <Button href={`/teacher/assignments/new?assignmentId=${homework.id}&assignmentTarget=${assignment.id}`} variant="secondary">배정 수정하기</Button>
          </div>
        </div>
      </Card>

      <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-6">
        <Metric label="대상 학생 수" value={assignment.targetStudentCount} />
        <Metric label="제출 완료 수" value={assignment.submittedCount} />
        <Metric label="미제출 수" value={assignment.unsubmittedCount} />
        <Metric label="지각 제출 수" value={lateCount} />
        <Metric label="피드백 필요 수" value={assignment.feedbackNeededCount} />
        <Metric label="피드백 완료 수" value={assignment.feedbackDoneCount} />
      </div>

      <Card>
        <div className="grid gap-3 md:grid-cols-3">
          <label className="grid gap-2 text-sm font-semibold">학생명 검색<Input value={studentQuery} onChange={(event) => setStudentQuery(event.target.value)} placeholder="학생명 검색" /></label>
          <label className="grid gap-2 text-sm font-semibold">제출 상태<Select value={submitFilter} onChange={(event) => setSubmitFilter(event.target.value)}><option>전체</option><option>제출 완료</option><option>미제출</option><option>지각 제출</option></Select></label>
          <label className="grid gap-2 text-sm font-semibold">피드백 상태<Select value={feedbackFilter} onChange={(event) => setFeedbackFilter(event.target.value)}><option>전체</option><option>피드백 필요</option><option>피드백 완료</option><option>미작성</option></Select></label>
        </div>
      </Card>

      <Card>
        <div className="hidden overflow-x-auto md:block">
          <table className="w-full min-w-[820px] text-left text-sm">
            <thead className="text-slate-500"><tr><th className="py-2">학생명</th><th>제출 상태</th><th>제출 시간</th><th>제출 파일</th><th>피드백 상태</th><th>액션</th></tr></thead>
            <tbody>{filteredRows.map((row) => <SubmissionRow key={row.id} row={row} />)}</tbody>
          </table>
        </div>
        <div className="grid gap-3 md:hidden">
          {filteredRows.map((row) => <SubmissionMobileCard key={row.id} row={row} />)}
        </div>
      </Card>
    </div>
  );
}

function Metric({ label, value, suffix = "명" }: { label: string; value: number; suffix?: string }) {
  return <Card><p className="text-sm text-slate-500">{label}</p><p className="mt-2 text-2xl font-bold">{value}{suffix}</p></Card>;
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return <div className="grid gap-1 md:grid-cols-[120px_1fr]"><dt className="font-bold text-slate-500">{label}</dt><dd>{value}</dd></div>;
}

function SubmissionAction({ row }: { row: Submission }) {
  if (row.status === "not_submitted") return <Button type="button" variant="secondary" disabled>미제출</Button>;
  if (row.feedbackStatus === "done") return <Button type="button" variant="secondary" disabled>피드백 완료</Button>;
  return <Button type="button" disabled>피드백 필요</Button>;
}

function SubmissionRow({ row }: { row: Submission }) {
  return (
    <tr className="border-t border-line">
      <td className="py-3 font-semibold">{row.studentName}</td>
      <td><Badge tone={submissionTone(row.status)}>{submissionLabel(row.status)}</Badge></td>
      <td>{row.submittedAt ? formatDateTime(row.submittedAt) : "-"}</td>
      <td>{row.hasAudio ? <audio className="h-9 w-44" controls src="/mock-audio/native-sample.m4a" /> : "-"}</td>
      <td><Badge tone={feedbackTone(row.feedbackStatus)}>{feedbackLabel(row.feedbackStatus)}</Badge></td>
      <td><SubmissionAction row={row} /></td>
    </tr>
  );
}

function SubmissionMobileCard({ row }: { row: Submission }) {
  return (
    <div className="rounded-md border border-line p-3">
      <div className="flex items-start justify-between gap-3"><p className="font-bold">{row.studentName}</p><Badge tone={submissionTone(row.status)}>{submissionLabel(row.status)}</Badge></div>
      <p className="mt-2 text-sm text-slate-500">제출 시간: {row.submittedAt ? formatDateTime(row.submittedAt) : "-"}</p>
      <div className="mt-3 flex flex-wrap gap-2">
        {row.hasAudio && <audio className="h-9 w-full" controls src="/mock-audio/native-sample.m4a" />}
        <Badge tone={feedbackTone(row.feedbackStatus)}>{feedbackLabel(row.feedbackStatus)}</Badge>
        <SubmissionAction row={row} />
      </div>
    </div>
  );
}
