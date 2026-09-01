/**
 * src/pages/Voiceprints.tsx
 * Trusted speaker enrollment interface.
 */
import React, { useState } from 'react';
import { enrollSpeaker, getSpeaker } from '@/services/api';
import { LoadingState } from '@/components/ui/LoadingState';
import { ErrorState } from '@/components/ui/ErrorState';
import { UserPlus, UserCheck, Shield, Mic, CheckCircle2, Search } from 'lucide-react';

export function Voiceprints() {
  const [speakerId, setSpeakerId] = useState('');
  const [name, setName] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Lookup state
  const [lookupId, setLookupId] = useState('');
  const [lookupResult, setLookupResult] = useState<any>(null);
  const [lookupLoading, setLookupLoading] = useState(false);

  const handleEnroll = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!speakerId || !name || !file) return;
    setLoading(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await enrollSpeaker(speakerId, name, file);
      setSuccess(`Speaker "${res.display_name}" enrolled successfully!`);
      setSpeakerId('');
      setName('');
      setFile(null);
    } catch (err: any) {
      setError(err?.message || 'Failed to enroll speaker voiceprint.');
    } finally {
      setLoading(false);
    }
  };

  const handleLookup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!lookupId) return;
    setLookupLoading(true);
    setLookupResult(null);
    try {
      const res = await getSpeaker(lookupId);
      setLookupResult(res);
    } catch (err: any) {
      setLookupResult({ notFound: true, message: err?.message || 'Speaker not found.' });
    } finally {
      setLookupLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div>
        <h1 className="display text-2xl text-text-primary">Voiceprint Management</h1>
        <p className="text-sm text-text-secondary mt-1">
          Register and verify known trusted contacts using ECAPA-TDNN speaker embeddings.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Enroll Form */}
        <div className="card p-6 space-y-4">
          <div className="flex items-center gap-2 border-b border-glass/[0.07] pb-3">
            <UserPlus className="w-5 h-5 text-accent" />
            <h2 className="text-sm font-bold text-text-primary">Enroll Trusted Contact</h2>
          </div>

          {success && (
            <div className="p-3 bg-green-950/80 border border-green-800 rounded-lg text-xs text-green-200 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-green-400 shrink-0" />
              <span>{success}</span>
            </div>
          )}

          {error && <ErrorState message={error} />}

          <form onSubmit={handleEnroll} className="space-y-4">
            <div>
              <label className="text-xs text-text-secondary block mb-1">Speaker ID (Unique identifier)</label>
              <input
                type="text"
                required
                placeholder="e.g. exec-john-doe"
                value={speakerId}
                onChange={(e) => setSpeakerId(e.target.value)}
                className="input"
              />
            </div>

            <div>
              <label className="text-xs text-text-secondary block mb-1">Display Name</label>
              <input
                type="text"
                required
                placeholder="e.g. John Doe (CFO)"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="input"
              />
            </div>

            <div>
              <label className="text-xs text-text-secondary block mb-1">Voice Sample (WAV/MP3)</label>
              <input
                type="file"
                required
                accept="audio/*"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
                className="block w-full text-xs text-text-secondary file:mr-3 file:py-1.5 file:px-3 file:rounded file:border-0 file:text-xs file:font-semibold file:bg-bg-elevated file:text-text-primary hover:file:bg-bg-border cursor-pointer"
              />
              <span className="text-[10px] text-text-muted mt-1 block">
                Embedding extracted in-memory. Audio sample is discarded immediately after.
              </span>
            </div>

            <button type="submit" disabled={loading} className="btn btn-primary w-full justify-center">
              {loading ? 'Extracting Embedding...' : 'Enroll Voiceprint'}
            </button>
          </form>
        </div>

        {/* Lookup Profile */}
        <div className="card p-6 space-y-4">
          <div className="flex items-center gap-2 border-b border-glass/[0.07] pb-3">
            <Search className="w-5 h-5 text-accent" />
            <h2 className="text-sm font-bold text-text-primary">Lookup Voiceprint Profile</h2>
          </div>

          <form onSubmit={handleLookup} className="flex gap-2">
            <input
              type="text"
              required
              placeholder="Enter Speaker ID..."
              value={lookupId}
              onChange={(e) => setLookupId(e.target.value)}
              className="input flex-1"
            />
            <button type="submit" disabled={lookupLoading} className="btn btn-ghost">
              Search
            </button>
          </form>

          {lookupLoading && <LoadingState message="Looking up profile..." />}

          {lookupResult && !lookupResult.notFound && (
            <div className="p-4 bg-bg-surface rounded-xl border border-bg-border space-y-2">
              <div className="flex items-center gap-2 text-green-400 font-bold text-xs">
                <UserCheck className="w-4 h-4" /> Active Voiceprint Enrolled
              </div>
              <div className="text-xs space-y-1">
                <div className="flex justify-between">
                  <span className="text-text-muted">Display Name:</span>
                  <span className="font-semibold text-text-primary">{lookupResult.display_name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-muted">Speaker ID:</span>
                  <span className="font-mono text-text-primary">{lookupResult.speaker_id}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-muted">Enrolled At:</span>
                  <span className="text-text-secondary">{new Date(lookupResult.created_at).toLocaleString()}</span>
                </div>
              </div>
            </div>
          )}

          {lookupResult?.notFound && (
            <div className="p-3 bg-red-950/50 border border-red-800/50 rounded-lg text-xs text-red-300">
              {lookupResult.message}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
