"use client";

import { Suspense, useEffect, useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { TeacherLayout } from "@/components/layout/TeacherLayout";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import type { ClassHomeworkType } from "@/features/class-calendar/types/classCalendar";

const DEFAULT_HOMEWORK_IMAGE_URL = "";

const templateOptions = [
  {
    id: "alphabet-speaking",
    name: "알파벳 카드 말하기",
    title: "Alphabet Picture Cards Speaking",
    type: "image_speaking" as ClassHomeworkType,
    description: "이미지를 보고 각 단어를 또렷하게 말해 보세요.",
    passageTitle: "A to G Picture Cards",
    passageText: "Look at each picture. Say the letter, the sound, and the word clearly.",
    minRecordingSec: "10",
    maxRecordingSec: "90"
  },
  {
    id: "sentence-shadowing",
    name: "문장 따라 읽기 기본",
    title: "Daily Sentence Shadowing",
    type: "sentence_shadowing" as ClassHomeworkType,
    description: "원어민 음성을 듣고 같은 속도와 억양으로 따라 읽으세요.",
    passageTitle: "A Day at the Museum",
    passageText: "I went to the museum with my family. We saw old paintings, shiny stones, and a big dinosaur.",
    minRecordingSec: "3",
    maxRecordingSec: "120"
  }
];

const assignmentClasses = [
  { id: "class-a", name: "월수 Basic Speaking", studentCount: 8, students: ["이지우", "박서준", "최하윤", "한아린", "유재영", "서도윤", "강지우", "문하린"] },
  { id: "class-b", name: "화목 Reading Plus", studentCount: 6, students: ["최하윤", "정도윤", "한아린", "백서준", "윤채원", "남도현"] },
  { id: "reading-a", name: "초등 Reading A", studentCount: 10, students: ["김나은", "이지아", "박현우", "최서율", "정민서", "오하준", "송예린", "문지호", "강윤서", "한시우"] },
  { id: "reading-b", name: "초등 Reading B", studentCount: 9, students: ["유하늘", "서지민", "홍태오", "권예준", "임수아", "배지안", "조은채", "신도윤", "고유빈"] },
  { id: "middle-speaking", name: "중등 Speaking", studentCount: 7, students: ["장민재", "이도겸", "박세은", "최연우", "정유나", "오준서", "김서현"] }
];

type ApiAssignmentClass = { id: string; name: string; studentCount: number; students: Array<{ id: string; name: string }> };
type ApiAssignmentOption = { id: string; name: string };

type TemplateState = {
  title: string;
  type: ClassHomeworkType;
  description: string;
  passageTitle: string;
  passageText: string;
  minRecordingSec: string;
  maxRecordingSec: string;
  audioFileName: string;
  imageUrl: string;
};

type ClassAssignment = {
  classId: string;
  dueDate: string;
  dueTime: string;
  visibility: VisibilityStatus;
  targetMode: "all" | "partial";
  selectedStudents: string[];
  studentSearch: string;
};

type VisibilityStatus = "draft" | "published";

function formatTime(time: string) {
  if (!time) return "-";
  const [hourText, minute] = time.split(":");
  const hour = Number(hourText);
  const period = hour >= 12 ? "PM" : "AM";
  const hour12 = hour % 12 || 12;
  return `${hour12}:${minute} ${period}`;
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
  const routeAssignmentId = searchParams.get("assignmentId");
  const routeClassId = searchParams.get("classId");
  const isEditMode = Boolean(routeAssignmentId);
  const [assignmentOptions, setAssignmentOptions] = useState<ApiAssignmentOption[]>([]);
  const [assignmentClassRows, setAssignmentClassRows] = useState<ApiAssignmentClass[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState("");
  const [message, setMessage] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [isSavingTemplate, startSavingTemplate] = useTransition();
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [defaultDueDate, setDefaultDueDate] = useState("2026-05-25");
  const [defaultDueTime, setDefaultDueTime] = useState("23:59");
  const [visibility, setVisibility] = useState<VisibilityStatus>("published");
  const [template, setTemplate] = useState<TemplateState>({
    title: "Discovery Unit 1 Speaking Homework",
    type: "listening_recording",
    description: "원어민 음성을 듣고 같은 속도로 읽어 보세요.",
    passageTitle: "A Day at the Museum",
    passageText: "I went to the museum with my family. We saw old paintings, shiny stones, and a big dinosaur. My favorite part was the space room.",
    minRecordingSec: "3",
    maxRecordingSec: "120",
    audioFileName: "",
    imageUrl: DEFAULT_HOMEWORK_IMAGE_URL
  });
  const [classAssignments, setClassAssignments] = useState<Record<string, ClassAssignment>>(() => {
    if (!routeClassId || !assignmentClasses.some((classItem) => classItem.id === routeClassId)) return {};
    return {
      [routeClassId]: {
        classId: routeClassId,
        dueDate: defaultDueDate,
        dueTime: defaultDueTime,
        visibility,
        targetMode: "all",
        selectedStudents: [],
        studentSearch: ""
      }
    };
  });

  const selectedAssignments = Object.values(classAssignments);
  const summaryRows = selectedAssignments.map((assignment) => {
    const sourceClasses = assignmentClassRows.length > 0 ? assignmentClassRows : assignmentClasses.map((item) => ({
      ...item,
      students: item.students.map((name, index) => ({ id: `${item.id}-${index}`, name })),
    }));
    const classItem = sourceClasses.find((item) => item.id === assignment.classId);
    const studentCount = assignment.targetMode === "all" ? classItem?.studentCount ?? 0 : assignment.selectedStudents.length;
    return { assignment, classItem, studentCount };
  });
  const totalStudents = summaryRows.reduce((sum, row) => sum + row.studentCount, 0);
  const currentAssignmentId = routeAssignmentId ?? selectedTemplateId;

  useEffect(() => {
    fetch("/api/teacher/classes", { cache: "no-store" })
      .then((response) => response.json())
      .then((data: ApiAssignmentClass[]) => setAssignmentClassRows(data.filter((item) => item.studentCount >= 0)))
      .catch(() => setAssignmentClassRows([]));

    fetch("/api/teacher/assignments", { cache: "no-store" })
      .then((response) => response.json())
      .then((data) => {
        const options = (data.assignments ?? []).map((item: { id: string; title: string }) => ({ id: item.id, name: item.title }));
        setAssignmentOptions(options);
        setSelectedTemplateId((current) => current || options[0]?.id || "");
      })
      .catch(() => setAssignmentOptions([]));
  }, []);

  useEffect(() => {
    if (!routeAssignmentId) return;
    const assignmentId = routeAssignmentId;
    let ignore = false;

    async function loadSavedTemplate() {
      const response = await fetch(`/api/teacher/assignments?id=${encodeURIComponent(assignmentId)}`, { cache: "no-store" });
      const data = await response.json();
      if (ignore || !data.assignment) return;
      setTemplate((current) => ({
        ...current,
        title: data.assignment.title,
        type: data.assignment.type,
        description: data.assignment.description,
        passageTitle: data.assignment.item.title,
        passageText: data.assignment.item.passageText,
        minRecordingSec: data.assignment.item.minRecordingSec,
        maxRecordingSec: data.assignment.item.maxRecordingSec,
        audioFileName: data.assignment.item.audioFileName,
        imageUrl: data.assignment.imageUrl || current.imageUrl
      }));
    }

    loadSavedTemplate().catch(() => undefined);
    return () => {
      ignore = true;
    };
  }, [routeAssignmentId]);

  function loadTemplate() {
    if (selectedTemplateId) {
      window.location.href = `/teacher/assignments/new?assignmentId=${encodeURIComponent(selectedTemplateId)}`;
      return;
    }
    const nextTemplate = templateOptions.find((item) => item.id === selectedTemplateId);
    if (!nextTemplate) return;
    setTemplate((current) => ({
      ...current,
      title: nextTemplate.title,
      type: nextTemplate.type,
      description: nextTemplate.description,
      passageTitle: nextTemplate.passageTitle,
      passageText: nextTemplate.passageText,
      minRecordingSec: nextTemplate.minRecordingSec,
      maxRecordingSec: nextTemplate.maxRecordingSec
    }));
    setMessage("과제 원본을 불러왔습니다.");
  }

  function previewImage(file?: File) {
    if (!file) {
      setImageFile(null);
      setTemplate((current) => ({ ...current, imageUrl: DEFAULT_HOMEWORK_IMAGE_URL }));
      return;
    }
    setImageFile(file);
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") setTemplate((current) => ({ ...current, imageUrl: reader.result as string }));
    };
    reader.readAsDataURL(file);
  }

  function onAudioChange(file?: File) {
    setAudioFile(file ?? null);
    setTemplate((current) => ({ ...current, audioFileName: file?.name ?? "" }));
  }

  function saveAssignment() {
    if (!template.title.trim()) {
      setMessage("숙제 제목을 입력해 주세요.");
      return;
    }

    startSavingTemplate(async () => {
      const formData = new FormData();
      formData.set("id", currentAssignmentId);
      formData.set("title", template.title);
      formData.set("type", template.type);
      formData.set("description", template.description);
      formData.set("passageTitle", template.passageTitle);
      formData.set("passageText", template.passageText);
      formData.set("minRecordingSec", template.minRecordingSec);
      formData.set("maxRecordingSec", template.maxRecordingSec);
      formData.set("audioFileName", template.audioFileName);
      formData.set("imageUrl", template.imageUrl);
      if (imageFile) formData.set("imageFile", imageFile, imageFile.name);
      if (audioFile) formData.set("audioFile", audioFile, audioFile.name);

      const response = await fetch("/api/teacher/assignments", {
        method: "POST",
        body: formData,
      });
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        setMessage(data.error ?? "과제 저장 중 오류가 발생했습니다.");
        return;
      }

      setImageFile(null);
      setAudioFile(null);
      setTemplate((current) => ({
        ...current,
        imageUrl: data.assignment?.imageUrl || current.imageUrl,
        audioFileName: data.assignment?.item?.audioFileName || current.audioFileName,
      }));
      setMessage("과제가 저장되었습니다.");
    });
  }

  function buildAssignmentFormData(includeTargets: boolean) {
    const formData = new FormData();
    formData.set("id", currentAssignmentId);
    formData.set("title", template.title);
    formData.set("type", template.type);
    formData.set("description", template.description);
    formData.set("passageTitle", template.passageTitle);
    formData.set("passageText", template.passageText);
    formData.set("minRecordingSec", template.minRecordingSec);
    formData.set("maxRecordingSec", template.maxRecordingSec);
    formData.set("audioFileName", template.audioFileName);
    formData.set("imageUrl", template.imageUrl);
    if (imageFile) formData.set("imageFile", imageFile, imageFile.name);
    if (audioFile) formData.set("audioFile", audioFile, audioFile.name);
    if (includeTargets) {
      formData.set("assignments", JSON.stringify(selectedAssignments));
    }
    return formData;
  }

  function toggleClass(classId: string) {
    setClassAssignments((current) => {
      if (current[classId]) {
        const next = { ...current };
        delete next[classId];
        return next;
      }
      return {
        ...current,
        [classId]: {
          classId,
          dueDate: defaultDueDate,
          dueTime: defaultDueTime,
          visibility,
          targetMode: "all",
          selectedStudents: [],
          studentSearch: ""
        }
      };
    });
  }

  function updateClassAssignment(classId: string, input: Partial<ClassAssignment>) {
    setClassAssignments((current) => {
      const existing = current[classId];
      if (!existing) return current;
      return { ...current, [classId]: { ...existing, ...input } };
    });
  }

  function toggleStudent(classId: string, student: string) {
    const current = classAssignments[classId];
    if (!current) return;
    updateClassAssignment(classId, {
      selectedStudents: current.selectedStudents.includes(student)
        ? current.selectedStudents.filter((item) => item !== student)
        : [...current.selectedStudents, student]
    });
  }

  function applyDefaultsToSelectedClasses() {
    setClassAssignments((current) => {
      const next = { ...current };
      for (const classId of Object.keys(next)) {
        next[classId] = { ...next[classId], dueDate: defaultDueDate, dueTime: defaultDueTime, visibility };
      }
      return next;
    });
    setMessage("선택한 모든 반에 기본 마감값과 공개 상태를 적용했습니다.");
  }

  function saveMock(status: VisibilityStatus) {
    if (!template.title.trim()) {
      setMessage("숙제 제목을 입력해주세요.");
      return;
    }
    const shouldAssign = status === "published";
    if (shouldAssign && selectedAssignments.length === 0) {
      setMessage("배정할 반을 1개 이상 선택해주세요.");
      return;
    }
    startSavingTemplate(async () => {
      const response = await fetch("/api/teacher/assignments", {
        method: "POST",
        body: buildAssignmentFormData(shouldAssign),
      });
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        setMessage(data.error ?? "과제 배정 중 오류가 발생했습니다.");
        return;
      }

      setImageFile(null);
      setAudioFile(null);
      setIsConfirmOpen(false);
      setTemplate((current) => ({
        ...current,
        imageUrl: data.assignment?.imageUrl || current.imageUrl,
        audioFileName: data.assignment?.item?.audioFileName || current.audioFileName,
      }));
      setMessage(status === "draft" ? "과제가 저장되었습니다." : `과제가 ${data.assignedCount ?? 0}명에게 배정되었습니다.`);
      if (shouldAssign) router.push("/teacher/assignments");
    });
  }

  return (
    <TeacherLayout title={isEditMode ? "숙제 수정" : "숙제 생성"}>
      <div className="grid gap-5">
        {message && <p className="rounded-md bg-blue-50 px-3 py-2 text-sm font-semibold text-action">{message}</p>}

        <Card>
          <div className="mb-5">
            <h2 className="text-xl font-bold">과제 원본</h2>
            <p className="mt-1 text-sm text-slate-500">나중에 여러 번 재사용할 숙제 내용을 만드는 영역입니다.</p>
          </div>
          <div className="grid gap-5">
            <div className="grid gap-3 lg:grid-cols-[1fr_auto_auto]">
              <label className="grid gap-2 text-sm font-semibold">기존 과제 선택<Select value={selectedTemplateId} onChange={(event) => setSelectedTemplateId(event.target.value)}>{(assignmentOptions.length > 0 ? assignmentOptions : templateOptions).map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</Select></label>
              <Button type="button" className="self-end" variant="secondary" onClick={loadTemplate}>불러오기</Button>
              <Button type="button" className="self-end" variant="secondary" onClick={() => setMessage("새 과제 작성 상태입니다.")}>새 과제</Button>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <label className="grid gap-2 text-sm font-semibold">숙제 제목<Input value={template.title} onChange={(event) => setTemplate({ ...template, title: event.target.value })} /></label>
              <label className="grid gap-2 text-sm font-semibold">숙제 유형<Select value={template.type} onChange={(event) => setTemplate({ ...template, type: event.target.value as ClassHomeworkType })}><option value="listening_recording">듣기/녹음</option><option value="image_speaking">이미지 보고 말하기</option><option value="sentence_shadowing">문장 따라 읽기</option><option value="free_speaking">자유 말하기</option></Select></label>
            </div>
            <div className="grid gap-4 md:grid-cols-[1fr_260px]">
              <label className="grid gap-2 text-sm font-semibold">원어민 MP3 업로드<Input type="file" accept="audio/*" onChange={(event) => onAudioChange(event.target.files?.[0])} /></label>
              <div className="grid gap-2 text-sm font-semibold">MP3 파일명<div className="min-h-10 rounded-md border border-line bg-slate-50 px-3 py-2 text-sm font-medium text-slate-700">{template.audioFileName || "선택된 파일 없음"}</div></div>
            </div>
            <label className="grid gap-2 text-sm font-semibold">설명<Textarea value={template.description} onChange={(event) => setTemplate({ ...template, description: event.target.value })} /></label>
            <div className="grid gap-4 lg:grid-cols-[1fr_380px]">
              <label className="grid gap-2 text-sm font-semibold">숙제 이미지 업로드<Input type="file" accept="image/*" onChange={(event) => previewImage(event.target.files?.[0])} /></label>
              <div className="grid gap-2 text-sm font-semibold">이미지 미리보기<div className="grid h-44 place-items-center overflow-hidden rounded-md border border-line bg-slate-50">{template.imageUrl ? <img src={template.imageUrl} alt="숙제 이미지 미리보기" className="h-full w-full object-contain" /> : <span className="text-sm font-medium text-slate-400">선택된 이미지 없음</span>}</div></div>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <label className="grid gap-2 text-sm font-semibold">지문 제목<Input value={template.passageTitle} onChange={(event) => setTemplate({ ...template, passageTitle: event.target.value })} /></label>
              <div className="grid grid-cols-2 gap-3">
                <label className="grid gap-2 text-sm font-semibold">최소 녹음 시간<Input type="number" value={template.minRecordingSec} onChange={(event) => setTemplate({ ...template, minRecordingSec: event.target.value })} /></label>
                <label className="grid gap-2 text-sm font-semibold">최대 녹음 시간<Input type="number" value={template.maxRecordingSec} onChange={(event) => setTemplate({ ...template, maxRecordingSec: event.target.value })} /></label>
              </div>
            </div>
            <label className="grid gap-2 text-sm font-semibold">지문 내용<Textarea value={template.passageText} onChange={(event) => setTemplate({ ...template, passageText: event.target.value })} /></label>
            <div className="flex justify-end"><Button type="button" variant="secondary" onClick={saveAssignment} disabled={isSavingTemplate}>{isSavingTemplate ? "저장 중..." : "과제 저장"}</Button></div>
          </div>
        </Card>

        <Card>
          <div className="mb-5">
            <h2 className="text-xl font-bold">배정 설정</h2>
            <p className="mt-1 text-sm text-slate-500">하나의 숙제를 여러 반 또는 일부 학생에게 동시에 배정하는 영역입니다.</p>
          </div>
          <div className="grid gap-5 xl:grid-cols-[1fr_360px]">
            <div className="grid gap-5">
              <div className="rounded-md border border-line bg-slate-50 p-4">
                <h3 className="font-bold">배정 기본값</h3>
                <div className="mt-4 grid gap-4 md:grid-cols-3">
                  <label className="grid gap-2 text-sm font-semibold">기본 마감일<Input type="date" value={defaultDueDate} onChange={(event) => setDefaultDueDate(event.target.value)} /></label>
                  <label className="grid gap-2 text-sm font-semibold">기본 마감 시간<Input type="time" value={defaultDueTime} onChange={(event) => setDefaultDueTime(event.target.value)} /></label>
                  <label className="grid gap-2 text-sm font-semibold">공개 상태<Select value={visibility} onChange={(event) => setVisibility(event.target.value as VisibilityStatus)}><option value="draft">임시저장</option><option value="published">게시됨</option></Select></label>
                </div>
                <div className="mt-4 flex justify-end"><Button type="button" variant="secondary" onClick={applyDefaultsToSelectedClasses}>선택한 모든 반에 기본값 적용</Button></div>
              </div>

              <div>
                <h3 className="mb-3 font-bold">대상 반 선택</h3>
                <div className="grid gap-3">
                  {(assignmentClassRows.length > 0 ? assignmentClassRows : assignmentClasses.map((item) => ({
                    ...item,
                    students: item.students.map((name, index) => ({ id: `${item.id}-${index}`, name })),
                  }))).map((classItem) => {
                    const selected = classAssignments[classItem.id];
                    const filteredStudents = classItem.students.filter((student) => student.name.includes(selected?.studentSearch ?? ""));
                    return (
                      <div key={classItem.id} className="rounded-md border border-line bg-white p-4">
                        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                          <label className="flex items-start gap-3">
                            <input type="checkbox" className="mt-1" checked={Boolean(selected)} onChange={() => toggleClass(classItem.id)} />
                            <span>
                              <span className="block font-bold">{classItem.name}</span>
                              <span className="text-sm text-slate-500">학생 {classItem.studentCount}명</span>
                            </span>
                          </label>
                          {selected && (
                            <div className="grid gap-3 sm:grid-cols-3">
                              <label className="grid gap-2 text-sm font-semibold">마감일<Input type="date" value={selected.dueDate} onChange={(event) => updateClassAssignment(classItem.id, { dueDate: event.target.value })} /></label>
                              <label className="grid gap-2 text-sm font-semibold">마감 시간<Input type="time" value={selected.dueTime} onChange={(event) => updateClassAssignment(classItem.id, { dueTime: event.target.value })} /></label>
                              <label className="grid gap-2 text-sm font-semibold">공개 여부<Select value={selected.visibility} onChange={(event) => updateClassAssignment(classItem.id, { visibility: event.target.value as VisibilityStatus })}><option value="draft">임시저장</option><option value="published">게시됨</option></Select></label>
                            </div>
                          )}
                        </div>
                        {selected && (
                          <div className="mt-4 grid gap-3 border-t border-line pt-4">
                            <fieldset className="grid gap-2">
                              <legend className="text-sm font-semibold">대상 학생</legend>
                              <div className="flex flex-wrap gap-4 text-sm font-semibold">
                                <label className="flex items-center gap-2"><input type="radio" checked={selected.targetMode === "all"} onChange={() => updateClassAssignment(classItem.id, { targetMode: "all", selectedStudents: [] })} />반 전체</label>
                                <label className="flex items-center gap-2"><input type="radio" checked={selected.targetMode === "partial"} onChange={() => updateClassAssignment(classItem.id, { targetMode: "partial" })} />일부 학생만</label>
                              </div>
                            </fieldset>
                            {selected.targetMode === "partial" && (
                              <div className="grid gap-3 rounded-md bg-slate-50 p-3">
                                <label className="grid gap-2 text-sm font-semibold">학생 검색<Input value={selected.studentSearch} onChange={(event) => updateClassAssignment(classItem.id, { studentSearch: event.target.value })} placeholder="학생 이름 검색" /></label>
                                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                                  {filteredStudents.map((student) => (
                                    <label key={student.id} className="flex items-center gap-2 rounded-md border border-line bg-white p-2 text-sm font-semibold">
                                      <input type="checkbox" checked={selected.selectedStudents.includes(student.id)} onChange={() => toggleStudent(classItem.id, student.id)} />
                                      {student.name}
                                    </label>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="self-start rounded-md border border-line bg-slate-50 p-4 xl:sticky xl:top-4">
              <h3 className="font-bold">배정 요약</h3>
              <div className="mt-3 grid gap-2 text-sm">
                <p>선택된 반: <span className="font-bold">{summaryRows.length}개</span></p>
                <p>총 대상 학생: <span className="font-bold">{totalStudents}명</span></p>
              </div>
              <div className="mt-4 grid gap-2">
                {summaryRows.length === 0 ? (
                  <p className="rounded-md border border-dashed border-line bg-white p-3 text-center text-sm text-slate-500">선택된 반이 없습니다.</p>
                ) : (
                  summaryRows.map(({ assignment, classItem, studentCount }) => (
                    <div key={assignment.classId} className="rounded-md border border-line bg-white p-3 text-sm">
                      <p className="font-bold">{classItem?.name}</p>
                      <p className="mt-1 text-slate-600">{assignment.targetMode === "all" ? `전체 ${studentCount}명` : `일부 ${studentCount}명`} / {assignment.dueDate} {formatTime(assignment.dueTime)}</p>
                      <p className="mt-1 text-slate-500">공개 여부: {assignment.visibility === "published" ? "게시됨" : "임시저장"}</p>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
          <div className="mt-5 grid gap-2 sm:flex sm:justify-end">
            <Button href="/teacher/assignments" variant="secondary">취소</Button>
            <Button type="button" variant="secondary" onClick={() => saveMock("draft")} disabled={isSavingTemplate}>임시저장</Button>
            <Button type="button" onClick={() => setIsConfirmOpen(true)} disabled={isSavingTemplate}>숙제 배정하기</Button>
          </div>
        </Card>
      </div>

      {isConfirmOpen && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/35 p-4" role="dialog" aria-modal="true">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-auto rounded-lg bg-white p-5 shadow-soft">
            <h2 className="text-lg font-bold">숙제를 배정하시겠습니까?</h2>
            <dl className="mt-4 grid gap-3 text-sm">
              <div className="grid grid-cols-[130px_1fr] gap-3"><dt className="font-bold text-slate-500">숙제 제목</dt><dd>{template.title}</dd></div>
              <div className="grid grid-cols-[130px_1fr] gap-3"><dt className="font-bold text-slate-500">선택된 반 수</dt><dd>{summaryRows.length}개</dd></div>
              <div className="grid grid-cols-[130px_1fr] gap-3"><dt className="font-bold text-slate-500">총 대상 학생 수</dt><dd>{totalStudents}명</dd></div>
              <div className="grid grid-cols-[130px_1fr] gap-3"><dt className="font-bold text-slate-500">기본 공개 상태</dt><dd>{visibility === "published" ? "게시됨" : "임시저장"}</dd></div>
            </dl>
            <div className="mt-5">
              <p className="mb-2 text-sm font-bold">반별 배정 목록</p>
              <div className="grid gap-2">
                {summaryRows.map(({ assignment, classItem, studentCount }, index) => (
                  <div key={assignment.classId} className="rounded-md border border-line p-3 text-sm">
                    <p className="font-bold">{index + 1}. {classItem?.name}</p>
                    <p className="mt-1 text-slate-600">대상: {assignment.targetMode === "all" ? `반 전체 ${studentCount}명` : `일부 학생 ${studentCount}명`}</p>
                    <p className="text-slate-600">마감: {assignment.dueDate} {formatTime(assignment.dueTime)}</p>
                    <p className="text-slate-600">공개 여부: {assignment.visibility === "published" ? "게시됨" : "임시저장"}</p>
                  </div>
                ))}
              </div>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <Button type="button" variant="secondary" onClick={() => setIsConfirmOpen(false)}>취소</Button>
              <Button type="button" onClick={() => saveMock("published")} disabled={isSavingTemplate}>{isSavingTemplate ? "배정 중..." : "배정하기"}</Button>
            </div>
          </div>
        </div>
      )}
    </TeacherLayout>
  );
}
