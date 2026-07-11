"use client";

import { useEffect, useRef } from "react";

/**
 * Full-bleed muted background video for the dashboard hero. React does not
 * reliably emit the `muted` attribute in server-rendered HTML, which blocks
 * autoplay, so muting and playback are armed imperatively on mount.
 */
export function HeroVideo({ src }: { src: string }) {
  const ref = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    const v = ref.current;
    if (!v) return;

    v.muted = true;
    v.defaultMuted = true;
    v.volume = 0;
    v.loop = true;

    const onVolumeChange = () => {
      if (!v.muted) {
        v.muted = true;
        v.volume = 0;
      }
    };
    const onPlay = () => {
      v.muted = true;
    };
    const onEnded = () => {
      v.currentTime = 0;
      v.play().catch(() => {});
    };
    v.addEventListener("volumechange", onVolumeChange);
    v.addEventListener("play", onPlay);
    v.addEventListener("ended", onEnded);

    const p = v.play();
    if (p && typeof p.catch === "function") {
      p.catch(() => {
        v.muted = true;
        setTimeout(() => {
          v.play().catch(() => {});
        }, 120);
      });
    }

    return () => {
      v.removeEventListener("volumechange", onVolumeChange);
      v.removeEventListener("play", onPlay);
      v.removeEventListener("ended", onEnded);
    };
  }, []);

  return (
    <video
      ref={ref}
      autoPlay
      muted
      loop
      playsInline
      preload="metadata"
      aria-hidden="true"
      className="absolute inset-0 z-0 h-full w-full object-cover object-center"
    >
      <source src={src} type="video/mp4" />
    </video>
  );
}
