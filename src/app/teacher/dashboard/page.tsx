"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { TeacherLayout } from "@/components/layout/TeacherLayout";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";

type DashboardData = {
  weekStart: string;
  weekEnd: string;
  todayClasses: ScheduleItem[];
  weeklySchedule: ScheduleItem[];
  assignmentSummary: { totalAssigned: number; submitted: number; missing: number; needsReview: number };
  classCards: Array<{ classId: string; className: string; studentCount: number; assignedCount: number; submittedCount: number; missingCount: number; needsReviewCount: number }>;
};

type ScheduleItem = {
  id: string;
  classId: string;
  className: string;
  date: string;
  startTime: string | null;
  endTime: string | null;
  bookTitle: string | null;
  progressTitle: string | null;
  progressMemo: string | null;
  nextPrep: string | null;
  homeworkCount: number;
};

type Notice = {
  id: string;
  title: string;
  content: string;
  imageUrl: string | null;
  status: string;
  createdAt: string;
  publishedAt: string | null;
};

function addDays(date: string, days: number) {
  const base = new Date(`${date}T00:00:00.000Z`);
  base.setUTCDate(base.getUTCDate() + days);
  return base.toISOString().slice(0, 10);
}

function mondayOfThisWeek() {
  const now = new Date();
  const day = now.getDay();
  const offset = day === 0 ? -6 : 1 - day;
  now.setDate(now.getDate() + offset);
  return now.toISOString().slice(0, 10);
}

function dateLabel(date: string) {
  return new Intl.DateTimeFormat("ko-KR", { month: "numeric", day: "numeric", weekday: "short" }).format(new Date(`${date}T00:00:00`));
}

