import { useCallback, useEffect, useRef, useState } from 'react';

interface Transform {
  x: number;
  y: number;
  k: number;
}

const IDENTITY: Transform = { x: 0, y: 0, k: 1 };
const MIN_SCALE = 0.2;
const MAX_SCALE = 8;

interface UsePanZoomResult {
  svgRef: React.RefObject<SVGSVGElement>;
  transform: string;
  scale: number;
  onPointerDown: (event: React.PointerEvent<SVGSVGElement>) => void;
  reset: () => void;
  isPanning: boolean;
}

/**
 * Pan/Zoom auf SVG-Container ueber ein verschachteltes <g transform={...}>.
 * - Mausrad zoomt auf den Cursor.
 * - Linke Maustaste + Drag verschiebt.
 * - reset() setzt auf Identitaet zurueck.
 */
export function usePanZoom(): UsePanZoomResult {
  const svgRef = useRef<SVGSVGElement>(null);
  const [transform, setTransform] = useState<Transform>(IDENTITY);
  const dragRef = useRef<
    | {
        startX: number;
        startY: number;
        baseX: number;
        baseY: number;
      }
    | null
  >(null);
  const [isPanning, setIsPanning] = useState(false);

  const clientToSvgPoint = useCallback((clientX: number, clientY: number) => {
    const svg = svgRef.current;
    if (!svg) return null;
    const matrix = svg.getScreenCTM();
    if (!matrix) return null;
    const point = svg.createSVGPoint();
    point.x = clientX;
    point.y = clientY;
    return point.matrixTransform(matrix.inverse());
  }, []);

  useEffect(() => {
    const el = svgRef.current;
    if (!el) return;

    const onWheel = (event: WheelEvent) => {
      event.preventDefault();
      const pointer = clientToSvgPoint(event.clientX, event.clientY);
      if (!pointer) return;
      const factor = event.deltaY < 0 ? 1.15 : 1 / 1.15;

      setTransform((current) => {
        const nextK = Math.max(MIN_SCALE, Math.min(MAX_SCALE, current.k * factor));
        const localX = (pointer.x - current.x) / current.k;
        const localY = (pointer.y - current.y) / current.k;
        return {
          k: nextK,
          x: pointer.x - localX * nextK,
          y: pointer.y - localY * nextK,
        };
      });
    };

    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, [clientToSvgPoint]);

  useEffect(() => {
    const onMove = (event: PointerEvent) => {
      const drag = dragRef.current;
      if (!drag) return;
      const pointer = clientToSvgPoint(event.clientX, event.clientY);
      if (!pointer) return;
      setTransform((current) => ({
        ...current,
        x: drag.baseX + (pointer.x - drag.startX),
        y: drag.baseY + (pointer.y - drag.startY),
      }));
    };
    const onUp = () => {
      if (dragRef.current) {
        dragRef.current = null;
        setIsPanning(false);
      }
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onUp);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onUp);
    };
  }, [clientToSvgPoint]);

  const onPointerDown = useCallback(
    (event: React.PointerEvent<SVGSVGElement>) => {
      if (event.pointerType === 'mouse' && event.button !== 0) return;
      const target = event.target as Element;
      if (target.closest('[data-pan-ignore="true"]')) return;
      const pointer = clientToSvgPoint(event.clientX, event.clientY);
      if (!pointer) return;
      dragRef.current = {
        startX: pointer.x,
        startY: pointer.y,
        baseX: transform.x,
        baseY: transform.y,
      };
      setIsPanning(true);
    },
    [clientToSvgPoint, transform.x, transform.y],
  );

  const reset = useCallback(() => setTransform(IDENTITY), []);

  const transformStr = `translate(${transform.x}, ${transform.y}) scale(${transform.k})`;

  return {
    svgRef,
    transform: transformStr,
    scale: transform.k,
    onPointerDown,
    reset,
    isPanning,
  };
}
