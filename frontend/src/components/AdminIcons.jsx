function IconBase({ size = 18, className = "", children, ...rest }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      className={className}
      {...rest}
    >
      {children}
    </svg>
  );
}

export function IconCalendar(props) {
  return (
    <IconBase {...props}>
      <rect x="3" y="5" width="18" height="16" rx="3" />
      <path d="M16 3v4M8 3v4M3 10h18" />
    </IconBase>
  );
}

export function IconCalendarDays(props) {
  return (
    <IconBase {...props}>
      <rect x="3" y="5" width="18" height="16" rx="3" />
      <path d="M16 3v4M8 3v4M3 10h18M8 14h.01M12 14h.01M16 14h.01M8 18h.01M12 18h.01" />
    </IconBase>
  );
}

export function IconUsers(props) {
  return (
    <IconBase {...props}>
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
    </IconBase>
  );
}

export function IconUser(props) {
  return (
    <IconBase {...props}>
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </IconBase>
  );
}

export function IconCheck(props) {
  return (
    <IconBase {...props}>
      <path d="m20 6-11 11-5-5" />
    </IconBase>
  );
}

export function IconCheckCircle(props) {
  return (
    <IconBase {...props}>
      <circle cx="12" cy="12" r="9" />
      <path d="m8.5 12 2.5 2.5 4.5-5" />
    </IconBase>
  );
}

export function IconX(props) {
  return (
    <IconBase {...props}>
      <path d="M18 6 6 18M6 6l12 12" />
    </IconBase>
  );
}

export function IconXCircle(props) {
  return (
    <IconBase {...props}>
      <circle cx="12" cy="12" r="9" />
      <path d="m15 9-6 6M9 9l6 6" />
    </IconBase>
  );
}

export function IconClock(props) {
  return (
    <IconBase {...props}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </IconBase>
  );
}

export function IconSearch(props) {
  return (
    <IconBase {...props}>
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </IconBase>
  );
}

export function IconPlus(props) {
  return (
    <IconBase {...props}>
      <path d="M12 5v14M5 12h14" />
    </IconBase>
  );
}

export function IconRefresh(props) {
  return (
    <IconBase {...props}>
      <path d="M21 12a9 9 0 1 1-2.64-6.36" />
      <path d="M21 3v6h-6" />
    </IconBase>
  );
}

export function IconChevronDown(props) {
  return (
    <IconBase {...props}>
      <path d="m6 9 6 6 6-6" />
    </IconBase>
  );
}

export function IconChevronRight(props) {
  return (
    <IconBase {...props}>
      <path d="m9 6 6 6-6 6" />
    </IconBase>
  );
}

export function IconFilter(props) {
  return (
    <IconBase {...props}>
      <path d="M4 5h16l-6.5 7.5V19l-3 2v-8.5L4 5Z" />
    </IconBase>
  );
}

export function IconEye(props) {
  return (
    <IconBase {...props}>
      <path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z" />
      <circle cx="12" cy="12" r="3" />
    </IconBase>
  );
}

export function IconSend(props) {
  return (
    <IconBase {...props}>
      <path d="m22 2-7 20-4-9-9-4 20-7Z" />
      <path d="M22 2 11 13" />
    </IconBase>
  );
}

export function IconUndo(props) {
  return (
    <IconBase {...props}>
      <path d="M9 14 4 9l5-5" />
      <path d="M4 9h10a6 6 0 0 1 0 12h-3" />
    </IconBase>
  );
}

export function IconBookOpen(props) {
  return (
    <IconBase {...props}>
      <path d="M12 6.5C10.5 5 8.4 4.4 4 4.5v14c4.4-.1 6.5.5 8 2 1.5-1.5 3.6-2.1 8-2v-14c-4.4-.1-6.5.5-8 2Z" />
      <path d="M12 6.5v14" />
    </IconBase>
  );
}

export function IconClipboard(props) {
  return (
    <IconBase {...props}>
      <rect x="5" y="4" width="14" height="17" rx="3" />
      <path d="M9 4.5V3.5A1.5 1.5 0 0 1 10.5 2h3A1.5 1.5 0 0 1 15 3.5v1M9 10h6M9 14h6M9 18h3" />
    </IconBase>
  );
}

export function IconTrendingUp(props) {
  return (
    <IconBase {...props}>
      <path d="m3 17 6-6 4 4 7-8" />
      <path d="M14 7h6v6" />
    </IconBase>
  );
}

export function IconAlertTriangle(props) {
  return (
    <IconBase {...props}>
      <path d="M12 3.5 22 20H2L12 3.5Z" />
      <path d="M12 9v5M12 17.5h.01" />
    </IconBase>
  );
}

export function IconInfo(props) {
  return (
    <IconBase {...props}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 11v6M12 7.5h.01" />
    </IconBase>
  );
}

export function IconSparkles(props) {
  return (
    <IconBase {...props}>
      <path d="M12 3.5 13.6 8 18 9.5 13.6 11 12 15.5 10.4 11 6 9.5 10.4 8 12 3.5Z" />
      <path d="M19 15.5 19.8 18l2.2.8-2.2.7L19 22l-.8-2.5-2.2-.7 2.2-.8.8-2.5Z" />
    </IconBase>
  );
}

export function IconGraduationCap(props) {
  return (
    <IconBase {...props}>
      <path d="m2 9 10-5 10 5-10 5L2 9Z" />
      <path d="M6 11.5V16c0 1.7 2.7 3 6 3s6-1.3 6-3v-4.5M22 9v6" />
    </IconBase>
  );
}

export function IconLayers(props) {
  return (
    <IconBase {...props}>
      <path d="m12 3 9 5-9 5-9-5 9-5Z" />
      <path d="m3 12 9 5 9-5M3 16l9 5 9-5" />
    </IconBase>
  );
}

export function IconArrowRight(props) {
  return (
    <IconBase {...props}>
      <path d="M4 12h16M14 6l6 6-6 6" />
    </IconBase>
  );
}

export function IconMoreHorizontal(props) {
  return (
    <IconBase {...props}>
      <circle cx="5" cy="12" r="1" />
      <circle cx="12" cy="12" r="1" />
      <circle cx="19" cy="12" r="1" />
    </IconBase>
  );
}

export function IconSpinner(props) {
  return (
    <IconBase {...props}>
      <path d="M21 12a9 9 0 1 1-6.2-8.56" />
    </IconBase>
  );
}
