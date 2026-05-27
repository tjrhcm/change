import type { Song, PlaybackStatus } from "../types";

interface SongListProps {
  songs: Song[];
  currentSong: Song | null;
  playbackStatus: PlaybackStatus;
  onPlay: (song: Song) => void;
}

function formatDuration(ms: number): string {
  const totalSec = Math.floor(ms / 1000);
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  return `${min}:${sec.toString().padStart(2, "0")}`;
}

function formatSampleRate(hz: number): string {
  if (hz >= 1000) return `${(hz / 1000).toFixed(1)}kHz`;
  return `${hz}Hz`;
}

export function SongList({ songs, currentSong, playbackStatus, onPlay }: SongListProps) {
  if (songs.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center text-zinc-500">
        <p>还没有音乐，请先选择文件夹</p>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto">
      <table className="w-full text-sm">
        <thead className="sticky top-0 bg-zinc-950/90 backdrop-blur-sm">
          <tr className="text-zinc-500 border-b border-zinc-800">
            <th className="text-left py-2 px-4 font-medium w-12">#</th>
            <th className="text-left py-2 px-4 font-medium">标题</th>
            <th className="text-left py-2 px-4 font-medium">歌手</th>
            <th className="text-left py-2 px-4 font-medium">专辑</th>
            <th className="text-left py-2 px-4 font-medium w-20">质量</th>
            <th className="text-right py-2 px-4 font-medium w-16">时长</th>
          </tr>
        </thead>
        <tbody>
          {songs.map((song, index) => {
            const isPlaying = currentSong?.id === song.id && playbackStatus !== "Stopped";
            const isCurrent = currentSong?.id === song.id;

            return (
              <tr
                key={song.id}
                onClick={() => onPlay(song)}
                className={`cursor-pointer transition-colors group ${
                  isCurrent
                    ? "bg-zinc-800/60 text-zinc-100"
                    : "hover:bg-zinc-800/40 text-zinc-300"
                }`}
              >
                <td className="py-2 px-4 text-zinc-500">
                  {isPlaying ? (
                    <span className="text-emerald-400">&#9654;</span>
                  ) : (
                    <span className="group-hover:hidden">{index + 1}</span>
                  )}
                </td>
                <td className="py-2 px-4 truncate max-w-0">
                  <span className={isCurrent ? "text-emerald-400" : ""}>{song.title}</span>
                </td>
                <td className="py-2 px-4 text-zinc-400 truncate max-w-0">{song.artist}</td>
                <td className="py-2 px-4 text-zinc-500 truncate max-w-0">{song.album}</td>
                <td className="py-2 px-4 text-zinc-600 text-xs">
                  {song.bits_per_sample}bit/{formatSampleRate(song.sample_rate)}
                </td>
                <td className="py-2 px-4 text-zinc-500 text-right">
                  {formatDuration(song.duration_ms)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
