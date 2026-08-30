"""
voiceprint.py — P1 ML Core: Speaker embedding + cosine similarity
Uses resemblyzer (ECAPA-TDNN based) pretrained speaker embeddings.
Purpose: cross-session consistency check — is this caller the SAME known person?

Usage:
    from voiceprint import Voiceprint

    vp = Voiceprint()
    emb = vp.embed("real_cxo.wav")              # 256-d vector
    emb2 = vp.embed("incoming_call.wav")
    sim = vp.similarity(emb, emb2)              # 0..1
"""
import numpy as np


class Voiceprint:
    def __init__(self, device="auto"):
        self.device = device
        self._encoder = None

    def _load(self):
        if self._encoder is None:
            try:
                from resemblyzer import VoiceEncoder
                self._encoder = VoiceEncoder(device=self.device)
            except Exception as e:
                raise RuntimeError(
                    "resemblyzer not installed. Run:\n  pip install resemblyzer\n"
                    f"Original error: {e}"
                )
        return self._encoder

    def embed(self, path_or_bytes):
        """Return 256-d speaker embedding for an audio clip."""
        from resemblyzer import preprocess_wav
        import audio_utils
        wav, sr = audio_utils.load_audio(path_or_bytes)
        if sr != 16000:
            import librosa
            wav = librosa.resample(wav, orig_sr=sr, target_sr=16000)
        enc = self._load()
        emb = enc.embed_utterance(wav)
        return np.asarray(emb, dtype=np.float32)

    def enroll(self, path_or_bytes, label):
        """Store an embedding + label. Returns {'label': label, 'embedding': emb}."""
        return {"label": label, "embedding": self.embed(path_or_bytes).tolist()}

    @staticmethod
    def similarity(emb_a, emb_b):
        """Cosine similarity between two 256-d embeddings -> 0..1."""
        a = np.asarray(emb_a).ravel()
        b = np.asarray(emb_b).ravel()
        denom = (np.linalg.norm(a) * np.linalg.norm(b)) + 1e-8
        return float(np.dot(a, b) / denom)

    def is_match(self, emb, enrolled, threshold=0.75):
        """A simple tuned decision. Threshold should be calibrated on real data."""
        sim = self.similarity(emb, enrolled["embedding"])
        return sim, sim >= threshold
