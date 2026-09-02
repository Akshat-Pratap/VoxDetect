/**
 * src/pages/Voiceprints.tsx — Trusted speaker enrollment
 */
import React, { useState } from 'react';
import { enrollSpeaker, getSpeaker } from '@/services/api';
import { LoadingState } from '@/components/ui/LoadingState';
import { ErrorState } from '@/components/ui/ErrorState';
import { UserPlus, UserCheck, CheckCircle2, Search } from 'lucide-react';

export function Voiceprints() {
  const [speakerId, setSpeakerId] = useState('');
  const [name, setName] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

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
    <div className="space-y-4 max-w-5xl mx-auto">
      <div>
        <h1 className="text-lg font-semibold text-[rgb(var(--text-primary))]">Voiceprint Management</h1>
        <p className="text-xs text-[rgb(var(--text-muted))] mt-0.5">
          Register and verify known trusted speakers
        </p>
      </div>

      {/* Compact single card with two divided panes */}
      <div className="card grid grid-cols-1 md:grid-cols-2">
        {/* Enroll pane */}
        <div className="md:pr-5 pb-5 md:pb-0 md:mr-5">
          <div className="flex items-center gap-2 mb-4">
            <UserPlus className="w-4 h-4 text-[rgb(var(--accent-soft))]" />
            <h2 className="text-sm font-semibold text-[rgb(var(--text-primary))]">Enroll Trusted Contact</h2>
          </div>

          {success && (
            <div className="p-2.5 rounded-md bg-[rgba(34,197,94,0.1)] border border-[rgba(34,197,94,0.2)] text-xs text-green-300 flex items-center gap-2 mb-3">
              <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
              <span>{success}</span>
            </div>
          )}

          {error && <div className="mb-3"><ErrorState message={error} /></div>}

          <form onSubmit={handleEnroll} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] text-[rgb(var(--text-muted))] block mb-1.5">Speaker ID</label>
                <input
                  type="text"
                  required
                  placeholder="exec-john-doe"
                  value={speakerId}
                  onChange={(e) => setSpeakerId(e.target.value)}
                  className="input"
                />
              </div>
              <div>
                <label className="text-[11px] text-[rgb(var(--text-muted))] block mb-1.5">Display Name</label>
                <input
                  type="text"
                  required
                  placeholder="John Doe (CFO)"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="input"
                />
              </div>
            </div>

            <div>
              <label className="text-[11px] text-[rgb(var(--text-muted))] block mb-1.5">Voice Sample</label>
              <input
                type="file"
                required
                accept="audio/*"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
                className="block w-full text-xs text-[rgb(var(--text-secondary))] file:mr-3 file:py-2 file:px-3 file:rounded file:border-0 file:text-xs file:font-semibold file:bg-[var(--hover-bg)] file:text-[rgb(var(--text-primary))] hover:file:bg-[var(--hover-bg-strong)] cursor-pointer"
              />
              <span className="text-[10px] text-[rgb(var(--text-muted))] mt-2 block">
                Embedding extracted in-memory. Audio discarded immediately.
              </span>
            </div>

            <button type="submit" disabled={loading} className="btn btn-primary w-full justify-center">
              {loading ? 'Extracting Embedding...' : 'Enroll Voiceprint'}
            </button>
          </form>
        </div>

        {/* Lookup pane */}
        <div className="md:pl-5 pt-5 md:pt-0 border-t md:border-t-0 md:border-l border-[rgb(var(--border-subtle))]">
          <div className="flex items-center gap-2 mb-4">
            <Search className="w-4 h-4 text-[rgb(var(--accent-soft))]" />
            <h2 className="text-sm font-semibold text-[rgb(var(--text-primary))]">Lookup Profile</h2>
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
            <button type="submit" disabled={lookupLoading} className="btn btn-primary">
              {lookupLoading ? <span className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" /> : <Search className="w-3.5 h-3.5" />}
              Search
            </button>
          </form>

          {lookupLoading && <div className="mt-3"><LoadingState message="Looking up..." /></div>}

          {lookupResult && !lookupResult.notFound && (
            <div className="mt-3 p-3 rounded-md bg-[var(--hover-bg)] border border-[rgb(var(--border-subtle))] space-y-1.5">
              <div className="flex items-center gap-2 text-[11px] font-semibold text-[rgb(var(--risk-low))]">
                <UserCheck className="w-3.5 h-3.5" /> Enrolled
              </div>
              <div className="text-[11px] space-y-1">
                <div className="flex justify-between">
                  <span className="text-[rgb(var(--text-muted))]">Name</span>
                  <span className="font-semibold text-[rgb(var(--text-primary))]">{lookupResult.display_name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[rgb(var(--text-muted))]">ID</span>
                  <span className="font-mono text-[rgb(var(--text-primary))]">{lookupResult.speaker_id}</span>
                </div>
              </div>
            </div>
          )}

          {lookupResult?.notFound && (
            <div className="mt-3 p-2.5 rounded-md bg-[rgba(239,68,68,0.08)] border border-[rgba(239,68,68,0.2)] text-xs text-red-300">
              {lookupResult.message}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}