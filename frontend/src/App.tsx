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
        <h1>School Admission System</h1>
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
