import { useEffect, useRef } from 'react';

interface VolumeMeterProps {
  level: number;
  label: string;
  id: string;
}

export default function VolumeMeter({ level, label, id }: VolumeMeterProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Draw meter
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Background track
    ctx.fillStyle = '#2d2d2d';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Level fill (Google Stitch theme colors)
    let fillStyle = '#81c995'; // green by default
    if (level > 0.8) {
      fillStyle = '#f28b82'; // red for clipping peaks
    } else if (level > 0.6) {
      fillStyle = '#fdd663'; // yellow warning
    }

    ctx.fillStyle = fillStyle;
    const fillWidth = Math.min(canvas.width, level * canvas.width);
    ctx.fillRect(0, 0, fillWidth, canvas.height);
  }, [level]);

  return (
    <div className="flex flex-col gap-1 w-full">
      <div className="flex justify-between text-xs text-stitch-muted">
        <label htmlFor={id}>{label}</label>
        <span>{Math.round(level * 100)}%</span>
      </div>
      <canvas
        id={id}
        ref={canvasRef}
        width={300}
        height={8}
        className="w-full h-2 rounded bg-stitch-border overflow-hidden"
      />
    </div>
  );
}
