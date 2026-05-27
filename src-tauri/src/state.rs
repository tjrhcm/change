use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::path::PathBuf;
use std::sync::Arc;
use parking_lot::RwLock;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Song {
    pub id: String,
    pub title: String,
    pub artist: String,
    pub album: String,
    pub track_number: u32,
    pub duration_ms: u64,
    pub year: Option<String>,
    pub path: String,
    pub sample_rate: u32,
    pub bits_per_sample: u32,
    pub channels: u32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Album {
    pub name: String,
    pub artist: String,
    pub year: Option<String>,
    pub songs: Vec<Song>,
    pub cover: Option<String>, // base64
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Artist {
    pub name: String,
    pub albums: Vec<Album>,
    pub song_count: usize,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub enum PlaybackStatus {
    Stopped,
    Playing,
    Paused,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PlaybackState {
    pub status: PlaybackStatus,
    pub current_song: Option<Song>,
    pub position_ms: u64,
    pub duration_ms: u64,
    pub volume: f32,
}

pub struct AppState {
    pub songs: Vec<Song>,
    pub music_dir: Option<PathBuf>,
    pub playback: PlaybackState,
}

impl Default for AppState {
    fn default() -> Self {
        Self {
            songs: Vec::new(),
            music_dir: None,
            playback: PlaybackState {
                status: PlaybackStatus::Stopped,
                current_song: None,
                position_ms: 0,
                duration_ms: 0,
                volume: 1.0,
            },
        }
    }
}

impl AppState {
    pub fn get_albums(&self) -> Vec<Album> {
        let mut map: HashMap<String, Vec<&Song>> = HashMap::new();
        for song in &self.songs {
            let key = format!("{}|||{}", song.album, song.artist);
            map.entry(key).or_default().push(song);
        }
        let mut albums: Vec<Album> = map
            .into_values()
            .map(|mut songs| {
                songs.sort_by_key(|s| s.track_number);
                Album {
                    name: songs[0].album.clone(),
                    artist: songs[0].artist.clone(),
                    year: songs[0].year.clone(),
                    songs: songs.into_iter().cloned().collect(),
                    cover: None,
                }
            })
            .collect();
        albums.sort_by(|a, b| a.name.cmp(&b.name));
        albums
    }

    pub fn get_artists(&self) -> Vec<Artist> {
        let albums = self.get_albums();
        let mut map: HashMap<String, Vec<Album>> = HashMap::new();
        for album in albums {
            map.entry(album.artist.clone()).or_default().push(album);
        }
        let mut artists: Vec<Artist> = map
            .into_values()
            .map(|mut albums| {
                let song_count = albums.iter().map(|a| a.songs.len()).sum();
                albums.sort_by(|a, b| a.name.cmp(&b.name));
                Artist {
                    name: albums[0].artist.clone(),
                    albums,
                    song_count,
                }
            })
            .collect();
        artists.sort_by(|a, b| a.name.cmp(&b.name));
        artists
    }
}

pub type SharedState = Arc<RwLock<AppState>>;
