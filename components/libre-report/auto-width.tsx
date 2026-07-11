import { useEffect, useRef, useState, type ReactElement, type ReactNode } from "react";
import { flushSync } from "react-dom";

/**
 * Measures its own rendered width and hands it to the child render-prop, so
 * SVG charts can draw at the real on-screen width (keeping absolute font
 * sizes legible on phones) instead of down-scaling a fixed-width drawing.
 *
 * While printing, charts fall back to `printWidth` so the printed report
 * keeps the original paper proportions regardless of the screen it was
 * printed from.
 */
export function AutoWidth({
  min = 220,
  printWidth = 700,
  children,
}: {
  min?: number;
  printWidth?: number;
  children: (width: number) => ReactNode;
}): ReactElement {
  const ref = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState<number | null>(null);
  const [printing, setPrinting] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const measure = () => {
      const w = el.getBoundingClientRect().width;
      if (w > 0) setWidth(Math.round(w));
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    // beforeprint fires synchronously ahead of print layout, so the state
    // change must be flushed to the DOM inside the handler itself.
    const onBefore = () => flushSync(() => setPrinting(true));
    const onAfter = () => setPrinting(false);
    window.addEventListener("beforeprint", onBefore);
    window.addEventListener("afterprint", onAfter);
    return () => {
      ro.disconnect();
      window.removeEventListener("beforeprint", onBefore);
      window.removeEventListener("afterprint", onAfter);
    };
  }, []);

  const w = printing ? printWidth : width === null ? null : Math.max(min, width);
  return (
    <div ref={ref} className="lr-autowidth">
      {w === null ? null : children(w)}
    </div>
  );
}
