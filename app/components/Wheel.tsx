"use client";

import { useRef, useCallback, useEffect, useState, forwardRef, useImperativeHandle } from "react";

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
  const [rotation, setRotation] = useState(0);
  const currentRotationRef = useRef(0);
  const wheelRef = useRef<HTMLDivElement>(null);
  const spinTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const segmentAngle = 360 / segments.length;

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
      const lineSpacing = Math.max(10, size / 45); // Dynamic line spacing
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

    // Clear any existing spin timeout
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

    setRotation(newRotation);
    currentRotationRef.current = newRotation;

    // Calculate which segment the pointer lands on
    // Pointer is at top (0 degrees). Wheel rotates clockwise.
    // Final position = newRotation mod 360
    const finalAngle = newRotation % 360;
    // The pointer is at top, so segment 0 starts at top.
    // As wheel rotates clockwise by finalAngle, the segment at the pointer is:
    const pointerAngle = (360 - finalAngle + 360) % 360;
    const segmentIndex = Math.floor(pointerAngle / segmentAngle) % segments.length;

    // Fire result after animation completes
    spinTimeoutRef.current = setTimeout(() => {
      spinTimeoutRef.current = null;
      onResult(segments[segmentIndex], segmentIndex);
    }, 4100);
  }, [disabled, spinning, onSpinStart, onResult, segments, segmentAngle]);

  const cancelSpin = useCallback(() => {
    if (spinTimeoutRef.current) {
      clearTimeout(spinTimeoutRef.current);
      spinTimeoutRef.current = null;
    }
  }, []);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (spinTimeoutRef.current) {
        clearTimeout(spinTimeoutRef.current);
      }
    };
  }, []);

  useImperativeHandle(ref, () => ({
    spin,
    cancelSpin,
  }), [spin, cancelSpin]);

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="wheel-container" style={{ width: size, height: size }}>
        <div className="wheel-pointer" />
        <div
          ref={wheelRef}
          className="wheel"
          style={{
            width: size,
            height: size,
            transform: `rotate(${rotation}deg)`,
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
            px-10 py-4 xl:px-12 xl:py-5 2xl:px-14 2xl:py-6 rounded-xl text-lg xl:text-xl 2xl:text-2xl font-bold uppercase tracking-wider
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
          <label className="flex items-center gap-2 px-4 py-3 bg-surface rounded-lg cursor-pointer hover:bg-surface-light transition-colors">
            <input
              type="checkbox"
              checked={autoSpinEnabled}
              onChange={(e) => onAutoSpinChange(e.target.checked)}
              className="cursor-pointer accent-accent w-4 h-4"
            />
            <span className="text-sm font-medium text-text-muted whitespace-nowrap">
              Auto-spin (2s)
            </span>
          </label>
        )}
      </div>
    </div>
  );
});

export default Wheel;
