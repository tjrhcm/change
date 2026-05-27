use crate::state::{PlaybackStatus, Song, SharedState};
use parking_lot::Mutex;
use std::fs::File;
use std::sync::Arc;
use std::time::Duration;
use symphonia::core::audio::SampleBuffer;
use symphonia::core::codecs::{DecoderOptions, CODEC_TYPE_FLAC};
use symphonia::core::formats::FormatOptions;
use symphonia::core::io::MediaSourceStream;
use symphonia::core::meta::MetadataOptions;
use symphonia::core::probe::Hint;

pub struct Player {
    state: SharedState,
    control: Arc<Mutex<PlayerControl>>,
}

struct PlayerControl {
    should_stop: bool,
    is_paused: bool,
    volume: f32,
}

impl Player {
    pub fn new(state: SharedState) -> Self {
        Self {
            state,
            control: Arc::new(Mutex::new(PlayerControl {
                should_stop: false,
                is_paused: false,
                volume: 1.0,
            })),
        }
    }

    pub fn play(&self, song: &Song) {
        let ctrl = self.control.clone();
        {
            let mut c = ctrl.lock();
            c.should_stop = true;
        }
        std::thread::sleep(Duration::from_millis(50));

        {
            let mut c = ctrl.lock();
            c.should_stop = false;
            c.is_paused = false;
        }

        let song = song.clone();
        let state = self.state.clone();
        let control = ctrl.clone();

        std::thread::spawn(move || {
            if let Err(e) = play_audio(&song, &state, &control) {
                eprintln!("Playback error: {e}");
            }
        });
    }

    pub fn pause(&self) {
        let mut c = self.control.lock();
        c.is_paused = true;
        let mut s = self.state.write();
        s.playback.status = PlaybackStatus::Paused;
    }

    pub fn resume(&self) {
        let mut c = self.control.lock();
        c.is_paused = false;
        let mut s = self.state.write();
        s.playback.status = PlaybackStatus::Playing;
    }

    pub fn stop(&self) {
        let mut c = self.control.lock();
        c.should_stop = true;
        let mut s = self.state.write();
        s.playback.status = PlaybackStatus::Stopped;
        s.playback.current_song = None;
        s.playback.position_ms = 0;
    }

    pub fn seek(&self, _position_ms: u64) {
        // Seek support can be added later
    }

    pub fn set_volume(&self, volume: f32) {
        let mut c = self.control.lock();
        c.volume = volume.clamp(0.0, 1.0);
        let mut s = self.state.write();
        s.playback.volume = c.volume;
    }
}

fn play_audio(
    song: &Song,
    state: &SharedState,
    control: &Arc<Mutex<PlayerControl>>,
) -> Result<(), Box<dyn std::error::Error>> {
    {
        let mut s = state.write();
        s.playback.current_song = Some(song.clone());
        s.playback.status = PlaybackStatus::Playing;
        s.playback.position_ms = 0;
        s.playback.duration_ms = song.duration_ms;
    }

    let file = File::open(&song.path)?;
    let mss = MediaSourceStream::new(Box::new(file), Default::default());

    let mut hint = Hint::new();
    hint.with_extension("flac");

    let meta_opts: MetadataOptions = Default::default();
    let fmt_opts: FormatOptions = Default::default();

    let probed = symphonia::default::get_probe().format(&hint, mss, &fmt_opts, &meta_opts)?;
    let mut format = probed.format;

    let track = format
        .tracks()
        .iter()
        .find(|t| t.codec_params.codec == CODEC_TYPE_FLAC)
        .or_else(|| format.tracks().first())
        .ok_or("No supported audio track")?;

    let dec_opts: DecoderOptions = Default::default();
    let mut decoder = symphonia::default::get_codecs().make(&track.codec_params, &dec_opts)?;

    let sample_rate = track.codec_params.sample_rate.unwrap_or(44100);
    let channels = track
        .codec_params
        .channels
        .map(|c| c.count())
        .unwrap_or(2) as u32;
    let bits_per_sample = track.codec_params.bits_per_sample.unwrap_or(16);

    #[cfg(target_os = "windows")]
    {
        play_wasapi_exclusive(
            &mut *decoder,
            &mut *format,
            sample_rate,
            channels,
            bits_per_sample,
            state,
            control,
        )?;
    }

    #[cfg(not(target_os = "windows"))]
    {
        play_null_output(&mut *decoder, &mut *format, state, control)?;
    }

    {
        let mut s = state.write();
        s.playback.status = PlaybackStatus::Stopped;
        s.playback.position_ms = 0;
    }

    Ok(())
}

