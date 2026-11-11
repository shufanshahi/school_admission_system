import { ApplicationPage } from "./components/ApplicationPage";
import { ClassList } from "./components/ClassList";
import { CreateClassForm } from "./components/CreateClassForm";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { MyApplications } from "./components/MyApplications";
import { NoticeBanner } from "./components/NoticeBanner";
import { StudentIdBar } from "./components/StudentIdBar";
import { NotificationProvider } from "./context/NotificationContext";
import { StudentProvider } from "./context/StudentContext";
import { useHashRoute } from "./hooks/useHashRoute";

const TABS = [
  { hash: "#/classes", label: "Classes", route: "classes" },
  { hash: "#/mine", label: "My applications", route: "mine" },
  { hash: "#/create", label: "Create class (Admin)", route: "create" },
] as const;

function Shell() {
  const route = useHashRoute();
  const activeTab = route.name === "application" ? "mine" : route.name;

  return (
    <div className="app">
      <header>
        <div className="app-bar">
          <span className="brand-mark" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none">
              <path d="M12 3.5 1.75 8.25 12 13l10.25-4.75L12 3.5Z" fill="currentColor" />
              <path
                d="M5 10.6v4.1c0 .5.28.95.73 1.17C7.12 16.6 9.42 17.5 12 17.5s4.88-.9 6.27-1.63c.45-.22.73-.67.73-1.17v-4.1"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
              />
              <path d="M22 8.5v4.4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
            </svg>
          </span>
          <h1>School Admission System</h1>
        </div>
        <StudentIdBar />
        <nav aria-label="Main">
          {TABS.map((tab) => (
            <a
              key={tab.hash}
              href={tab.hash}
              className={activeTab === tab.route ? "tab active" : "tab"}
              aria-current={activeTab === tab.route ? "page" : undefined}
            >
              {tab.label}
            </a>
          ))}
        </nav>
      </header>

      <NoticeBanner />

      <main>
        {/* key: switching screens starts a fresh boundary, so one crash never sticks */}
        <ErrorBoundary key={route.name === "application" ? `app-${route.holdId}` : route.name}>
          {route.name === "classes" && <ClassList />}
          {route.name === "create" && <CreateClassForm />}
          {route.name === "mine" && <MyApplications />}
          {route.name === "application" && <ApplicationPage holdId={route.holdId} />}
        </ErrorBoundary>
      </main>
    </div>
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
