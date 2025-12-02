import type { IconProps } from './IconProps';

const ArtworkIcon = ({ className, style }: IconProps) => {
  return (
    <svg
      viewBox="0 0 24 24"
      role="presentation"
      className={className}
      style={style}
    >
      <rect
        x="4"
        y="5"
        width="16"
        height="14"
        rx="2.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
      />
      <path
        d="m7 16 3.8-3.6c.6-.6 1.6-.6 2.2 0L17 16l1.8-1.8c.4-.4.4-1 0-1.4l-.6-.6"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="15" cy="10" r="1.2" fill="currentColor" />
    </svg>
  );
};

export default ArtworkIcon;
