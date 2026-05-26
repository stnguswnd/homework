"use client";

import type { ReactNode } from "react";
import { useEffect, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";

import { TeacherLayout } from "@/components/layout/TeacherLayout";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import { cn } from "@/lib/utils";

type Tab = "overview" | "students" | "notices" | "homework" | "schedule" | "tests";
type StudentRow = { id: string; name: string; studentLoginId: string; status: string };
type AssignmentRow = { id: string; title: string; assignmentType: string; dueAt: string | null; targetCount: number; submittedCount: number; missingCount: number; needsReviewCount: number };
type Notice = { id: string; title: string; content: string; imageUrl: string | null; status: string; createdAt: string };
type CalendarEvent = { id: string; eventType: string; title: string; description?: string | null; eventDate: string; startTime?: string | null; endTime?: string | null; status: string };
type ScheduleDay = { id: string; date: string; startTime?: string | null; endTime?: string | null; bookTitle?: string | null; progressTitle?: string | null };
type TestRow = { id: string; title: string; subject: string; testDate: string; scope?: string | null; status: string; resultCount: number; passCount: number; nonpassCount: number };
type TestResultRow = { studentId: string; studentName: string; score: number | null; maxScore: number; result: "PASS" | "NonPASS"; teacherMemo: string; takenAt?: string | null };
type DeletePreview = { deleted: boolean; archived: boolean; reason: "no_history" | "has_history" };

const tabs: Array<{ id: Tab; label: string }> = [
  { id: "overview", label: "개요" },
  { id: "students", label: "학생" },
  { id: "notices", label: "공지사항" },
  { id: "homework", label: "숙제" },
  { id: "schedule", label: "수업 일정" },
  { id: "tests", label: "테스트" },
];

function eventLabel(type: string) {
  if (type === "class") return "정규수업";
  if (type === "cancelled") return "휴강";
  if (type === "makeup") return "보강";
  if (type === "test") return "시험";
  if (type === "notice") return "공지";
  return "기타";
}

function eventTone(type: string): "blue" | "green" | "red" | "yellow" | "gray" {
  if (type === "class") return "blue";
  if (type === "cancelled") return "red";
  if (type === "makeup") return "green";
  if (type === "test") return "yellow";
  return "gray";
}

function dateOnly(value?: string | null) {
  return value ? value.slice(0, 10) : "";
}

function formatDate(value?: string | null) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("ko-KR", { month: "long", day: "numeric", weekday: "short" }).format(new Date(`${dateOnly(value)}T00:00:00`));
}

function buildMonthDays(anchor = "2026-05-01") {
  const base = new Date(`${anchor}T00:00:00`);
  const year = base.getFullYear();
  const month = base.getMonth();
  const last = new Date(year, month + 1, 0).getDate();
  const firstDay = new Date(year, month, 1).getDay();
  return [
    ...Array.from({ length: firstDay }, () => null),
    ...Array.from({ length: last }, (_, index) => `${year}-${String(month + 1).padStart(2, "0")}-${String(index + 1).padStart(2, "0")}`),
  ];
}

