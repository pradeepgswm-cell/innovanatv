import React, { useState, useEffect } from 'react';
import api from '../api';

function Dashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const response = await api.get('/admin/stats');
      setStats(response.data);
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <div>
      <h1 style={{ marginBottom: '32px' }}>Dashboard</h1>
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-value">{stats?.total_users || 0}</div>
          <div className="stat-label">Total Users</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{stats?.total_videos || 0}</div>
          <div className="stat-label">Total Videos</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{stats?.total_series || 0}</div>
          <div className="stat-label">Total Series</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{stats?.premium_users || 0}</div>
          <div className="stat-label">Premium Users</div>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;
