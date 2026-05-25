"use client";

import { Suspense, useEffect, useState, useTransition } from "react";
import { useSearchParams } from "next/navigation";

import { TeacherLayout } from "@/components/layout/TeacherLayout";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import { ASSIGNMENT_SUBJECTS, assignmentTypeLabel, normalizeAssignmentSubject, type AssignmentSubject, type AssignmentType, type WritingMode, type WritingUnit } from "@/lib/assignmentTypes";

type TemplateState = {
  title: string;
  type: AssignmentType | "";
  subject: AssignmentSubject;
  description: string;
  passageTitle: string;
  passageText: string;
  minRecordingSec: string;
  maxRecordingSec: string;
  audioFileName: string;
  imageUrl: string;
  writingMode: WritingMode;
  writingUnit: WritingUnit;
  promptText: string;
  writingInstructions: string;
  writingHint: string;
  writingExample: string;
};

const TYPE_CARDS: Array<{ type: AssignmentType; title: string; description: string }> = [
  { type: "listening_recording", title: "RL 녹음", description: "음원을 듣고 학생이 녹음 파일을 제출하는 숙제" },
  { type: "listening", title: "리스닝", description: "음원을 끝까지 듣기만 하면 완료되는 숙제" },
  { type: "writing", title: "라이팅", description: "이미지나 주제를 보고 글을 작성하고 AI 첨삭을 받는 숙제" },
];

function createAssignmentId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return `assignment-${crypto.randomUUID()}`;
  return `assignment-${Date.now()}`;
}

function emptyTemplate(): TemplateState {
  return {
    title: "",
    type: "",
    subject: "Phonics",
    description: "",
    passageTitle: "",
    passageText: "",
    minRecordingSec: "3",
    maxRecordingSec: "120",
    audioFileName: "",
    imageUrl: "",
    writingMode: "picture_description",
    writingUnit: "paragraphs",
    promptText: "",
    writingInstructions: "",
    writingHint: "",
    writingExample: "",
  };
}

export default function NewAssignmentPage() {
  return (
    <Suspense fallback={<TeacherLayout title="숙제 생성"><Card><p className="text-sm text-slate-500">숙제 작성 화면을 불러오는 중입니다.</p></Card></TeacherLayout>}>
      <NewAssignmentForm />
    </Suspense>
  );
}

