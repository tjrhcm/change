use crate::state::Song;
use std::path::Path;
use walkdir::WalkDir;

pub fn scan_directory(dir: &Path) -> Vec<Song> {
    let mut songs = Vec::new();
    for entry in WalkDir::new(dir)
        .into_iter()
        .filter_map(|e| e.ok())
        .filter(|e| {
            e.path()
                .extension()
                .map(|ext| ext.eq_ignore_ascii_case("flac"))
                .unwrap_or(false)
        })
    {
        if let Some(song) = read_metadata(entry.path()) {
            songs.push(song);
        }
    }
    songs.sort_by(|a, b| {
        a.artist
            .cmp(&b.artist)
            .then(a.album.cmp(&b.album))
            .then(a.track_number.cmp(&b.track_number))
    });
    songs
}

fn get_vorbis_value<'a>(
    vc: &'a metaflac::block::VorbisComment,
    key: &str,
) -> Option<&'a str> {
    vc.get(key).and_then(|v| v.first()).map(|s| s.as_str())
}

fn read_metadata(path: &Path) -> Option<Song> {
    let tag = metaflac::Tag::read_from_path(path).ok()?;
    let vorbis = tag.vorbis_comments()?;

    let title = vorbis
        .title()
        .and_then(|v| v.first())
        .cloned()
        .unwrap_or_else(|| {
            path.file_stem()
                .map(|s| s.to_string_lossy().to_string())
                .unwrap_or_default()
        });

    let artist = vorbis
        .artist()
        .and_then(|v| v.first())
        .cloned()
        .unwrap_or_else(|| "未知艺术家".to_string());

    let album = vorbis
        .album()
        .and_then(|v| v.first())
        .cloned()
        .unwrap_or_else(|| "未知专辑".to_string());

    let track_number = vorbis.track().unwrap_or(0);

    let year = get_vorbis_value(vorbis, "DATE")
        .or_else(|| get_vorbis_value(vorbis, "YEAR"))
        .map(|s| s.to_string());

    let stream_info = tag.get_streaminfo()?;
    let sample_rate = stream_info.sample_rate;
    let bits_per_sample = stream_info.bits_per_sample as u32;
    let channels = stream_info.num_channels as u32;
    let total_samples = stream_info.total_samples;
    let duration_ms = if sample_rate > 0 {
        total_samples * 1000 / sample_rate as u64
    } else {
        0
    };

    let id = format!("{:x}", md5_hash(path.to_string_lossy().as_bytes()));

    Some(Song {
        id,
        title,
        artist,
        album,
        track_number,
        duration_ms,
        year,
        path: path.to_string_lossy().to_string(),
        sample_rate,
        bits_per_sample,
        channels,
    })
}

fn md5_hash(data: &[u8]) -> u128 {
    let mut hash: u128 = 0;
    for &b in data {
        hash = hash.wrapping_mul(31).wrapping_add(b as u128);
    }
    hash
}

pub fn extract_cover(path: &Path) -> Option<Vec<u8>> {
    let tag = metaflac::Tag::read_from_path(path).ok()?;
    let pictures: Vec<_> = tag.pictures().collect();
    pictures
        .iter()
        .find(|p| {
            p.picture_type == metaflac::block::PictureType::CoverFront
                || p.picture_type == metaflac::block::PictureType::Other
                || p.picture_type == metaflac::block::PictureType::Illustration
        })
        .or_else(|| pictures.first())
        .map(|p| p.data.clone())
}
