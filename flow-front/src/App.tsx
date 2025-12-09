
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { LoaderProvider } from "@/components/providers/LoaderProvider";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import ForgotPasswordPage from "./pages/ForgotPasswordPage";
import ProjectsPage from "./pages/ProjectsPage";
import VelocityPage from "./pages/VelocityPage";
import UsersPage from "./pages/UsersPage";
import TeamsPage from "./pages/TeamsPage";
import SchedulesPage from "./pages/SchedulesPage";
import ScheduleDetailsPage from "./pages/ScheduleDetailsPage";
import NotFound from "./pages/NotFound";
import { ProtectedRoute } from "./components/auth/ProtectedRoute";
import { AuthProvider } from "./components/auth/AuthProvider";
import AppLayout from "./components/layout/AppLayout";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <LoaderProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AuthProvider>
          <Routes>
            {/* Rotas públicas */}
            <Route path="/" element={<LoginPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />
            
            {/* Rotas protegidas */}
            <Route path="/projects" element={
              <ProtectedRoute allowedRoles={['admin', 'user', 'manager', 'techlead', 'qa']}>
                <AppLayout>
                  <ProjectsPage />
                </AppLayout>
              </ProtectedRoute>
            } />
            <Route path="/velocity" element={
              <ProtectedRoute allowedRoles={['admin', 'user', 'manager', 'techlead', 'qa']}>
                <AppLayout>
                  <VelocityPage />
                </AppLayout>
              </ProtectedRoute>
            } />
            <Route path="/users" element={
              <ProtectedRoute allowedRoles={['admin', 'manager', 'techlead']}>
                <AppLayout>
                  <UsersPage />
                </AppLayout>
              </ProtectedRoute>
            } />
            <Route path="/teams" element={
              <ProtectedRoute allowedRoles={['admin', 'manager', 'techlead']}>
                <AppLayout>
                  <TeamsPage />
                </AppLayout>
              </ProtectedRoute>
            } />
            <Route path="/schedules" element={
              <ProtectedRoute allowedRoles={['admin', 'manager', 'techlead', 'user', 'client', 'qa']}>
                <AppLayout>
                  <SchedulesPage />
                </AppLayout>
              </ProtectedRoute>
            } />
            <Route path="/schedules/:id" element={
              <ProtectedRoute allowedRoles={['admin', 'manager', 'techlead', 'user', 'client', 'qa']}>
                <AppLayout>
                  <ScheduleDetailsPage />
                </AppLayout>
              </ProtectedRoute>
            } />
            <Route path="/projects/:id/schedule" element={
              <ProtectedRoute allowedRoles={['admin', 'manager', 'techlead', 'user', 'client', 'qa']}>
                <AppLayout>
                  <ScheduleDetailsPage />
                </AppLayout>
              </ProtectedRoute>
            } />

            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
      </LoaderProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
