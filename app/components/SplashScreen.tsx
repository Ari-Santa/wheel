"use client";

import { useEffect, useState } from "react";
import styles from "./SplashScreen.module.css";

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
      <div className={styles.containerFadeOut}>
        <h1 className={styles.titleNoMargin}>
          <span className={styles.accent}>Wheel</span> of Ethereal
        </h1>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.content}>
        <h1 className={styles.title}>
          <span className={styles.accent}>Wheel</span> of Ethereal
        </h1>
        <p className={styles.subtitle}>
          Loading...
        </p>
      </div>
    </div>
  );
}
