# Reusable Components

This document outlines the reusable UI components in the pre-existing repository, their props, behaviors, and design features.

---

## 1. Visual/Structure Components

### `Eyebrow.tsx`
- **File Path:** `components/Eyebrow.tsx`
- **Description:** A styled badge component used for small tags, subtitles, or labels preceding headings.
- **Props:**
  - `children` (`React.ReactNode`): Text or markup to render inside the badge.
  - `tone` (`"light" | "dark"`, default: `"light"`): Selects the theme coloration.
- **Styles:**
  - Light tone: `bg-teal/10 text-teal-deep`
  - Dark tone: `bg-white/10 text-teal`
  - Typography: `font-label text-[12px] uppercase tracking-[0.14em] inline-block rounded-full px-3.5 py-1.5`

### `icons.tsx`
- **File Path:** `components/icons.tsx`
- **Description:** Pre-configured SVG icons wrapped as lightweight React components.
- **Default SVG settings:** `viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"`
- **Available Icons:**
  - `IconMapPin`: Clinic location Pin.
  - `IconMapPinOff`: Disabled/Strikethrough Pin.
  - `IconPhoneWave`: Telephone receiver icon.
  - `IconClock`: Clock timer indicator.
  - `IconTarget`: Target/Bullseye (marketing/relevance target).
  - `IconTrendingUp`: Line graph heading upward (analytics).
  - `IconCalendarCheck`: Appointment planner sheet.
  - `IconChat`: Message bubble.
  - `IconStorefront`: Physical shop/clinic outline.
  - `IconMonitor`: Computer desktop screen.
  - `IconUsers`: Customer/patients grouping silhouette.
  - `IconStar`: 5-star rating graphic outline.
  - `IconCheck`: Standard checkmark.
  - `IconSearch`: Magnifying glass search indicator.
- **Props:**
  - `className` (`string`, optional): Custom size, colors, or transitions override. Defaults to `h-6 w-6`.

---

## 2. Layout Section Modules

The following components represent block-level structural sections on the homepage:

### `Header.tsx`
- **File Path:** `components/Header.tsx`
- **Description:** Responsive navigation header with standard desktop links and a quick CTA anchor link. Contains navigation references to `#top`, `#how-it-works`, `#reporting`, `#faq`.

### `Hero.tsx`
- **File Path:** `components/Hero.tsx`
- **Description:** Introductory hero container. Displays a high-contrast heading ("More local patients. Fewer empty chairs.") and a horizontal interactive-styled 4-step sequence (Google Search → Clinic Found → Patient Enquiry → Appointment Booked). Use of Framer Motion (`motion/react`) enables entry animations.
- **Visuals:** Implements `motion.div` fades, custom background images, and shadow classes (`shadow-[0_30px_60px_-25px_rgba(8,44,58,0.35)]`).

### `ProblemSection.tsx`
- **File Path:** `components/ProblemSection.tsx`
- **Description:** Highlights three standard dental marketing challenges (Invisible on Maps, Leaky Websites, and Unresponsive Inboxes) with high-contrast text and custom list bullets.

### `HowItWorks.tsx`
- **File Path:** `components/HowItWorks.tsx`
- **Description:** A step-by-step description of the audit and growth process (1. Clinic Audit, 2. Campaign Setup, 3. Patient Bookings).

### `GalleryStrip.tsx`
- **File Path:** `components/GalleryStrip.tsx`
- **Description:** A visual row showcasing real clinic/dental images or dental office mockups using Tailwind absolute layouts.

### `ServicesGrid.tsx`
- **File Path:** `components/ServicesGrid.tsx`
- **Description:** Displays a descriptive cards grid of primary service features (Local SEO, Web Design, Lead Management, Reviews growth).

### `ReportingDashboard.tsx`
- **File Path:** `components/ReportingDashboard.tsx`
- **Description:** Integrates an animated 4-column metrics panel showing visual SVG sparklines for:
  - Local Visibility
  - Patient Enquiries
  - Booked Calls
  - Review Growth
  Uses `motion.path` and `pathLength` properties to animate the growth trends in viewport view.

### `FAQ.tsx`
- **File Path:** `components/FAQ.tsx`
- **Description:** A clean, semantic, JavaScript-free accordion using HTML `<details>` and `<summary>` tags with animated icons (`group-open:rotate-45`).

### `FinalCTA.tsx`
- **File Path:** `components/FinalCTA.tsx`
- **Description:** A large call-to-action banner at the bottom of the page encouraging users to schedule a consultation.

### `Footer.tsx`
- **File Path:** `components/Footer.tsx`
- **Description:** Layout footer showing copyright notices, simple links (Privacy, Terms), and dental category specifications.
