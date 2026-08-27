import { BrowserRouter, Route, Routes } from 'react-router-dom'
import AppLayout from './components/AppLayout'
import RequireAuth from './components/RequireAuth'
import { AuthProvider } from './contexts/AuthContext'
import Bloqueado from './pages/Bloqueado'
import Cadastro from './pages/auth/Cadastro'
import Login from './pages/auth/Login'
import Dashboard from './pages/Dashboard'
import Placeholder from './pages/Placeholder'

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/cadastro" element={<Cadastro />} />
          <Route path="/bloqueado" element={<Bloqueado />} />

          <Route
            element={
              <RequireAuth>
                <AppLayout />
              </RequireAuth>
            }
          >
            <Route path="/" element={<Dashboard />} />
            <Route path="/orcamentos" element={<Placeholder title="Orçamentos" />} />
            <Route path="/ordens" element={<Placeholder title="Ordens de Produção" />} />
            <Route path="/nesting" element={<Placeholder title="Nesting" />} />
            <Route path="/clientes" element={<Placeholder title="Clientes" />} />
            <Route path="/parametros" element={<Placeholder title="Parâmetros" />} />
            <Route path="/historicos" element={<Placeholder title="Históricos" />} />
            <Route path="/configuracoes" element={<Placeholder title="Configurações" />} />
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}
