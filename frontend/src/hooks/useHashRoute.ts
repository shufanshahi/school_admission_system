import { useEffect, useState } from "react";

export type Route =
  | { name: "home" }
  | { name: "classes" }
  | { name: "create" }
  | { name: "mine" }
  | { name: "application"; holdId: string };

function parse(hash: string): Route {
  const path = hash.replace(/^#\/?/, "");
  const [first, second] = path.split("/");
  if (first === "classes") return { name: "classes" };
  if (first === "create") return { name: "create" };
  if (first === "mine") return { name: "mine" };
  if (first === "applications" && second) return { name: "application", holdId: decodeURIComponent(second) };
  return { name: "home" };   // "", "#/" and anything unknown
}

/** Tiny hash router: the page survives a refresh because it lives in the URL. */
export function useHashRoute(): Route {
  const [route, setRoute] = useState<Route>(() => parse(window.location.hash));
  useEffect(() => {
    const onChange = () => setRoute(parse(window.location.hash));
    window.addEventListener("hashchange", onChange);
    return () => window.removeEventListener("hashchange", onChange);
  }, []);
  return route;
}

export function goToApplication(holdId: string): void {
  window.location.hash = `#/applications/${encodeURIComponent(holdId)}`;
}
