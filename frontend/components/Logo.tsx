import React from "react";

interface LogoProps extends React.SVGProps<SVGSVGElement> {
  size?: number;
}

export default function Logo({ size = 26, className = "text-primary", ...props }: LogoProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
      {...props}
    >
      {/* Outer Protective Shield Geometry */}
      <path
        d="M16 3L5 7.5V15C5 21.8 9.7 27.8 16 29.5C22.3 27.8 27 21.8 27 15V7.5L16 3Z"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="opacity-95"
      />
      {/* Inner Network / Connected Grid Mesh */}
      <path
        d="M11 13.5L16 11L21 13.5L16 19L11 13.5Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="opacity-75"
      />
      <path
        d="M16 11V19M11 13.5L21 13.5"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="opacity-50"
      />
      {/* Central Node / Camera Core */}
      <circle cx="16" cy="15" r="2" fill="currentColor" />
      {/* Network Nodes */}
      <circle cx="11" cy="13.5" r="1.5" fill="currentColor" />
      <circle cx="21" cy="13.5" r="1.5" fill="currentColor" />
      <circle cx="16" cy="11" r="1.5" fill="currentColor" />
      <circle cx="16" cy="19" r="1.5" fill="currentColor" />
    </svg>
  );
}
