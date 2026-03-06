import { BrowserRouter, Routes, Route, Navigate, Outlet } from "react-router-dom";

import Login from "./components/Login";
import Code from "./components/Code";
import Sidebar from "./components/Sidebar";
import Header from "./components/Header";
import Dashboard from "./components/Dashboard";
import Produits from "./components/Produits";
import Partenaires from "./components/Partenaires";
import Wallet from "./components/Wallet";
import Validation from "./components/Validation";
import Commissions from "./components/Commissions";
import Rapports from "./components/Rapports";
import Utilisateurs from "./components/Utilisateurs";
import useAuth from "./context/auth/utils";
import AuthProvider from "./context/auth/Provider";
/* import Logout from "./components/Logout"; */

/* ================= LAYOUT ================= */

function DashboardLayout() {
  return (
    <div className="flex">
      <Sidebar />
      <div className="flex-1 bg-gray-50 min-h-screen">
        <Header />
        <div className="p-6">
          <Outlet />
        </div>
      </div>
    </div>
  );
}

/* ================= ROUTE PROTECTION ================= */

function PrivateRoute() {
  const auth = useAuth();
 console.log(auth);
  
  return (auth && auth.user) ? <Outlet /> : <Navigate to="/login" replace />;
}

function AuthRoute() {
  const auth = useAuth();
  const tempToken = localStorage.getItem("tempToken");

  if (auth && auth.user) return <Navigate to="/dashboard" replace />;
  if (tempToken) return <Navigate to="/code" replace />;

  return <Outlet />;
}

function CodeRoute() {
  const token = localStorage.getItem("token");
  const tempToken = localStorage.getItem("tempToken");

  if (token) return <Navigate to="/dashboard" replace />;
  return tempToken ? <Outlet /> : <Navigate to="/login" replace />;
}

/* ================= APP ================= */

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>

          {/* Racine */}
          <Route path="/" element={<Navigate to="/login" replace />} />

          {/* LOGIN */}
          <Route element={<AuthRoute />}>
            <Route path="/login" element={<Login />} />
          </Route>

          {/* CODE OTP */}
          <Route element={<CodeRoute />}>
            <Route path="/code" element={<Code />} />
          </Route>

          {/* DASHBOARD PROTÉGÉ */}
          <Route element={<PrivateRoute />}>
            <Route element={<DashboardLayout />}>
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/produits" element={<Produits />} />
              <Route path="/partenaires" element={<Partenaires />} />
              <Route path="/wallet" element={<Wallet />} />
              <Route path="/validation" element={<Validation />} />
              <Route path="/commissions" element={<Commissions />} />
              <Route path="/rapports" element={<Rapports />} />
              <Route path="/utilisateurs" element={<Utilisateurs />} />
            </Route>
          </Route>

          {/* LOGOUT */}
        {/*  <Route path="/logout" element={<Logout />} /> */}

          {/* 404 */}
        {/*   <Route path="*" element={<Navigate to="/login" replace />} /> */}

        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}