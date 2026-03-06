import type { IconProps } from './IconProps';

const CloudIcon = ({ className, style }: IconProps) => (
  <svg
    viewBox="0 0 24 24"
    role="presentation"
    className={className}
    style={style}
  >
    <path
      d="M8.5 18.5h8a4 4 0 0 0 .8-7.9A5.5 5.5 0 0 0 5.7 9.8 3.6 3.6 0 0 0 6.4 17"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

export default CloudIcon;
