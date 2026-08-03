# Current Architecture

This document maps out the file structures, routing mechanisms, styles, and assets in the pre-existing repository.

---

## 1. Project Directory Structure

```text
/home/pankaj-kumar/Workspace/smileaimarketing/
├── .next/                         # Next.js build compilation cache
├── app/                           # App Router routes and page layouts
│   ├── globals.css                # Global CSS containing Tailwind v4 theme variables
│   ├── icon.svg                   # Site icon SVG
│   ├── layout.tsx                 # Root layout injecting fonts and SEO metadata
│   ├── opengraph-image.tsx        # Dynamic OpenGraph image generator
│   ├── page.tsx                   # Main Landing Page rendering layout modules
│   ├── robots.ts                  # Search engine crawl configuration
│   └── sitemap.ts                 # XML Sitemap generator
├── components/                    # Core UI components
│   ├── Eyebrow.tsx                # Reusable badge/label indicator
│   ├── FAQ.tsx                    # Frequently Asked Questions accordion section
│   ├── FinalCTA.tsx               # Footer Call To Action panel
│   ├── Footer.tsx                 # Site footer with compliance and copyrights
│   ├── GalleryStrip.tsx           # Inline horizontal clinic display strip
│   ├── Header.tsx                 # Navigation bar and branding header
│   ├── Hero.tsx                   # Primary hero container with initial CTAs
│   ├── HowItWorks.tsx             # 3-step platform flow diagram
│   ├── icons.tsx                  # Local SVG icon components (Lucide styled)
│   ├── ProblemSection.tsx         # The 3 core dental marketing pitfalls
│   ├── ReportingDashboard.tsx     # Sample analytics visual mockup
│   └── ServicesGrid.tsx           # Grid list of service descriptions
├── public/                        # Static assets (images, logos, etc.)
├── scripts/                       # Local automation/data seeding tools
│   └── dataforseo-keyword-research.mjs
├── seo/                           # CSV reports representing historical search data
│   ├── competitor-scan.csv
│   ├── content-plan.csv
│   ├── keyword-research-top-picks.csv
│   └── keyword-research.csv
├── eslint.config.mjs              # ESLint flat config
├── next.config.ts                 # Next.js compiler settings
├── package.json                   # Project manifest (dependencies, scripts)
├── package-lock.json              # Version locked npm dependencies
├── postcss.config.mjs             # PostCSS plugin configurations
└── tsconfig.json                  # TypeScript compiler settings
```

---

## 2. Core Routing & Request Handling

- **Router Type:** Next.js App Router.
- **Active Routes:**
  - `/` (Home page) mapped directly to `app/page.tsx`.
  - `/robots.txt` (via `app/robots.ts`).
  - `/sitemap.xml` (via `app/sitemap.ts`).
  - `/icon.svg` (via `app/icon.svg`).
  - `/opengraph-image` (via `app/opengraph-image.tsx`).
- **Rendering Strategy:** Static rendering (`Static` prerendered content) for the current pages.

---

## 3. Typography & Style System

The system defines custom typography and color variables in `app/globals.css` and links them to tailwind tokens:

### Custom Fonts
- **Display Font:** `Fraunces` (fluid serif, loaded via Google Fonts under `--font-display`).
- **Body Font:** `Manrope` (sans-serif, loaded via Google Fonts under `--font-body`).
- **Label Font:** `IBM Plex Mono` (monospace, loaded via Google Fonts under `--font-label`).

### Tailwind v4 Color Palette
The colors match a dental/medical aesthetic (clean paper backgrounds, teal accents, ink text):
- `bg-paper` (`#f5faf9`): Page background.
- `bg-mist` (`#e8f3f1`): Soft teal container backgrounds.
- `text-ink` (`#082c3a`): Primary body text.
- `text-ink-2` (`#0f3b4d`): Sub-headers or secondary text.
- `bg-teal` / `text-teal` (`#0eaa9b`): Primary action buttons/links.
- `bg-teal-deep` / `text-teal-deep` (`#0a7a6d`): Hover states and primary brand highlights.
- `text-slate` (`#4f6b74`): Muted/caption text.
- `bg-coral` / `text-coral` (`#ff6b61`): Accents, warnings, or badges.
- `border-line` (`#dceae7`): Subtle dividers/borders.
