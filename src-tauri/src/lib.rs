pub mod commands;
pub mod player;
pub mod scanner;
pub mod state;

use crate::commands::PlayerHandle;
use crate::player::Player;
use crate::state::{AppState, SharedState};
use parking_lot::RwLock;
use std::sync::Arc;

pub struct MusicState(pub SharedState);

pub fn run() {
    let shared_state: SharedState = Arc::new(RwLock::new(AppState::default()));
    let player = Player::new(shared_state.clone());
    let player_handle = PlayerHandle(Arc::new(parking_lot::Mutex::new(player)));

    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .manage(MusicState(shared_state))
        .manage(player_handle)
        .invoke_handler(tauri::generate_handler![
            commands::scan_folder,
            commands::get_all_songs,
            commands::get_albums,
            commands::get_artists,
            commands::play_song,
            commands::pause,
            commands::resume,
            commands::stop,
            commands::seek,
            commands::set_volume,
            commands::get_playback_state,
            commands::get_album_art,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
