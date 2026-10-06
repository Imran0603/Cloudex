import React, { useState, useEffect, useRef } from 'react';
import { Image as ImageIcon } from 'lucide-react';

interface SafeImageProps {
  src?: string;
  videoSrc?: string;
  alt: string;
  className?: string;
  eager?: boolean;
  aspectRatio?: string;
}

export const SafeImage: React.FC<SafeImageProps> = ({
  src,
  videoSrc,
  alt,
  className = 'w-full h-full object-cover',
  eager = false,
  aspectRatio,
}) => {
  const [isLoaded, setIsLoaded] = useState<boolean>(false);
  const [hasError, setHasError] = useState<boolean>(false);
  const imgRef = useRef<HTMLImageElement | null>(null);

  // Check if image is already cached/complete on mount
  useEffect(() => {
    if (imgRef.current?.complete && imgRef.current.naturalWidth > 0) {
      setIsLoaded(true);
    }

    // Safety fallback: if not loaded within 400ms, force visible so content is never blank
    const fallbackTimer = setTimeout(() => {
      setIsLoaded(true);
    }, 400);

    return () => clearTimeout(fallbackTimer);
  }, [src]);

  return (
    <div
      style={{ aspectRatio }}
      className="relative w-full h-full overflow-hidden bg-[#1C1C1E] flex items-center justify-center"
    >
      {/* Skeleton Shimmer Background (always present while loading) */}
      {!isLoaded && !hasError && (
        <div className="absolute inset-0 bg-[#242426] animate-pulse flex items-center justify-center">
          <ImageIcon className="w-5 h-5 text-white/20" />
        </div>
      )}

      {/* Fallback Error / Missing Thumbnail Cell */}
      {hasError || !src ? (
        videoSrc ? (
          <video
            src={videoSrc}
            preload="metadata"
            muted
            playsInline
            className={`${className} object-cover`}
          />
        ) : (
          <div className="absolute inset-0 bg-[#1C1C1E] flex items-center justify-center">
            <ImageIcon className="w-6 h-6 text-white/30" />
          </div>
        )
      ) : (
        <img
          ref={(el) => {
            imgRef.current = el;
            if (el?.complete && el.naturalWidth > 0 && !isLoaded) {
              setIsLoaded(true);
            }
          }}
          src={src}
          alt={alt}
          loading={eager ? 'eager' : 'lazy'}
          decoding="async"
          onLoad={() => setIsLoaded(true)}
          onError={() => setHasError(true)}
          referrerPolicy="no-referrer"
          className={`${className} transition-opacity duration-200 ${
            isLoaded ? 'opacity-100' : 'opacity-0'
          }`}
        />
      )}
    </div>
  );
};
