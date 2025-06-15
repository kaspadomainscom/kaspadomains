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
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="2" x2="12" y2="22" />
      <line x1="2" y1="12" x2="22" y2="12" />
      <circle cx="12" cy="7" r="2" />
      <circle cx="12" cy="17" r="2" />
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
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-label="Teddy"
    >
      <circle cx="12" cy="12" r="10" />
      <circle cx="8" cy="10" r="2" />
      <circle cx="16" cy="10" r="2" />
      <path d="M8 16c1.5 1.5 4 1.5 5.5 0" />
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
      <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
      <polyline points="17 6 23 6 23 12" />
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
      <path d="M20 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M4 21v-2a4 4 0 0 1 3-3.87" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
}
