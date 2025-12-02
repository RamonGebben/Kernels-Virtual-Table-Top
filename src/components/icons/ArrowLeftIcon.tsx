import type { IconProps } from './IconProps';

const ArrowLeftIcon = ({ className, style }: IconProps) => {
  return (
    <svg
      viewBox="0 0 24 24"
      role="presentation"
      className={className}
      style={style}
    >
      <path
        d="M14.5 6.5 8 12l6.5 5.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
};

export default ArrowLeftIcon;
