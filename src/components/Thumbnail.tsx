interface ThumbnailProps {
  src?: string;
  alt?: string;
  className?: string;
  blankClassName?: string;
}

const Thumbnail = ({ src, alt, className, blankClassName }: ThumbnailProps) => {
  const blankClasses = [className, blankClassName]
    .filter(Boolean)
    .join(' ')
    .trim();

  if (!src) {
    return (
      <div className={blankClasses || undefined}>
        <span>Blank</span>
      </div>
    );
  }

  return (
    <div className={className}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt={alt || ''} loading="lazy" draggable={false} />
    </div>
  );
};

export default Thumbnail;
