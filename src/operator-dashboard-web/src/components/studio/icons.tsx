// Line icons for the Studio ribbon (24×24, stroke = currentColor).
import type { ReactNode } from 'react'

const paths: Record<string, ReactNode> = {
  file: (
    <>
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
    </>
  ),
  newFile: (
    <>
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <path d="M12 12v6M9 15h6" />
    </>
  ),
  folder: <path d="M3 6a2 2 0 0 1 2-2h4l2 3h8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />,
  save: (
    <>
      <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
      <path d="M17 21v-8H7v8M7 3v5h8" />
    </>
  ),
  import: (
    <>
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <path d="M12 11v7M9 15l3 3 3-3" />
    </>
  ),
  export: (
    <>
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <path d="M12 18v-7M9 14l3-3 3 3" />
    </>
  ),
  cloud: <path d="M7 18a5 5 0 0 1-.5-10A7 7 0 0 1 19 8.5a4.5 4.5 0 0 1-1 9.5z" />,
  sync: (
    <>
      <path d="M21 12a9 9 0 0 1-15.5 6.2M3 12A9 9 0 0 1 18.5 5.8" />
      <path d="M18 2v4h-4M6 22v-4h4" />
    </>
  ),
  star: <polygon points="12 2 15 9 22 9.3 16.5 14 18.5 21 12 17 5.5 21 7.5 14 2 9.3 9 9" />,
  plusRoute: (
    <>
      <circle cx="6" cy="18" r="2.5" />
      <circle cx="18" cy="6" r="2.5" />
      <path d="M8 16l8-8" />
      <path d="M18 14v6M15 17h6" />
    </>
  ),
  pin: (
    <>
      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
      <circle cx="12" cy="10" r="3" />
    </>
  ),
  trash: (
    <>
      <path d="M3 6h18M8 6V4h8v2M6 6l1 15h10l1-15" />
    </>
  ),
  bus: (
    <>
      <rect x="4" y="3" width="16" height="15" rx="2" />
      <path d="M4 11h16M8 21v-3M16 21v-3" />
      <circle cx="8" cy="14.5" r="1" />
      <circle cx="16" cy="14.5" r="1" />
    </>
  ),
  check: (
    <>
      <path d="M22 11.1V12a10 10 0 1 1-5.9-9.1" />
      <polyline points="22 4 12 14 9 11" />
    </>
  ),
  calendar: (
    <>
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <path d="M16 2v4M8 2v4M3 10h18" />
    </>
  ),
  rain: (
    <>
      <path d="M20 16.6A5 5 0 0 0 18 7h-1.3A8 8 0 1 0 4 15.3" />
      <path d="M8 19l-2 3M12 19l-2 3M16 19l-2 3" />
    </>
  ),
  user: (
    <>
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </>
  ),
  users: (
    <>
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.9M16 3.1a4 4 0 0 1 0 7.8" />
    </>
  ),
  sliders: <path d="M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3M1 14h6M9 8h6M17 16h6" />,
  clock: (
    <>
      <circle cx="12" cy="12" r="9" />
      <polyline points="12 7 12 12 15 14" />
    </>
  ),
  gauge: (
    <>
      <path d="M3 18a9 9 0 1 1 18 0" />
      <path d="M12 18l4-6" />
    </>
  ),
  barChart: <path d="M3 21h18M6 17V9M11 17V4M16 17v-6M21 17v-9" />,
  table: (
    <>
      <rect x="3" y="4" width="18" height="16" rx="1" />
      <path d="M3 10h18M3 15h18M9 4v16" />
    </>
  ),
  map: (
    <>
      <polygon points="1 6 8 3 16 6 23 3 23 18 16 21 8 18 1 21" />
      <path d="M8 3v15M16 6v15" />
    </>
  ),
  coin: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M15 9.5c-.5-1-1.6-1.5-3-1.5-1.7 0-3 .9-3 2.2 0 3 6 1.6 6 4.6 0 1.3-1.3 2.2-3 2.2-1.4 0-2.6-.6-3-1.6M12 6v2M12 16v2" />
    </>
  ),
  fuel: (
    <>
      <path d="M4 21V5a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v16M3 21h12M4 10h10" />
      <path d="M14 8l4 3v7a1.5 1.5 0 0 0 3 0V9l-3-3" />
    </>
  ),
  wrench: <path d="M14.7 6.3a4 4 0 0 0-5.4 5.4L3 18l3 3 6.3-6.3a4 4 0 0 0 5.4-5.4l-2.5 2.5-2.4-.6-.6-2.4z" />,
  bolt: <polygon points="13 2 4 14 12 14 11 22 20 10 12 10" />,
  play: <polygon points="6 4 20 12 6 20" fill="currentColor" />,
  log: (
    <>
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <path d="M16 13H8M16 17H8" />
    </>
  ),
  reset: (
    <>
      <path d="M3 12a9 9 0 1 0 3-6.7L3 8" />
      <path d="M3 3v5h5" />
    </>
  ),
  compare: (
    <>
      <rect x="3" y="4" width="7" height="16" rx="1" />
      <rect x="14" y="4" width="7" height="16" rx="1" />
      <path d="M6.5 9v6M17.5 12v3" />
    </>
  ),
  gantt: (
    <>
      <path d="M3 3v18h18" />
      <path d="M7 7h6M10 11h8M7 15h5M13 15h5" strokeWidth="2.6" />
    </>
  ),
  timetable: (
    <>
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <path d="M3 8h18M8 8v13M3 13h18M3 17h18" />
    </>
  ),
  spaceTime: (
    <>
      <path d="M3 3v18h18" />
      <path d="M6 18L11 6M10 18l5-12M14 18l3-7 2-5" />
    </>
  ),
  bunching: (
    <>
      <path d="M2 12h20" />
      <rect x="4" y="9" width="5" height="6" rx="1" />
      <rect x="10" y="9" width="5" height="6" rx="1" />
    </>
  ),
  loadProfile: (
    <>
      <path d="M3 21h18" />
      <path d="M3 18c3 0 4-10 9-10s6 8 9 8" />
    </>
  ),
  hourglass: <path d="M6 2h12M6 22h12M7 2c0 6 10 6 10 10S7 16 7 22M17 2c0 6-10 6-10 10s10 4 10 10" />,
  shield: (
    <>
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      <polyline points="9 12 11 14 15 10" />
    </>
  ),
  excel: (
    <>
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <path d="M8 8l8 8M16 8l-8 8" />
    </>
  ),
  pdf: (
    <>
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <path d="M8 14h1.5a1.5 1.5 0 0 0 0-3H8v6M14 11v6M14 11h2M14 14h1.5" />
    </>
  ),
  book: (
    <>
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20V2H6.5A2.5 2.5 0 0 0 4 4.5z" />
      <path d="M4 19.5A2.5 2.5 0 0 0 6.5 22H20v-5" />
    </>
  ),
  bulb: (
    <>
      <path d="M9 18h6M10 22h4" />
      <path d="M12 2a7 7 0 0 0-4 12.7V16h8v-1.3A7 7 0 0 0 12 2z" />
    </>
  ),
  video: (
    <>
      <rect x="2" y="5" width="14" height="14" rx="2" />
      <polygon points="22 7 16 12 22 17" />
    </>
  ),
  flag: (
    <>
      <path d="M4 22V4" />
      <path d="M4 4h13l-2 4 2 4H4" />
    </>
  ),
  list: <path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" />,
  diagram: (
    <>
      <circle cx="5" cy="12" r="2" />
      <circle cx="12" cy="12" r="2" />
      <circle cx="19" cy="12" r="2" />
      <path d="M7 12h3M14 12h3" />
    </>
  ),
  money: (
    <>
      <rect x="2" y="6" width="20" height="12" rx="2" />
      <circle cx="12" cy="12" r="2.5" />
    </>
  ),
  gear: (
    <>
      <circle cx="12" cy="12" r="3" />
      <path d="M12 2v3M12 19v3M4.2 4.2l2.1 2.1M17.7 17.7l2.1 2.1M2 12h3M19 12h3M4.2 19.8l2.1-2.1M17.7 6.3l2.1-2.1" />
    </>
  ),
}