export default function ClassDetailPage() {
  const { classId } = useParams<{ classId: string }>();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<Tab>("overview");
  const [classItem, setClassItem] = useState<{ name: string; description?: string } | null>(null);
  const [students, setStudents] = useState<StudentRow[]>([]);
  const [assignments, setAssignments] = useState<AssignmentRow[]>([]);
  const [scheduleDays, setScheduleDays] = useState<ScheduleDay[]>([]);
  const [notices, setNotices] = useState<Notice[]>([]);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [tests, setTests] = useState<TestRow[]>([]);
  const [message, setMessage] = useState("");
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [deleteActionPreview, setDeleteActionPreview] = useState<DeletePreview | null>(null);
  const [deletePreview, setDeletePreview] = useState<DeletePreview | null>(null);
  const [isDeletePending, startDeleteTransition] = useTransition();

  async function loadAll() {
    const [classData, studentData, assignmentData, scheduleData, noticeData, eventData, testData] = await Promise.all([
      fetch(`/api/teacher/classes/${classId}`).then((response) => response.json()),
      fetch(`/api/teacher/classes/${classId}/students`).then((response) => response.json()),
      fetch(`/api/teacher/classes/${classId}/assignments`).then((response) => response.json()),
      fetch(`/api/teacher/classes/${classId}/schedule`).then((response) => response.json()),
      fetch(`/api/teacher/classes/${classId}/notices`).then((response) => response.json()).catch(() => ({ notices: [] })),
      fetch(`/api/teacher/classes/${classId}/calendar-events`).then((response) => response.json()).catch(() => ({ events: [] })),
      fetch(`/api/teacher/tests?classId=${classId}`).then((response) => response.json()).catch(() => ({ tests: [] })),
    ]);
    setClassItem(classData.class ?? null);
    setStudents(studentData.students ?? []);
    setAssignments(assignmentData.assignments ?? []);
    setScheduleDays(scheduleData.scheduleDays ?? []);
    setNotices(noticeData.notices ?? []);
    setEvents(eventData.events ?? []);
    setTests(testData.tests ?? []);
  }

  async function loadDeletePreview() {
    const response = await fetch(`/api/teacher/classes/${classId}?deletePreview=1`, { cache: "no-store" });
    const data = await response.json().catch(() => null);
    if (response.ok) setDeleteActionPreview(data);
  }

  useEffect(() => {
    loadAll().catch(() => undefined);
    loadDeletePreview().catch(() => setDeleteActionPreview(null));
  }, [classId]);

  async function refresh(msg: string) {
    setMessage(msg);
    await loadAll();
  }

  async function updateClass(formData: FormData) {
    const response = await fetch(`/api/teacher/classes/${classId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: String(formData.get("name") ?? "").trim(),
        description: String(formData.get("description") ?? "").trim(),
      }),
    });
    const data = await response.json().catch(() => null);
    if (!response.ok) {
      setMessage(data?.error ?? "반 정보를 수정하지 못했습니다.");
      return;
    }

    setIsEditOpen(false);
    setMessage("반 정보를 수정했습니다.");
    await loadAll();
  }

  async function openDeleteModal() {
    const response = await fetch(`/api/teacher/classes/${classId}?deletePreview=1`, { cache: "no-store" });
    const data = await response.json();
    if (!response.ok) {
      setMessage(data.error ?? "반 삭제 상태를 확인하지 못했습니다.");
      return;
    }
    setDeletePreview(data);
    setDeleteActionPreview(data);
  }

  function deleteClass() {
    startDeleteTransition(async () => {
      const response = await fetch(`/api/teacher/classes/${classId}`, { method: "DELETE" });
      const data = await response.json();
      if (!response.ok) {
        setMessage(data.error ?? "반 삭제 처리 중 오류가 발생했습니다.");
        setDeletePreview(null);
        return;
      }

      setDeletePreview(null);
      if (data.deleted) {
        window.sessionStorage.setItem("classDeleteMessage", "반이 삭제되었습니다. 학생은 유지되고 반 배정만 해제되었습니다.");
        router.push("/teacher/classes");
        return;
      }

      setMessage("반이 비활성 처리되었습니다. 기존 기록은 유지됩니다.");
      await loadAll();
    });
  }

  return (
    <TeacherLayout title={classItem?.name ?? "반 상세"}>
      <div className="grid gap-4">
        <Card>
          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <h1 className="text-2xl font-extrabold">{classItem?.name ?? "반 상세"}</h1>
              <p className="mt-2 text-slate-600">{classItem?.description ?? "-"}</p>
              <p className="mt-3 text-sm font-semibold text-slate-500">
                학생 {students.length}명 · 숙제 {assignments.length}개 · 예정 시험 {tests.filter((test) => test.status === "scheduled").length}개 · 공유 일정 {events.length + scheduleDays.length}개
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="secondary" onClick={() => setIsEditOpen(true)}>반 수정하기</Button>
              <Button variant="danger" onClick={openDeleteModal}>
                {deleteActionPreview?.archived ? "반 비활성화" : "반 삭제"}
              </Button>
            </div>
          </div>
        </Card>

        {message && <p className="rounded-md bg-blue-50 px-3 py-2 text-sm font-semibold text-action">{message}</p>}

        <div className="overflow-x-auto border-b border-line">
          <div className="flex min-w-max gap-4">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                className={cn("border-b-2 px-2 py-3 text-sm font-bold", activeTab === tab.id ? "border-action text-action" : "border-transparent text-slate-500")}
                onClick={() => setActiveTab(tab.id)}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {activeTab === "overview" && <OverviewTab notices={notices} assignments={assignments} events={events} tests={tests} />}
        {activeTab === "students" && <StudentsTab students={students} />}
        {activeTab === "notices" && <NoticesTab classId={classId} notices={notices} onChanged={refresh} />}
        {activeTab === "homework" && <HomeworkTab classId={classId} assignments={assignments} />}
        {activeTab === "schedule" && <ScheduleTab classId={classId} scheduleDays={scheduleDays} events={events} onChanged={refresh} />}
        {activeTab === "tests" && <TestsTab classId={classId} students={students} tests={tests} onChanged={refresh} />}
        {isEditOpen && classItem && (
          <ClassEditModal
            classItem={classItem}
            onClose={() => setIsEditOpen(false)}
            onSubmit={updateClass}
          />
        )}
        {deletePreview && <ClassDeleteModal preview={deletePreview} isPending={isDeletePending} onClose={() => setDeletePreview(null)} onConfirm={deleteClass} />}
      </div>
    </TeacherLayout>
  );
}

function ClassDeleteModal({
  preview,
  isPending,
  onClose,
  onConfirm,
}: {
  preview: DeletePreview;
  isPending: boolean;
  onClose: () => void;
  onConfirm: () => void;
}) {
  const title = preview.deleted ? "이 반을 완전히 삭제하시겠습니까?" : "이 반은 비활성 처리됩니다.";
  const message = preview.deleted
    ? "학생은 삭제되지 않고, 이 반과의 배정만 해제됩니다. 아직 숙제/제출/수업 기록이 없어 완전 삭제할 수 있습니다."
    : "이 반에는 숙제/제출/수업 기록이 있어 완전히 삭제할 수 없습니다. 반은 비활성 처리되어 활성 반 목록에서 숨겨지고, 학생과 기존 기록은 유지됩니다.";

  return (
    <Modal title={title} onClose={onClose}>
      <div className="grid gap-4">
        <p className="text-sm leading-6 text-slate-700">{message}</p>
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>취소</Button>
          <Button variant={preview.deleted ? "danger" : "primary"} onClick={onConfirm} disabled={isPending}>
            {isPending ? "처리 중..." : preview.deleted ? "완전 삭제" : "비활성 처리"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

function ClassEditModal({
  classItem,
  onClose,
  onSubmit,
}: {
  classItem: { name: string; description?: string | null };
  onClose: () => void;
  onSubmit: (formData: FormData) => void;
}) {
  return (
    <Modal title="반 정보 수정" onClose={onClose}>
      <form action={onSubmit} className="grid gap-4">
        <label className="grid gap-2 text-sm font-semibold">
          반 이름
          <Input name="name" required defaultValue={classItem.name} />
        </label>
        <label className="grid gap-2 text-sm font-semibold">
          설명
          <Textarea name="description" defaultValue={classItem.description ?? ""} />
        </label>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose}>취소</Button>
          <Button type="submit">저장</Button>
        </div>
      </form>
    </Modal>
  );
}

function OverviewTab({ notices, assignments, events, tests }: { notices: Notice[]; assignments: AssignmentRow[]; events: CalendarEvent[]; tests: TestRow[] }) {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <SummaryCard title="이번주 수업/일정" empty="등록된 일정이 없습니다." items={events.slice(0, 4).map((event) => ({ id: event.id, title: event.title, meta: `${formatDate(event.eventDate)} · ${eventLabel(event.eventType)}` }))} />
      <SummaryCard title="최근 반 공지사항" empty="이 반에 등록된 공지사항이 없습니다." items={notices.slice(0, 4).map((notice) => ({ id: notice.id, title: notice.title, meta: notice.status }))} />
      <SummaryCard title="숙제 현황" empty="등록된 숙제가 없습니다." items={assignments.slice(0, 4).map((assignment) => ({ id: assignment.id, title: assignment.title, meta: `제출 ${assignment.submittedCount}/${assignment.targetCount}명` }))} />
      <SummaryCard title="예정된 테스트" empty="등록된 테스트가 없습니다." items={tests.slice(0, 4).map((test) => ({ id: test.id, title: test.title, meta: `${test.subject} · ${formatDate(test.testDate)}` }))} />
    </div>
  );
}

function SummaryCard({ title, empty, items }: { title: string; empty: string; items: Array<{ id: string; title: string; meta: string }> }) {
  return (
    <Card>
      <h2 className="font-bold">{title}</h2>
      <div className="mt-3 grid gap-2">
        {items.length ? items.map((item) => <ListLine key={item.id} title={item.title} meta={item.meta} />) : <p className="rounded-md border border-dashed border-line p-4 text-center text-sm text-slate-500">{empty}</p>}
      </div>
    </Card>
  );
}

function ListLine({ title, meta }: { title: string; meta: string }) {
  return (
    <div className="rounded-md border border-line p-3">
      <p className="font-semibold">{title}</p>
      <p className="mt-1 text-sm text-slate-500">{meta}</p>
    </div>
  );
}

function StudentsTab({ students }: { students: StudentRow[] }) {
  return (
    <Card>
      <h2 className="font-bold">학생 목록</h2>
      <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {students.length ? (
          students.map((student) => (
            <Link
              key={student.id}
              href={`/teacher/students/${student.id}`}
              className="block rounded-md border border-line p-3 text-sm transition hover:border-action hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-action/30"
            >
              <p className="font-bold">{student.name}</p>
              <p className="text-slate-500">{student.studentLoginId}</p>
              <Badge tone={student.status === "active" ? "green" : "gray"}>{student.status}</Badge>
            </Link>
          ))
        ) : (
          <p className="text-sm text-slate-500">이 반에 등록된 학생이 없습니다.</p>
        )}
      </div>
    </Card>
  );
}

function HomeworkTab({ assignments }: { classId: string; assignments: AssignmentRow[] }) {
  return (
    <Card>
      <h2 className="font-bold">숙제 관리</h2>
      <div className="mt-3 grid gap-3">
        {assignments.length ? (
          assignments.map((assignment) => (
            <div key={assignment.id} className="rounded-md border border-line p-4">
              <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div>
                  <h3 className="font-bold">{assignment.title}</h3>
                  <p className="text-sm text-slate-500">마감 {assignment.dueAt ? formatDate(assignment.dueAt) : "-"}</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <Badge>대상 {assignment.targetCount}</Badge>
                    <Badge tone="green">제출 {assignment.submittedCount}</Badge>
                    <Badge tone="red">미제출 {assignment.missingCount}</Badge>
                    <Badge tone="yellow">검토 {assignment.needsReviewCount}</Badge>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button href={`/teacher/assignments/${assignment.id}/submissions`} variant="secondary">
                    제출 현황
                  </Button>
                  <Button href={`/teacher/assignments/new?assignmentId=${assignment.id}`} variant="secondary">
                    수정
                  </Button>
                </div>
              </div>
            </div>
          ))
        ) : (
          <p className="rounded-md border border-dashed border-line p-4 text-center text-sm text-slate-500">등록된 숙제가 없습니다.</p>
        )}
      </div>
    </Card>
  );
}

function NoticesTab({ classId, notices, onChanged }: { classId: string; notices: Notice[]; onChanged: (msg: string) => void }) {
  const [editing, setEditing] = useState<Notice | null>(null);
  const [isOpen, setIsOpen] = useState(false);

  async function remove(noticeId: string) {
    if (!window.confirm("반 공지사항을 삭제할까요?")) return;
    await fetch(`/api/teacher/notices/${noticeId}`, { method: "DELETE" });
    onChanged("반 공지사항을 삭제했습니다.");
  }

  return (
    <Card>
      <div className="flex items-center justify-between">
        <h2 className="font-bold">반 공지사항</h2>
        <Button onClick={() => { setEditing(null); setIsOpen(true); }}>반 공지 작성</Button>
      </div>
      <div className="mt-3 grid gap-3">
        {notices.length ? (
          notices.map((notice) => (
            <div key={notice.id} className="rounded-md border border-line p-4">
              <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div>
                  <div className="flex gap-2">
                    <Badge tone="green">반</Badge>
                    <Badge>{notice.status}</Badge>
                  </div>
                  <h3 className="mt-2 font-bold">{notice.title}</h3>
                  <p className="mt-1 text-sm text-slate-600">{notice.content}</p>
                </div>
                <div className="flex gap-2">
                  <Button variant="secondary" onClick={() => { setEditing(notice); setIsOpen(true); }}>수정</Button>
                  <Button variant="danger" onClick={() => remove(notice.id)}>삭제</Button>
                </div>
              </div>
            </div>
          ))
        ) : (
          <p className="rounded-md border border-dashed border-line p-4 text-center text-sm text-slate-500">이 반에 등록된 공지사항이 없습니다.</p>
        )}
      </div>
      {isOpen && <NoticeModal classId={classId} notice={editing} onClose={() => setIsOpen(false)} onSaved={() => { setIsOpen(false); onChanged("반 공지사항을 저장했습니다."); }} />}
    </Card>
  );
}

function NoticeModal({ classId, notice, onClose, onSaved }: { classId: string; notice: Notice | null; onClose: () => void; onSaved: () => void }) {
  const [title, setTitle] = useState(notice?.title ?? "");
  const [content, setContent] = useState(notice?.content ?? "");
  const [imageUrl, setImageUrl] = useState(notice?.imageUrl ?? "");
  const [status, setStatus] = useState(notice?.status ?? "published");
  const [isPending, startTransition] = useTransition();

  function save() {
    startTransition(async () => {
      await fetch(notice ? `/api/teacher/notices/${notice.id}` : `/api/teacher/classes/${classId}/notices`, {
        method: notice ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, content, imageUrl: imageUrl || null, status }),
      });
      onSaved();
    });
  }

  return (
    <Modal title={notice ? "반 공지 수정" : "반 공지 작성"} onClose={onClose}>
      <div className="grid gap-4">
        <label className="grid gap-2 text-sm font-semibold">제목<Input value={title} onChange={(event) => setTitle(event.target.value)} /></label>
        <label className="grid gap-2 text-sm font-semibold">본문<Textarea value={content} onChange={(event) => setContent(event.target.value)} /></label>
        <label className="grid gap-2 text-sm font-semibold">이미지 URL<Input value={imageUrl} onChange={(event) => setImageUrl(event.target.value)} /></label>
        <label className="grid gap-2 text-sm font-semibold">공개 상태<Select value={status} onChange={(event) => setStatus(event.target.value)}><option value="published">published</option><option value="draft">draft</option><option value="hidden">hidden</option></Select></label>
        <ModalActions onClose={onClose} onSave={save} isPending={isPending} />
      </div>
    </Modal>
  );
}

function ScheduleTab({ classId, scheduleDays, events, onChanged }: { classId: string; scheduleDays: ScheduleDay[]; events: CalendarEvent[]; onChanged: (msg: string) => void }) {
  const [isOpen, setIsOpen] = useState(false);
  const firstDate = events[0]?.eventDate ?? scheduleDays[0]?.date ?? "2026-05-25";
  const [selectedDate, setSelectedDate] = useState(dateOnly(firstDate));
  const visibleEvents = events.filter((event) => event.status !== "hidden");
  const selectedEvents = visibleEvents.filter((event) => dateOnly(event.eventDate) === selectedDate);
  const selectedScheduleDays = scheduleDays.filter((day) => dateOnly(day.date) === selectedDate);

  async function remove(eventId: string) {
    await fetch(`/api/teacher/classes/${classId}/calendar-events/${eventId}`, { method: "DELETE" });
    onChanged("일정을 삭제했습니다.");
  }

  return (
    <Card>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-bold">수업 일정</h2>
          <p className="mt-1 text-sm text-slate-500">이 캘린더는 반 단위로 공유되어 같은 반 학생 홈 화면에도 표시됩니다.</p>
        </div>
        <Button onClick={() => setIsOpen(true)}>일정 추가</Button>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
        <ClassCalendarGrid events={visibleEvents} scheduleDays={scheduleDays} selectedDate={selectedDate} onSelectDate={setSelectedDate} anchorDate={firstDate} />
        <div className="rounded-lg border border-line bg-slate-50 p-4">
          <h3 className="font-bold">{formatDate(selectedDate)} 일정</h3>
          <div className="mt-3 grid gap-3">
            {selectedEvents.map((event) => (
              <div key={event.id} className="rounded-md border border-line bg-white p-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <Badge tone={eventTone(event.eventType)}>{eventLabel(event.eventType)}</Badge>
                    <p className="mt-2 font-bold">{event.title}</p>
                    <p className="text-sm text-slate-500">{event.startTime ?? ""}{event.startTime || event.endTime ? " - " : ""}{event.endTime ?? ""}</p>
                    {event.description && <p className="mt-2 text-sm text-slate-600">{event.description}</p>}
                  </div>
                  <Button variant="danger" onClick={() => remove(event.id)}>삭제</Button>
                </div>
              </div>
            ))}
            {selectedScheduleDays.map((day) => (
              <div key={day.id} className="rounded-md border border-line bg-white p-3">
                <Badge tone="blue">수업 기록</Badge>
                <p className="mt-2 font-bold">{day.startTime ?? ""}{day.startTime || day.endTime ? " - " : ""}{day.endTime ?? ""}</p>
                <p className="text-sm text-slate-500">{day.bookTitle ?? "-"} / {day.progressTitle ?? "-"}</p>
              </div>
            ))}
            {selectedEvents.length === 0 && selectedScheduleDays.length === 0 && <p className="rounded-md border border-dashed border-line bg-white p-4 text-center text-sm text-slate-500">선택한 날짜에 일정이 없습니다.</p>}
          </div>
        </div>
      </div>

      {isOpen && <ScheduleModal classId={classId} onClose={() => setIsOpen(false)} onSaved={() => { setIsOpen(false); onChanged("일정을 저장했습니다."); }} />}
    </Card>
  );
}

function ClassCalendarGrid({ events, scheduleDays, selectedDate, onSelectDate, anchorDate }: { events: CalendarEvent[]; scheduleDays: ScheduleDay[]; selectedDate: string; onSelectDate: (date: string) => void; anchorDate: string }) {
  const days = buildMonthDays(anchorDate);
  const eventsByDate = useMemo(() => {
    const grouped = new Map<string, Array<{ type: string; id: string }>>();
    for (const event of events) {
      const key = dateOnly(event.eventDate);
      grouped.set(key, [...(grouped.get(key) ?? []), { type: event.eventType, id: event.id }]);
    }
    for (const day of scheduleDays) {
      const key = dateOnly(day.date);
      grouped.set(key, [...(grouped.get(key) ?? []), { type: "class", id: day.id }]);
    }
    return grouped;
  }, [events, scheduleDays]);

  return (
    <div className="rounded-lg border border-line bg-white p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="font-bold">{new Intl.DateTimeFormat("ko-KR", { year: "numeric", month: "long" }).format(new Date(`${dateOnly(anchorDate)}T00:00:00`))}</h3>
        <Badge tone="blue">반 캘린더</Badge>
      </div>
      <div className="grid grid-cols-7 gap-1 text-center text-xs font-bold text-slate-500">
        {["일", "월", "화", "수", "목", "금", "토"].map((day) => <span key={day}>{day}</span>)}
      </div>
      <div className="mt-2 grid grid-cols-7 gap-1">
        {days.map((date, index) => {
          const markers = date ? eventsByDate.get(date) ?? [] : [];
          const isSelected = date === selectedDate;
          return (
            <button
              key={date ?? `empty-${index}`}
              type="button"
              disabled={!date}
              onClick={() => date && onSelectDate(date)}
              className={cn("min-h-20 rounded-md border border-line p-1.5 text-left text-sm transition disabled:bg-transparent", date && "bg-white hover:border-action hover:bg-blue-50", isSelected && "border-action bg-blue-50 ring-1 ring-action")}
            >
              {date && (
                <>
                  <span className="font-bold">{Number(date.slice(-2))}</span>
                  <div className="mt-1 flex flex-wrap gap-1">
                    {markers.slice(0, 4).map((marker) => (
                      <span key={`${marker.type}-${marker.id}`} className={cn("h-2 w-2 rounded-full", marker.type === "cancelled" && "bg-red-500", marker.type === "test" && "bg-yellow-500", marker.type === "makeup" && "bg-green-500", marker.type === "class" && "bg-blue-500", marker.type === "etc" && "bg-slate-400")} />
                    ))}
                  </div>
                </>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function ScheduleModal({ classId, onClose, onSaved }: { classId: string; onClose: () => void; onSaved: () => void }) {
  const [eventType, setEventType] = useState("class");
  const [title, setTitle] = useState("");
  const [eventDate, setEventDate] = useState("2026-05-25");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [description, setDescription] = useState("");
  const [isPending, startTransition] = useTransition();

  function save() {
    startTransition(async () => {
      await fetch(`/api/teacher/classes/${classId}/calendar-events`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ eventType, title, eventDate, startTime: startTime || null, endTime: endTime || null, description }),
      });
      onSaved();
    });
  }

  return (
    <Modal title="일정 추가" onClose={onClose}>
      <div className="grid gap-4">
        <label className="grid gap-2 text-sm font-semibold">유형<Select value={eventType} onChange={(event) => setEventType(event.target.value)}><option value="class">정규수업</option><option value="cancelled">휴강</option><option value="makeup">보강</option><option value="test">시험</option><option value="etc">기타</option></Select></label>
        <label className="grid gap-2 text-sm font-semibold">날짜<Input type="date" value={eventDate} onChange={(event) => setEventDate(event.target.value)} /></label>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="grid gap-2 text-sm font-semibold">시작 시간<Input type="time" value={startTime} onChange={(event) => setStartTime(event.target.value)} /></label>
          <label className="grid gap-2 text-sm font-semibold">종료 시간<Input type="time" value={endTime} onChange={(event) => setEndTime(event.target.value)} /></label>
        </div>
        <label className="grid gap-2 text-sm font-semibold">제목<Input value={title} onChange={(event) => setTitle(event.target.value)} /></label>
        <label className="grid gap-2 text-sm font-semibold">설명<Textarea value={description} onChange={(event) => setDescription(event.target.value)} /></label>
        <ModalActions onClose={onClose} onSave={save} isPending={isPending} />
      </div>
    </Modal>
  );
}

function TestsTab({ classId, students, tests, onChanged }: { classId: string; students: StudentRow[]; tests: TestRow[]; onChanged: (msg: string) => void }) {
  const [isTestOpen, setIsTestOpen] = useState(false);
  const [resultTest, setResultTest] = useState<TestRow | null>(null);

  async function remove(testId: string) {
    await fetch(`/api/teacher/tests/${testId}`, { method: "DELETE" });
    onChanged("테스트를 삭제했습니다.");
  }

  return (
    <Card>
      <div className="flex items-center justify-between">
        <h2 className="font-bold">테스트 관리</h2>
        <Button onClick={() => setIsTestOpen(true)}>테스트 추가</Button>
      </div>
      <div className="mt-3 grid gap-3">
        {tests.length ? (
          tests.map((test) => (
            <div key={test.id} className="rounded-md border border-line p-4">
              <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div>
                  <Badge tone="blue">{test.subject}</Badge>
                  <h3 className="mt-2 font-bold">{test.title}</h3>
                  <p className="text-sm text-slate-500">{formatDate(test.testDate)} · 범위: {test.scope ?? "-"}</p>
                  <div className="mt-2 flex gap-2">
                    <Badge>결과 {test.resultCount}</Badge>
                    <Badge tone="green">PASS {test.passCount}</Badge>
                    <Badge tone="red">NonPASS {test.nonpassCount}</Badge>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button variant="secondary" onClick={() => setResultTest(test)}>결과 입력</Button>
                  <Button variant="danger" onClick={() => remove(test.id)}>삭제</Button>
                </div>
              </div>
            </div>
          ))
        ) : (
          <p className="rounded-md border border-dashed border-line p-4 text-center text-sm text-slate-500">등록된 테스트가 없습니다.</p>
        )}
      </div>
      {isTestOpen && <TestModal classId={classId} onClose={() => setIsTestOpen(false)} onSaved={() => { setIsTestOpen(false); onChanged("테스트를 저장했습니다."); }} />}
      {resultTest && <TestResultModal test={resultTest} students={students} onClose={() => setResultTest(null)} onSaved={() => { setResultTest(null); onChanged("테스트 결과를 저장했습니다."); }} />}
    </Card>
  );
}

function TestModal({ classId, onClose, onSaved }: { classId: string; onClose: () => void; onSaved: () => void }) {
  const [title, setTitle] = useState("");
  const [subject, setSubject] = useState("SR");
  const [testDate, setTestDate] = useState("2026-05-27");
  const [scope, setScope] = useState("");
  const [isPending, startTransition] = useTransition();

  function save() {
    startTransition(async () => {
      await fetch("/api/teacher/tests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ classId, title, subject, testDate, scope }),
      });
      onSaved();
    });
  }

  return (
    <Modal title="테스트 추가" onClose={onClose}>
      <div className="grid gap-4">
        <label className="grid gap-2 text-sm font-semibold">시험명<Input value={title} onChange={(event) => setTitle(event.target.value)} /></label>
        <label className="grid gap-2 text-sm font-semibold">과목<Input value={subject} onChange={(event) => setSubject(event.target.value)} /></label>
        <label className="grid gap-2 text-sm font-semibold">시험 날짜<Input type="date" value={testDate} onChange={(event) => setTestDate(event.target.value)} /></label>
        <label className="grid gap-2 text-sm font-semibold">범위<Input value={scope} onChange={(event) => setScope(event.target.value)} /></label>
        <ModalActions onClose={onClose} onSave={save} isPending={isPending} />
      </div>
    </Modal>
  );
}

function TestResultModal({ test, students, onClose, onSaved }: { test: TestRow; students: StudentRow[]; onClose: () => void; onSaved: () => void }) {
  const [rows, setRows] = useState<TestResultRow[]>(students.map((student) => ({ studentId: student.id, studentName: student.name, score: null, maxScore: 100, result: "PASS", teacherMemo: "", takenAt: test.testDate })));
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    fetch(`/api/teacher/tests/${test.id}/results`)
      .then((response) => response.json())
      .then((data) => {
        if (data.results?.length) setRows(data.results);
      })
      .catch(() => undefined);
  }, [test.id]);

  function update(studentId: string, input: Partial<TestResultRow>) {
    setRows((current) => current.map((row) => (row.studentId === studentId ? { ...row, ...input } : row)));
  }

  function save() {
    startTransition(async () => {
      await fetch(`/api/teacher/tests/${test.id}/results`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ results: rows }),
      });
      onSaved();
    });
  }

  return (
    <Modal title={`${test.title} 결과 입력`} onClose={onClose}>
      <div className="grid max-h-[65vh] gap-3 overflow-auto">
        {rows.map((row) => (
          <div key={row.studentId} className="rounded-md border border-line p-3">
            <p className="font-bold">{row.studentName}</p>
            <div className="mt-2 grid gap-2 md:grid-cols-[120px_150px_1fr]">
              <Input type="number" value={row.score ?? ""} onChange={(event) => update(row.studentId, { score: event.target.value ? Number(event.target.value) : null })} placeholder="점수" />
              <Select value={row.result} onChange={(event) => update(row.studentId, { result: event.target.value as "PASS" | "NonPASS" })}>
                <option value="PASS">PASS</option>
                <option value="NonPASS">NonPASS</option>
              </Select>
              <Input value={row.teacherMemo} onChange={(event) => update(row.studentId, { teacherMemo: event.target.value })} placeholder="선생님 메모" />
            </div>
          </div>
        ))}
      </div>
      <div className="mt-4 flex justify-end gap-2">
        <Button variant="secondary" onClick={onClose}>취소</Button>
        <Button onClick={save} disabled={isPending}>{isPending ? "저장 중..." : "저장"}</Button>
      </div>
    </Modal>
  );
}

function ModalActions({ onClose, onSave, isPending }: { onClose: () => void; onSave: () => void; isPending: boolean }) {
  return (
    <div className="flex justify-end gap-2">
      <Button variant="secondary" onClick={onClose}>취소</Button>
      <Button onClick={onSave} disabled={isPending}>{isPending ? "저장 중..." : "저장"}</Button>
    </div>
  );
}

function Modal({ title, children, onClose }: { title: string; children: ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/35 p-4" role="dialog" aria-modal="true">
      <div className="max-h-[90vh] w-full max-w-3xl overflow-auto rounded-lg bg-white p-5 shadow-soft">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold">{title}</h2>
          <Button variant="secondary" onClick={onClose}>닫기</Button>
        </div>
        {children}
      </div>
    </div>
  );
}
