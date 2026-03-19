import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';

function AddSeries() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    thumbnail_url: '',
    genre: 'Drama',
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      await api.post('/series', formData);
      alert('Series created successfully!');
      navigate('/series');
    } catch (error) {
      alert('Failed to create series: ' + (error.response?.data?.detail || error.message));
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value,
    });
  };

  return (
    <div>
      <h1 style={{ marginBottom: '32px' }}>Add New Series</h1>

      <div className="card">
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Title *</label>
            <input
              type="text"
              name="title"
              value={formData.title}
              onChange={handleChange}
              required
            />
          </div>

          <div className="form-group">
            <label>Description *</label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              required
            />
          </div>

          <div className="form-group">
            <label>Thumbnail URL *</label>
            <input
              type="url"
              name="thumbnail_url"
              value={formData.thumbnail_url}
              onChange={handleChange}
              placeholder="https://your-cloudfront-url.com/series-thumbnail.jpg"
              required
            />
          </div>

          <div className="form-group">
            <label>Genre *</label>
            <select name="genre" value={formData.genre} onChange={handleChange} required>
              <option value="Drama">Drama</option>
              <option value="Romance">Romance</option>
              <option value="Thriller">Thriller</option>
              <option value="Revenge">Revenge</option>
              <option value="Comedy">Comedy</option>
              <option value="Action">Action</option>
              <option value="Horror">Horror</option>
              <option value="Mystery">Mystery</option>
              <option value="Family">Family</option>
            </select>
          </div>

          <div style={{ display: 'flex', gap: '16px' }}>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Creating...' : 'Create Series'}
            </button>
            <button
              type="button"
              onClick={() => navigate('/series')}
              className="btn btn-secondary"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default AddSeries;
