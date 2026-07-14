import React, { useState, useEffect } from 'react';
import { useResolvedTheme } from '../../hooks/useResolvedTheme';

export default function ThemedImage({ lightSrc, darkSrc, src, alt, ...props }) {
  const resolvedTheme = useResolvedTheme();
  const [hasError, setHasError] = useState(false);

  // Reset error state when theme changes so we try loading the themed image again
  useEffect(() => {
    setHasError(false);
  }, [resolvedTheme]);

  // Choose source based on resolved theme and load error state
  let computedSrc;
  if (hasError) {
    // If the themed image failed to load, fall back to the base src, or the opposite theme's image
    computedSrc = src || lightSrc || darkSrc;
  } else {
    if (resolvedTheme === 'dark') {
      computedSrc = darkSrc || src || lightSrc;
    } else {
      computedSrc = lightSrc || src || darkSrc;
    }
  }

  const handleError = (e) => {
    if (!hasError) {
      setHasError(true);
    }
    if (props.onError) {
      props.onError(e);
    }
  };

  return <img src={computedSrc} alt={alt} {...props} onError={handleError} />;
}
