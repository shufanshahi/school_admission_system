/** Smooth-scrolls to an element on the page (the app uses hash routing, so plain #anchors are taken). */
export function scrollToId(id: string): void {
  const el = document.getElementById(id);
  if (!el) return;
  const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;
  el.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
}
