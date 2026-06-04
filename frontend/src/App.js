import "@/App.css";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "@/components/ui/sonner";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import Login from "@/pages/Login";
import Register from "@/pages/Register";
import AppLayout from "@/layouts/AppLayout";
import Dashboard from "@/pages/Dashboard";
import SearchPage from "@/pages/SearchPage";
import RecordsPage from "@/pages/RecordsPage";
import UploadPage from "@/pages/UploadPage";
import AddRecordPage from "@/pages/AddRecordPage";
import RecordDetailPage from "@/pages/RecordDetailPage";
import AdminUsersPage from "@/pages/AdminUsersPage";

function Protected({ children, adminOnly }) {
  const { token, user, bootstrapping, isAdmin } = useAuth();
  if (bootstrapping) {
    return <div className="min-h-screen flex items-center justify-center text-sm text-slate-400">Loading workspace...</div>;
  }
  if (!token || !user) return <Navigate to="/login" replace />;
  if (adminOnly && !isAdmin) return <Navigate to="/" replace />;
  return children;
}

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/" element={<Protected><AppLayout /></Protected>}>
            <Route index element={<Dashboard />} />
            <Route path="search" element={<SearchPage />} />
            <Route path="records" element={<RecordsPage />} />
            <Route path="records/:id" element={<RecordDetailPage />} />
            <Route path="upload" element={<Protected adminOnly><UploadPage /></Protected>} />
            <Route path="add" element={<Protected adminOnly><AddRecordPage /></Protected>} />
            <Route path="admin/users" element={<Protected adminOnly><AdminUsersPage /></Protected>} />
          </Route>
        </Routes>
      </BrowserRouter>
      <Toaster richColors position="top-right" />
    </AuthProvider>
  );
}

export default App;
