# 📱 x75 // Minimalist College Attendance Protocol

A mobile-first, high-precision college attendance tracker built with modern tonal minimalism, fluid spring physics, and zero bloat.

---

## ⚡ Core Architecture

### 1. 🎯 1 Day = 1 Attendance Tracking
- **Present**: Attended college.
- **Absent**: Leave / bunked instruction day.
- **Holiday**: Official holiday / college break (zero penalty to attendance percentage).
- **On-Duty (OD)**: College-verified duty / medical leave (counted as attended).

### 2. 🛡️ The 75% Defense Margin
- **Safe Leave Days**: Calculates the exact number of days you can miss without dropping below your target:
  $$\text{Safe Leaves} = \left\lfloor \frac{\text{Attended Days} \times 100 - \text{Target} \times \text{Conducted Days}}{\text{Target}} \right\rfloor$$
- **Consecutive Recovery Days**: If below target, calculates the exact consecutive days you must attend to recover:
  $$\text{Days Needed} = \left\lceil \frac{\text{Target} \times \text{Conducted Days} - \text{Attended Days} \times 100}{100 - \text{Target}} \right\rceil$$

### 3. 📅 Interactive Calendar & Floating Action Capsule
- Fluid month navigation with left/right spring slide animations.
- Unboxed monthly status count tally (Present, Absent, Holiday, On Duty).
- Tap any date to open the **Floating Action Capsule** for instant 4-way logging, inline holiday labeling, or clearing records.

### 4. 🎛️ Settings & Haptics
- 3-pilled feedback switch: **Sound** (Web Audio haptic clicks), **Vibrate** (device vibration), or **Off** (silent).
- Target Threshold slider (50%–95%, 75% standard default).
- System Accent Swatches + custom hex picker.
- Light Mode and Deep Tonal Dark Mode with smooth morph transitions.
- Full offline JSON backup export and import.

---

## 🚀 Running the App

```bash
npm run dev     # Start dev server on http://localhost:5173
npm run build   # Production build
```
