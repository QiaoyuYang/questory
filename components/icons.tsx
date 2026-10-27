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

export function PhotoIcon(props: Props) {
  return (
    <Icon {...props}>
      <rect x="3.5" y="5" width="17" height="14" rx="2" />
      <circle cx="9" cy="10" r="1.6" />
      <path d="M20.5 16l-5-5-8 8" />
    </Icon>
  );
}

export function BookIcon(props: Props) {
  return (
    <Icon {...props}>
      <path d="M12 6.5C10 5 7 4.5 4 5v13c3-.5 6 0 8 1.5 2-1.5 5-2 8-1.5V5c-3-.5-6 0-8 1.5z" />
      <path d="M12 6.5v13" />
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
