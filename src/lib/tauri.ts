import { invoke } from "@tauri-apps/api/core";
import type { Song, Album, Artist, PlaybackState } from "../types";

export const api = {
  scanFolder: (path: string) => invoke<Song[]>("scan_folder", { path }),
  getAllSongs: () => invoke<Song[]>("get_all_songs"),
  getAlbums: () => invoke<Album[]>("get_albums"),
  getArtists: () => invoke<Artist[]>("get_artists"),
  playSong: (id: string) => invoke<void>("play_song", { id }),
  pause: () => invoke<void>("pause"),
  resume: () => invoke<void>("resume"),
  stop: () => invoke<void>("stop"),
  seek: (positionMs: number) => invoke<void>("seek", { positionMs }),
  setVolume: (volume: number) => invoke<void>("set_volume", { volume }),
  getPlaybackState: () => invoke<PlaybackState>("get_playback_state"),
  getAlbumArt: (songId: string) => invoke<string | null>("get_album_art", { songId }),
};
