export interface Song {
  id: string;
  title: string;
  artist: string;
  album: string;
  track_number: number;
  duration_ms: number;
  year: string | null;
  path: string;
  sample_rate: number;
  bits_per_sample: number;
  channels: number;
}

export interface Album {
  name: string;
  artist: string;
  year: string | null;
  songs: Song[];
  cover: string | null;
}

export interface Artist {
  name: string;
  albums: Album[];
  song_count: number;
}

export type PlaybackStatus = "Stopped" | "Playing" | "Paused";

export interface PlaybackState {
  status: PlaybackStatus;
  current_song: Song | null;
  position_ms: number;
  duration_ms: number;
  volume: number;
}

export type View = "all" | "albums" | "artists";
