"use client";

import { useEffect, useMemo, useState } from "react";
import { TeacherLayout } from "@/components/layout/TeacherLayout";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";

type DashboardData = {
  weekStart: string;
  weekEnd: string;
  todayClasses: ScheduleItem[];
  weeklySchedule: ScheduleItem[];
  assignmentSummary: {
    totalAssigned: number;
    submitted: number;
    missing: number;
    needsReview: number;
  };
  classCards: Array<{
    classId: string;
    className: string;
    studentCount: number;
    assignedCount: number;
    submittedCount: number;
    missingCount: number;
    needsReviewCount: number;
  }>;
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
  const parsed = new Date(`${date}T00:00:00`);
  return new Intl.DateTimeFormat("ko-KR", { month: "numeric", day: "numeric", weekday: "short" }).format(parsed);
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
  const summary = data?.assignmentSummary ?? { totalAssigned: 0, submitted: 0, missing: 0, needsReview: 0 };

  return (
    <TeacherLayout title="대시보드">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard label="이번 주 배정" value={summary.totalAssigned} />
        <MetricCard label="제출 완료" value={summary.submitted} />
        <MetricCard label="미제출" value={summary.missing} tone="red" />
        <MetricCard label="검토 필요" value={summary.needsReview} tone="yellow" />
      </div>

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
                {(data?.weeklySchedule ?? []).filter((item) => item.date === day).length === 0 && (
                  <p className="rounded-md border border-dashed border-line p-3 text-center text-xs text-slate-400">일정 없음</p>
                )}
              </div>
            </div>
          ))}
        </div>
      </Card>

      <div className="mt-5 grid gap-5 xl:grid-cols-[360px_1fr]">
        <Card>
          <h2 className="text-lg font-bold">오늘 수업</h2>
          <div className="mt-3 grid gap-2">
            {(data?.todayClasses ?? []).length === 0 ? (
              <p className="rounded-md border border-dashed border-line p-4 text-center text-sm text-slate-500">오늘 수업이 없습니다.</p>
            ) : (
              data?.todayClasses.map((item) => (
                <Button key={item.id} href={`/teacher/classes/${item.classId}`} variant="secondary" className="justify-between">
                  <span>{item.className}</span>
                  <span className="text-xs text-slate-500">{item.startTime ?? "-"}</span>
                </Button>
              ))
            )}
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

function MetricCard({ label, value, tone = "blue" }: { label: string; value: number; tone?: "blue" | "red" | "yellow" }) {
  return (
    <Card>
      <p className="text-sm text-slate-500">{label}</p>
      <p className="mt-2 text-3xl font-bold">{value}</p>
      <Badge tone={tone === "red" ? "red" : tone === "yellow" ? "yellow" : "blue"}>DB</Badge>
    </Card>
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
