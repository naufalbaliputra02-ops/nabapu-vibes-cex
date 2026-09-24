import { useId } from "react";

export function RegionArt({
  region,
  className,
}: {
  region: "forest" | "desert" | "ocean";
  className?: string;
}) {
  const id = useId().replace(/:/g, "");
  const skyId = `region-sky-${id}`;
  const hillId = `region-hill-${id}`;

  const tree = (x: number, y: number, scale: number, key: string) => (
    <g key={key} transform={`translate(${x} ${y}) scale(${scale})`}>
      <path d="M-1 1 0-17 2-22 4-14 3 1Z" fill="#92785b" />
      <circle cx="0" cy="-22" r="7" fill="#648568" />
      <circle cx="-5" cy="-18" r="5.2" fill="#789775" />
      <circle cx="5" cy="-18" r="5.1" fill="#55785d" />
      <circle cx="-2.4" cy="-25" r="1.4" fill="#a8bd97" opacity=".72" />
    </g>
  );

  return (
    <svg
      aria-hidden="true"
      className={className}
      focusable="false"
      viewBox="0 0 100 82"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id={skyId} x1="0" x2="0" y1="0" y2="1">
          {region === "forest" ? (
            <>
              <stop offset="0" stopColor="#dcebe0" />
              <stop offset="1" stopColor="#f3eee0" />
            </>
          ) : null}
          {region === "desert" ? (
            <>
              <stop offset="0" stopColor="#f7dfc9" />
              <stop offset="1" stopColor="#fff0d4" />
            </>
          ) : null}
          {region === "ocean" ? (
            <>
              <stop offset="0" stopColor="#c9e8e8" />
              <stop offset="1" stopColor="#edf2df" />
            </>
          ) : null}
        </linearGradient>
        <linearGradient id={hillId} x1="0" x2="0" y1="0" y2="1">
          {region === "forest" ? (
            <>
              <stop offset="0" stopColor="#b4c9a7" />
              <stop offset="1" stopColor="#8eae8d" />
            </>
          ) : null}
          {region === "desert" ? (
            <>
              <stop offset="0" stopColor="#e9be79" />
              <stop offset="1" stopColor="#d9a45f" />
            </>
          ) : null}
          {region === "ocean" ? (
            <>
              <stop offset="0" stopColor="#77c4c1" />
              <stop offset="1" stopColor="#4c9eaa" />
            </>
          ) : null}
        </linearGradient>
      </defs>

      <rect width="100" height="82" fill={`url(#${skyId})`} />

      {region === "forest" && (
        <>
          <circle cx="79" cy="17" r="7" fill="#f8dfa9" opacity=".9" />
          <path
            d="M7 21c0-2 1.6-3.5 3.6-3.5 1.1-2.1 4.4-2.1 5.5.1 1.7.1 2.8 1.4 2.8 3.1 0 .3 0 .6-.1.9H8.5A2.5 2.5 0 0 1 7 21Z"
            fill="#fffdf5"
            opacity=".76"
          />
          <path
            d="M0 48c12-9 22-11 34-7 11-8 22-9 34-2 11-6 21-4 32 2v41H0Z"
            fill="#c6d6b8"
          />
          <path
            d="M0 57c12-6 22-7 33-2 12-8 24-7 36-1 10-5 20-5 31 1v27H0Z"
            fill={`url(#${hillId})`}
          />
          <path
            d="M0 67c12-5 24-3 34 1 11-6 23-7 34-2 10-4 21-3 32 2v14H0Z"
            fill="#779879"
          />
          <path
            d="M49 82c-2-5-7-8-7-12 0-4 7-5 9-9 2-4-2-7-5-10"
            fill="none"
            stroke="#fff8e8"
            strokeLinecap="round"
            strokeWidth="4.2"
          />
          <path
            d="M49 82c-2-5-7-8-7-12 0-4 7-5 9-9 2-4-2-7-5-10"
            fill="none"
            stroke="#e9e0ca"
            strokeLinecap="round"
            strokeWidth=".7"
            opacity=".8"
          />
          {tree(13, 64, 1.08, "tree-left")}
          {tree(30, 55, 0.74, "tree-middle")}
          {tree(86, 62, 1.12, "tree-right")}
          <g transform="translate(21 72)">
            <path d="M-1 1v-4h5v4" fill="#f3e5c7" />
            <path d="M-2-3c0-3 7-3 7 0Z" fill="#d88e78" />
            <circle cx="0" cy="-2" r=".65" fill="#f7d5ae" />
            <circle cx="2" cy="-2.4" r=".55" fill="#f7d5ae" />
          </g>
          <g transform="translate(74 73) scale(.78)">
            <path d="M-1 1v-4h5v4" fill="#f3e5c7" />
            <path d="M-2-3c0-3 7-3 7 0Z" fill="#d88e78" />
            <circle cx="0" cy="-2" r=".65" fill="#f7d5ae" />
            <circle cx="2" cy="-2.4" r=".55" fill="#f7d5ae" />
          </g>
          <circle cx="34" cy="72" r="1" fill="#f4d98d" />
          <circle cx="67" cy="65" r=".9" fill="#f4d98d" />
        </>
      )}

      {region === "desert" && (
        <>
          <circle cx="78" cy="18" r="9" fill="#f6c979" opacity=".92" />
          <circle cx="78" cy="18" r="12" fill="#f6c979" opacity=".15" />
          <path
            d="M9 23c0-1.8 1.5-3.1 3.3-3.1 1-1.8 3.9-1.8 4.9.1 1.5.1 2.5 1.2 2.5 2.7 0 .3 0 .5-.1.8h-9A2.3 2.3 0 0 1 9 23Z"
            fill="#fff8ec"
            opacity=".8"
          />
          <path
            d="M0 51c13-10 25-13 38-8 12-6 23-7 35-1 10-5 18-3 27 2v38H0Z"
            fill="#f2d9ad"
          />
          <path
            d="M0 60c13-6 25-8 38-3 13-8 24-7 36-2 10-4 18-3 26 1v26H0Z"
            fill="#e8bd7f"
          />
          <path
            d="M0 71c15-8 29-8 42-3 12-5 25-4 36 0 9-3 16-2 22 1v13H0Z"
            fill={`url(#${hillId})`}
          />
          <path
            d="M23 67V51c0-3 2-5 4-5s4 2 4 5v16M27 58h-4c-2 0-3-2-3-4v-2M30 55h3c2 0 3-2 3-4v-2"
            fill="none"
            stroke="#668b66"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="3.2"
          />
          <path
            d="M22 53v2m4-10v2m4 5v2m5-3v2m-10 9v2"
            stroke="#a9bd87"
            strokeLinecap="round"
            strokeWidth=".8"
          />
          <path
            d="M69 70c3-4 7-4 10-1 2 2 2 5-1 7h-8c-3-1-3-4-1-6Z"
            fill="#b97f56"
          />
          <path
            d="M71 69c2-2 5-2 7 0"
            fill="none"
            stroke="#d9a879"
            strokeLinecap="round"
            strokeWidth="1.2"
          />
          <path
            d="M55 75c1-2 3-2 4 0"
            fill="none"
            stroke="#fbebcb"
            strokeLinecap="round"
            strokeWidth="1.2"
          />
          <circle cx="47" cy="68" r=".9" fill="#cf9663" />
          <circle cx="52" cy="71" r=".65" fill="#cf9663" />
        </>
      )}

      {region === "ocean" && (
        <>
          <path
            d="M10 20c0-2 1.6-3.5 3.5-3.5 1.2-2.1 4.3-2.1 5.5.1 1.7.1 2.9 1.4 2.9 3.1 0 .3 0 .6-.1.9h-10A2.4 2.4 0 0 1 10 20Z"
            fill="#fffdf5"
            opacity=".84"
          />
          <path
            d="M62 28c0-1.7 1.4-3 3.1-3 1-1.8 3.8-1.8 4.8.1 1.5.1 2.4 1.2 2.4 2.6 0 .3 0 .5-.1.8h-8.7a2.1 2.1 0 0 1-1.5-.5Z"
            fill="#fffdf5"
            opacity=".7"
          />
          <path d="M0 45c15-2 28-1 42 1 16 2 34-2 58 0v36H0Z" fill="#a8d8cf" />
          <path
            d="M58 49c5-3 10-5 15-5 5 0 10 2 14 5-4 4-9 6-15 6-6 0-11-2-14-6Z"
            fill="#ecd39e"
          />
          <path
            d="M68 47c2-7 2-13 0-20"
            fill="none"
            stroke="#9c7653"
            strokeLinecap="round"
            strokeWidth="2.6"
          />
          <path
            d="M68 28c-5-3-8-3-11-2 2 3 5 5 9 5-4-1-6 0-8 2 4 1 8 0 11-3 1 3 4 4 7 4-1-4-4-6-8-6 4-2 7-4 8-7-5 0-8 2-10 5 0-4-2-7-5-9-1 4 0 7 2 10"
            fill="#789d76"
          />
          <path
            d="M0 57c8-4 14-4 22 0s14 4 22 0 14-4 22 0 14 4 22 0 9-3 12-2v27H0Z"
            fill={`url(#${hillId})`}
          />
          <path
            d="M0 68c8-4 14-4 22 0s14 4 22 0 14-4 22 0 14 4 22 0 9-3 12-2v16H0Z"
            fill="#478f9b"
            opacity=".82"
          />
          <path
            d="M5 62c4-2 7-2 11 0m24 0c4-2 7-2 11 0m25 0c4-2 7-2 11 0"
            fill="none"
            stroke="#d4eee3"
            strokeLinecap="round"
            strokeWidth="1.2"
            opacity=".9"
          />
          <path
            d="M18 37c3-2 5-2 8 0-3 2-5 2-8 0Zm3 0 2-2 2 2-2 2Z"
            fill="#fff7dd"
            opacity=".82"
          />
          <circle cx="29" cy="34" r="1.1" fill="#f9fbeb" opacity=".75" />
          <circle cx="33" cy="29" r=".7" fill="#f9fbeb" opacity=".7" />
          <path
            d="M63 51c1-2 3-2 4 0"
            fill="none"
            stroke="#d39c72"
            strokeLinecap="round"
            strokeWidth="1"
          />
        </>
      )}
    </svg>
  );
}
