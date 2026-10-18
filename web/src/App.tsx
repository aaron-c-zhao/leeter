import { NavLink, Route, Routes } from "react-router-dom";
import { DashboardPage } from "./pages/DashboardPage";
import { BankPage } from "./pages/BankPage";
import { SessionsPage } from "./pages/SessionsPage";
import { SessionDetailPage } from "./pages/SessionDetailPage";
import { RoadmapPage } from "./pages/RoadmapPage";
import { ThemeProvider, useTheme } from "./theme";
import { ToastHost } from "./components/Toast";

function ThemeToggle() {
  const { theme, toggle } = useTheme();
  return (
    <button className="theme-toggle" onClick={toggle} title="Toggle light/dark theme" aria-label="Toggle theme">
      {theme === "dark" ? "Light mode" : "Dark mode"}
    </button>
  );
}

export function App() {
  return (
    <ThemeProvider>
      <div className="app-shell">
        <header className="app-header">
          <span className="app-name">leeter</span>
          <nav>
            <NavLink to="/" end className={({ isActive }) => (isActive ? "nav-link active" : "nav-link")}>
              Dashboard
            </NavLink>
            <NavLink to="/bank" className={({ isActive }) => (isActive ? "nav-link active" : "nav-link")}>
              Problem bank
            </NavLink>
            <NavLink to="/sessions" className={({ isActive }) => (isActive ? "nav-link active" : "nav-link")}>
              History
            </NavLink>
            <NavLink to="/roadmap" className={({ isActive }) => (isActive ? "nav-link active" : "nav-link")}>
              Roadmap
            </NavLink>
          </nav>
          <ThemeToggle />
        </header>
        <main className="app-main">
          <Routes>
            <Route path="/" element={<DashboardPage />} />
            <Route path="/bank" element={<BankPage />} />
            <Route path="/sessions" element={<SessionsPage />} />
            <Route path="/sessions/:id" element={<SessionDetailPage />} />
            <Route path="/roadmap" element={<RoadmapPage />} />
          </Routes>
        </main>
        <ToastHost />
      </div>
    </ThemeProvider>
  );
}
