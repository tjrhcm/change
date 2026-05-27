import { useRef, useEffect, useState } from "react";
import type { PlaybackState } from "../types";
import { api } from "../lib/tauri";

interface PlayerBarProps {
  playback: PlaybackState;
  onPlay: () => void;
  onPause: () => void;
  onResume: () => void;
  onStop: () => void;
  onSeek: (ms: number) => void;
  onSetVolume: (v: number) => void;
}

function formatTime(ms: number): string {
  const totalSec = Math.floor(ms / 1000);
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  return `${min}:${sec.toString().padStart(2, "0")}`;
}

export function PlayerBar({
  playback,
  onPause,
  onResume,
  onStop,
  onSeek,
  onSetVolume,
}: PlayerBarProps) {
  const progressRef = useRef<HTMLDivElement>(null);
  const [albumArt, setAlbumArt] = useState<string | null>(null);
  const { current_song, status, position_ms, duration_ms, volume } = playback;
  const isPlaying = status === "Playing";
  const progress = duration_ms > 0 ? (position_ms / duration_ms) * 100 : 0;

  useEffect(() => {
    if (current_song) {
      api.getAlbumArt(current_song.id).then(setAlbumArt);
    } else {
      setAlbumArt(null);
    }
  }, [current_song?.id]);

  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!progressRef.current || !duration_ms) return;
    const rect = progressRef.current.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    onSeek(Math.floor(ratio * duration_ms));
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onSetVolume(parseFloat(e.target.value));
  };

  if (!current_song) {
    return (
      <div className="h-20 bg-zinc-900 border-t border-zinc-800 flex items-center justify-center">
        <p className="text-zinc-600 text-sm">选择一首歌曲开始播放</p>
      </div>
    );
  }

  return (
    <div className="h-20 bg-zinc-900 border-t border-zinc-800 flex flex-col">
      {/* Progress bar */}
      <div
        ref={progressRef}
        className="h-1 bg-zinc-800 cursor-pointer group relative"
        onClick={handleProgressClick}
      >
        <div
          className="h-full bg-emerald-500 transition-[width] duration-200"
          style={{ width: `${progress}%` }}
        />
        <div
          className="absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-emerald-400 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
          style={{ left: `calc(${progress}% - 6px)` }}
        />
      </div>

      <div className="flex-1 flex items-center px-4 gap-4">
        {/* Song info */}
        <div className="flex items-center gap-3 w-64 min-w-0">
          <div className="w-12 h-12 bg-zinc-800 rounded overflow-hidden flex-shrink-0">
            {albumArt ? (
              <img
                src={`data:image/jpeg;base64,${albumArt}`}
                alt=""
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-zinc-600">
                ♪
              </div>
            )}
          </div>
          <div className="min-w-0">
            <p className="text-sm text-zinc-200 truncate">{current_song.title}</p>
            <p className="text-xs text-zinc-500 truncate">{current_song.artist}</p>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-2 flex-1 justify-center">
          <button
            onClick={isPlaying ? onPause : onResume}
            className="w-9 h-9 rounded-full bg-zinc-100 text-zinc-900 flex items-center justify-center hover:scale-105 transition-transform"
          >
            {isPlaying ? (
              <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor">
                <rect x="2" y="1" width="3.5" height="12" rx="1" />
                <rect x="8.5" y="1" width="3.5" height="12" rx="1" />
              </svg>
            ) : (
              <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor">
                <path d="M3 1.5v11l9-5.5z" />
              </svg>
            )}
          </button>
          <button
            onClick={onStop}
            className="w-8 h-8 rounded-full bg-zinc-800 text-zinc-400 flex items-center justify-center hover:bg-zinc-700 hover:text-zinc-200 transition-colors"
          >
            <svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor">
              <rect x="1" y="1" width="8" height="8" rx="1" />
            </svg>
          </button>
        </div>

        {/* Time + Volume */}
        <div className="flex items-center gap-4 w-64 justify-end">
          <span className="text-xs text-zinc-500 tabular-nums">
            {formatTime(position_ms)} / {formatTime(duration_ms)}
          </span>
          <div className="flex items-center gap-2">
            <svg
              width="16"
              height="16"
              viewBox="0 0 16 16"
              fill="currentColor"
              className="text-zinc-500"
            >
              <path d="M8 2L4 6H1v4h3l4 4V2z" />
              {volume > 0.5 && (
                <path
                  d="M11 5.5c.8.8 1.2 2 1.2 3s-.4 2.2-1.2 3"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                />
              )}
              {volume > 0 && (
                <path
                  d="M10 7c.3.3.5.8.5 1.2s-.2.9-.5 1.2"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                />
              )}
            </svg>
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={volume}
              onChange={handleVolumeChange}
              className="w-20 h-1 appearance-none bg-zinc-700 rounded-full cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:bg-zinc-300 [&::-webkit-slider-thumb]:rounded-full"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
