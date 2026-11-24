import { useState, useEffect, useRef } from 'react';

// Smooth requestAnimationFrame counter with spring/cubic-bezier easing
export function useAnimatedNumber(targetValue, duration = 500, decimals = 1) {
  const [displayValue, setDisplayValue] = useState(targetValue);
  const startValueRef = useRef(targetValue);
  const startTimeRef = useRef(null);
  const animFrameRef = useRef(null);

  useEffect(() => {
    const startVal = displayValue;
    const endVal = parseFloat(targetValue) || 0;
    if (startVal === endVal) return;

    startValueRef.current = startVal;
    startTimeRef.current = performance.now();

    const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);

    const animate = (currentTime) => {
      const elapsed = currentTime - startTimeRef.current;
      const progress = Math.min(elapsed / duration, 1);
      const easedProgress = easeOutCubic(progress);

      const current = startVal + (endVal - startVal) * easedProgress;
      setDisplayValue(current);

      if (progress < 1) {
        animFrameRef.current = requestAnimationFrame(animate);
      } else {
        setDisplayValue(endVal);
      }
    };

    animFrameRef.current = requestAnimationFrame(animate);

    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [targetValue, duration]);

  return decimals === 0 
    ? Math.round(displayValue) 
    : displayValue.toFixed(decimals);
}
