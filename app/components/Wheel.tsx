"use client";

import { useRef, useCallback, useEffect, forwardRef, useImperativeHandle } from "react";

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
  size?: number;
  autoSpinEnabled?: boolean;
  onAutoSpinChange?: (enabled: boolean) => void;
  showAutoSpin?: boolean;
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
  size = 380,
  autoSpinEnabled = false,
  onAutoSpinChange,
  showAutoSpin = false,
}, ref) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const currentRotationRef = useRef(0);
  const wheelRef = useRef<HTMLDivElement>(null);
  const pointerRef = useRef<HTMLDivElement>(null);
  const spinTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Boundary detection RAF loop
  const observerRef = useRef<number | null>(null);
  const previousSegmentRef = useRef<number>(0);

  const segmentAngle = 360 / segments.length;

  // Store mutable values in refs for the observer loop
  const segmentsRef = useRef(segments);
  const segmentAngleRef = useRef(segmentAngle);

  useEffect(() => { segmentsRef.current = segments; }, [segments]);
  useEffect(() => { segmentAngleRef.current = segmentAngle; }, [segmentAngle]);

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

    // Random 3-6 full rotations + random final position
    const fullRotations = 3 + Math.random() * 3;
    const randomAngle = Math.random() * 360;
    const totalRotation = fullRotations * 360 + randomAngle;
    const newRotation = currentRotationRef.current + totalRotation;

    // Calculate result segment ahead of time (same logic as before)
    const finalAngle = newRotation % 360;
    const pointerAngle = (360 - finalAngle + 360) % 360;
    const segmentIndex = Math.floor(pointerAngle / segmentAngle) % segments.length;

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

    // Start boundary detection observer
    startObserver();

    // Fire result after transition completes (4s transition + small buffer)
    spinTimeoutRef.current = setTimeout(() => {
      spinTimeoutRef.current = null;
      stopObserver();
      onResult(segments[segmentIndex], segmentIndex);
    }, 4100);
  }, [disabled, spinning, onSpinStart, onResult, segments, segmentAngle, startObserver, stopObserver]);

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
    <div className="flex flex-col items-center gap-4">
      <div className="wheel-container" style={{ width: size, height: size }}>
        <div ref={pointerRef} className="wheel-pointer" />
        <div
          ref={wheelRef}
          className="wheel"
          style={{
            width: size,
            height: size,
            transform: `rotate(${currentRotationRef.current}deg)`,
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

      <div className="flex flex-col sm:flex-row items-center gap-3 w-full justify-center">
        <button
          onClick={spin}
          disabled={disabled || spinning}
          className={`
            px-6 py-2 xl:px-8 xl:py-3 2xl:px-10 2xl:py-4 rounded-lg text-sm xl:text-base 2xl:text-lg font-bold uppercase tracking-wider
            transition-all duration-200
            ${
              disabled || spinning
                ? "bg-gray-600 text-gray-400 cursor-not-allowed"
                : "bg-accent hover:bg-accent-hover text-white shadow-lg hover:shadow-accent/30 hover:scale-105 active:scale-95"
            }
          `}
        >
          {spinning ? "Spinning..." : "Spin Wheel"}
        </button>

        {showAutoSpin && onAutoSpinChange && (
          <label className="flex items-center gap-2 px-4 py-2 xl:px-5 xl:py-3 2xl:px-6 2xl:py-4 bg-surface rounded-lg cursor-pointer hover:bg-surface-light transition-colors">
            <input
              type="checkbox"
              checked={autoSpinEnabled}
              onChange={(e) => onAutoSpinChange(e.target.checked)}
              className="cursor-pointer accent-accent w-3.5 h-3.5 xl:w-4 xl:h-4"
            />
            <span className="text-xs xl:text-sm 2xl:text-base font-medium text-text-muted whitespace-nowrap">
              Auto-spin (2s)
            </span>
          </label>
        )}
      </div>
    </div>
  );
});

export default Wheel;
