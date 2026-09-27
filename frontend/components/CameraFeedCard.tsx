"use client";

import { useState, useEffect, useRef } from "react";
import { CameraOff } from "lucide-react";
import type { Camera } from "@/lib/types";

interface CameraFeedCardProps {
  camera: Camera;
  onTimeUpdate?: (cameraId: string, currentTime: number) => void;
}

export default function CameraFeedCard({ camera, onTimeUpdate }: CameraFeedCardProps) {
  const [hasError, setHasError] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (!camera.video_url) {
      setHasError(true);
      return;
    }
  }, [camera.video_url]);

  return (
    <div className="group relative overflow-hidden rounded-2xl border border-border bg-card shadow-sm transition-all duration-300 hover:shadow-md hover:border-primary/40">
      <div className="relative aspect-video w-full overflow-hidden bg-slate-950 flex items-center justify-center">
        {!hasError && camera.video_url ? (
          <>
            <video
              ref={videoRef}
              src={camera.video_url}
              autoPlay
              muted
              loop
              playsInline
              onPlaying={() => setIsPlaying(true)}
              onTimeUpdate={(e) => onTimeUpdate?.(camera.id, e.currentTarget.currentTime)}
              className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
            />

            {/* Live Indicator Badge overlaid on top-left of video */}
            <div className="absolute left-3 top-3 z-20 flex items-center gap-1.5 rounded-md bg-black/60 px-2.5 py-1 text-xs font-semibold tracking-wider text-white backdrop-blur-md">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-red-500 animate-pulse" />
              </span>
              <span>LIVE</span>
            </div>
          </>
        ) : (
          /* Graceful Fallback State (calm, intentional, no broken video icon) */
          <div className="flex flex-col items-center justify-center p-6 text-center select-none">
            <div className="mb-2.5 flex h-12 w-12 items-center justify-center rounded-xl bg-slate-900 text-slate-400 border border-slate-800 shadow-inner">
              <CameraOff className="h-6 w-6 text-slate-400" aria-hidden="true" />
            </div>
            <p className="text-sm font-medium text-slate-300">Feed unavailable</p>
          </div>
        )}

        {/* Camera Name / Label Overlaid at the bottom on a semi-transparent dark gradient strip */}
        <div className="absolute inset-x-0 bottom-0 z-20 bg-gradient-to-t from-black/90 via-black/55 to-transparent px-4 pb-3 pt-8">
          <p
            className="truncate text-sm font-semibold text-white drop-shadow-sm tracking-wide"
            title={camera.name}
          >
            {camera.name}
          </p>
        </div>
      </div>
    </div>
  );
}
