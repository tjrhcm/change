use crate::player::Player;
use crate::scanner;
use crate::state::{Album, Artist, PlaybackState, SharedState, Song};
use crate::MusicState;
use base64::Engine;
use parking_lot::Mutex;
use std::path::Path;
use std::sync::Arc;

pub struct PlayerHandle(pub Arc<Mutex<Player>>);

fn get_state<'a>(state: &'a tauri::State<'a, MusicState>) -> &'a SharedState {
    &state.0
}

#[tauri::command]
pub fn scan_folder(path: String, state: tauri::State<'_, MusicState>) -> Result<Vec<Song>, String> {
    let dir = Path::new(&path);
    if !dir.is_dir() {
        return Err("路径不是有效的文件夹".to_string());
    }
    let songs = scanner::scan_directory(dir);
    let s = get_state(&state);
    let mut s = s.write();
    s.songs = songs.clone();
    s.music_dir = Some(dir.to_path_buf());
    Ok(songs)
}

#[tauri::command]
pub fn get_all_songs(state: tauri::State<'_, MusicState>) -> Vec<Song> {
    get_state(&state).read().songs.clone()
}

#[tauri::command]
pub fn get_albums(state: tauri::State<'_, MusicState>) -> Vec<Album> {
    get_state(&state).read().get_albums()
}

#[tauri::command]
pub fn get_artists(state: tauri::State<'_, MusicState>) -> Vec<Artist> {
    get_state(&state).read().get_artists()
}

#[tauri::command]
pub fn play_song(
    id: String,
    state: tauri::State<'_, MusicState>,
    player: tauri::State<'_, PlayerHandle>,
) -> Result<(), String> {
    let song = get_state(&state)
        .read()
        .songs
        .iter()
        .find(|s| s.id == id)
        .cloned()
        .ok_or("未找到歌曲")?;
    player.0.lock().play(&song);
    Ok(())
}

#[tauri::command]
pub fn pause(player: tauri::State<'_, PlayerHandle>) {
    player.0.lock().pause();
}

#[tauri::command]
pub fn resume(player: tauri::State<'_, PlayerHandle>) {
    player.0.lock().resume();
}

#[tauri::command]
pub fn stop(player: tauri::State<'_, PlayerHandle>) {
    player.0.lock().stop();
}

#[tauri::command]
pub fn seek(position_ms: u64, player: tauri::State<'_, PlayerHandle>) {
    player.0.lock().seek(position_ms);
}

#[tauri::command]
pub fn set_volume(volume: f32, player: tauri::State<'_, PlayerHandle>) {
    player.0.lock().set_volume(volume);
}

#[tauri::command]
pub fn get_playback_state(state: tauri::State<'_, MusicState>) -> PlaybackState {
    get_state(&state).read().playback.clone()
}

#[tauri::command]
pub fn get_album_art(song_id: String, state: tauri::State<'_, MusicState>) -> Option<String> {
    let path = get_state(&state)
        .read()
        .songs
        .iter()
        .find(|s| s.id == song_id)?
        .path
        .clone();
    let data = scanner::extract_cover(Path::new(&path))?;
    Some(base64::engine::general_purpose::STANDARD.encode(&data))
}