function NewAssignmentForm() {
  const searchParams = useSearchParams();
  const routeAssignmentId = searchParams.get("assignmentId");
  const isEditMode = Boolean(routeAssignmentId);
  const [newAssignmentId] = useState(createAssignmentId);
  const [message, setMessage] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [isSaving, startSaving] = useTransition();
  const [template, setTemplate] = useState<TemplateState>(emptyTemplate);

  const currentAssignmentId = routeAssignmentId ?? newAssignmentId;
  const selectedType = template.type || "listening_recording";
  const shouldShowTypeModal = !isEditMode && !template.type;
  const isWriting = selectedType === "writing";
  const isPictureWriting = isWriting && template.writingMode === "picture_description";

  useEffect(() => {
    if (!routeAssignmentId) return;
    const assignmentId = routeAssignmentId;
    let ignore = false;

    async function loadAssignment() {
      const response = await fetch(`/api/teacher/assignments?id=${encodeURIComponent(assignmentId)}`, { cache: "no-store" });
      const data = await response.json();
      if (ignore || !data.assignment) return;

      setTemplate({
        title: data.assignment.title ?? "",
        type: data.assignment.type ?? "listening_recording",
        subject: normalizeAssignmentSubject(data.assignment.assignmentSubject),
        description: data.assignment.description ?? "",
        passageTitle: data.assignment.item?.title ?? "",
        passageText: data.assignment.item?.passageText ?? "",
        minRecordingSec: data.assignment.item?.minRecordingSec ?? "3",
        maxRecordingSec: data.assignment.item?.maxRecordingSec ?? "120",
        audioFileName: data.assignment.item?.audioFileName ?? "",
        imageUrl: data.assignment.imageUrl || "",
        writingMode: data.assignment.item?.writingMode ?? "picture_description",
        writingUnit: data.assignment.item?.writingUnit ?? "paragraphs",
        promptText: data.assignment.item?.promptText ?? "",
        writingInstructions: data.assignment.item?.writingInstructions ?? "",
        writingHint: data.assignment.item?.writingHint ?? "",
        writingExample: data.assignment.item?.writingExample ?? "",
      });
    }

    loadAssignment().catch(() => setMessage("수정할 숙제를 불러오지 못했습니다."));
    return () => {
      ignore = true;
    };
  }, [routeAssignmentId]);

  function selectInitialType(type: AssignmentType) {
    if (isEditMode || template.type) return;
    setTemplate((current) => ({ ...current, type }));
  }

  function previewImage(file?: File) {
    if (!file) {
      setImageFile(null);
      setTemplate((current) => ({ ...current, imageUrl: "" }));
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
    setTemplate((current) => ({ ...current, audioFileName: file?.name ?? current.audioFileName }));
  }

  function saveAssignment() {
    if (!template.type) {
      setMessage("먼저 숙제 유형을 선택해주세요.");
      return;
    }
    if (!template.title.trim()) {
      setMessage("숙제 제목을 입력해주세요.");
      return;
    }
    if (template.type === "writing" && template.writingMode === "topic_diary" && !template.promptText.trim()) {
      setMessage("주제/일기 쓰기 숙제는 주제 텍스트가 필요합니다.");
      return;
    }

    startSaving(async () => {
      const formData = new FormData();
      formData.set("id", currentAssignmentId);
      formData.set("title", template.title);
      formData.set("type", template.type as AssignmentType);
      formData.set("subject", template.subject);
      formData.set("description", template.description);
      formData.set("passageTitle", template.passageTitle);
      formData.set("passageText", template.type === "writing" && template.writingMode === "topic_diary" ? template.promptText : template.passageText);
      formData.set("minRecordingSec", template.minRecordingSec);
      formData.set("maxRecordingSec", template.maxRecordingSec);
      formData.set("audioFileName", template.audioFileName);
      formData.set("imageUrl", template.imageUrl);
      formData.set("writingMode", template.writingMode);
      formData.set("writingUnit", template.writingUnit);
      formData.set("writingUnitCount", "4");
      formData.set("promptText", template.promptText);
      formData.set("writingInstructions", template.writingInstructions);
      formData.set("writingHint", template.writingHint);
      formData.set("writingExample", template.writingExample);
      if (imageFile) formData.set("imageFile", imageFile, imageFile.name);
      if (audioFile) formData.set("audioFile", audioFile, audioFile.name);

      const response = await fetch("/api/teacher/assignments", { method: "POST", body: formData });
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        setMessage(data.error ?? "숙제 저장 중 오류가 발생했습니다.");
        return;
      }

      setImageFile(null);
      setAudioFile(null);
      setTemplate((current) => ({
        ...current,
        imageUrl: data.assignment?.imageUrl || current.imageUrl,
        audioFileName: data.assignment?.item?.audioFileName || current.audioFileName,
        promptText: data.assignment?.item?.promptText ?? current.promptText,
        writingInstructions: data.assignment?.item?.writingInstructions ?? current.writingInstructions,
        writingHint: data.assignment?.item?.writingHint ?? current.writingHint,
        writingExample: data.assignment?.item?.writingExample ?? current.writingExample,
      }));
      setMessage(isEditMode ? "숙제가 수정되었습니다. 배정은 숙제 목록에서 진행해주세요." : "숙제가 생성되었습니다. 숙제 목록에서 체크 후 배정해주세요.");
    });
  }

  return (
    <TeacherLayout title={isEditMode ? "숙제 수정" : "숙제 생성"}>
      <div className="grid gap-5">
        {message && <p className="rounded-md bg-blue-50 px-3 py-2 text-sm font-semibold text-action">{message}</p>}
        <p className="rounded-md border border-blue-100 bg-blue-50 px-3 py-2 text-sm font-semibold text-action">
          이 화면에서는 숙제 원본 내용만 {isEditMode ? "수정" : "생성"}합니다. 반/학생 배정은 숙제 목록에서 체크 후 `숙제 배정하기`로 진행해주세요.
        </p>

        <Card>
          <div className="mb-5">
            <h2 className="text-xl font-bold">숙제 내용</h2>
            <p className="mt-1 text-sm text-slate-500">숙제 유형은 처음 만들 때만 선택할 수 있고, 이후에는 변경할 수 없습니다.</p>
          </div>

          <div className="grid gap-5">
            <div className="grid gap-4 md:grid-cols-2">
              <label className="grid gap-2 text-sm font-semibold">
                숙제 제목
                <Input value={template.title} onChange={(event) => setTemplate({ ...template, title: event.target.value })} placeholder="숙제 제목" disabled={shouldShowTypeModal} />
              </label>
              <div className="grid gap-2 text-sm font-semibold">
                숙제 유형
                <div className="flex min-h-10 items-center justify-between rounded-md border border-line bg-slate-50 px-3 py-2">
                  <Badge tone="blue">{template.type ? assignmentTypeLabel(template.type) : "선택 필요"}</Badge>
                  <span className="text-xs font-semibold text-slate-500">유형 변경 불가</span>
                </div>
              </div>
            </div>

            <div className="grid gap-2">
              <p className="text-sm font-semibold">과목 유형</p>
              <div className="flex flex-wrap gap-2">
                {ASSIGNMENT_SUBJECTS.map((subject) => (
                  <button
                    key={subject}
                    type="button"
                    disabled={shouldShowTypeModal}
                    onClick={() => setTemplate({ ...template, subject })}
                    className={
                      template.subject === subject
                        ? "rounded-full bg-action px-4 py-2 text-sm font-bold text-white disabled:opacity-50"
                        : "rounded-full border border-line bg-white px-4 py-2 text-sm font-bold text-slate-700 hover:border-action disabled:cursor-not-allowed disabled:opacity-50"
                    }
                  >
                    {subject}
                  </button>
                ))}
              </div>
              <p className="text-xs font-semibold text-slate-500">반 관리의 과목 필터는 여기서 선택한 과목 유형 기준으로 표시됩니다.</p>
            </div>

            {(selectedType === "listening_recording" || selectedType === "listening") && (
              <div className="grid gap-4 md:grid-cols-[1fr_260px]">
                <label className="grid gap-2 text-sm font-semibold">
                  원본 MP3 업로드
                  <Input type="file" accept="audio/*" onChange={(event) => onAudioChange(event.target.files?.[0])} disabled={shouldShowTypeModal} />
                </label>
                <div className="grid gap-2 text-sm font-semibold">
                  MP3 파일명
                  <div className="min-h-10 rounded-md border border-line bg-slate-50 px-3 py-2 text-sm font-medium text-slate-700">{template.audioFileName || "선택한 파일 없음"}</div>
                </div>
              </div>
            )}

            <label className="grid gap-2 text-sm font-semibold">
              설명
              <Textarea value={template.description} onChange={(event) => setTemplate({ ...template, description: event.target.value })} placeholder="학생에게 보여줄 설명" disabled={shouldShowTypeModal} />
            </label>

            {(selectedType !== "writing" || isPictureWriting) && (
              <div className="grid gap-4 lg:grid-cols-[1fr_380px]">
                <label className="grid gap-2 text-sm font-semibold">
                  숙제 이미지 업로드
                  <Input type="file" accept="image/*" onChange={(event) => previewImage(event.target.files?.[0])} disabled={shouldShowTypeModal} />
                </label>
                <div className="grid gap-2 text-sm font-semibold">
                  이미지 미리보기
                  <div className="grid h-44 place-items-center overflow-hidden rounded-md border border-line bg-slate-50">
                    {template.imageUrl ? <img src={template.imageUrl} alt="숙제 이미지 미리보기" className="h-full w-full object-contain" /> : <span className="text-sm font-medium text-slate-400">선택한 이미지 없음</span>}
                  </div>
                </div>
              </div>
            )}

            {isWriting ? (
              <WritingFields template={template} setTemplate={setTemplate} disabled={shouldShowTypeModal} />
            ) : (
              <ListeningFields template={template} setTemplate={setTemplate} selectedType={selectedType} disabled={shouldShowTypeModal} />
            )}

            <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
              <Button href="/teacher/assignments" variant="secondary">취소</Button>
              <Button type="button" onClick={saveAssignment} disabled={isSaving || shouldShowTypeModal}>
                {isSaving ? "저장 중..." : isEditMode ? "수정 저장" : "숙제 생성"}
              </Button>
            </div>
          </div>
        </Card>
      </div>

      {shouldShowTypeModal && <TypePicker onSelect={selectInitialType} />}
    </TeacherLayout>
  );
}

