import { useImageUrl } from "@/lib/image";

type Props = {
  src: string | null;
  alt: string;
  className?: string;
  width?: number;
  height?: number;
  eager?: boolean;
};

/** Image that resolves private storage refs to signed URLs. */
export function Img({ src, alt, className, width, height, eager }: Props) {
  const url = useImageUrl(src);
  if (!url) return <div className={className} aria-hidden />;
  return (
    <img
      src={url}
      alt={alt}
      className={className}
      width={width}
      height={height}
      loading={eager ? "eager" : "lazy"}
    />
  );
}
