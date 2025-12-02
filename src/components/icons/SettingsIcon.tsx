import type { IconProps } from './IconProps';

const SettingsIcon = ({ className, style }: IconProps) => {
  return (
    <svg
      viewBox="0 0 24 24"
      role="presentation"
      className={className}
      style={style}
    >
      <path
        d="M12 8.5a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
      />
      <path
        d="m5.2 9.8-1.7-1.2 2.6-4.5 2 .7c.6.2 1.3.1 1.7-.3l1-1 4.8 2.8-.5 1.3c-.2.6 0 1.3.4 1.7l1 1 1.1 6.2-5.2.4-.8 1.1c-.4.6-1.2.9-1.9.7l-1.2-.3-1.1 1.2-4-3.4.9-1.3c.4-.6.3-1.4-.2-2Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
    </svg>
  );
};

export default SettingsIcon;
