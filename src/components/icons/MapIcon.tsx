import type { IconProps } from './IconProps';

const MapIcon = ({ className, style }: IconProps) => {
  return (
    <svg
      viewBox="0 0 24 24"
      role="presentation"
      className={className}
      style={style}
    >
      <path
        d="M4 6.5 9 4l6 2.5 5-2.5v14l-5 2.5-6-2.5-5 2.5v-14Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <path
        d="m9 4 .02 14M15 6.5V21"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  );
};

export default MapIcon;
