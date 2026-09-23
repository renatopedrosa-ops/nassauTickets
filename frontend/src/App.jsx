import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { Layout } from './components/Layout.jsx';
import { ProtectedRoute } from './components/ProtectedRoute.jsx';
import { AuthProvider } from './context/AuthContext.jsx';
import { AttendantPage } from './pages/AttendantPage.jsx';
import { HomePage } from './pages/HomePage.jsx';
import { LoginPage } from './pages/LoginPage.jsx';
import { ManagerPage } from './pages/ManagerPage.jsx';
import { PanelPage } from './pages/PanelPage.jsx';
import { TotemPage } from './pages/TotemPage.jsx';

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Telas de quiosque, em tela cheia */}
          <Route path="/totem" element={<TotemPage />} />
          <Route path="/painel" element={<PanelPage />} />

          <Route element={<Layout />}>
            <Route path="/" element={<HomePage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/atendimento" element={<ProtectedRoute><AttendantPage /></ProtectedRoute>} />
            <Route path="/gestao" element={<ProtectedRoute role="GESTOR"><ManagerPage /></ProtectedRoute>} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
