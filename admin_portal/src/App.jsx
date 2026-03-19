import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Link, Navigate } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import Videos from './pages/Videos';
import AddVideo from './pages/AddVideo';
import Series from './pages/Series';
import AddSeries from './pages/AddSeries';
import Users from './pages/Users';
import Login from './pages/Login';

const API_URL = 'https://viralo-replica.preview.emergentagent.com/api';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('admin_token');
    if (token) {
      setIsAuthenticated(true);
    }
    setLoading(false);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('admin_token');
    setIsAuthenticated(false);
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  if (!isAuthenticated) {
    return <Login onLogin={() => setIsAuthenticated(true)} />;
  }

  return (
    <BrowserRouter>
      <div>
        <nav className="nav">
          <div className="nav-container">
            <h2 style={{ color: '#e50914' }}>Innovana TV Admin</h2>
            <ul className="nav-links">
              <li><Link to="/">Dashboard</Link></li>
              <li><Link to="/videos">Videos</Link></li>
              <li><Link to="/series">Series</Link></li>
              <li><Link to="/users">Users</Link></li>
              <li>
                <button onClick={handleLogout} style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', fontSize: '16px', fontWeight: '600' }}>
                  Logout
                </button>
              </li>
            </ul>
          </div>
        </nav>

        <div className="container">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/videos" element={<Videos />} />
            <Route path="/videos/add" element={<AddVideo />} />
            <Route path="/series" element={<Series />} />
            <Route path="/series/add" element={<AddSeries />} />
            <Route path="/users" element={<Users />} />
          </Routes>
        </div>
      </div>
    </BrowserRouter>
  );
}

export default App;
