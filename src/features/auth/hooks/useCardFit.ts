import { useEffect, useRef } from "react";

export function useCardFit() {
  const stageRef = useRef<HTMLElement>(null);
  const cardRef = useRef<HTMLElement>(null);
  const fitRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const stage = stageRef.current;
    const card = cardRef.current;
    const fit = fitRef.current;
    if (!stage || !card || !fit) return;

    let queued = false;
    const measure = () => {
      queued = false;
      const css = getComputedStyle(stage);
      const available =
        stage.clientHeight -
        parseFloat(css.paddingTop) -
        parseFloat(css.paddingBottom);
      const scale = Math.min(1, Math.max(0.68, available / card.offsetHeight));
      fit.style.setProperty("--card-fit", scale.toFixed(4));
    };
    const schedule = () => {
      if (!queued) {
        queued = true;
        requestAnimationFrame(measure);
      }
    };

    const ro1 = new ResizeObserver(schedule);
    const ro2 = new ResizeObserver(schedule);
    ro1.observe(stage);
    ro2.observe(card);
    window.addEventListener("resize", schedule, { passive: true });
    if (window.visualViewport)
      window.visualViewport.addEventListener("resize", schedule, {
        passive: true,
      });
    document.fonts.ready.then(schedule);
    measure();

    return () => {
      ro1.disconnect();
      ro2.disconnect();
      window.removeEventListener("resize", schedule);
      if (window.visualViewport)
        window.visualViewport.removeEventListener("resize", schedule);
    };
  }, []);

  return { stageRef, fitRef, cardRef };
}
