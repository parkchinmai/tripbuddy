import React, { useRef } from 'react';

export interface Position {
  x: number;
  y: number;
}

export const DEFAULT_POSITION: Position = { x: 50, y: 50 };

function clampNum(n: number): number {
  return Math.min(100, Math.max(0, isFinite(n) ? n : 50));
}

export function parsePosition(value?: string): Position {
  if (!value) return { ...DEFAULT_POSITION };
  const nums = value.match(/-?[\d.]+/g) || [];
  const x = nums[0] !== undefined ? clampNum(parseFloat(nums[0])) : 50;
  const y = nums[1] !== undefined ? clampNum(parseFloat(nums[1])) : 50;
  return { x, y };
}

export function positionToCss(pos: Position): string {
  return `${pos.x}% ${pos.y}%`;
}

interface ImagePositionPickerProps {
  src: string;
  position: Position;
  onPositionChange: (pos: Position) => void;
  aspect?: number;
  className?: string;
}

export default function ImagePositionPicker({
  src,
  position,
  onPositionChange,
  aspect = 1,
  className = '',
}: ImagePositionPickerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const draggingRef = useRef(false);
  const lastRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const posRef = useRef(position);
  posRef.current = position;

  const handlePointerDown = (e: React.PointerEvent) => {
    draggingRef.current = true;
    lastRef.current = { x: e.clientX, y: e.clientY };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!draggingRef.current) return;
    const container = containerRef.current;
    const img = imgRef.current;
    if (!container || !img) return;
    if (!img.naturalWidth || !img.naturalHeight) return;
    const cRect = container.getBoundingClientRect();
    const containerW = cRect.width;
    const containerH = cRect.height;
    const imgRatio = img.naturalWidth / img.naturalHeight;
    const containerRatio = containerW / containerH;
    const drawW = imgRatio > containerRatio ? containerH * imgRatio : containerW;
    const drawH = imgRatio > containerRatio ? containerH : containerW / imgRatio;
    const overflowX = drawW - containerW;
    const overflowY = drawH - containerH;
    const dx = e.clientX - lastRef.current.x;
    const dy = e.clientY - lastRef.current.y;
    lastRef.current = { x: e.clientX, y: e.clientY };
    const next = { ...posRef.current };
    if (overflowX > 0.5) {
      next.x = clampNum(next.x - (dx / overflowX) * 100);
    }
    if (overflowY > 0.5) {
      next.y = clampNum(next.y - (dy / overflowY) * 100);
    }
    onPositionChange(next);
  };

  const stopDragging = () => {
    draggingRef.current = false;
  };

  return (
    <div
      ref={containerRef}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={stopDragging}
      onPointerCancel={stopDragging}
      className={`relative overflow-hidden select-none touch-none rounded-xl border-2 border-slate-200 cursor-grab active:cursor-grabbing ${className}`}
      style={{ aspectRatio: String(aspect), width: '100%' }}
    >
      <img
        ref={imgRef}
        src={src}
        alt=""
        draggable={false}
        onDragStart={e => e.preventDefault()}
        className="absolute inset-0 w-full h-full object-cover pointer-events-none"
        style={{ objectPosition: positionToCss(posRef.current) }}
      />
    </div>
  );
}
