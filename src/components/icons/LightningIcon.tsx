import type { IconProps } from './IconProps';

const LightningIcon = ({ className, style }: IconProps) => (
  <svg
    viewBox="0 0 24 24"
    role="presentation"
    className={className}
    style={style}
  >
    <path
      d="M13.5 3 6 13h5l-1 8 7.5-10h-5Z"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinejoin="round"
      strokeLinecap="round"
    />
  </svg>
);

export default LightningIcon;
