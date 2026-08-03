type IconProps = { className?: string };

const base = "h-6 w-6";

function Svg({ className, children }: IconProps & { children: React.ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className ?? base}
      aria-hidden
    >
      {children}
    </svg>
  );
}

export function IconMapPin({ className }: IconProps) {
  return (
    <Svg className={className}>
      <path d="M12 21s7-6.6 7-11.7A7 7 0 0 0 5 9.3C5 14.4 12 21 12 21z" />
      <circle cx="12" cy="9.3" r="2.4" />
    </Svg>
  );
}

export function IconMapPinOff({ className }: IconProps) {
  return (
    <Svg className={className}>
      <path d="M9.5 6.2A9.7 9.7 0 0 1 12 6c5 0 8.5 4 9.7 6-.5.85-1.4 2.1-2.7 3.3M6.6 7.7C4.9 9 3.7 10.6 2.3 12c1.9 3.2 5.6 6 9.7 6 1.3 0 2.5-.27 3.7-.75" />
      <path d="M9.9 10a2.8 2.8 0 0 0 3.9 3.9" />
      <path d="M3 3l18 18" />
    </Svg>
  );
}

export function IconPhoneWave({ className }: IconProps) {
  return (
    <Svg className={className}>
      <path d="M5 4.5h3l1.5 4L7.5 10a10 10 0 0 0 6.5 6.5l1.5-2 4 1.5v3a1.5 1.5 0 0 1-1.6 1.5A16 16 0 0 1 3.5 6.1 1.5 1.5 0 0 1 5 4.5z" />
    </Svg>
  );
}

export function IconClock({ className }: IconProps) {
  return (
    <Svg className={className}>
      <circle cx="12" cy="12" r="8" />
      <path d="M12 8v4l2.8 2.8" />
    </Svg>
  );
}

export function IconTarget({ className }: IconProps) {
  return (
    <Svg className={className}>
      <circle cx="12" cy="12" r="8" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="12" cy="12" r="0.6" fill="currentColor" />
    </Svg>
  );
}

export function IconTrendingUp({ className }: IconProps) {
  return (
    <Svg className={className}>
      <path d="M4 16l5.2-5.2 3.6 3.6L20 7" />
      <path d="M14.5 7H20v5.5" />
    </Svg>
  );
}

export function IconCalendarCheck({ className }: IconProps) {
  return (
    <Svg className={className}>
      <rect x="4" y="5.5" width="16" height="14.5" rx="2" />
      <path d="M4 10h16M8 3.5v3.5M16 3.5v3.5" />
      <path d="M9 14.5l2 2 4-4" />
    </Svg>
  );
}

export function IconChat({ className }: IconProps) {
  return (
    <Svg className={className}>
      <path d="M4 5.5A1.5 1.5 0 0 1 5.5 4h13A1.5 1.5 0 0 1 20 5.5v10a1.5 1.5 0 0 1-1.5 1.5H9l-4 3v-3H5.5A1.5 1.5 0 0 1 4 15.5v-10z" />
    </Svg>
  );
}

export function IconStorefront({ className }: IconProps) {
  return (
    <Svg className={className}>
      <path d="M4 9.5l1-5h14l1 5" />
      <path d="M4 9.5a2.5 2.5 0 0 0 5 0 2.5 2.5 0 0 0 5 0 2.5 2.5 0 0 0 5 0" />
      <path d="M5 9.5V20h14V9.5" />
      <path d="M10 20v-5.5a2 2 0 0 1 4 0V20" />
    </Svg>
  );
}

export function IconMonitor({ className }: IconProps) {
  return (
    <Svg className={className}>
      <rect x="3.5" y="5" width="17" height="11" rx="1.5" />
      <path d="M8.5 20h7M12 16v4" />
    </Svg>
  );
}

export function IconUsers({ className }: IconProps) {
  return (
    <Svg className={className}>
      <circle cx="9" cy="9" r="3" />
      <path d="M3.5 19c0-3 2.5-5 5.5-5s5.5 2 5.5 5" />
      <path d="M16 8.2a2.7 2.7 0 1 1 0 5.4" />
      <path d="M15 14.3c2.4.4 4.5 2.1 4.5 4.7" />
    </Svg>
  );
}

export function IconStar({ className }: IconProps) {
  return (
    <Svg className={className}>
      <path d="M12 3.5l2.6 5.5 6 .8-4.4 4.2 1.1 6-5.3-2.9-5.3 2.9 1.1-6-4.4-4.2 6-.8z" />
    </Svg>
  );
}

export function IconCheck({ className }: IconProps) {
  return (
    <Svg className={className}>
      <path d="M5 12.5l4.5 4.5L19 7" />
    </Svg>
  );
}

export function IconSearch({ className }: IconProps) {
  return (
    <Svg className={className}>
      <circle cx="11" cy="11" r="6.5" />
      <path d="M20 20l-4.3-4.3" />
    </Svg>
  );
}