#[cfg(target_os = "windows")]
fn play_wasapi_exclusive(
    decoder: &mut dyn symphonia::core::codecs::Decoder,
    format: &mut dyn symphonia::core::formats::FormatReader,
    sample_rate: u32,
    channels: u32,
    bits_per_sample: u32,
    state: &SharedState,
    control: &Arc<Mutex<PlayerControl>>,
) -> Result<(), Box<dyn std::error::Error>> {
    use windows::Win32::Foundation::CloseHandle;
    use windows::Win32::Media::Audio::*;
    use windows::Win32::System::Com::*;
    use windows::Win32::System::Threading::{CreateEventW, WaitForSingleObject};

    unsafe {
        CoInitializeEx(None, COINIT_MULTITHREADED).ok()?;
    }

    let enumerator: IMMDeviceEnumerator =
        unsafe { CoCreateInstance(&MMDeviceEnumerator, None, CLSCTX_ALL)? };

    let device = unsafe { enumerator.GetDefaultAudioEndpoint(eRender, eConsole)? };

    let audio_client: IAudioClient = unsafe { device.Activate(CLSCTX_ALL, None)? };

    let block_align = channels * ((bits_per_sample + 7) / 8);
    let avg_bytes_per_sec = sample_rate * block_align;

    let wave_format = WAVEFORMATEX {
        wFormatTag: WAVE_FORMAT_PCM as u16,
        nChannels: channels as u16,
        nSamplesPerSec: sample_rate,
        nAvgBytesPerSec: avg_bytes_per_sec,
        nBlockAlign: block_align as u16,
        wBitsPerSample: bits_per_sample as u16,
        cbSize: 0,
    };

    let buffer_duration = 1_000_000i64; // 100ms

    unsafe {
        audio_client.Initialize(
            AUDCLNT_SHAREMODE_EXCLUSIVE,
            AUDCLNT_STREAMFLAGS_EVENTCALLBACK,
            buffer_duration,
            buffer_duration,
            &wave_format as *const WAVEFORMATEX,
            None,
        )?;
    }

    let render_client: IAudioRenderClient = unsafe { audio_client.GetService()? };
    let buffer_size = unsafe { audio_client.GetBufferSize()? };

    let event = unsafe { CreateEventW(None, false, false, None)? };
    unsafe { audio_client.SetEventHandle(event)? };
    unsafe { audio_client.Start()? }

    let bytes_per_sample = ((bits_per_sample + 7) / 8) as usize;
    let frame_size = bytes_per_sample * channels as usize;

    loop {
        {
            let c = control.lock();
            if c.should_stop {
                break;
            }
        }

        unsafe {
            WaitForSingleObject(event, 200);
        }

        {
            let c = control.lock();
            if c.is_paused {
                drop(c);
                std::thread::sleep(Duration::from_millis(50));
                continue;
            }
        }

        let padding = unsafe { audio_client.GetCurrentPadding()? };
        let frames_available = buffer_size - padding;
        if frames_available == 0 {
            continue;
        }

        let buffer_ptr = unsafe { render_client.GetBuffer(frames_available)? };

        let mut samples_written = 0u32;
        let max_frames = frames_available as usize;

        while samples_written < max_frames as u32 {
            match format.next_packet() {
                Ok(packet) => match decoder.decode(&packet) {
                    Ok(decoded) => {
                        let mut sample_buf =
                            SampleBuffer::<i16>::new(decoded.capacity() as u64, *decoded.spec());
                        sample_buf.copy_interleaved_ref(decoded);

                        let samples = sample_buf.samples();
                        let total_frames = samples.len() / channels as usize;

                        let frames_to_write =
                            std::cmp::min(total_frames, max_frames - samples_written as usize);

                        let volume = control.lock().volume;
                        let dst = unsafe {
                            std::slice::from_raw_parts_mut(
                                buffer_ptr as *mut i16,
                                (frames_available as usize) * channels as usize,
                            )
                        };

                        for i in 0..frames_to_write {
                            for ch in 0..channels as usize {
                                let idx =
                                    (samples_written as usize + i) * channels as usize + ch;
                                let src_idx = i * channels as usize + ch;
                                if src_idx < samples.len() && idx < dst.len() {
                                    dst[idx] = (samples[src_idx] as f32 * volume) as i16;
                                }
                            }
                        }

                        samples_written += frames_to_write as u32;

                        let pos_ms = (samples_written as u64 * 1000) / sample_rate as u64;
                        let mut s = state.write();
                        s.playback.position_ms = pos_ms;
                    }
                    Err(_) => {
                        samples_written += 1;
                    }
                },
                Err(symphonia::core::errors::Error::IoError(ref e))
                    if e.kind() == std::io::ErrorKind::UnexpectedEof =>
                {
                    break;
                }
                Err(_) => break,
            }
        }

        if samples_written < frames_available {
            let dst = unsafe {
                std::slice::from_raw_parts_mut(
                    buffer_ptr as *mut u8,
                    (frames_available as usize) * frame_size,
                )
            };
            let start = samples_written as usize * frame_size;
            for b in dst.iter_mut().skip(start) {
                *b = 0;
            }
        }

        unsafe {
            render_client.ReleaseBuffer(frames_available, 0)?;
        }

        if samples_written == 0 {
            break;
        }
    }

    unsafe {
        audio_client.Stop()?;
        CloseHandle(event)?;
    }

    Ok(())
}

#[cfg(not(target_os = "windows"))]
fn play_null_output(
    decoder: &mut dyn symphonia::core::codecs::Decoder,
    format: &mut dyn symphonia::core::formats::FormatReader,
    state: &SharedState,
    control: &Arc<Mutex<PlayerControl>>,
) -> Result<(), Box<dyn std::error::Error>> {
    loop {
        {
            let c = control.lock();
            if c.should_stop {
                break;
            }
            if c.is_paused {
                drop(c);
                std::thread::sleep(Duration::from_millis(50));
                continue;
            }
        }

        match format.next_packet() {
            Ok(packet) => match decoder.decode(&packet) {
                Ok(decoded) => {
                    let spec = decoded.spec();
                    let frames = decoded.frames() as u64;
                    let sample_rate = spec.rate as u64;
                    if sample_rate > 0 {
                        let duration_ms = frames * 1000 / sample_rate;
                        let mut s = state.write();
                        s.playback.position_ms += duration_ms;
                        if sample_rate > 0 {
                            let sleep_ms = frames * 1000 / sample_rate;
                            drop(s);
                            std::thread::sleep(Duration::from_millis(sleep_ms));
                        }
                    }
                }
                Err(_) => continue,
            },
            Err(symphonia::core::errors::Error::IoError(ref e))
                if e.kind() == std::io::ErrorKind::UnexpectedEof =>
            {
                break;
            }
            Err(_) => break,
        }
    }
    Ok(())
}
