import { useState, useEffect } from "react";
import { api } from "../lib/tauri";
import type { Artist, Song, Album, PlaybackStatus } from "../types";

interface ArtistListProps {
  onPlay: (song: Song) => void;
  currentSong: Song | null;
  playbackStatus: PlaybackStatus;
}

export function ArtistList({ onPlay, currentSong, playbackStatus }: ArtistListProps) {
  const [artists, setArtists] = useState<Artist[]>([]);
  const [selectedArtist, setSelectedArtist] = useState<Artist | null>(null);
  const [selectedAlbum, setSelectedAlbum] = useState<Album | null>(null);
  const [covers, setCovers] = useState<Record<string, string>>({});

  useEffect(() => {
    api.getArtists().then(setArtists);
  }, []);

  useEffect(() => {
    if (selectedArtist) {
      selectedArtist.albums.forEach(async (album) => {
        if (album.songs.length > 0 && !covers[album.name]) {
          const art = await api.getAlbumArt(album.songs[0].id);
          if (art) {
            setCovers((prev) => ({ ...prev, [album.name]: art }));
          }
        }
      });
    }
  }, [selectedArtist]);

  if (selectedAlbum) {
    return (
      <div className="flex-1 overflow-y-auto p-6">
        <button
          onClick={() => setSelectedAlbum(null)}
          className="text-zinc-400 hover:text-zinc-200 text-sm mb-4 flex items-center gap-1"
        >
          &larr; 返回 {selectedArtist?.name}
        </button>
        <div className="flex gap-6 mb-6">
          <div className="w-48 h-48 bg-zinc-800 rounded-lg overflow-hidden flex-shrink-0">
            {covers[selectedAlbum.name] ? (
              <img
                src={`data:image/jpeg;base64,${covers[selectedAlbum.name]}`}
                alt={selectedAlbum.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-zinc-600 text-4xl">
                ♪
              </div>
            )}
          </div>
          <div>
            <h2 className="text-2xl font-bold text-zinc-100">{selectedAlbum.name}</h2>
            <p className="text-zinc-400 mt-1">{selectedAlbum.artist}</p>
            {selectedAlbum.year && (
              <p className="text-zinc-500 text-sm mt-1">{selectedAlbum.year}</p>
            )}
          </div>
        </div>
        <table className="w-full text-sm">
          <tbody>
            {selectedAlbum.songs.map((song) => {
              const isCurrent = currentSong?.id === song.id;
              const isPlaying = isCurrent && playbackStatus !== "Stopped";
              return (
                <tr
                  key={song.id}
                  onClick={() => onPlay(song)}
                  className={`cursor-pointer transition-colors ${
                    isCurrent ? "bg-zinc-800/60" : "hover:bg-zinc-800/40"
                  }`}
                >
                  <td className="py-2 px-4 w-12 text-zinc-500">
                    {isPlaying ? (
                      <span className="text-emerald-400">&#9654;</span>
                    ) : (
                      song.track_number
                    )}
                  </td>
                  <td className={`py-2 px-4 ${isCurrent ? "text-emerald-400" : "text-zinc-300"}`}>
                    {song.title}
                  </td>
                  <td className="py-2 px-4 text-right text-zinc-500 w-16">
                    {Math.floor(song.duration_ms / 60000)}:
                    {String(Math.floor((song.duration_ms % 60000) / 1000)).padStart(2, "0")}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  }

  if (selectedArtist) {
    return (
      <div className="flex-1 overflow-y-auto p-6">
        <button
          onClick={() => setSelectedArtist(null)}
          className="text-zinc-400 hover:text-zinc-200 text-sm mb-4 flex items-center gap-1"
        >
          &larr; 返回歌手
        </button>
        <h2 className="text-2xl font-bold text-zinc-100 mb-2">{selectedArtist.name}</h2>
        <p className="text-zinc-500 text-sm mb-6">{selectedArtist.song_count} 首歌曲</p>
        <div className="grid grid-cols-[repeat(auto-fill,minmax(180px,1fr))] gap-4">
          {selectedArtist.albums.map((album) => (
            <button
              key={album.name}
              onClick={() => setSelectedAlbum(album)}
              className="text-left group"
            >
              <div className="aspect-square bg-zinc-800 rounded-lg overflow-hidden mb-2 group-hover:ring-2 ring-zinc-600 transition-all">
                {covers[album.name] ? (
                  <img
                    src={`data:image/jpeg;base64,${covers[album.name]}`}
                    alt={album.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-zinc-600 text-5xl">
                    ♪
                  </div>
                )}
              </div>
              <p className="text-sm text-zinc-200 truncate">{album.name}</p>
              {album.year && <p className="text-xs text-zinc-500">{album.year}</p>}
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-6">
      <h2 className="text-xl font-bold text-zinc-100 mb-4">歌手</h2>
      <div className="space-y-1">
        {artists.map((artist) => (
          <button
            key={artist.name}
            onClick={() => setSelectedArtist(artist)}
            className="w-full text-left px-4 py-3 rounded-lg hover:bg-zinc-800/50 transition-colors flex items-center justify-between group"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center text-zinc-500 text-lg">
                {artist.name.charAt(0).toUpperCase()}
              </div>
              <div>
                <p className="text-zinc-200 text-sm">{artist.name}</p>
                <p className="text-zinc-500 text-xs">
                  {artist.albums.length} 张专辑 &middot; {artist.song_count} 首歌曲
                </p>
              </div>
            </div>
            <span className="text-zinc-600 group-hover:text-zinc-400 transition-colors">&rsaquo;</span>
          </button>
        ))}
      </div>
    </div>
  );
}
