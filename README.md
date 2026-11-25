# x75

Minimalist college attendance tracker and margin defense utility for Android and Web.

## Overview

x75 is designed for academic environments enforcing strict attendance thresholds (typically 75%). Rather than tracking complicated hourly timetable slots, it operates on a verified daily record model: each calendar day is either a working instructional day (`PRESENT`, `ABSENT`, `DUTY_LEAVE`) or a non-instructional day (`HOLIDAY`).

## Mathematics & Margin Engine

The core calculation treats attendance as a discrete margin above or below a target percentage $T$ (default $75\%$):

Given:
- $A$: Attended working days (`PRESENT` + `DUTY_LEAVE`)
- $C$: Total conducted instructional days (`PRESENT` + `ABSENT` + `DUTY_LEAVE`)
- $T$: Target attendance percentage ($50 \le T \le 95$)

Current percentage:
$$P = \frac{A}{C} \times 100$$

### 1. Bunk Allowance (Surplus Margin)
When $P \ge T$, the maximum number of consecutive instructional days $L$ you can safely miss without dropping below $T$:

$$L = \left\lfloor \frac{100A - TC}{T} \right\rfloor$$

### 2. Recovery Requirement (Deficit Margin)
When $P < T$, the minimum number of consecutive instructional days $R$ you must attend without absence to recover compliance:

$$R = \left\lceil \frac{TC - 100A}{100 - T} \right\rceil$$

## Features

- **Daily Attendance Tracking**: One-tap logging for Present, Absent, On-Duty, and Holiday.
- **Calendar Matrix**: Month-by-month calendar view with unboxed status tallies and date-specific note annotation.
- **Batch Logging Tool**: Fast-fill date ranges with customizable status and automatic Sunday holiday exclusion.
- **Offline First**: All data stored locally via LocalStorage; zero telemetry, zero analytics, zero external network requests.
- **JSON Import / Export**: Standardized JSON structure for backups and sharing semester timetables with classmates.
- **Tactile Feedback**: Configurable audio click feedback (via Web Audio synthetic impulse) and device vibration.
- **Cross-Platform Mobile**: Native Android build powered by Capacitor 8 with hardware back gesture handling and custom adaptive launcher icons.

## Data Format

Attendance records use ISO 8601 date keys (`YYYY-MM-DD`):

```json
{
  "student": {
    "name": "Jane Doe",
    "enrollNo": "260001",
    "dept": "Mechatronics",
    "batch": "2026-2030",
    "yearSem": "I / I / A"
  },
  "records": {
    "2026-09-03": { "status": "PRESENT", "note": "" },
    "2026-09-04": { "status": "PRESENT", "note": "" },
    "2026-09-06": { "status": "HOLIDAY", "note": "Sunday" },
    "2026-09-09": { "status": "ABSENT", "note": "Sick Leave" },
    "2026-10-14": { "status": "DUTY_LEAVE", "note": "Symposium" }
  }
}
```

## Tech Stack

- **Framework**: React 18
- **Bundler**: Vite 6
- **Styling**: Tailwind CSS
- **Icons**: Lucide React
- **Mobile Bridge**: Capacitor 8 (Android & iOS)

## Development

### Prerequisites

- Node.js 18+
- JDK 21 (for Android builds)
- Android SDK (build-tools 35.0.0+)

### Setup

```bash
git clone git@github.com:xengoski/x75.git
cd x75
npm install
```

### Web Development

```bash
npm run dev        # Starts Vite dev server at http://localhost:5173
npm run build      # Generates static assets in dist/
npm run preview    # Local preview of production build
```

### Android Build

```bash
npm run cap:build  # Compiles web bundle and syncs to Android project
npm run build:apk  # Compiles debug APK via Gradle
```

Output APK will be generated at:
`android/app/build/outputs/apk/debug/app-debug.apk`
