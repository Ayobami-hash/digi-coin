import { AuthProvider, useAuth } from "./context/AuthContext";
import AuthPage from "./pages/AuthPage";
import AuthCallback from "./pages/AuthCallback";
import DigiCoinApp from "./DigiCoinApp";
import AdminPage from "./pages/AdminPage";

function Gate() {
  const { user, loading } = useAuth();
  const pathname = window.location.pathname;
  const isAdminPath = pathname === "/admin";
  const isAuthCallbackPath = pathname === "/auth/callback";

  // Google OAuth redirects here with ?token=... — handle this before the
  // loading/user checks below, since AuthCallback needs to run even
  // while the AuthProvider's initial /me check may still be settling.
  if (isAuthCallbackPath) {
    return <AuthCallback />;
  }

  if (loading) {
    return (
      <div style={{ padding: 40, textAlign: "center", color: "#63627A", fontFamily: "'Work Sans', sans-serif" }}>
        Loading…
      </div>
    );
  }

  if (!user) return <AuthPage />;

  if (isAdminPath) {
    if (!user.is_admin) {
      return (
        <div style={{ padding: 40, textAlign: "center", color: "#63627A", fontFamily: "'Work Sans', sans-serif" }}>
          You don't have access to this page.
        </div>
      );
    }
    return (
      <AdminPage
        onBack={() => {
          window.history.pushState({}, "", "/");
          window.location.reload();
        }}
      />
    );
  }

  return <DigiCoinApp />;
}

export default function App() {
  return (
    <AuthProvider>
      <Gate />
    </AuthProvider>
  );
}