"use client";

import { useRef, useCallback, useEffect, forwardRef, useImperativeHandle, useState } from "react";
import styles from "./Wheel.module.css";

export interface WheelSegment {
  label: string;
  color: string;
}

interface WheelProps {
  segments: WheelSegment[];
  onResult: (segment: WheelSegment, index: number) => void;
  spinning: boolean;
  onSpinStart: () => void;
  disabled: boolean;
  autoSpinEnabled?: boolean;
  onAutoSpinChange?: (enabled: boolean) => void;
  showAutoSpin?: boolean;
  riggedEnabled?: boolean;
  onRiggedChange?: (enabled: boolean) => void;
  currentPlayerName?: string | null;
  riggedPlayerName?: string;
}

export interface WheelRef {
  spin: () => void;
  cancelSpin: () => void;
}

/**
 * Extract the current rotation angle (0-360) from an element's computed transform matrix.
 */
function getComputedRotation(el: HTMLElement): number {
  const style = getComputedStyle(el);
  const transform = style.transform;
  if (!transform || transform === "none") return 0;

  const matrix = new DOMMatrix(transform);
  const radians = Math.atan2(matrix.b, matrix.a);
  const degrees = radians * (180 / Math.PI);
  return ((degrees % 360) + 360) % 360;
}

const Wheel = forwardRef<WheelRef, WheelProps>(function Wheel({
  segments,
  onResult,
  spinning,
  onSpinStart,
  disabled,
  autoSpinEnabled = false,
  onAutoSpinChange,
  showAutoSpin = false,
  riggedEnabled = false,
  onRiggedChange,
  currentPlayerName,
  riggedPlayerName = "Ari Santa",
}, ref) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const currentRotationRef = useRef(0);
  const [displayRotation, setDisplayRotation] = useState(0);
  const wheelRef = useRef<HTMLDivElement>(null);
  const pointerRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const spinTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [size, setSize] = useState(380);

  // Boundary detection RAF loop
  const observerRef = useRef<number | null>(null);
  const previousSegmentRef = useRef<number>(0);

  const segmentAngle = 360 / segments.length;

  // Store mutable values in refs for the observer loop
  const segmentsRef = useRef(segments);
  const segmentAngleRef = useRef(segmentAngle);

  useEffect(() => { segmentsRef.current = segments; }, [segments]);
  useEffect(() => { segmentAngleRef.current = segmentAngle; }, [segmentAngle]);

  // Read wheel size from CSS custom property
  useEffect(() => {
    function updateSize() {
      if (containerRef.current) {
        const computedSize = getComputedStyle(containerRef.current).getPropertyValue('--wheel-size');
        const parsed = parseInt(computedSize, 10);
        if (!isNaN(parsed) && parsed > 0) {
          setSize(parsed);
        }
      }
    }

    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  const drawWheel = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const radius = Math.min(centerX, centerY) - 4;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    segments.forEach((segment, i) => {
      const startAngle = (i * segmentAngle - 90) * (Math.PI / 180);
      const endAngle = ((i + 1) * segmentAngle - 90) * (Math.PI / 180);

      // Draw segment
      ctx.beginPath();
      ctx.moveTo(centerX, centerY);
      ctx.arc(centerX, centerY, radius, startAngle, endAngle);
      ctx.closePath();
      ctx.fillStyle = segment.color;
      ctx.fill();

      // Segment border
      ctx.strokeStyle = "#1a1a1a";
      ctx.lineWidth = 2;
      ctx.stroke();

      // Draw text
      const textAngle = ((i * segmentAngle + segmentAngle / 2 - 90) * Math.PI) / 180;
      const textRadius = radius * 0.65;
      const textX = centerX + Math.cos(textAngle) * textRadius;
      const textY = centerY + Math.sin(textAngle) * textRadius;

      ctx.save();
      ctx.translate(textX, textY);
      ctx.rotate(textAngle + Math.PI / 2);
      ctx.fillStyle = "#ffffff";
      ctx.font = `bold ${Math.max(16, Math.min(36, size / 18))}px sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.shadowColor = "rgba(0,0,0,0.7)";
      ctx.shadowBlur = 3;

      // Word wrap for long labels
      const words = segment.label.split(" ");
      const lineSpacing = Math.max(10, size / 45);
      if (words.length > 1 && segment.label.length > 10) {
        const mid = Math.ceil(words.length / 2);
        const line1 = words.slice(0, mid).join(" ");
        const line2 = words.slice(mid).join(" ");
        ctx.fillText(line1, 0, -lineSpacing);
        ctx.fillText(line2, 0, lineSpacing);
      } else {
        ctx.fillText(segment.label, 0, 0);
      }
      ctx.restore();
    });

    // Outer ring
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
    ctx.strokeStyle = "#ff8c00";
    ctx.lineWidth = 4;
    ctx.stroke();

    // Inner ring
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius * 0.08, 0, 2 * Math.PI);
    ctx.fillStyle = "#ff8c00";
    ctx.fill();
    ctx.strokeStyle = "#1a1a1a";
    ctx.lineWidth = 2;
    ctx.stroke();
  }, [segments, segmentAngle, size]);

  useEffect(() => {
    drawWheel();
  }, [drawWheel]);

  /**
   * RAF observer loop: reads the computed transform during the CSS transition
   * to detect segment boundary crossings. Does NOT write any styles — the CSS
   * transition handles animation on the compositor thread.
   */
  const startObserver = useCallback(() => {
    const wheel = wheelRef.current;
    if (!wheel) return;

    const observe = () => {
      const currentAngle = getComputedRotation(wheel);
      const sa = segmentAngleRef.current;
      const numSegs = segmentsRef.current.length;

      // Which segment is under the pointer
      const pointerAngle = ((360 - currentAngle) + 360) % 360;
      const currentSegment = Math.floor(pointerAngle / sa) % numSegs;

      if (currentSegment !== previousSegmentRef.current) {
        previousSegmentRef.current = currentSegment;

        // Pointer bounce via CSS animation class
        const pointer = pointerRef.current;
        if (pointer) {
          pointer.classList.remove("bouncing");
          // rAF to batch the remove/add so the browser sees the class change
          requestAnimationFrame(() => {
            pointer.classList.add("bouncing");
          });
        }
      }

      observerRef.current = requestAnimationFrame(observe);
    };

    observerRef.current = requestAnimationFrame(observe);
  }, []);

  const stopObserver = useCallback(() => {
    if (observerRef.current !== null) {
      cancelAnimationFrame(observerRef.current);
      observerRef.current = null;
    }
  }, []);

  const spin = useCallback(() => {
    if (disabled || spinning) return;

    // Clear any pending result timeout
    if (spinTimeoutRef.current) {
      clearTimeout(spinTimeoutRef.current);
      spinTimeoutRef.current = null;
    }

    onSpinStart();

    // Check if rigged mode should apply
    const isRiggedSpin = riggedEnabled && currentPlayerName?.toLowerCase() === riggedPlayerName.toLowerCase();

    let segmentIndex: number;
    let newRotation: number;

    if (isRiggedSpin) {
      // Find favorable segments based on labels
      const favorableLabels = ["Victory", "Lucky! +100", "Double Pts", "Bonus Round", "+50 Points", "Immunity", "Extra Life"];
      const favorableIndices = segments
        .map((s, i) => favorableLabels.some(label => s.label.includes(label)) ? i : -1)
        .filter(i => i !== -1);

      // Pick a random favorable segment (so it's not always the same one)
      segmentIndex = favorableIndices.length > 0
        ? favorableIndices[Math.floor(Math.random() * favorableIndices.length)]
        : 0;

      // Calculate the angle needed to land on this segment
      // Pointer is at top (0°), segments are clockwise from there
      const targetSegmentCenter = segmentIndex * segmentAngle + segmentAngle / 2;
      const targetAngle = (360 - targetSegmentCenter + 360) % 360;

      // Add full rotations for effect
      const fullRotations = 3 + Math.random() * 3;
      newRotation = currentRotationRef.current + fullRotations * 360 + targetAngle - (currentRotationRef.current % 360);
    } else {
      // Normal random spin
      const fullRotations = 3 + Math.random() * 3;
      const randomAngle = Math.random() * 360;
      const totalRotation = fullRotations * 360 + randomAngle;
      let candidateRotation = currentRotationRef.current + totalRotation;

      // Calculate where the pointer would land
      const finalAngle = candidateRotation % 360;
      const pointerAngle = (360 - finalAngle + 360) % 360;
      segmentIndex = Math.floor(pointerAngle / segmentAngle) % segments.length;

      // Check if we're too close to a segment boundary (dead zone = 15% from each edge)
      const positionInSegment = (pointerAngle % segmentAngle) / segmentAngle;
      const deadZone = 0.15;

      if (positionInSegment < deadZone) {
        // Too close to start of segment - push to 25% into segment
        const adjustment = (0.25 - positionInSegment) * segmentAngle;
        candidateRotation -= adjustment; // Subtract because pointerAngle is inverse of rotation
      } else if (positionInSegment > (1 - deadZone)) {
        // Too close to end of segment - push to 75% into segment
        const adjustment = (positionInSegment - 0.75) * segmentAngle;
        candidateRotation += adjustment;
      }

      newRotation = candidateRotation;
    }

    // Initialize observer state
    const wheel = wheelRef.current;
    if (wheel) {
      const currentAngle = getComputedRotation(wheel);
      const pa = ((360 - currentAngle) + 360) % 360;
      previousSegmentRef.current = Math.floor(pa / segmentAngle) % segments.length;
    }

    // Set the CSS transition target — browser handles smooth animation
    if (wheel) {
      wheel.style.transform = `rotate(${newRotation}deg)`;
    }
    currentRotationRef.current = newRotation;
    setDisplayRotation(newRotation);

    // Start boundary detection observer
    startObserver();

    // Fire result after transition completes (4s transition + small buffer)
    spinTimeoutRef.current = setTimeout(() => {
      spinTimeoutRef.current = null;
      stopObserver();
      onResult(segments[segmentIndex], segmentIndex);
    }, 4100);
  }, [disabled, spinning, onSpinStart, onResult, segments, segmentAngle, startObserver, stopObserver, riggedEnabled, currentPlayerName, riggedPlayerName]);

  const cancelSpin = useCallback(() => {
    stopObserver();
    if (spinTimeoutRef.current) {
      clearTimeout(spinTimeoutRef.current);
      spinTimeoutRef.current = null;
    }
  }, [stopObserver]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopObserver();
      if (spinTimeoutRef.current) {
        clearTimeout(spinTimeoutRef.current);
      }
    };
  }, [stopObserver]);

  useImperativeHandle(ref, () => ({
    spin,
    cancelSpin,
  }), [spin, cancelSpin]);

  return (
    <div ref={containerRef} className={styles.container}>
      <div className="wheel-container" style={{ width: size, height: size }}>
        <div ref={pointerRef} className="wheel-pointer" />
        <div
          ref={wheelRef}
          className="wheel"
          style={{
            width: size,
            height: size,
            transform: `rotate(${displayRotation}deg)`,
          }}
        >
          <canvas
            ref={canvasRef}
            width={size * 2}
            height={size * 2}
            style={{ width: size, height: size }}
          />
        </div>
      </div>

      <div className={styles.controlsRow}>
        <button
          onClick={spin}
          disabled={disabled || spinning}
          className={disabled || spinning ? styles.spinButtonDisabled : styles.spinButton}
        >
          {spinning ? "Spinning..." : "Spin Wheel"}
        </button>

        {showAutoSpin && onAutoSpinChange && (
          <label className={styles.autoSpinLabel}>
            <input
              type="checkbox"
              checked={autoSpinEnabled}
              onChange={(e) => onAutoSpinChange(e.target.checked)}
              className={styles.autoSpinCheckbox}
            />
            <span className={styles.autoSpinText}>
              Auto-spin (2s)
            </span>
          </label>
        )}

        {showAutoSpin && onRiggedChange && (
          <label className={styles.riggedLabel}>
            <input
              type="checkbox"
              checked={riggedEnabled}
              onChange={(e) => onRiggedChange(e.target.checked)}
              className={styles.riggedCheckbox}
            />
            <span className={styles.riggedText}>
              Rigged
            </span>
          </label>
        )}
      </div>
    </div>
  );
});

export default Wheel;
