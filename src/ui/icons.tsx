import type { SVGProps } from 'react';

type P = SVGProps<SVGSVGElement> & { size?: number };

const make = (paths: React.ReactNode, fill = false) =>
  function Icon({ size = 18, ...rest }: P) {
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill={fill ? 'currentColor' : 'none'}
        stroke={fill ? 'none' : 'currentColor'}
        strokeWidth={1.75}
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
        {...rest}
      >
        {paths}
      </svg>
    );
  };

export const IconVase = make(<path d="M9.5 3h5l-.3 2.2c2.6 1.4 4.3 4.1 4.3 7.3 0 4.5-3 8.5-6.5 8.5s-6.5-4-6.5-8.5c0-3.2 1.7-5.9 4.3-7.3L9.5 3Z M6.2 12.5h11.6" />);
export const IconWheel = make(
  <>
    <circle cx="12" cy="12" r="8.5" />
    <circle cx="12" cy="12" r="4.5" />
    <path d="M12 3.5v4M20.5 12h-4M12 20.5v-4M3.5 12h4" />
  </>,
);
export const IconShape = make(<path d="M8 3.5h8M9.2 3.5c0 2.6-4.2 4.4-4.2 9.3C5 17.2 8.1 20.5 12 20.5s7-3.3 7-7.7c0-4.9-4.2-6.7-4.2-9.3" />);
export const IconGlaze = make(
  <>
    <path d="M12 3.2c3.3 3.9 6 7.2 6 10.6a6 6 0 0 1-12 0c0-3.4 2.7-6.7 6-10.6Z" />
    <path d="M9 14.5a3 3 0 0 0 3 3" />
  </>,
);
export const IconCarve = make(
  <>
    <path d="m14.5 4.5 5 5L9 20H4v-5L14.5 4.5Z" />
    <path d="m12.5 6.5 5 5" />
  </>,
);
export const IconCode = make(<path d="m8.5 7-5 5 5 5M15.5 7l5 5-5 5M13.5 4.5l-3 15" />);
export const IconFire = make(<path d="M12 21c3.9 0 6.5-2.6 6.5-6.2 0-4.2-3.3-6-4.2-10.3-2 1.4-3.3 3.6-3.3 5.9-1-.6-1.7-1.8-1.9-3C7.1 9.1 5.5 11.7 5.5 14.8 5.5 18.4 8.1 21 12 21Z M12 21c-1.7 0-2.8-1.2-2.8-2.8 0-1.9 1.6-2.7 2.8-4.7 1.2 2 2.8 2.8 2.8 4.7 0 1.6-1.1 2.8-2.8 2.8Z" />);
export const IconShelf = make(<path d="M3.5 7.5h17M3.5 16.5h17M5 7.5v13M19 7.5v13M7 7.5V4.5h3.5v3M13.5 7.5V3.5h3v4M8 16.5v-5.5h3v5.5M14 16.5v-4h3.5v4" />);
export const IconGuide = make(
  <>
    <path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v15H6.5A2.5 2.5 0 0 0 4 20.5v-15Z" />
    <path d="M4 20.5A2.5 2.5 0 0 1 6.5 18H20v3H6.5" />
    <path d="M9 7.5h7M9 11h5" />
  </>,
);
export const IconBack = make(<path d="M19 12H5M11 18l-6-6 6-6" />);
export const IconUndo = make(<path d="M9 14 4 9l5-5M4 9h10.5a5.5 5.5 0 0 1 0 11H11" />);
export const IconRedo = make(<path d="m15 14 5-5-5-5M20 9H9.5a5.5 5.5 0 0 0 0 11H13" />);
export const IconDesktop = make(
  <>
    <rect x="3" y="4" width="18" height="12" rx="2" />
    <path d="M9 20h6M12 16v4" />
  </>,
);
export const IconTablet = make(
  <>
    <rect x="5" y="3" width="14" height="18" rx="2" />
    <path d="M11 18h2" />
  </>,
);
export const IconPhone = make(
  <>
    <rect x="7" y="2.5" width="10" height="19" rx="2.5" />
    <path d="M11 18.5h2" />
  </>,
);
export const IconInspect = make(
  <>
    <path d="M4 9V5.5A1.5 1.5 0 0 1 5.5 4H9M15 4h3.5A1.5 1.5 0 0 1 20 5.5V9M4 15v3.5A1.5 1.5 0 0 0 5.5 20H9" />
    <path d="m13 13 7.5 2.8-3.2 1.4-1.4 3.3L13 13Z" />
  </>,
);
export const IconLock = make(
  <>
    <rect x="5" y="11" width="14" height="9.5" rx="2" />
    <path d="M8 11V8a4 4 0 0 1 8 0v3" />
  </>,
);
export const IconUnlock = make(
  <>
    <rect x="5" y="11" width="14" height="9.5" rx="2" />
    <path d="M8 11V8a4 4 0 0 1 7.6-1.7" />
  </>,
);
export const IconSun = make(
  <>
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2.5v2M12 19.5v2M4.6 4.6 6 6M18 18l1.4 1.4M2.5 12h2M19.5 12h2M4.6 19.4 6 18M18 6l1.4-1.4" />
  </>,
);
export const IconMoon = make(<path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5Z" />);
export const IconSearch = make(
  <>
    <circle cx="11" cy="11" r="6.5" />
    <path d="m20 20-4.2-4.2" />
  </>,
);
export const IconShuffle = make(<path d="M16 3.5h4.5V8M4 20l16.5-16.5M20.5 16v4.5H16M14.5 14.5l6 6M4 4l5 5" />);
export const IconDownload = make(<path d="M12 3.5v12M7 10.5l5 5 5-5M4.5 20.5h15" />);
export const IconCopy = make(
  <>
    <rect x="8.5" y="8.5" width="12" height="12" rx="2" />
    <path d="M15.5 8.5V5.5a2 2 0 0 0-2-2h-8a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h3" />
  </>,
);
export const IconPlus = make(<path d="M12 5v14M5 12h14" />);
export const IconTrash = make(<path d="M4.5 7h15M10 11v6M14 11v6M6 7l1 12.5a1.5 1.5 0 0 0 1.5 1.5h7a1.5 1.5 0 0 0 1.5-1.5L18 7M9 7V4.5h6V7" />);
export const IconEye = make(
  <>
    <path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z" />
    <circle cx="12" cy="12" r="3" />
  </>,
);
export const IconEyeOff = make(<path d="M3 3l18 18M10.6 5.6A9.9 9.9 0 0 1 12 5.5c6 0 9.5 6.5 9.5 6.5a17 17 0 0 1-3 3.8M6.6 6.6C3.9 8.4 2.5 12 2.5 12S6 18.5 12 18.5c1.8 0 3.3-.5 4.6-1.3M9.9 9.9a3 3 0 0 0 4.2 4.2" />);
export const IconGrip = make(
  <>
    <circle cx="9" cy="6" r=".9" fill="currentColor" />
    <circle cx="15" cy="6" r=".9" fill="currentColor" />
    <circle cx="9" cy="12" r=".9" fill="currentColor" />
    <circle cx="15" cy="12" r=".9" fill="currentColor" />
    <circle cx="9" cy="18" r=".9" fill="currentColor" />
    <circle cx="15" cy="18" r=".9" fill="currentColor" />
  </>,
);
export const IconCheck = make(<path d="m5 12.5 4.5 4.5L19 7.5" />);
export const IconX = make(<path d="M6 6l12 12M18 6 6 18" />);
export const IconChevronDown = make(<path d="m6 9 6 6 6-6" />);
export const IconChevronRight = make(<path d="m9 6 6 6-6 6" />);
export const IconChevronUp = make(<path d="m6 15 6-6 6 6" />);
export const IconImage = make(
  <>
    <rect x="3.5" y="4.5" width="17" height="15" rx="2" />
    <circle cx="9" cy="10" r="1.8" />
    <path d="m20.5 16-5-5L6 19.5" />
  </>,
);
export const IconSparkle = make(<path d="M12 3.5 13.8 9 19.5 10.8 13.8 12.6 12 18.5 10.2 12.6 4.5 10.8 10.2 9 12 3.5ZM18.5 16l.7 2 2 .7-2 .7-.7 2-.7-2-2-.7 2-.7.7-2Z" />);
export const IconInfo = make(
  <>
    <circle cx="12" cy="12" r="8.5" />
    <path d="M12 11v5.5M12 7.8v.2" />
  </>,
);
export const IconPlay = make(<path d="M7 4.5v15l12-7.5-12-7.5Z" />);
export const IconArrowRight = make(<path d="M5 12h14M13 6l6 6-6 6" />);
export const IconKeyboard = make(
  <>
    <rect x="2.5" y="6" width="19" height="12" rx="2" />
    <path d="M6 10h.01M10 10h.01M14 10h.01M18 10h.01M7.5 14h9" />
  </>,
);
export const IconRefresh = make(<path d="M20 11a8 8 0 0 0-14.7-4.4L4 8.5M4 4v4.5h4.5M4 13a8 8 0 0 0 14.7 4.4l1.3-1.9M20 20v-4.5h-4.5" />);
export const IconLayers = make(<path d="m12 3.5 9 5-9 5-9-5 9-5ZM3 13.5l9 5 9-5" />);
export const IconType = make(<path d="M4.5 7V4.5h15V7M12 4.5v15M9 19.5h6" />);
export const IconTexture = make(
  <>
    <rect x="3.5" y="3.5" width="17" height="17" rx="3" />
    <path d="M3.5 9.5 9.5 3.5M3.5 15.5 15.5 3.5M8.5 20.5l12-12M14.5 20.5l6-6" />
  </>,
);
export const IconMotion = make(<path d="M4 12h3l2.5-6 5 12 2.5-6h3" />);
export const IconColumns = make(
  <>
    <rect x="3.5" y="4.5" width="17" height="15" rx="2" />
    <path d="M10 4.5v15" />
  </>,
);
export const IconDice = make(
  <>
    <rect x="4" y="4" width="16" height="16" rx="3.5" />
    <circle cx="9" cy="9" r="1" fill="currentColor" />
    <circle cx="15" cy="15" r="1" fill="currentColor" />
    <circle cx="15" cy="9" r="1" fill="currentColor" />
    <circle cx="9" cy="15" r="1" fill="currentColor" />
  </>,
);
