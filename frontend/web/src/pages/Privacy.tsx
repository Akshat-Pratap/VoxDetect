/**
 * src/pages/Privacy.tsx — Enterprise Voice Privacy & Security Policy
 */
import React from 'react';
import {
  ShieldCheck,
  Lock,
  Cpu,
  Trash2,
  FileCheck,
  Database,
  CheckCircle2,
  ExternalLink,
} from 'lucide-react';

export function Privacy() {
  const principles = [
    {
      icon: Lock,
      title: 'Zero Raw Audio Persistence',
      desc: 'Raw audio streams and recordings are never written to disk, databases, or third-party cloud storage. Audio is streamed directly to RAM for inference and purged immediately.',
      badge: 'Architecture Guarantee',
    },
    {
      icon: Cpu,
      title: 'Ephemeral In-Memory Inference',
      desc: 'Deepfake feature extraction occurs entirely within volatile memory. Once Wav2Vec2-XLSR acoustic embeddings are calculated, the PCM buffer is zeroed out.',
      badge: 'Volatile RAM Only',
    },
    {
      icon: FileCheck,
      title: 'Cryptographic Evidence Logging',
      desc: 'Audit records store only anonymized timestamps, organization policy profiles, fused risk scores, and SHA-256 verification hashes. Voice content is never stored.',
      badge: 'SHA-256 Hashing',
    },
    {
      icon: Database,
      title: 'Isolated Voiceprint Templates',
      desc: 'Trusted contact enrollments store only irreversible 512-dimensional vector embeddings, protected with organizational tenant isolation and optional AES-256 encryption at rest.',
      badge: 'Irreversible Vectors',
    },
  ];

  const complianceStandards = [
    {
      name: 'GDPR (EU 2016/679)',
      detail: 'Complies with Article 9 (Special category biometric data processing) and Article 17 (Right to Erasure).',
      status: 'Compliant',
    },
    {
      name: 'DPDP Act 2023',
      detail: 'Meets India Digital Personal Data Protection Act requirements for purpose limitation and data minimization.',
      status: 'Compliant',
    },
    {
      name: 'SOC 2 Type II Standards',
      detail: 'Security and confidentiality trust services criteria supported by end-to-end TLS 1.3 encryption and access logging.',
      status: 'Ready',
    },
    {
      name: 'PCI-DSS / Financial SOC',
      detail: 'Suitable for banking authentication flows with zero customer call storage and real-time fraud mitigation.',
      status: 'Supported',
    },
  ];

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Page Header */}
      <div>
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[rgb(var(--accent))] mb-1">
          <ShieldCheck className="w-4 h-4" /> Security & Privacy Architecture
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-[rgb(var(--text-primary))]">
          Privacy Policy & Data Protection
        </h1>
        <p className="text-sm text-[rgb(var(--text-muted))] mt-1">
          VoxDetect is engineered with a strict Privacy-by-Design standard. We do not store, retain, or monetize voice recordings.
        </p>
      </div>

      {/* Core Privacy Pillars */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {principles.map((p) => {
          const Icon = p.icon;
          return (
            <div key={p.title} className="card flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="w-8 h-8 rounded-lg bg-[rgb(var(--accent))/0.15] text-[rgb(var(--accent-soft))] flex items-center justify-center">
                    <Icon className="w-4 h-4" />
                  </div>
                  <span className="text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded bg-[var(--hover-bg)] text-[rgb(var(--accent-soft))]">
                    {p.badge}
                  </span>
                </div>
                <h3 className="text-sm font-semibold text-[rgb(var(--text-primary))] mb-1.5">
                  {p.title}
                </h3>
                <p className="text-xs text-[rgb(var(--text-secondary))] leading-relaxed">
                  {p.desc}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Data Lifecycle / Flow */}
      <div className="card space-y-4">
        <h3 className="text-base font-semibold text-[rgb(var(--text-primary))]">
          Real-Time Audio Processing Pipeline
        </h3>
        <p className="text-xs text-[rgb(var(--text-muted))]">
          Step-by-step breakdown of how voice audio is received, evaluated, and immediately destroyed:
        </p>

        <div className="space-y-3">
          <div className="p-3.5 rounded-lg bg-[var(--hover-bg)] flex items-start gap-3">
            <div className="w-6 h-6 rounded-full bg-[rgb(var(--accent))] text-white text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
              1
            </div>
            <div>
              <h4 className="text-xs font-semibold text-[rgb(var(--text-primary))]">
                Secure Ingestion over TLS 1.3
              </h4>
              <p className="text-xs text-[rgb(var(--text-secondary))] mt-0.5">
                Audio chunks arrive via encrypted WebSockets (`/v1/stream`) or multipart REST upload (`/v1/analyze-call`).
              </p>
            </div>
          </div>

          <div className="p-3.5 rounded-lg bg-[var(--hover-bg)] flex items-start gap-3">
            <div className="w-6 h-6 rounded-full bg-[rgb(var(--accent))] text-white text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
              2
            </div>
            <div>
              <h4 className="text-xs font-semibold text-[rgb(var(--text-primary))]">
                Multi-Detector Neural Inference
              </h4>
              <p className="text-xs text-[rgb(var(--text-secondary))] mt-0.5">
                Wav2Vec2-XLSR, Prosodic Feature Extractor, and Speaker Embeddings run in RAM. Risk scores (0–100) and confidence bands are computed within ~700ms.
              </p>
            </div>
          </div>

          <div className="p-3.5 rounded-lg bg-[var(--hover-bg)] flex items-start gap-3">
            <div className="w-6 h-6 rounded-full bg-[rgb(var(--risk-low))] text-white text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
              3
            </div>
            <div>
              <h4 className="text-xs font-semibold text-[rgb(var(--text-primary))]">
                Memory Zeroing & Buffer Disposal
              </h4>
              <p className="text-xs text-[rgb(var(--text-secondary))] mt-0.5">
                Immediately after the forward pass, audio buffers are unallocated and marked for garbage collection. No temporary `.wav` files are ever written to disk.
              </p>
            </div>
          </div>

          <div className="p-3.5 rounded-lg bg-[var(--hover-bg)] flex items-start gap-3">
            <div className="w-6 h-6 rounded-full bg-[rgb(var(--accent))] text-white text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
              4
            </div>
            <div>
              <h4 className="text-xs font-semibold text-[rgb(var(--text-primary))]">
                Privacy-Safe Audit Record
              </h4>
              <p className="text-xs text-[rgb(var(--text-secondary))] mt-0.5">
                Only the generated alert identifier, timestamp, and numerical risk score are stored for security auditing.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Compliance Frameworks */}
      <div className="card space-y-4">
        <h3 className="text-base font-semibold text-[rgb(var(--text-primary))]">
          Regulatory Compliance Standards
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {complianceStandards.map((std) => (
            <div key={std.name} className="p-3.5 rounded-lg bg-[var(--hover-bg)] flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-bold text-[rgb(var(--text-primary))]">{std.name}</span>
                  <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-[rgb(var(--risk-low))]">
                    <CheckCircle2 className="w-3 h-3" /> {std.status}
                  </span>
                </div>
                <p className="text-xs text-[rgb(var(--text-secondary))] leading-relaxed">{std.detail}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Voiceprint Deletion */}
      <div className="card p-4 flex items-start gap-3 border-l-4 border-l-[rgb(var(--accent))]">
        <Trash2 className="w-5 h-5 text-[rgb(var(--accent))] shrink-0 mt-0.5" />
        <div className="text-xs space-y-1">
          <span className="font-semibold text-[rgb(var(--text-primary))] block">
            Voiceprint Enrollment Erasure (Right to be Forgotten)
          </span>
          <p className="text-[rgb(var(--text-secondary))] leading-relaxed">
            Organizations can delete enrolled trusted speaker embeddings at any time via the Voiceprint Management API or UI. Deletion purges the irreversible embedding vector from storage immediately.
          </p>
        </div>
      </div>
    </div>
  );
}
