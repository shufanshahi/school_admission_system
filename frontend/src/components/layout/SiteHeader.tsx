import { useEffect, useRef, useState } from "react";
import { school } from "../../content/site";
import { useStudent } from "../../context/StudentContext";
import type { Route } from "../../hooks/useHashRoute";
import { Crest } from "../brand/Crest";
import { IconCheck, IconClose, IconMail, IconMenu, IconPhone, IconUser } from "../brand/icons";
import { StudentIdBar } from "../StudentIdBar";

const NAV = [
  { hash: "#/", label: "Home", route: "home" },
  { hash: "#/classes", label: "Places & Apply", route: "classes" },
  { hash: "#/mine", label: "My Applications", route: "mine" },
  { hash: "#/create", label: "Registrar (Admin)", route: "create" },
] as const;

export function SiteHeader({
  route,
  idOpen,
  onToggleId,
  onCloseId,
}: {
  route: Route;
  idOpen: boolean;
  onToggleId: () => void;
  onCloseId: () => void;
}) {
  const { studentId, isValid } = useStudent();
  const [menuOpen, setMenuOpen] = useState(false);
  const idWrap = useRef<HTMLDivElement>(null);
  const active = route.name === "application" ? "mine" : route.name;

  useEffect(() => setMenuOpen(false), [route]);

  // The student-number popover closes on Escape or a click outside it.
  useEffect(() => {
    if (!idOpen) return;
    const onDown = (e: MouseEvent) => {
      if (!idWrap.current?.contains(e.target as Node)) onCloseId();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCloseId();
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [idOpen, onCloseId]);

  useEffect(() => {
    if (idOpen) document.getElementById("student-id")?.focus();
  }, [idOpen]);

  return (
    <>
      <div className="topbar">
        <div className="container topbar-inner">
          <span>{school.announcement}</span>
          <span className="topbar-contact">
            <a href={`tel:${school.phone.replace(/\s/g, "")}`}><IconPhone size={14} /> {school.phone}</a>
            <a href={`mailto:${school.email}`}><IconMail size={14} /> {school.email}</a>
          </span>
        </div>
      </div>

      <header className="site-header">
        <div className="container site-header-inner">
          <a className="brand" href="#/" aria-label={`${school.name}, home`}>
            <Crest size={38} />
            <span className="brand-text">
              <span className="brand-name">{school.name}</span>
              <span className="brand-sub">Boarding and Day · Est. {school.founded}</span>
            </span>
          </a>

          <nav id="site-nav" className="site-nav" aria-label="Main" data-open={menuOpen}>
            {NAV.map((item) => (
              <a
                key={item.hash}
                href={item.hash}
                className="nav-link"
                aria-current={active === item.route ? "page" : undefined}
              >
                {item.label}
              </a>
            ))}
          </nav>

          <div className="id-wrap" ref={idWrap}>
            <button
              type="button"
              className={isValid ? "id-pill id-pill-valid" : "id-pill"}
              aria-haspopup="dialog"
              aria-expanded={idOpen}
              aria-label={isValid ? `Student ${studentId}, change` : "Enter student ID"}
              onClick={onToggleId}
            >
              {isValid ? <IconCheck size={16} /> : <IconUser size={16} />}
              <span className="pill-long">{isValid ? `Student ···${studentId.slice(-4)}` : "Enter student ID"}</span>
              <span className="pill-short">{isValid ? `···${studentId.slice(-4)}` : "Student ID"}</span>
              <span className="pill-tiny">{isValid ? `···${studentId.slice(-4)}` : "ID"}</span>
            </button>
            {idOpen && (
              <div className="id-popover" role="dialog" aria-label="Student identification">
                <h2>Student identification</h2>
                <StudentIdBar />
                <button type="button" className="btn btn-outline id-popover-close" onClick={onCloseId}>
                  Done
                </button>
              </div>
            )}
          </div>

          <button
            type="button"
            className="menu-btn"
            aria-expanded={menuOpen}
            aria-controls="site-nav"
            aria-label={menuOpen ? "Close menu" : "Open menu"}
            onClick={() => setMenuOpen((o) => !o)}
          >
            {menuOpen ? <IconClose size={22} /> : <IconMenu size={22} />}
          </button>
        </div>
      </header>
    </>
  );
}
