import "@/App.css";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "@/components/ui/sonner";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import Login from "@/pages/Login";
import AppLayout from "@/layouts/AppLayout";
import Dashboard from "@/pages/Dashboard";
import SearchPage from "@/pages/SearchPage";
import RecordsPage from "@/pages/RecordsPage";
import UploadPage from "@/pages/UploadPage";
import AddRecordPage from "@/pages/AddRecordPage";
import RecordDetailPage from "@/pages/RecordDetailPage";

function Protected({ children }) {
  const { token } = useAuth();
  if (!token) return <Navigate to="/login" replace />;
  return children;
}

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route
            path="/"
            element={
              <Protected>
                <AppLayout />
              </Protected>
            }
          >
            <Route index element={<Dashboard />} />
            <Route path="search" element={<SearchPage />} />
            <Route path="records" element={<RecordsPage />} />
            <Route path="records/:id" element={<RecordDetailPage />} />
            <Route path="upload" element={<UploadPage />} />
            <Route path="add" element={<AddRecordPage />} />
          </Route>
        </Routes>
      </BrowserRouter>
      <Toaster richColors position="top-right" />
    </AuthProvider>
  );
}

export default App;
