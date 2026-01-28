"use client";

import { useEffect, useState } from "react";

interface SplashScreenProps {
  onDismiss: () => void;
}

export default function SplashScreen({ onDismiss }: SplashScreenProps) {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    // Auto-dismiss after 2.5 seconds
    const timer = setTimeout(() => {
      setIsVisible(false);
      // Wait for fade-out animation to complete
      setTimeout(onDismiss, 500);
    }, 2500);

    return () => clearTimeout(timer);
  }, [onDismiss]);

  if (!isVisible) {
    return (
      <div className="fixed inset-0 bg-background z-50 flex items-center justify-center animate-fade-out pointer-events-none">
        <h1 className="text-5xl md:text-6xl xl:text-7xl 2xl:text-8xl font-bold">
          <span className="text-accent">Wheel</span> of Ethereal
        </h1>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-background z-50 flex items-center justify-center">
      <div className="text-center animate-fade-in">
        <h1 className="text-5xl md:text-6xl xl:text-7xl 2xl:text-8xl font-bold mb-4">
          <span className="text-accent">Wheel</span> of Ethereal
        </h1>
        <p className="text-text-muted text-sm md:text-base animate-pulse">
          Loading...
        </p>
      </div>
    </div>
  );
}
