import { useState, useCallback, useEffect } from "react";
import { open } from "@tauri-apps/plugin-dialog";
import { Sidebar } from "./components/Sidebar";
import { SongList } from "./components/SongList";
import { AlbumGrid } from "./components/AlbumGrid";
import { ArtistList } from "./components/ArtistList";
import { PlayerBar } from "./components/PlayerBar";
import { usePlayer } from "./hooks/usePlayer";
import { api } from "./lib/tauri";
import type { View, Song } from "./types";

function App() {
  const [view, setView] = useState<View>("all");
  const [songs, setSongs] = useState<Song[]>([]);
  const { playback, play, pause, resume, stop, seek, setVolume } = usePlayer();

  const loadSongs = useCallback(async () => {
    try {
      const allSongs = await api.getAllSongs();
      setSongs(allSongs);
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    loadSongs();
  }, [loadSongs]);

  const handleScanFolder = useCallback(async () => {
    const selected = await open({
      directory: true,
      multiple: false,
      title: "选择音乐文件夹",
    });
    if (selected) {
      const scanned = await api.scanFolder(selected);
      setSongs(scanned);
    }
  }, []);

  const handlePlaySong = useCallback(
    (song: Song) => {
      play(song);
    },
    [play]
  );

  return (
    <div className="h-screen flex flex-col bg-zinc-950 text-zinc-100">
      <div className="flex flex-1 min-h-0">
        <Sidebar currentView={view} onViewChange={setView} onScanFolder={handleScanFolder} />
        <main className="flex-1 flex flex-col min-w-0">
          {view === "all" && (
            <SongList
              songs={songs}
              currentSong={playback.current_song}
              playbackStatus={playback.status}
              onPlay={handlePlaySong}
            />
          )}
          {view === "albums" && (
            <AlbumGrid
              onPlay={handlePlaySong}
              currentSong={playback.current_song}
              playbackStatus={playback.status}
            />
          )}
          {view === "artists" && (
            <ArtistList
              onPlay={handlePlaySong}
              currentSong={playback.current_song}
              playbackStatus={playback.status}
            />
          )}
        </main>
      </div>
      <PlayerBar
        playback={playback}
        onPlay={() => {}}
        onPause={pause}
        onResume={resume}
        onStop={stop}
        onSeek={seek}
        onSetVolume={setVolume}
      />
    </div>
  );
}

export default App;