export default function TeacherDashboardPage() {
  const [weekStart, setWeekStart] = useState(mondayOfThisWeek);
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setError(null);
    fetch(`/api/teacher/dashboard?weekStart=${weekStart}`, { cache: "no-store" })
      .then(async (response) => {
        const body = await response.json();
        if (!response.ok) throw new Error(body.error ?? "대시보드를 불러오지 못했습니다.");
        return body as DashboardData;
      })
      .then(setData)
      .catch((err: Error) => setError(err.message));
  }, [weekStart]);

  const weekDays = useMemo(() => Array.from({ length: 7 }, (_, index) => addDays(weekStart, index)), [weekStart]);

  return (
    <TeacherLayout title="대시보드">
      <GlobalNoticeSection />
      {error && <p className="mt-4 rounded-md bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{error}</p>}

      <Card className="mt-5">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-lg font-bold">이번 주 수업 일정</h2>
            <p className="mt-1 text-sm text-slate-500">{data?.weekStart ?? weekStart} - {data?.weekEnd ?? addDays(weekStart, 6)}</p>
          </div>
          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => setWeekStart(addDays(weekStart, -7))}>이전 주</Button>
            <Button variant="secondary" onClick={() => setWeekStart(mondayOfThisWeek())}>이번 주</Button>
            <Button variant="secondary" onClick={() => setWeekStart(addDays(weekStart, 7))}>다음 주</Button>
          </div>
        </div>
        <div className="mt-4 grid gap-3 lg:grid-cols-7">
          {weekDays.map((day) => (
            <div key={day} className="rounded-md border border-line bg-white p-3">
              <p className="font-bold">{dateLabel(day)}</p>
              <div className="mt-3 grid gap-2">
                {(data?.weeklySchedule ?? []).filter((item) => item.date === day).map((item) => (
                  <Button key={item.id} href={`/teacher/classes/${item.classId}`} variant="ghost" className="h-auto justify-start border border-line p-2 text-left">
                    <span className="min-w-0">
                      <span className="block truncate font-bold">{item.className}</span>
                      <span className="block text-xs text-slate-500">{item.startTime ?? "-"} - {item.endTime ?? "-"}</span>
                      <span className="block truncate text-xs text-slate-500">{item.progressTitle ?? item.bookTitle ?? "진도 미입력"}</span>
                    </span>
                  </Button>
                ))}
                {(data?.weeklySchedule ?? []).filter((item) => item.date === day).length === 0 && <p className="rounded-md border border-dashed border-line p-3 text-center text-xs text-slate-400">일정 없음</p>}
              </div>
            </div>
          ))}
        </div>
      </Card>

      <div className="mt-5 grid gap-5 xl:grid-cols-[360px_1fr]">
        <Card>
          <h2 className="text-lg font-bold">오늘 수업</h2>
          <div className="mt-3 grid gap-2">
            {(data?.todayClasses ?? []).length === 0 ? <p className="rounded-md border border-dashed border-line p-4 text-center text-sm text-slate-500">오늘 수업이 없습니다.</p> : data?.todayClasses.map((item) => (
              <Button key={item.id} href={`/teacher/classes/${item.classId}`} variant="secondary" className="justify-between">
                <span>{item.className}</span>
                <span className="text-xs text-slate-500">{item.startTime ?? "-"}</span>
              </Button>
            ))}
          </div>
        </Card>

        <Card>
          <h2 className="text-lg font-bold">반별 진행 상황</h2>
          <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {(data?.classCards ?? []).map((classItem) => (
              <div key={classItem.classId} className="rounded-md border border-line p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="font-bold">{classItem.className}</h3>
                    <p className="mt-1 text-sm text-slate-500">학생 {classItem.studentCount}명</p>
                  </div>
                  <Button href={`/teacher/classes/${classItem.classId}`} variant="secondary">상세</Button>
                </div>
                <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
                  <ProgressBadge label="진행 중" value={classItem.assignedCount} />
                  <ProgressBadge label="제출" value={classItem.submittedCount} />
                  <ProgressBadge label="미제출" value={classItem.missingCount} tone="red" />
                  <ProgressBadge label="검토" value={classItem.needsReviewCount} tone="yellow" />
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </TeacherLayout>
  );
}

function GlobalNoticeSection() {
  const [notices, setNotices] = useState<Notice[]>([]);
  const [editing, setEditing] = useState<Notice | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [message, setMessage] = useState("");

  async function load() {
    const response = await fetch("/api/teacher/notices/global", { cache: "no-store" });
    const data = await response.json();
    setNotices(data.notices ?? []);
  }

  useEffect(() => {
    load().catch(() => setNotices([]));
  }, []);

  async function remove(noticeId: string) {
    if (!window.confirm("전체 공지사항을 삭제할까요?")) return;
    await fetch(`/api/teacher/notices/${noticeId}`, { method: "DELETE" });
    setMessage("전체 공지사항을 삭제했습니다.");
    await load();
  }

  return (
    <Card>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-bold">전체 공지사항</h2>
          <p className="mt-1 text-sm text-slate-500">강사의 모든 학생에게 보이는 공지입니다.</p>
        </div>
        <Button type="button" onClick={() => { setEditing(null); setIsOpen(true); }}>전체 공지 작성</Button>
      </div>
      {message && <p className="mt-3 rounded-md bg-blue-50 px-3 py-2 text-sm font-semibold text-action">{message}</p>}
      <div className="mt-4 grid gap-3">
        {notices.length === 0 ? <p className="rounded-md border border-dashed border-line p-4 text-center text-sm text-slate-500">등록된 전체 공지사항이 없습니다.</p> : notices.map((notice) => (
          <article key={notice.id} className="rounded-md border border-line p-4">
            <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
              <div>
                <div className="flex flex-wrap gap-2"><Badge tone="blue">전체</Badge><Badge>{notice.status}</Badge></div>
                <h3 className="mt-2 font-bold">{notice.title}</h3>
                <p className="mt-1 text-sm text-slate-600">{notice.content}</p>
                <p className="mt-2 text-xs font-semibold text-slate-400">{notice.publishedAt ?? notice.createdAt}</p>
              </div>
              <div className="flex gap-2">
                <Button type="button" variant="secondary" onClick={() => { setEditing(notice); setIsOpen(true); }}>수정</Button>
                <Button type="button" variant="danger" onClick={() => remove(notice.id)}>삭제</Button>
              </div>
            </div>
          </article>
        ))}
      </div>
      {isOpen && <NoticeFormModal notice={editing} onClose={() => setIsOpen(false)} onSaved={async () => { setIsOpen(false); setMessage("전체 공지사항을 저장했습니다."); await load(); }} />}
    </Card>
  );
}

function NoticeFormModal({ notice, onClose, onSaved }: { notice: Notice | null; onClose: () => void; onSaved: () => void }) {
  const [title, setTitle] = useState(notice?.title ?? "");
  const [content, setContent] = useState(notice?.content ?? "");
  const [imageUrl, setImageUrl] = useState(notice?.imageUrl ?? "");
  const [status, setStatus] = useState(notice?.status ?? "published");
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  function save() {
    setError("");
    startTransition(async () => {
      const response = await fetch(notice ? `/api/teacher/notices/${notice.id}` : "/api/teacher/notices/global", {
        method: notice ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, content, imageUrl: imageUrl || null, status }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError(data.error ?? "공지 저장 중 오류가 발생했습니다.");
        return;
      }
      onSaved();
    });
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/35 p-4" role="dialog" aria-modal="true">
      <div className="w-full max-w-xl rounded-lg bg-white p-5 shadow-soft">
        <h2 className="text-lg font-bold">{notice ? "전체 공지 수정" : "전체 공지 작성"}</h2>
        {error && <p className="mt-3 rounded-md bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">{error}</p>}
        <div className="mt-4 grid gap-4">
          <label className="grid gap-2 text-sm font-semibold">제목<Input value={title} onChange={(event) => setTitle(event.target.value)} /></label>
          <label className="grid gap-2 text-sm font-semibold">본문<Textarea value={content} onChange={(event) => setContent(event.target.value)} /></label>
          <label className="grid gap-2 text-sm font-semibold">이미지 URL<Input value={imageUrl} onChange={(event) => setImageUrl(event.target.value)} placeholder="선택 사항" /></label>
          <label className="grid gap-2 text-sm font-semibold">공개 상태<Select value={status} onChange={(event) => setStatus(event.target.value)}><option value="published">published</option><option value="draft">draft</option><option value="hidden">hidden</option></Select></label>
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose}>취소</Button>
          <Button type="button" onClick={save} disabled={isPending}>{isPending ? "저장 중..." : "저장"}</Button>
        </div>
      </div>
    </div>
  );
}

function ProgressBadge({ label, value, tone = "blue" }: { label: string; value: number; tone?: "blue" | "red" | "yellow" }) {
  return (
    <div className="rounded-md bg-slate-50 p-3">
      <p className="text-xs font-semibold text-slate-500">{label}</p>
      <p className={tone === "red" ? "mt-1 text-xl font-bold text-red-700" : tone === "yellow" ? "mt-1 text-xl font-bold text-amber-700" : "mt-1 text-xl font-bold text-slate-900"}>{value}</p>
    </div>
  );
}
