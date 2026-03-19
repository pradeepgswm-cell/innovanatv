import React, { useState, useEffect } from 'react';
import api from '../api';
import axios from 'axios';

const API_URL = 'https://viralo-replica.preview.emergentagent.com/api';

function Users() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      // We need to call MongoDB directly or create an admin endpoint
      // For now, showing a placeholder
      setUsers([]);
    } catch (error) {
      console.error('Failed to fetch users:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <div>
      <h1 style={{ marginBottom: '32px' }}>Users</h1>

      <div className="card">
        <p style={{ color: '#999', textAlign: 'center', padding: '40px' }}>
          User management coming soon. Use MongoDB to view/manage users directly.
        </p>
      </div>
    </div>
  );
}

export default Users;
