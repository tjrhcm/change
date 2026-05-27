import { useState, useEffect, useCallback, useRef } from "react";
import { api } from "../lib/tauri";
import type { PlaybackState, Song } from "../types";

export function usePlayer() {
  const [playback, setPlayback] = useState<PlaybackState>({
    status: "Stopped",
    current_song: null,
    position_ms: 0,
    duration_ms: 0,
    volume: 1.0,
  });
  const intervalRef = useRef<number | null>(null);

  const pollState = useCallback(async () => {
    try {
      const state = await api.getPlaybackState();
      setPlayback(state);
    } catch {
      // ignore polling errors
    }
  }, []);

  useEffect(() => {
    intervalRef.current = window.setInterval(pollState, 200);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [pollState]);

  const play = useCallback(async (song: Song) => {
    await api.playSong(song.id);
  }, []);

  const pause = useCallback(async () => {
    await api.pause();
  }, []);

  const resume = useCallback(async () => {
    await api.resume();
  }, []);

  const stop = useCallback(async () => {
    await api.stop();
  }, []);

  const seek = useCallback(async (positionMs: number) => {
    await api.seek(positionMs);
  }, []);

  const setVolume = useCallback(async (volume: number) => {
    await api.setVolume(volume);
  }, []);

  return {
    playback,
    play,
    pause,
    resume,
    stop,
    seek,
    setVolume,
  };
}
