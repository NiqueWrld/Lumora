import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Login from './pages/Auth/Login'
import Register from './pages/Auth/Register'
import ForgotPassword from './pages/Auth/ForgotPassword'
import Profile from './pages/Auth/Profile'
import Settings from './pages/Auth/Settings'
import Home from './pages/index'
import Dashboard from './pages/Dashboard'
import NotFound from './pages/NotFound'
import Layout from './components/Layout'
import { AuthProvider, useAuth } from './context/AuthContext'
import { ThemeProvider } from './context/ThemeContext'
import { ROUTES } from './lib/routes'

function AppRoutes() {
  const { user } = useAuth()

  return (
    <Routes>
      <Route path={ROUTES.HOME} element={<Layout showSidebar={false}><Home /></Layout>} />
      <Route path={ROUTES.LOGIN} element={<Login />} />
      <Route path={ROUTES.REGISTER} element={<Register />} />
      <Route path={ROUTES.FORGOT_PASSWORD} element={<ForgotPassword />} />
      <Route
        path={ROUTES.DASHBOARD}
        element={
          user
            ? <Layout><Dashboard user={user} /></Layout>
            : <Navigate to={ROUTES.LOGIN} replace />
        }
      />
      <Route
        path={ROUTES.PROFILE}
        element={
          user
            ? <Layout><Profile /></Layout>
            : <Navigate to={ROUTES.LOGIN} replace />
        }
      />
      <Route
        path={ROUTES.SETTINGS}
        element={
          user
            ? <Layout><Settings /></Layout>
            : <Navigate to={ROUTES.LOGIN} replace />
        }
      />
      <Route path="*" element={<NotFound />} />
    </Routes>
  )
}

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
          <AppRoutes />
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  )
}

export default App