export type IconName = keyof typeof paths

// Office-like accent per icon; icons not listed (e.g. play) keep the surrounding text color.
const BLUE = '#2b7cd3'
const GREEN = '#107c41'
const ORANGE = '#d83b01'
const RED = '#c43e1c'
const PURPLE = '#7719aa'
const TEAL = '#038387'
const GOLD = '#c19c00'
const GRAY = '#605e5c'

const colors: Record<string, string> = {
  file: BLUE,
  newFile: BLUE,
  folder: GOLD,
  save: PURPLE,
  import: GREEN,
  export: BLUE,
  cloud: '#0078d4',
  sync: TEAL,
  star: GOLD,
  plusRoute: GREEN,
  pin: ORANGE,
  trash: RED,
  bus: '#0078d4',
  check: GREEN,
  calendar: BLUE,
  rain: TEAL,
  user: PURPLE,
  users: PURPLE,
  sliders: BLUE,
  clock: PURPLE,
  gauge: ORANGE,
  barChart: GREEN,
  table: BLUE,
  map: GREEN,
  coin: GOLD,
  fuel: ORANGE,
  wrench: GRAY,
  bolt: GOLD,
  log: GRAY,
  reset: ORANGE,
  compare: PURPLE,
  gantt: BLUE,
  timetable: GREEN,
  spaceTime: TEAL,
  bunching: RED,
  loadProfile: BLUE,
  hourglass: GOLD,
  shield: GREEN,
  excel: GREEN,
  pdf: RED,
  book: BLUE,
  bulb: GOLD,
  video: RED,
  flag: ORANGE,
  diagram: TEAL,
  money: GREEN,
  gear: GRAY,
}

export function Icon({ name, size = 28, color }: { name: IconName | string; size?: number; color?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      style={{ color: color ?? colors[name] }}
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {paths[name] ?? paths.file}
    </svg>
  )
}
