"""
prosody.py — P1 ML Core: Prosody & behavioral features
Finds features that help tell natural human speech from neural TTS:
  - pitch contour variance (TTS often has unnaturally flat/regular pitch)
  - pause ratio (humans pause irregularly; TTS pauses regularly)
  - speaking rate (syllables/sec)

Usage:
    from prosody import extract_prosody
    feat = extract_prosody("clip.wav")
    # {'pitch_var': 0.04, 'pause_ratio': 0.18, 'speaking_rate': 4.2, 'pitch_mean': 133.0, ...}
"""
import numpy as np


def extract_prosody(path_or_bytes, sr=None):
    """Extract prosody features. `path_or_bytes` may be a file path / raw bytes OR
    a tuple (wav_array, sr) so callers with audio already in memory (e.g. live mic
    via score_audio) avoid re-loading from disk."""
    import audio_utils
    import librosa

    if isinstance(path_or_bytes, tuple):
        wav, sr = path_or_bytes
    else:
        wav, sr = audio_utils.load_audio(path_or_bytes)

    # 1) Pitch via PYIN (already returns voiced f0 + voiced flag)
    f0, voiced_flag, _ = librosa.pyin(
        wav, fmin=librosa.note_to_hz("C2"), fmax=librosa.note_to_hz("C6"),
        sr=sr, frame_length=2048, hop_length=512,
    )
    f0 = np.nan_to_num(f0, nan=0.0)
    voiced = voiced_flag.astype(bool)
    voiced_f0 = f0[voiced]

    # 2) Voice activity / pauses via energy-based segmentation
    #    RMS per frame, threshold at -35 dB relative to peak
    rms = librosa.feature.rms(y=wav, frame_length=2048, hop_length=512)[0]
    thr = max(10 ** (-35 / 20), np.percentile(rms, 15))
    is_voice = rms > thr
    pause_ratio = 1.0 - is_voice.mean()

    # 3) "Speaking rate" PROXY: approximate syllables via voiced/unvoiced onsets.
    #    NOTE: this is a rough proxy for syllable count, NOT a true syllabic metric.
    #    Relabeled clearly so no one quotes it as a real speaking-rate figure.
    voiced_onsets = np.diff(voiced.astype(int)) == 1
    dur_s = len(wav) / sr
    n_syl_proxy = int(voiced_onsets.sum())
    speaking_rate_proxy = n_syl_proxy / dur_s if dur_s > 0 else 0.0

    def safe_stat(arr, fn):
        return float(fn(arr)) if arr.size else 0.0

    return {
        "pitch_mean": safe_stat(voiced_f0, np.mean),
        "pitch_std": safe_stat(voiced_f0, np.std),
        "pitch_var": safe_stat(voiced_f0, np.var),
        "pitch_contour_slope": safe_stat(np.diff(voiced_f0), np.mean) if voiced_f0.size > 1 else 0.0,
        "pause_ratio": float(pause_ratio),
        "speaking_rate_proxy_syl_s": float(speaking_rate_proxy),
        "voiced_ratio": float(is_voice.mean()),
        "rms_mean": float(np.mean(rms)),
    }


def prosody_anomaly_score(features, baseline=None):
    """Compare clip prosody to a natural-speech baseline -> anomaly in [0,1].
    If no baseline given, use generic known ranges for natural read speech:
      pitch_var < ~0.10, pause_ratio 0.1-0.4, speaking_rate 3-6 syl/s.
    Higher = more likely synthetic. This is a heuristic to be tuned on real data.
    """
    checks = []
    # too-flat pitch (very low variance) => suspicious
    pv = features.get("pitch_var", 0)
    pv_n = np.clip(1.0 - pv / 0.10, 0, 1)          # 1.0 when pv~0 (suspiciously flat)
    checks.append(pv_n)

    # pause ratio too uniform / edge case
    pr = features.get("pause_ratio", 0.2)
    if pr > 0.45 or pr < 0.03:                      # too much / too little pause
        checks.append(0.9)
    else:
        checks.append(0.3)

    # speaking rate out of natural band
    sr_ = features.get("speaking_rate_proxy_syl_s", 4.0)
    if sr_ < 1.5 or sr_ > 8.0:
        checks.append(0.9)
    else:
        checks.append(0.3)

    return float(np.mean(checks))
