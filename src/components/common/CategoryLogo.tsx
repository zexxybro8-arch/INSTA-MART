import React, { useState, useEffect } from 'react';
import { IconRenderer } from './IconRenderer';

interface CategoryLogoProps {
  logoUrl?: string | null;
  iconName?: string;
  name?: string;
  className?: string;
  imageClassName?: string;
  fallbackIconClassName?: string;
  alt?: string;
}

export const CategoryLogo: React.FC<CategoryLogoProps> = ({
  logoUrl,
  iconName,
  name = '',
  className = 'w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center text-slate-300 overflow-hidden',
  imageClassName = 'w-full h-full object-contain p-1.5',
  fallbackIconClassName = 'w-5 h-5',
  alt,
}) => {
  const [imgError, setImgError] = useState(false);
  const cleanUrl = logoUrl?.trim() || '';

  // Reset error state if logoUrl prop updates
  useEffect(() => {
    setImgError(false);
  }, [cleanUrl]);

  const showImage = cleanUrl.length > 0 && !imgError;

  return (
    <div className={className}>
      {showImage ? (
        <img
          src={cleanUrl}
          alt={alt || name || 'Category Logo'}
          referrerPolicy="no-referrer"
          onError={() => setImgError(true)}
          className={imageClassName}
          loading="lazy"
        />
      ) : (
        <IconRenderer
          name={iconName || name || 'Zap'}
          className={fallbackIconClassName}
        />
      )}
    </div>
  );
};
