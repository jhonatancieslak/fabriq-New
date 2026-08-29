import { BrowserRouter, Route, Routes } from 'react-router-dom'
import AppLayout from './components/AppLayout'
import RequireAuth from './components/RequireAuth'
import { AuthProvider } from './contexts/AuthContext'
import Bloqueado from './pages/Bloqueado'
import Cadastro from './pages/auth/Cadastro'
import Login from './pages/auth/Login'
import Dashboard from './pages/Dashboard'
import Placeholder from './pages/Placeholder'
import Parametros from './pages/Parametros'
import Clientes from './pages/Clientes'
import Orcamentos from './pages/Orcamentos'
import QuoteForm from './pages/Orcamentos/QuoteForm'
import Ordens from './pages/Ordens'
import OrderDetail from './pages/Ordens/OrderDetail'
import Nesting from './pages/Nesting'
import NestingForm from './pages/Nesting/NestingForm'

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
            <Route path="/orcamentos" element={<Orcamentos />} />
            <Route path="/orcamentos/:id" element={<QuoteForm />} />
            <Route path="/ordens" element={<Ordens />} />
            <Route path="/ordens/:id" element={<OrderDetail />} />
            <Route path="/nesting" element={<Nesting />} />
            <Route path="/nesting/:id" element={<NestingForm />} />
            <Route path="/clientes" element={<Clientes />} />
            <Route path="/parametros" element={<Parametros />} />
            <Route path="/historicos" element={<Placeholder title="Históricos" />} />
            <Route path="/configuracoes" element={<Placeholder title="Configurações" />} />
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}
