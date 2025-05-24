
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import Layout from "@/components/layout/Layout";
import Login from "@/pages/Login";
import Dashboard from "@/pages/Dashboard";
import Unauthorized from "@/pages/Unauthorized";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutos
      gcTime: 10 * 60 * 1000, // 10 minutos
    },
  },
});

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AuthProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            {/* Ruta de login */}
            <Route path="/login" element={<Login />} />
            <Route path="/unauthorized" element={<Unauthorized />} />
            
            {/* Rutas protegidas */}
            <Route path="/" element={
              <ProtectedRoute>
                <Layout />
              </ProtectedRoute>
            }>
              <Route index element={<Navigate to="/dashboard" replace />} />
              <Route path="dashboard" element={<Dashboard />} />
              
              {/* Rutas para profesores */}
              <Route path="notas" element={
                <ProtectedRoute allowedRoles={['PROFESOR', 'ADMINISTRATIVO']}>
                  <div className="p-6">
                    <h1 className="text-2xl font-bold">Registro de Notas</h1>
                    <p className="text-gray-600 mt-2">Funcionalidad en desarrollo...</p>
                  </div>
                </ProtectedRoute>
              } />
              
              <Route path="asistencias" element={
                <ProtectedRoute allowedRoles={['PROFESOR', 'ADMINISTRATIVO']}>
                  <div className="p-6">
                    <h1 className="text-2xl font-bold">Control de Asistencias</h1>
                    <p className="text-gray-600 mt-2">Funcionalidad en desarrollo...</p>
                  </div>
                </ProtectedRoute>
              } />
              
              <Route path="participaciones" element={
                <ProtectedRoute allowedRoles={['PROFESOR', 'ADMINISTRATIVO']}>
                  <div className="p-6">
                    <h1 className="text-2xl font-bold">Registro de Participaciones</h1>
                    <p className="text-gray-600 mt-2">Funcionalidad en desarrollo...</p>
                  </div>
                </ProtectedRoute>
              } />
              
              <Route path="predicciones" element={
                <ProtectedRoute allowedRoles={['PROFESOR', 'ADMINISTRATIVO']}>
                  <div className="p-6">
                    <h1 className="text-2xl font-bold">Predicciones de IA</h1>
                    <p className="text-gray-600 mt-2">Funcionalidad en desarrollo...</p>
                  </div>
                </ProtectedRoute>
              } />
              
              {/* Rutas para administrativos */}
              <Route path="usuarios" element={
                <ProtectedRoute allowedRoles={['ADMINISTRATIVO']}>
                  <div className="p-6">
                    <h1 className="text-2xl font-bold">Gestión de Usuarios</h1>
                    <p className="text-gray-600 mt-2">Funcionalidad en desarrollo...</p>
                  </div>
                </ProtectedRoute>
              } />
              
              <Route path="materias" element={
                <ProtectedRoute allowedRoles={['ADMINISTRATIVO']}>
                  <div className="p-6">
                    <h1 className="text-2xl font-bold">Gestión de Materias</h1>
                    <p className="text-gray-600 mt-2">Funcionalidad en desarrollo...</p>
                  </div>
                </ProtectedRoute>
              } />
              
              <Route path="cursos" element={
                <ProtectedRoute allowedRoles={['ADMINISTRATIVO']}>
                  <div className="p-6">
                    <h1 className="text-2xl font-bold">Gestión de Cursos</h1>
                    <p className="text-gray-600 mt-2">Funcionalidad en desarrollo...</p>
                  </div>
                </ProtectedRoute>
              } />
              
              <Route path="reportes" element={
                <ProtectedRoute allowedRoles={['ADMINISTRATIVO']}>
                  <div className="p-6">
                    <h1 className="text-2xl font-bold">Reportes del Sistema</h1>
                    <p className="text-gray-600 mt-2">Funcionalidad en desarrollo...</p>
                  </div>
                </ProtectedRoute>
              } />
            </Route>
            
            {/* Ruta catch-all */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
