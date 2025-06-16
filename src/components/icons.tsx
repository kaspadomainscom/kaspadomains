// src/components/icons.tsx
import React from 'react';

/* Navigation & UI Icons */

export function IconFolder(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-label="Folder"
    >
      <path d="M3 7h5l3 3h9a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2z" />
    </svg>
  );
}

export function IconChevronRight(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-label="Chevron Right"
    >
      <polyline points="9 18 15 12 9 6" />
    </svg>
  );
}

export function IconChevronLeft(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-label="Chevron Left"
    >
      <polyline points="15 18 9 12 15 6" />
    </svg>
  );
}

export function IconChevronUp(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-label="Chevron Up"
    >
      <polyline points="18 15 12 9 6 15" />
    </svg>
  );
}

export function IconChevronDown(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-label="Chevron Down"
    >
      <polyline points="6 9 12 15 18 9" />
    </svg>
  );
}

/* Category Icons – Stylized */

export function IconShortNames(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-label="Short Names"
    >
      <text
        x="50%"
        y="55%"
        textAnchor="middle"
        fontSize="16"
        fontWeight="700"
        fontFamily="Arial, sans-serif"
        dominantBaseline="middle"
        fill="currentColor"
      >
        A
      </text>
    </svg>
  );
}

export function IconClub(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-label="Club"
    >
      <circle cx="12" cy="12" r="10" />
      <text
        x="50%"
        y="60%"
        textAnchor="middle"
        fontSize="14"
        fontWeight="700"
        fontFamily="Arial, sans-serif"
        dominantBaseline="middle"
        fill="currentColor"
      >
        #
      </text>
    </svg>
  );
}

/* Category Icons – Visual */

export function IconTag(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-label="Tag"
    >
      <path d="M20 12v6a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-6l8-8 8 8z" />
      <circle cx="7" cy="11" r="1" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function IconGlobe(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-label="Globe"
    >
      <circle cx="12" cy="12" r="10" />
      <line x1="2" y1="12" x2="22" y2="12" />
      <path d="M12 2a15.3 15.3 0 0 1 0 20 15.3 15.3 0 0 1 0-20z" />
    </svg>
  );
}

export function IconBriefcase(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-label="Briefcase"
    >
      <rect x="3" y="7" width="18" height="12" rx="3" ry="3" />
      <path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2" />
    </svg>
  );
}

export function IconGamepad(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-label="Gamepad"
    >
      <rect x="2" y="9" width="20" height="10" rx="3" ry="3" />
      <line x1="7" y1="13" x2="7" y2="17" />
      <line x1="11" y1="15" x2="15" y2="15" />
      <line x1="19" y1="13" x2="19" y2="17" />
    </svg>
  );
}

export function IconBrain(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-label="Brain"
    >
      <path d="M12 2a5 5 0 0 0-5 5v3H6a3 3 0 0 0-3 3v1a5 5 0 0 0 5 5h1v1a3 3 0 0 0 3 3h1a5 5 0 0 0 5-5v-1h1a3 3 0 0 0 3-3v-1a5 5 0 0 0-5-5h-3V7a5 5 0 0 0-5-5z" />
    </svg>
  );
}

export function IconMoney(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-label="Money"
    >
      <rect x="3" y="8" width="18" height="8" rx="3" ry="3" />
      <line x1="12" y1="8" x2="12" y2="16" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}
export function IconVault(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-label="Vault"
    >
      <path d="M3 6.75A2.25 2.25 0 0 1 5.25 4.5h13.5A2.25 2.25 0 0 1 21 6.75v10.5A2.25 2.25 0 0 1 18.75 19.5H5.25A2.25 2.25 0 0 1 3 17.25V6.75zm9 6.75a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3zm0 0v3" />
    </svg>
  );
}

export function IconActivity(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-label="Activity"
    >
      <path d="M4.5 12h3l3 6 4.5-12 3 6h3" />
    </svg>
  );
}

export function IconHeart(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-label="Heart"
    >
      <path d="M3.75 8.25a5.25 5.25 0 0 1 9-3.75 5.25 5.25 0 0 1 9 3.75c0 6-9 11.25-9 11.25s-9-5.25-9-11.25z" />
    </svg>
  );
}

export function IconSettings(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-label="Settings"
    >
      <path d="M12 15.75a3.75 3.75 0 1 0 0-7.5 3.75 3.75 0 0 0 0 7.5zm8.25-3.75a8.25 8.25 0 0 0-.66-3.24l2.1-1.65-2.25-3.9-2.46 1.02A8.25 8.25 0 0 0 12 3.75c-1.15 0-2.24.24-3.24.66L6.3 3.39 4.05 7.29l2.1 1.65A8.25 8.25 0 0 0 3.75 12c0 1.15.24 2.24.66 3.24l-2.1 1.65 2.25 3.9 2.46-1.02a8.25 8.25 0 0 0 6.98 0l2.46 1.02 2.25-3.9-2.1-1.65c.42-1 .66-2.09.66-3.24z" />
    </svg>
  );
}

export function IconTool(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-label="Tool"
    >
      <path d="M21 2.25l-6.75 6.75M13.5 3.75l6.75 6.75M4.5 12l6 6M7.5 18H3v-4.5l4.5 4.5zM14.25 9.75l-6.75 6.75" />
    </svg>
  );
}

export function IconNetwork(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-label="Network"
    >
      <circle cx="12" cy="12" r="3" />
      <line x1="12" y1="3" x2="12" y2="9" />
      <line x1="12" y1="15" x2="12" y2="21" />
      <line x1="3" y1="12" x2="9" y2="12" />
      <line x1="15" y1="12" x2="21" y2="12" />
    </svg>
  );
}


export function IconTeddy(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-label="Teddy"
    >
      <circle cx="6" cy="6" r="2" />
      <circle cx="18" cy="6" r="2" />
      <circle cx="12" cy="14" r="6" />
      <circle cx="10" cy="13" r="1" fill="currentColor" stroke="none" />
      <circle cx="14" cy="13" r="1" fill="currentColor" stroke="none" />
      <path d="M9 17c1.5-1 4.5-1 6 0" />
    </svg>
  );
}

export function IconTrending(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-label="Trending"
    >
      <polyline points="3 17 9 11 13 15 21 7" />
      <polyline points="14 7 21 7 21 14" />
    </svg>
  );
}


export function IconUser(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-label="User"
    >
      <path d="M20 21v-2a4 4 0 0 0-3-3.87M4 21v-2a4 4 0 0 1 3-3.87M16 3.13a4 4 0 1 1-8 0 4 4 0 0 1 8 0z" />
    </svg>
  );
}
