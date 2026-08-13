import { AuthProvider, useAuth } from "./context/AuthContext";
import AuthPage from "./pages/AuthPage";
import DigiCoinApp from "./DigiCoinApp"; // your existing component

function Gate() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div style={{ padding: 40, textAlign: "center", color: "#63627A", fontFamily: "'Work Sans', sans-serif" }}>
        Loading…
      </div>
    );
  }

  return user ? <DigiCoinApp /> : <AuthPage />;
}

export default function App() {
  return (
    <AuthProvider>
      <Gate />
    </AuthProvider>
  );
}