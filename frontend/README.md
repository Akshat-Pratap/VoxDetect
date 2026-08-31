# VoxDetect Frontend Dashboard 🎙️🛡️

This directory contains the web dashboard for **VoxDetect** (formerly VoiceGuard AI), a real-time AI-generated voice detection, voiceprint identification, and security analytics platform.

---

## 🚀 Tech Stack

- **Framework**: [React 19](https://react.dev/) + [TypeScript](https://www.typescriptlang.org/)
- **Build Tool**: [Vite](https://vitejs.dev/)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/) + Custom CSS Themes
- **Routing**: [React Router v7](https://reactrouter.com/)
- **Charts & Visualizations**: [Recharts](https://recharts.org/)
- **Icons**: [Lucide React](https://lucide.dev/)
- **HTTP Client**: [Axios](https://axios-http.com/)

---

## 📁 Project Structure

```text
frontend/
├── web/
│   ├── public/             # Static public assets
│   ├── src/
│   │   ├── assets/         # Images, illustrations, and design assets
│   │   ├── components/     # Reusable UI, layout, and feature components
│   │   │   ├── alerts/     # Security alerts & notifications UI
│   │   │   ├── layout/     # AppShell, Navbar, Sidebar
│   │   │   └── ui/         # Core buttons, cards, modals, loading states
│   │   ├── context/        # React context providers (State & Auth)
│   │   ├── hooks/          # Custom React hooks (Audio streaming, websockets)
│   │   ├── pages/          # Application views/routes
│   │   │   ├── Dashboard.tsx    # Threat monitoring & analytics overview
│   │   │   ├── LiveCall.tsx     # Real-time audio stream & call analysis
│   │   │   ├── Analyze.tsx      # Manual audio file analysis & deepfake scoring
│   │   │   ├── Voiceprints.tsx  # Voice enrollment and identity management
│   │   │   ├── Alerts.tsx       # Incident management and threat alerts
│   │   │   ├── Audit.tsx        # System audit logs & compliance trail
│   │   │   ├── Settings.tsx     # System threshold & integration configuration
│   │   │   └── NotFound.tsx     # 404 error page
│   │   ├── services/       # API endpoints & backend integration services
│   │   ├── types/          # TypeScript interface and type definitions
│   │   ├── App.tsx         # Root component with routing
│   │   ├── main.tsx        # Application entry point
│   │   └── index.css       # Global styles and Tailwind configurations
│   ├── package.json
│   ├── tsconfig.json
│   └── vite.config.ts
└── README.md
```

---

## 🛠️ Getting Started

### Prerequisites

- **Node.js**: `v18.0.0` or higher
- **npm** or **yarn** / **pnpm**

### Installation

1. Navigate to the `frontend/web` directory:
   ```bash
   cd frontend/web
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

### Development Server

Start the local development server with Hot Module Replacement (HMR):

```bash
npm run dev
```

The application will typically be accessible at `http://localhost:5173`.

### Production Build

To build the project for production:

```bash
npm run build
```

To preview the production build locally:

```bash
npm run preview
```

### Linting & Quality Checks

Run the linter to ensure code quality:

```bash
npm run lint
```

---

## 🛡️ Key Features

- **Real-Time Live Call Monitoring**: Continuous streaming voice analysis to detect spoofing or deepfake audio mid-call.
- **Audio File Inspection**: Upload audio samples (`.wav`, `.mp3`, etc.) to run deep acoustic and synthetic voice classification models.
- **Voiceprint Enrollment**: Manage authorized speaker profiles and identify impersonation attempts.
- **Incident Alerts & Logging**: Real-time alerts on detected anomalies, risk scoring, and audit trails.
