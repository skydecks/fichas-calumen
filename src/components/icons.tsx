import type { SVGProps } from "react";

type Props = SVGProps<SVGSVGElement>;

function Base({ children, ...props }: Props & { children: React.ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.7}
      strokeLinecap="round"
      strokeLinejoin="round"
      width={20}
      height={20}
      aria-hidden="true"
      {...props}
    >
      {children}
    </svg>
  );
}

export function IconHome(props: Props) {
  return (
    <Base {...props}>
      <path d="M3 10.5 12 3l9 7.5" />
      <path d="M5 9.8V20a1 1 0 0 0 1 1h4v-6h4v6h4a1 1 0 0 0 1-1V9.8" />
    </Base>
  );
}

export function IconFile(props: Props) {
  return (
    <Base {...props}>
      <path d="M6 2.8h7.2L19 8.6V21a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V3.8a1 1 0 0 1 1-1Z" />
      <path d="M13 3v6h6" />
      <path d="M8.5 12.5h7M8.5 16h7" />
    </Base>
  );
}

export function IconPlus(props: Props) {
  return (
    <Base {...props}>
      <path d="M12 5v14M5 12h14" />
    </Base>
  );
}

export function IconFolder(props: Props) {
  return (
    <Base {...props}>
      <path d="M3 7.5A1.5 1.5 0 0 1 4.5 6h4l2 2.4h9A1.5 1.5 0 0 1 21 9.9V18a1.5 1.5 0 0 1-1.5 1.5h-15A1.5 1.5 0 0 1 3 18V7.5Z" />
    </Base>
  );
}

export function IconUsers(props: Props) {
  return (
    <Base {...props}>
      <circle cx="9" cy="8" r="3.2" />
      <path d="M3.5 20c0-3.2 2.4-5.2 5.5-5.2s5.5 2 5.5 5.2" />
      <path d="M16 5.2a3 3 0 0 1 0 5.8M17.5 14.9c2 .6 3.3 2.3 3.3 4.4" />
    </Base>
  );
}

export function IconAgent(props: Props) {
  return (
    <Base {...props}>
      <circle cx="12" cy="8" r="3.2" />
      <path d="M5 20.5c0-3.6 3-6 7-6s7 2.4 7 6" />
      <path d="m9.2 14.6-.6 3.3 3.4 1.6 3.4-1.6-.6-3.3" />
    </Base>
  );
}

export function IconDownload(props: Props) {
  return (
    <Base {...props}>
      <path d="M12 3v12m0 0 4-4m-4 4-4-4" />
      <path d="M4 17v2.5A1.5 1.5 0 0 0 5.5 21h13a1.5 1.5 0 0 0 1.5-1.5V17" />
    </Base>
  );
}

export function IconEye(props: Props) {
  return (
    <Base {...props}>
      <path d="M2.5 12S6 5.8 12 5.8 21.5 12 21.5 12 18 18.2 12 18.2 2.5 12 2.5 12Z" />
      <circle cx="12" cy="12" r="2.8" />
    </Base>
  );
}

export function IconEyeOff(props: Props) {
  return (
    <Base {...props}>
      <path d="M3 3l18 18" />
      <path d="M10.6 6.1A9.9 9.9 0 0 1 12 6c6 0 9.5 6 9.5 6a16 16 0 0 1-2.4 3.2M6.3 6.8C3.8 8.6 2.5 12 2.5 12s3.5 6 9.5 6a10 10 0 0 0 3.5-.6" />
      <path d="M9.8 9.9a3 3 0 0 0 4.3 4.2" />
    </Base>
  );
}

export function IconTrash(props: Props) {
  return (
    <Base {...props}>
      <path d="M4 7h16M9 7V4.8A.8.8 0 0 1 9.8 4h4.4a.8.8 0 0 1 .8.8V7" />
      <path d="M6.5 7 7 20a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1l.5-13" />
      <path d="M10 11v6M14 11v6" />
    </Base>
  );
}

export function IconCopy(props: Props) {
  return (
    <Base {...props}>
      <rect x="9" y="9" width="11" height="12" rx="1.5" />
      <path d="M15 5.5V4.5A1.5 1.5 0 0 0 13.5 3h-9A1.5 1.5 0 0 0 3 4.5v11A1.5 1.5 0 0 0 4.5 17h1" />
    </Base>
  );
}

export function IconSave(props: Props) {
  return (
    <Base {...props}>
      <path d="M5 3h11.5L21 7.5V20a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h1Z" />
      <path d="M7 3v6h9V3.5M7 21v-7h10v7" />
    </Base>
  );
}

export function IconSearch(props: Props) {
  return (
    <Base {...props}>
      <circle cx="11" cy="11" r="7" />
      <path d="m16.5 16.5 4 4" />
    </Base>
  );
}

export function IconChevronLeft(props: Props) {
  return (
    <Base {...props}>
      <path d="m14 6-6 6 6 6" />
    </Base>
  );
}

export function IconChevronRight(props: Props) {
  return (
    <Base {...props}>
      <path d="m10 6 6 6-6 6" />
    </Base>
  );
}

export function IconChevronUp(props: Props) {
  return (
    <Base {...props}>
      <path d="m6 14 6-6 6 6" />
    </Base>
  );
}

export function IconChevronDown(props: Props) {
  return (
    <Base {...props}>
      <path d="m6 10 6 6 6-6" />
    </Base>
  );
}

