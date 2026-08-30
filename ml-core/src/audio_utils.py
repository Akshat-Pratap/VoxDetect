"""
audio_utils.py — P1 ML Core: Audio loading & preprocessing
Shared entry point: normalize any audio to a 16kHz mono waveform tensor.
Works in Colab and locally.

Usage:
    from audio_utils import load_audio, preprocess_clip

    wav, sr = load_audio("clip.wav")        # (n_samples,) float32, 16kHz
    feat = preprocess_clip(wav, sr)         # normalized/normed for model
"""
import io
import numpy as np

TARGET_SR = 16000


def load_audio(path_or_bytes, target_sr=TARGET_SR):
    """Load any audio (wav/mp3/ogg) to mono float32 at target_sr.
    Accepts a file path OR raw bytes. Uses torchaudio if available, else librosa.
    """
    try:
        import torchaudio
        import torchaudio.transforms as T
        wav, sr = torchaudio.load(path_or_bytes)
        # mono
        if wav.shape[0] > 1:
            wav = wav.mean(dim=0, keepdim=True)
        # resample if needed
        if sr != target_sr:
            resampler = T.Resample(sr, target_sr)
            wav = resampler(wav)
        return wav.squeeze(0).numpy().astype(np.float32), target_sr
    except ImportError:
        import soundfile as sf
        wav, sr = sf.read(path_or_bytes, dtype="float32")
        if len(wav.shape) > 1:
            wav = wav.mean(axis=1)
        if sr != target_sr:
            import librosa
            wav = librosa.resample(wav, orig_sr=sr, target_sr=target_sr)
        return wav.astype(np.float32), target_sr


def preprocess_clip(path_or_bytes, target_sr=TARGET_SR, trim_silence=True, max_len_s=None):
    """Full preprocessing: load -> mono -> normalize -> (optional) trim/fix length."""
    wav, sr = load_audio(path_or_bytes, target_sr)
    # normalize peak amplitude to [-1, 1]
    peak = np.max(np.abs(wav)) + 1e-8
    wav = wav / peak

    if trim_silence:
        try:
            import librosa
            wav, _ = librosa.effects.trim(wav, top_db=30)
        except Exception:
            pass

    if max_len_s is not None:
        max_len = int(max_len_s * sr)
        if len(wav) > max_len:
            wav = wav[:max_len]
        else:
            wav = np.pad(wav, (0, max_len - len(wav)))

    return wav, sr


def chunk_audio(wav, sr, chunk_s=2.5, hop_s=2.0, max_total_s=60.0):
    """Slide a window over a waveform -> list of chunk arrays (for streaming mode).
    Default: 2.5s windows, 2.0s hop (0.5s overlap) — enough for 2-3s chunks.
    """
    chunk_n = int(chunk_s * sr)
    hop_n = int(hop_s * sr)
    total_n = min(len(wav), int(max_total_s * sr))
    chunks = []
    start = 0
    while start + chunk_n <= total_n and len(chunks) < 50:
        chunks.append(wav[start:start + chunk_n])
        start += hop_n
    return chunks


def bytes_to_wav_io(np_audio, sr=TARGET_SR):
    """Convert a raw float32 array back into in-memory WAV bytes (for /analyze-call).
    """
    import wave
    import struct
    buf = io.BytesIO()
    with wave.open(buf, "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(sr)
        pcm = (np.clip(np_audio, -1, 1) * 32767).astype(np.int16)
        w.writeframes(pcm.tobytes())
    return buf.getvalue()
