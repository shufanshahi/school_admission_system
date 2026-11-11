import { useCallback, useEffect, useMemo, useState } from "react";
import { ApplicationPage } from "./components/ApplicationPage";
import { ClassList } from "./components/ClassList";
import { CreateClassForm } from "./components/CreateClassForm";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { HomePage } from "./components/home/HomePage";
import { Footer } from "./components/layout/Footer";
import { SiteHeader } from "./components/layout/SiteHeader";
import { MyApplications } from "./components/MyApplications";
import { NoticeBanner } from "./components/NoticeBanner";
import { NotificationProvider } from "./context/NotificationContext";
import { StudentDialogProvider } from "./context/StudentDialogContext";
import { StudentProvider } from "./context/StudentContext";
import { useHashRoute } from "./hooks/useHashRoute";

function Shell() {
  const route = useHashRoute();
  const [idOpen, setIdOpen] = useState(false);

  // On Home the student-number field is part of the page, so just bring it into view;
  // everywhere else it lives in a popover under the header.
  const openStudentId = useCallback(() => {
    const field = document.getElementById("student-id");
    if (field) {
      const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;
      field.scrollIntoView({ block: "center", behavior: reduce ? "auto" : "smooth" });
      field.focus();
    } else {
      setIdOpen(true);
    }
  }, []);
  const toggleStudentId = useCallback(() => (idOpen ? setIdOpen(false) : openStudentId()), [idOpen, openStudentId]);
  const closeStudentId = useCallback(() => setIdOpen(false), []);

  // A new page starts at the top, with the popover closed.
  useEffect(() => {
    setIdOpen(false);
    window.scrollTo({ top: 0 });
  }, [route]);

  const dialog = useMemo(() => ({ openStudentId }), [openStudentId]);

  return (
    <StudentDialogProvider value={dialog}>
      <a
        className="skip-link"
        href="#main"
        onClick={(e) => {
          e.preventDefault();   // "#main" would be read as a page route
          document.getElementById("main")?.focus();
        }}
      >
        Skip to content
      </a>

      <SiteHeader route={route} idOpen={idOpen} onToggleId={toggleStudentId} onCloseId={closeStudentId} />
      <NoticeBanner />

      <main id="main" tabIndex={-1}>
        {/* key: switching screens starts a fresh boundary, so one crash never sticks */}
        <ErrorBoundary key={route.name === "application" ? `app-${route.holdId}` : route.name}>
          {route.name === "home" && <HomePage />}
          {route.name === "classes" && <ClassList />}
          {route.name === "create" && <CreateClassForm />}
          {route.name === "mine" && <MyApplications />}
          {route.name === "application" && <ApplicationPage holdId={route.holdId} />}
        </ErrorBoundary>
      </main>

      <Footer />
    </StudentDialogProvider>
  );
}

export default function App() {
  return (
    <StudentProvider>
      <NotificationProvider>
        <Shell />
      </NotificationProvider>
    </StudentProvider>
  );
}