function WritingFields({
  template,
  setTemplate,
  disabled,
}: {
  template: TemplateState;
  setTemplate: (value: TemplateState) => void;
  disabled: boolean;
}) {
  return (
    <div className="grid gap-4">
      <div className="grid gap-4 md:grid-cols-2">
        <label className="grid gap-2 text-sm font-semibold">
          Writing 방식
          <Select value={template.writingMode} onChange={(event) => setTemplate({ ...template, writingMode: event.target.value as WritingMode })} disabled={disabled}>
            <option value="picture_description">그림 묘사</option>
            <option value="topic_diary">주제/일기 쓰기</option>
          </Select>
        </label>
        <label className="grid gap-2 text-sm font-semibold">
          작성 단위
          <Select value={template.writingUnit} onChange={(event) => setTemplate({ ...template, writingUnit: event.target.value as WritingUnit })} disabled={disabled}>
            <option value="paragraphs">4 paragraphs</option>
            <option value="sentences">4 sentences</option>
          </Select>
        </label>
      </div>
      <label className="grid gap-2 text-sm font-semibold">
        {template.writingMode === "topic_diary" ? "주제 텍스트" : "추가 주제 또는 관찰 포인트"}
        <Textarea
          value={template.promptText}
          onChange={(event) => setTemplate({ ...template, promptText: event.target.value })}
          placeholder={template.writingMode === "topic_diary" ? "예: Write about your weekend." : "예: Describe what the people are doing in the picture."}
          disabled={disabled}
        />
      </label>
      <label className="grid gap-2 text-sm font-semibold">
        추가 지시문
        <Textarea value={template.writingInstructions} onChange={(event) => setTemplate({ ...template, writingInstructions: event.target.value })} placeholder="예: Use past tense. Write clearly with details." disabled={disabled} />
      </label>
      <div className="grid gap-4 md:grid-cols-2">
        <label className="grid gap-2 text-sm font-semibold">
          힌트
          <Textarea value={template.writingHint} onChange={(event) => setTemplate({ ...template, writingHint: event.target.value })} placeholder="예: Who is in the picture? Where are they? What are they doing?" disabled={disabled} />
        </label>
        <label className="grid gap-2 text-sm font-semibold">
          예시 문장
          <Textarea value={template.writingExample} onChange={(event) => setTemplate({ ...template, writingExample: event.target.value })} placeholder="예: I can see two children in the park." disabled={disabled} />
        </label>
      </div>
    </div>
  );
}

