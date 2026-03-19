import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';

function AddVideo() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    cloudfront_url: '',
    thumbnail_url: '',
    duration: '',
    genre: 'Drama',
    series_id: '',
    episode_number: '',
    is_premium: false,
    tags: '',
  });
  const [seriesList, setSeriesList] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchSeries();
  }, []);

  const fetchSeries = async () => {
    try {
      const response = await api.get('/series');
      setSeriesList(response.data);
    } catch (error) {
      console.error('Failed to fetch series:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const videoData = {
        ...formData,
        duration: parseInt(formData.duration),
        episode_number: formData.episode_number ? parseInt(formData.episode_number) : null,
        tags: formData.tags.split(',').map((t) => t.trim()).filter(Boolean),
        series_id: formData.series_id || null,
      };

      await api.post('/videos', videoData);
      alert('Video added successfully!');
      navigate('/videos');
    } catch (error) {
      alert('Failed to add video: ' + (error.response?.data?.detail || error.message));
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData({
      ...formData,
      [name]: type === 'checkbox' ? checked : value,
    });
  };

  return (
    <div>
      <h1 style={{ marginBottom: '32px' }}>Add New Video</h1>

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
            <label>CloudFront Video URL *</label>
            <input
              type="url"
              name="cloudfront_url"
              value={formData.cloudfront_url}
              onChange={handleChange}
              placeholder="https://your-cloudfront-url.com/video.mp4"
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
              placeholder="https://your-cloudfront-url.com/thumbnail.jpg"
              required
            />
          </div>

          <div className="form-group">
            <label>Duration (seconds) *</label>
            <input
              type="number"
              name="duration"
              value={formData.duration}
              onChange={handleChange}
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

          <div className="form-group">
            <label>Series (optional)</label>
            <select name="series_id" value={formData.series_id} onChange={handleChange}>
              <option value="">-- None --</option>
              {seriesList.map((series) => (
                <option key={series.id} value={series.id}>
                  {series.title}
                </option>
              ))}
            </select>
          </div>

          {formData.series_id && (
            <div className="form-group">
              <label>Episode Number</label>
              <input
                type="number"
                name="episode_number"
                value={formData.episode_number}
                onChange={handleChange}
              />
            </div>
          )}

          <div className="form-group">
            <label>Tags (comma-separated)</label>
            <input
              type="text"
              name="tags"
              value={formData.tags}
              onChange={handleChange}
              placeholder="drama, romance, love"
            />
          </div>

          <div className="form-group">
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <input
                type="checkbox"
                name="is_premium"
                checked={formData.is_premium}
                onChange={handleChange}
                style={{ width: 'auto' }}
              />
              Premium Content
            </label>
          </div>

          <div style={{ display: 'flex', gap: '16px' }}>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Adding...' : 'Add Video'}
            </button>
            <button
              type="button"
              onClick={() => navigate('/videos')}
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

export default AddVideo;
