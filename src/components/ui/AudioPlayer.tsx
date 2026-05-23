export function AudioPlayer({ src }: { src?: string }) {
  if (!src) {
    return <div className="rounded-md border border-dashed border-line p-4 text-sm text-slate-500">오디오 파일 목업 영역</div>;
  }

  return <audio className="w-full" controls src={src} />;
}
