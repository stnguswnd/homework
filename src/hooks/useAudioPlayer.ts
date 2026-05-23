"use client";

import { useEffect, useRef, useState } from "react";

export function useAudioPlayer(src?: string) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [state, setState] = useState<"idle" | "playing" | "paused" | "ended" | "error">("idle");
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  useEffect(() => {
    const audio = new Audio(src);
    audioRef.current = audio;
    const onTime = () => setCurrentTime(audio.currentTime);
    const onMeta = () => setDuration(audio.duration || 0);
    const onEnded = () => setState("ended");
    const onError = () => setState("error");
    audio.addEventListener("timeupdate", onTime);
    audio.addEventListener("loadedmetadata", onMeta);
    audio.addEventListener("ended", onEnded);
    audio.addEventListener("error", onError);
    return () => {
      audio.pause();
      audio.removeEventListener("timeupdate", onTime);
      audio.removeEventListener("loadedmetadata", onMeta);
      audio.removeEventListener("ended", onEnded);
      audio.removeEventListener("error", onError);
    };
  }, [src]);

  async function play() {
    if (!audioRef.current) return;
    await audioRef.current.play();
    setState("playing");
  }

  function pause() {
    audioRef.current?.pause();
    setState("paused");
  }

  async function replay() {
    if (!audioRef.current) return;
    audioRef.current.currentTime = 0;
    await play();
  }

  return { state, currentTime, duration, play, pause, replay };
}
