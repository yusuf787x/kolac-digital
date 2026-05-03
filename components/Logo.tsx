import Image from 'next/image';

interface LogoProps {
  width?: number;
  height?: number;
  className?: string;
  priority?: boolean;
}

export default function Logo({
  width = 160,
  height = 40,
  className,
  priority = false,
}: LogoProps) {
  return (
    <Image
      src="/images/Logo Lang Schwarz.png"
      alt="Kolac Digital"
      width={width}
      height={height}
      priority={priority}
      className={className}
    />
  );
}
