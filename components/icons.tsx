import type { ReactNode } from "react";

type Props = { className?: string };

function Icon({ className = "", strokeWidth = 2, children }: Props & { strokeWidth?: number; children: ReactNode }) {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
    >
      {children}
    </svg>
  );
}

export function CameraIcon(props: Props) {
  return (
    <Icon {...props}>
      <path d="M4 8.5A1.5 1.5 0 0 1 5.5 7h2.2l1.5-2h5.6l1.5 2h2.2A1.5 1.5 0 0 1 20 8.5v9a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 17.5z" />
      <circle cx="12" cy="13" r="3.5" />
    </Icon>
  );
}

export function MagnifierIcon(props: Props) {
  return (
    <Icon {...props}>
      <circle cx="10.5" cy="10.5" r="6" />
      <path d="M15 15l5 5" />
    </Icon>
  );
}

export function LockIcon(props: Props) {
  return (
    <Icon {...props}>
      <rect x="5" y="11" width="14" height="9" rx="1.5" />
      <path d="M8 11V8a4 4 0 0 1 8 0v3" />
    </Icon>
  );
}

export function ChevronLeftIcon(props: Props) {
  return (
    <Icon {...props} strokeWidth={2.5}>
      <path d="M15 5l-7 7 7 7" />
    </Icon>
  );
}

export function ChevronRightIcon(props: Props) {
  return (
    <Icon {...props} strokeWidth={2.5}>
      <path d="M9 5l7 7-7 7" />
    </Icon>
  );
}
