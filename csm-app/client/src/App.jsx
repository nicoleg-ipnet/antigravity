import { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, NavLink, Navigate } from 'react-router-dom';
import { LayoutDashboard, Users, FileText, User, BarChart3, Sun, Moon, LogOut } from 'lucide-react';
import axios from 'axios';
import { AuthProvider, useAuth } from './context/AuthContext';
import Dashboard from './components/Dashboard';
import GlobalDashboard from './components/GlobalDashboard';
import Contracts from './components/Contracts';
import ActivityLog from './components/ActivityLog';
import ClientDashboard from './components/ClientDashboard';
import Login from './components/Login';

// Axios Interceptor para enviar o papel do usuário
axios.interceptors.request.use(config => {
  const user = JSON.parse(localStorage.getItem('csm_user'));
  if (user && user.role) {
    config.headers['x-user-role'] = user.role;
  }
  return config;
});

function AppContent() {
  const { user, logout, loading } = useAuth();
  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'dark');

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => (prev === 'dark' ? 'light' : 'dark'));
  };

  if (loading) return null;

  if (!user) {
    return <Login />;
  }

  return (
    <Router>
      <div className="app-container">
        {/* Sidebar */}
        <aside className="sidebar">
          <div className="sidebar-header" style={{ display: 'flex', flexDirection: 'column' }}>
            <h1 style={{ fontWeight: 900, color: '#660099', fontSize: '2rem', letterSpacing: '-0.02em' }}>PULSO</h1>
            <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginTop: '4px', lineHeight: 1.2 }}>
              Plataforma de Unificação, Logs e Sucesso Operacional.
            </span>
          </div>

          <nav>
            <NavLink to="/" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`} end>
              <BarChart3 size={20} />
              Visão Global
            </NavLink>

            <NavLink to="/panel" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
              <LayoutDashboard size={20} />
              Carteira de Clientes
            </NavLink>

            <NavLink to="/contracts" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
              <Users size={20} />
              Gestão de Contratos
            </NavLink>

            <NavLink to="/client-dashboard" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
              <User size={20} />
              Visão 360º
            </NavLink>

            <NavLink to="/activities" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
              <FileText size={20} />
              Log de Atividades
            </NavLink>
          </nav>

          <div style={{ marginTop: 'auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {/* User Info */}
            <div style={{
              padding: '12px',
              background: 'var(--bg-card)',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              marginBottom: '8px'
            }}>
              <div style={{
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                background: 'var(--primary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '0.8rem',
                fontWeight: 700,
                color: 'white'
              }}>
                {user.nome.charAt(0)}
              </div>
              <div style={{ overflow: 'hidden' }}>
                <p style={{ fontSize: '0.85rem', fontWeight: 600, whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>{user.nome}</p>
                <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'capitalize' }}>{user.role}</p>
              </div>
            </div>

            {/* Theme Toggle */}
            <button
              onClick={toggleTheme}
              className="nav-link"
              style={{ width: '100%', justifyContent: 'flex-start', border: 'none', background: 'transparent', cursor: 'pointer' }}
            >
              {theme === 'dark' ? <><Sun size={20} /> Visão Clara</> : <><Moon size={20} /> Visão Noturna</>}
            </button>

            {/* Logout */}
            <button
              onClick={logout}
              className="nav-link"
              style={{ width: '100%', justifyContent: 'flex-start', border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--status-danger)' }}
            >
              <LogOut size={20} />
              Sair
            </button>
          </div>
        </aside>

        {/* Main Content Area */}
        <main className="main-content">
          <Routes>
            <Route path="/" element={<GlobalDashboard />} />
            <Route path="/panel" element={<Dashboard />} />
            <Route path="/contracts" element={<Contracts />} />
            <Route path="/client-dashboard" element={<ClientDashboard />} />
            <Route path="/activities" element={<ActivityLog />} />
            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;