export function IconArrowLeft(props: Props) {
  return (
    <Base {...props}>
      <path d="M20 12H4m0 0 6-6m-6 6 6 6" />
    </Base>
  );
}

export function IconCheck(props: Props) {
  return (
    <Base {...props}>
      <path d="m4.5 12.5 5 5L20 6.5" />
    </Base>
  );
}

export function IconAlert(props: Props) {
  return (
    <Base {...props}>
      <path d="M12 3.5 2.8 20h18.4L12 3.5Z" />
      <path d="M12 9v4.5M12 17v.2" />
    </Base>
  );
}

export function IconSparkles(props: Props) {
  return (
    <Base {...props}>
      <path d="M12 3.5 13.6 9l5.4 1.6-5.4 1.7L12 17.8l-1.6-5.5L5 10.6 10.4 9 12 3.5Z" />
      <path d="M18.5 15.5l.7 2.3 2.3.7-2.3.8-.7 2.2-.8-2.2-2.2-.8 2.2-.7.8-2.3Z" />
    </Base>
  );
}

export function IconX(props: Props) {
  return (
    <Base {...props}>
      <path d="M6 6l12 12M18 6 6 18" />
    </Base>
  );
}

export function IconBuilding(props: Props) {
  return (
    <Base {...props}>
      <path d="M4 21V5.5A1.5 1.5 0 0 1 5.5 4h7A1.5 1.5 0 0 1 14 5.5V21" />
      <path d="M14 10h4.5A1.5 1.5 0 0 1 20 11.5V21M2.5 21h19" />
      <path d="M7 8h4M7 12h4M7 16h4M17 14h.1M17 18h.1" />
    </Base>
  );
}

export function IconGlobe(props: Props) {
  return (
    <Base {...props}>
      <circle cx="12" cy="12" r="9" />
      <path d="M3.5 9h17M3.5 15h17M12 3c2.5 2.4 3.8 5.5 3.8 9S14.5 18.6 12 21c-2.5-2.4-3.8-5.5-3.8-9S9.5 5.4 12 3Z" />
    </Base>
  );
}

export function IconSend(props: Props) {
  return (
    <Base {...props}>
      <path d="m21 3-7.5 18-3.2-7.3L3 10.5 21 3Z" />
      <path d="M21 3 10.3 13.7" />
    </Base>
  );
}

export function IconImage(props: Props) {
  return (
    <Base {...props}>
      <rect x="3" y="4.5" width="18" height="15" rx="2" />
      <circle cx="8.5" cy="9.5" r="1.6" />
      <path d="m4 17 5-4.5 4 3.5 3-2.5 4 3.5" />
    </Base>
  );
}

export function IconStop(props: Props) {
  return (
    <Base {...props}>
      <rect x="6" y="6" width="12" height="12" rx="2" />
    </Base>
  );
}

export function IconFilePdf(props: Props) {
  return (
    <Base {...props}>
      <path d="M14 2h6a2 2 0 0 1 2 2v4a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2Z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="12" y1="18" x2="12" y2="12" />
      <line x1="12" y1="18" x2="9" y2="15" />
      <line x1="12" y1="18" x2="15" y2="15" />
    </Base>
  );
}

export function IconUpload(props: Props) {
  return (
    <Base {...props}>
      <path d="M12 16V4" />
      <path d="m7 9 5-5 5 5" />
      <path d="M4 16v3a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-3" />
    </Base>
  );
}

export function IconSettings(props: Props) {
  return (
    <Base {...props}>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.7 1.7 0 0 0 .34 1.88l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.7 1.7 0 0 0-1.88-.34 1.7 1.7 0 0 0-1 1.55V21a2 2 0 1 1-4 0v-.09a1.7 1.7 0 0 0-1.11-1.55 1.7 1.7 0 0 0-1.88.34l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.7 1.7 0 0 0 4.6 15a1.7 1.7 0 0 0-1.55-1H3a2 2 0 1 1 0-4h.09A1.7 1.7 0 0 0 4.6 8.9a1.7 1.7 0 0 0-.34-1.88l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.7 1.7 0 0 0 9 4.6a1.7 1.7 0 0 0 1-1.55V3a2 2 0 1 1 4 0v.09a1.7 1.7 0 0 0 1 1.55 1.7 1.7 0 0 0 1.88-.34l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.7 1.7 0 0 0 19.4 9c.1.24.35.4.6.4H21a2 2 0 1 1 0 4h-.09c-.25 0-.5.16-.6.4Z" />
    </Base>
  );
}

export function IconRefresh(props: Props) {
  return (
    <Base {...props}>
      <path d="M20 11a8.1 8.1 0 0 0-14.9-4.3L3 9" />
      <path d="M3 4v5h5" />
      <path d="M4 13a8.1 8.1 0 0 0 14.9 4.3L21 15" />
      <path d="M21 20v-5h-5" />
    </Base>
  );
}

export function IconLogout(props: Props) {
  return (
    <Base {...props}>
      <path d="M10 17l5-5-5-5" />
      <path d="M15 12H3" />
      <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
    </Base>
  );
}

export function IconPackage(props: Props) {
  return (
    <Base {...props}>
      <path d="m12 3 8 4.5v9L12 21l-8-4.5v-9L12 3Z" />
      <path d="m4 7.5 8 4.5 8-4.5" />
      <path d="M12 12v9" />
      <path d="m8 5.2 8 4.6" />
    </Base>
  );
}
