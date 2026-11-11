import type { ReactNode } from "react";

/** One icon family: 1.5px stroke, round caps, drawn here. No icon library, no glyph characters. */
function Icon({ size = 20, children }: { size?: number; children: ReactNode }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {children}
    </svg>
  );
}
type P = { size?: number };

export const IconSearch = ({ size }: P) => <Icon size={size}><circle cx="11" cy="11" r="6.500" /><path d="m20 20-4.200-4.200" /></Icon>;
export const IconUser = ({ size }: P) => <Icon size={size}><circle cx="12" cy="8.500" r="3.500" /><path d="M5 20c.8-3.600 3.700-5.500 7-5.500s6.200 1.900 7 5.500" /></Icon>;
export const IconClock = ({ size }: P) => <Icon size={size}><circle cx="12" cy="12" r="8.500" /><path d="M12 7.500V12l3 2" /></Icon>;
export const IconCheck = ({ size }: P) => <Icon size={size}><path d="m5 12.500 4.500 4.500L19 7.500" /></Icon>;
export const IconCopy = ({ size }: P) => <Icon size={size}><rect x="9" y="9" width="10.500" height="10.500" rx="2" /><path d="M15 9V6.500A1.500 1.500 0 0 0 13.500 5h-7A1.500 1.500 0 0 0 5 6.500v7A1.500 1.500 0 0 0 6.500 15H9" /></Icon>;
export const IconPrinter = ({ size }: P) => <Icon size={size}><path d="M7 9V4.500h10V9" /><rect x="4" y="9" width="16" height="8" rx="2" /><path d="M7 14h10v5.500H7z" /></Icon>;
export const IconMenu = ({ size }: P) => <Icon size={size}><path d="M4 7h16M4 12h16M4 17h16" /></Icon>;
export const IconClose = ({ size }: P) => <Icon size={size}><path d="m6 6 12 12M18 6 6 18" /></Icon>;
export const IconArrowRight = ({ size }: P) => <Icon size={size}><path d="M5 12h14M13 6l6 6-6 6" /></Icon>;
export const IconArrowLeft = ({ size }: P) => <Icon size={size}><path d="M19 12H5M11 6l-6 6 6 6" /></Icon>;
export const IconChevronDown = ({ size }: P) => <Icon size={size}><path d="m6 9 6 6 6-6" /></Icon>;
export const IconPhone = ({ size }: P) => <Icon size={size}><path d="M6.500 4h3l1.500 4-2 1.300a11 11 0 0 0 5.700 5.700L16 13l4 1.500v3a2 2 0 0 1-2.200 2A15.500 15.500 0 0 1 4.500 6.200 2 2 0 0 1 6.500 4Z" /></Icon>;
export const IconMail = ({ size }: P) => <Icon size={size}><rect x="3.500" y="5.500" width="17" height="13" rx="2" /><path d="m4 7.500 8 6 8-6" /></Icon>;
export const IconMapPin = ({ size }: P) => <Icon size={size}><path d="M12 21s6.500-5.700 6.500-11A6.500 6.500 0 0 0 5.500 10c0 5.300 6.500 11 6.500 11Z" /><circle cx="12" cy="10" r="2.300" /></Icon>;
export const IconBuilding = ({ size }: P) => <Icon size={size}><path d="M4 20V9l8-5 8 5v11" /><path d="M9 20v-6h6v6M3 20h18" /></Icon>;
export const IconDocument = ({ size }: P) => <Icon size={size}><path d="M7 3.500h7L19 8.500V19a1.500 1.500 0 0 1-1.500 1.500h-10A1.500 1.500 0 0 1 6 19V5a1.500 1.500 0 0 1 1-1.500Z" /><path d="M14 3.500V9h5M9 13h6M9 16.500h4" /></Icon>;
export const IconAlert = ({ size }: P) => <Icon size={size}><circle cx="12" cy="12" r="8.500" /><path d="M12 8v4.500M12 16h.01" /></Icon>;
export const IconInfo = ({ size }: P) => <Icon size={size}><circle cx="12" cy="12" r="8.500" /><path d="M12 11v5M12 8h.01" /></Icon>;
export const IconSeal = ({ size }: P) => <Icon size={size}><circle cx="12" cy="10" r="5.500" /><path d="m8.800 14.600-1.300 5.400 4.500-2.300 4.500 2.300-1.300-5.400" /><path d="m9.800 10 1.600 1.600L14.300 8.600" /></Icon>;
export const IconCalendar = ({ size }: P) => <Icon size={size}><rect x="4" y="5.500" width="16" height="14" rx="2" /><path d="M4 10h16M8.500 3.500v4M15.500 3.500v4" /></Icon>;