function ListeningFields({
  template,
  setTemplate,
  selectedType,
  disabled,
}: {
  template: TemplateState;
  setTemplate: (value: TemplateState) => void;
  selectedType: AssignmentType;
  disabled: boolean;
}) {
  return (
    <>
      <div className="grid gap-4 md:grid-cols-2">
        <label className="grid gap-2 text-sm font-semibold">
          지문 제목
          <Input value={template.passageTitle} onChange={(event) => setTemplate({ ...template, passageTitle: event.target.value })} placeholder="지문 제목" disabled={disabled} />
        </label>
        <div className="grid grid-cols-2 gap-3">
          <label className="grid gap-2 text-sm font-semibold">
            최소 녹음 시간
            <Input type="number" value={template.minRecordingSec} onChange={(event) => setTemplate({ ...template, minRecordingSec: event.target.value })} disabled={disabled || selectedType === "listening"} />
          </label>
          <label className="grid gap-2 text-sm font-semibold">
            최대 녹음 시간
            <Input type="number" value={template.maxRecordingSec} onChange={(event) => setTemplate({ ...template, maxRecordingSec: event.target.value })} disabled={disabled || selectedType === "listening"} />
          </label>
        </div>
      </div>
      <label className="grid gap-2 text-sm font-semibold">
        지문 내용
        <Textarea value={template.passageText} onChange={(event) => setTemplate({ ...template, passageText: event.target.value })} placeholder="학생이 볼 지문 또는 스크립트" disabled={disabled} />
      </label>
    </>
  );
}

function TypePicker({ onSelect }: { onSelect: (type: AssignmentType) => void }) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/40 p-4" role="dialog" aria-modal="true">
      <div className="w-full max-w-3xl rounded-lg bg-white p-5 shadow-soft">
        <h2 className="text-xl font-extrabold">어떤 숙제를 만들까요?</h2>
        <p className="mt-2 text-sm text-slate-500">숙제 유형은 처음 선택 후 변경할 수 없습니다.</p>
        <div className="mt-5 grid gap-3 md:grid-cols-3">
          {TYPE_CARDS.map((card) => (
            <button
              key={card.type}
              type="button"
              onClick={() => onSelect(card.type)}
              className="rounded-lg border border-line bg-white p-5 text-left shadow-sm transition hover:border-action hover:bg-blue-50"
            >
              <p className="text-lg font-extrabold">{card.title}</p>
              <p className="mt-2 text-sm leading-6 text-slate-600">{card.description}</p>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
