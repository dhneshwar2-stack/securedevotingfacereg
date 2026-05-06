import { useEffect, useRef } from "react";

interface WebcamProps {
  onReady?: (video: HTMLVideoElement) => void;
  className?: string;
}

export function Webcam({ onReady, className }: WebcamProps) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    let stream: MediaStream | null = null;
    let cancelled = false;

    (async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { width: 480, height: 360, facingMode: "user" },
          audio: false,
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
          onReady?.(videoRef.current);
        }
      } catch (err) {
        console.error("Webcam error:", err);
      }
    })();

    return () => {
      cancelled = true;
      stream?.getTracks().forEach((t) => t.stop());
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <video
      ref={videoRef}
      autoPlay
      playsInline
      muted
      className={className ?? "w-full rounded-lg bg-muted"}
    />
  );
}

export function captureFrame(video: HTMLVideoElement): {
  canvas: HTMLCanvasElement;
  dataUrl: string;
} {
  const canvas = document.createElement("canvas");
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(video, 0, 0);
  return { canvas, dataUrl: canvas.toDataURL("image/jpeg", 0.85) };
}
