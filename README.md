<div align="center">

  <img src="public/icon-512.png" width="96" height="96" alt="x75" style="border-radius: 22px;" />

  # x75

  **College attendance tracker and 75% margin calculator for Android and Web.**

  [![Android](https://img.shields.io/badge/Platform-Android%20%7C%20Web-007AFF?style=flat-square&logo=android&logoColor=white)](#)
  [![Release](https://img.shields.io/badge/Release-v1.0.0-10B981?style=flat-square)](#)
  [![Turso](https://img.shields.io/badge/Database-Turso%20libSQL-00FFE0?style=flat-square&logo=sqlite&logoColor=black)](#)
  [![Capacitor](https://img.shields.io/badge/Engine-Capacitor%208-11ECE5?style=flat-square&logo=capacitor&logoColor=white)](#)
  [![License](https://img.shields.io/badge/License-MIT-gray?style=flat-square)](#)

</div>

---

## Overview

Most college attendance portals are slow and clutter the screen with complex hourly timetables. **x75** simplifies attendance tracking to daily records: each day is either an instructional day (`PRESENT`, `ABSENT`, `DUTY_LEAVE`) or a non-instructional day (`HOLIDAY`).

It consists of two separate mobile apps:
1. **Student App**: Shows your current attendance percentage, how many days you can safely miss, or how many consecutive classes you need to attend to stay above 75%.
2. **Admin App**: Designed for class representatives to log daily attendance for the entire class in one tap, manage holidays, and export formatted attendance spreadsheets for faculty.

---

## Downloads

Official standalone Android `.apk` builds are available under [**Releases**](https://github.com/xengoski/x75/releases).

| Application | Package ID | Target Audience | Direct Download |
| :--- | :--- | :--- | :--- |
| **`x75 Student`** | `com.x75.app` | Students (75% Calculator, Calendar, Color Themes) | [**x75-v1.0.apk**](https://github.com/xengoski/x75/releases/download/v1.0.0/x75-v1.0.apk) |
| **`x75 Admin`** | `com.x75.admin` | Class Reps (1-Tap Batch Attendance, Cloud Sync, Excel Export) | [**x75-admin-v1.0.apk**](https://github.com/xengoski/x75/releases/download/v1.0.0/x75-admin-v1.0.apk) |

> **Side-by-Side Installation**: Both APKs use separate package IDs and can be installed simultaneously on the same Android device without conflicts.

---

## Calculations

Attendance is calculated relative to a minimum threshold $T$ (default $75\%$):

Let:
- $A$: Attended working instructional days ($\text{PRESENT} + \text{DUTY\_LEAVE}$)
- $C$: Total conducted instructional days ($\text{PRESENT} + \text{ABSENT} + \text{DUTY\_LEAVE}$)
- $T$: Target percentage threshold ($50 \le T \le 95$, default $75\%$)

Current attendance percentage:
$$P = \frac{A}{C} \times 100$$

### 1. Days Available to Miss (Surplus Margin)
When $P \ge T$, the maximum number of consecutive instructional days $L$ you can safely miss without dropping below $T$:

$$L = \left\lfloor \frac{100A - TC}{T} \right\rfloor$$

### 2. Classes Needed to Recover (Deficit Margin)
When $P < T$, the minimum number of consecutive instructional days $R$ you must attend without absence to reach $T$:

$$R = \left\lceil \frac{TC - 100A}{100 - T} \right\rceil$$

---

## Features

### Student App
- **Initial Setup**: Select your profile from the class list and verify your 6-digit roll number once. Roll numbers are not shown in general menus.
- **Attendance Status**: Clean display showing current percentage and days available to miss or days needed to recover.
- **Calendar Matrix**: Month-by-month attendance matrix with date notes. Sundays are automatically recognized as holidays.
- **Color Customization**: Built-in color picker with continuous hue slider and preset swatches (no manual hex input needed).

### Admin App
- **Password Auth**: Protected with password `pass6789`.
- **Fast Batch Marking**: Select any date, check off only the students who are absent or on duty leave (OD), and tap **"Mark Rest Present"** to log the whole batch.
- **Holiday Management**: Add and delete college holidays with one tap.
- **Spreadsheet Export**: Generates attendance spreadsheets formatted for department submissions (featuring the Mechatronics Department header, `DD.MM.YY` columns, official attendance codes `P`, `A`, `OD`, `H`, and summary totals). Also supports raw JSON export.
- **Automated Cloud Sync**: Connected to a Turso database (hosted libSQL on AWS Tokyo). Changes save locally immediately and automatically sync to the cloud when leaving or closing the app.

### Android Native Features
- **Portrait Lock**: App is locked to portrait orientation (`android:screenOrientation="portrait"`).
- **Full Viewport Scaling**: Uses dynamic viewport height (`100dvh`) and full-width mobile layout to eliminate black bars/letterboxing across any phone width (412px, 430px, etc.).
- **Pinned Bottom Navigation**: Floating dock navigation stays pinned to the bottom of the screen.
- **Launcher Icons**: Custom geometric app icons across all Android mipmap densities (`mdpi` through `xxxhdpi`).

---

## Database Schema

```sql
CREATE TABLE students (
  enroll_no TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  dept TEXT DEFAULT 'Mechatronics',
  batch TEXT DEFAULT '2026-2030',
  section TEXT DEFAULT 'A'
);

CREATE TABLE college_calendar (
  date TEXT PRIMARY KEY,
  is_holiday INTEGER DEFAULT 0,
  note TEXT DEFAULT ''
);

CREATE TABLE attendance_records (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  enroll_no TEXT NOT NULL,
  date TEXT NOT NULL,
  status TEXT NOT NULL CHECK(status IN ('PRESENT', 'ABSENT', 'DUTY_LEAVE')),
  note TEXT DEFAULT '',
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(enroll_no, date)
);
```

---

## Tech Stack

- **Frontend**: React 18
- **Bundler**: Vite 6
- **Styling**: Tailwind CSS
- **Icons**: Lucide React
- **Mobile Engine**: Capacitor 8 (Android)
- **Database**: Turso (libSQL Cloud)

---

## Development

### Setup

```bash
git clone git@github.com:xengoski/x75.git
cd x75
npm install
```

### Environment

Create a `.env` file using `.env.example`:

```bash
cp .env.example .env
```

```env
VITE_TURSO_DATABASE_URL=https://x75-attendance-xengoski.aws-ap-northeast-1.turso.io
VITE_TURSO_AUTH_TOKEN=your-turso-auth-token-here
```

### Running Locally

```bash
npm run dev
# Starts Vite dev server on http://localhost:5173
```

### Building APKs

```bash
# Student App
npm run cap:build
npm run build:apk

# Output APK:
# android/app/build/outputs/apk/debug/app-debug.apk
```

---

## License

MIT License. Designed for the Department of Mechatronics Engineering.
