"use client";

import { useRef, useCallback, useEffect, forwardRef, useImperativeHandle, useState } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import styles from "./Wheel.module.css";

gsap.registerPlugin(useGSAP);

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
  const tweenRef = useRef<gsap.core.Tween | null>(null);
  const [size, setSize] = useState(380);

  // Boundary detection state
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

  const spin = useCallback(() => {
    if (disabled || spinning) return;

    // Kill any existing tween
    if (tweenRef.current) {
      tweenRef.current.kill();
      tweenRef.current = null;
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
      const fullRotations = 5 + Math.random() * 4;
      newRotation = currentRotationRef.current + fullRotations * 360 + targetAngle - (currentRotationRef.current % 360);
    } else {
      // Normal random spin
      const fullRotations = 5 + Math.random() * 4;
      const randomAngle = Math.random() * 360;
      const totalRotation = fullRotations * 360 + randomAngle;
      const candidateRotation = currentRotationRef.current + totalRotation;

      // Calculate where the pointer would land
      const finalAngle = candidateRotation % 360;
      const pointerAngle = (360 - finalAngle + 360) % 360;
      segmentIndex = Math.floor(pointerAngle / segmentAngle) % segments.length;

      newRotation = candidateRotation;
    }

    // Initialize previous segment for boundary detection
    const wheel = wheelRef.current;
    if (wheel) {
      const currentRot = gsap.getProperty(wheel, "rotation") as number;
      const pa = ((360 - (currentRot % 360)) + 360) % 360;
      previousSegmentRef.current = Math.floor(pa / segmentAngle) % segments.length;
    }

    // Animate with GSAP
    if (wheel) {
      tweenRef.current = gsap.to(wheel, {
        rotation: newRotation,
        duration: 4,
        ease: "expo.out",
        onUpdate: () => {
          const currentRot = gsap.getProperty(wheel, "rotation") as number;
          const sa = segmentAngleRef.current;
          const numSegs = segmentsRef.current.length;

          const pa = ((360 - (currentRot % 360)) + 360) % 360;
          const currentSegment = Math.floor(pa / sa) % numSegs;

          if (currentSegment !== previousSegmentRef.current) {
            previousSegmentRef.current = currentSegment;

            const pointer = pointerRef.current;
            if (pointer) {
              pointer.classList.remove("bouncing");
              requestAnimationFrame(() => {
                pointer.classList.add("bouncing");
              });
            }
          }
        },
        onComplete: () => {
          tweenRef.current = null;
          onResult(segments[segmentIndex], segmentIndex);
        },
      });
    }

    currentRotationRef.current = newRotation;
    setDisplayRotation(newRotation);
  }, [disabled, spinning, onSpinStart, onResult, segments, segmentAngle, riggedEnabled, currentPlayerName, riggedPlayerName]);

  const cancelSpin = useCallback(() => {
    if (tweenRef.current) {
      tweenRef.current.kill();
      tweenRef.current = null;
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (tweenRef.current) {
        tweenRef.current.kill();
      }
    };
  }, []);

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
