// src/components/AudioRecorder.tsx
"use client";

import { useState, useRef } from "react";

export default function AudioRecorder({ onDone }: { onDone: (file: File) => void }) {
  const [recording, setRecording] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const chunks = useRef<Blob[]>([]);

  async function startRecording() {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const mr = new MediaRecorder(stream);
    mr.ondataavailable = (e) => chunks.current.push(e.data);
    mr.onstop = () => {
      const blob = new Blob(chunks.current, { type: "audio/webm" });
      chunks.current = [];
      const file = new File([blob], "recording.webm", { type: "audio/webm" });
      onDone(file);
    };
    mr.start();
    setMediaRecorder(mr);
    setRecording(true);
  }

  function stopRecording() {
    mediaRecorder?.stop();
    setRecording(false);
  }

  return (
    <div className="flex gap-2">
      {!recording ? (
        <button onClick={startRecording} className="px-3 py-2 rounded bg-green-500 text-white">
          🎙️ Start
        </button>
      ) : (
        <button onClick={stopRecording} className="px-3 py-2 rounded bg-red-500 text-white">
          ⏹ Stop
        </button>
      )}
    </div>
  );
}
