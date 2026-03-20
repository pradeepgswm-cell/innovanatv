import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
  Alert,
  ScrollView,
  StatusBar,
  Modal,
  FlatList,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import Video from 'react-native-video';
import { Ionicons } from '@expo/vector-icons';
import api from '../../utils/api';
import { useAuth } from '../../contexts/AuthContext';

const { width, height } = Dimensions.get('window');

interface VideoData {
  id: string;
  title: string;
  description: string;
  cloudfront_url: string;
  thumbnail_url: string;
  duration: number;
  genre: string;
  is_premium: boolean;
  views_count: number;
  series_id?: string;
  episode_number?: number;
}

export default function VideoPlayerScreen() {
  const { id } = useLocalSearchParams();
  const [video, setVideo] = useState<VideoData | null>(null);
  const [loading, setLoading] = useState(true);
  const [isPlaying, setIsPlaying] = useState(true);
  const [inMyList, setInMyList] = useState(false);
  const [relatedVideos, setRelatedVideos] = useState<VideoData[]>([]);
  const [allEpisodes, setAllEpisodes] = useState<VideoData[]>([]);
  const [currentEpisodeIndex, setCurrentEpisodeIndex] = useState(0);
  const [isFullScreen, setIsFullScreen] = useState(true);
  const videoRef = useRef<Video>(null);
  const router = useRouter();
  const { user } = useAuth();

  useEffect(() => {
    if (id) {
      setLoading(true);
      fetchVideo();
      checkIfInMyList();
    }
  }, [id]); // Re-run when ID changes

  const fetchVideo = async () => {
    try {
      const response = await api.get(`/videos/${id}`);
      setVideo(response.data);
      
      // If it's part of a series, fetch all episodes
      if (response.data.series_id) {
        const episodesResponse = await api.get(`/series/${response.data.series_id}/episodes`);
        setAllEpisodes(episodesResponse.data);
        const currentIndex = episodesResponse.data.findIndex((ep: VideoData) => ep.id === id);
        setCurrentEpisodeIndex(currentIndex);
      }
      
      // Fetch related videos (same genre)
      const relatedResponse = await api.get('/videos', {
        params: { genre: response.data.genre, limit: 10 },
      });
      setRelatedVideos(relatedResponse.data.filter((v: VideoData) => v.id !== id));
    } catch (error: any) {
      console.error('Failed to fetch video:', error);
      Alert.alert('Error', 'Failed to load video');
      router.back();
    } finally {
      setLoading(false);
    }
  };

  const checkIfInMyList = async () => {
    try {
      const response = await api.get('/my-list');
      const videoIds = response.data.map((v: VideoData) => v.id);
      setInMyList(videoIds.includes(id));
    } catch (error) {
      console.error('Failed to check my list:', error);
    }
  };

  const toggleMyList = async () => {
    try {
      if (inMyList) {
        await api.delete(`/my-list/${id}`);
        setInMyList(false);
        Alert.alert('Success', 'Removed from My List');
      } else {
        await api.post(`/my-list/${id}`);
        setInMyList(true);
        Alert.alert('Success', 'Added to My List');
      }
    } catch (error) {
      console.error('Failed to toggle my list:', error);
      Alert.alert('Error', 'Failed to update My List');
    }
  };

  const handleVideoEnd = () => {
    // Auto-play next episode if available
    if (allEpisodes.length > 0 && currentEpisodeIndex < allEpisodes.length - 1) {
      const nextEpisode = allEpisodes[currentEpisodeIndex + 1];
      router.replace(`/video/${nextEpisode.id}` as any);
    }
  };

  const handleProgress = (data: any) => {
    // Save watch history every 5 seconds
    if (data.currentTime && Math.floor(data.currentTime) % 5 === 0) {
      saveWatchHistory(data.currentTime, false);
    }
  };

  const saveWatchHistory = async (position: number, completed: boolean) => {
    try {
      await api.post('/watch-history', {
        video_id: id,
        last_watched_position: Math.floor(position),
        completed,
      });
    } catch (error) {
      console.error('Failed to save watch history:', error);
    }
  };

  const goToPreviousEpisode = () => {
    if (currentEpisodeIndex > 0 && allEpisodes.length > 0) {
      const prevEpisode = allEpisodes[currentEpisodeIndex - 1];
      console.log('Going to previous episode:', prevEpisode.id, prevEpisode.title);
      // Force reload by using push instead of replace
      router.push(`/video/${prevEpisode.id}` as any);
    }
  };

  const goToNextEpisode = () => {
    if (currentEpisodeIndex < allEpisodes.length - 1 && allEpisodes.length > 0) {
      const nextEpisode = allEpisodes[currentEpisodeIndex + 1];
      console.log('Going to next episode:', nextEpisode.id, nextEpisode.title);
      // Force reload by using push instead of replace
      router.push(`/video/${nextEpisode.id}` as any);
    }
  };

  const exitFullScreen = () => {
    setIsFullScreen(false);
    router.back();
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#e50914" />
      </View>
    );
  }

  if (!video) {
    return null;
  }

  // Check if premium and user doesn't have access
  const needsPremium = video.is_premium && user?.subscription_status !== 'premium';

  if (needsPremium) {
    return (
      <View style={styles.container}>
        <StatusBar hidden />
        <View style={styles.premiumBlocker}>
          <TouchableOpacity style={styles.closeButton} onPress={exitFullScreen}>
            <Ionicons name="close" size={32} color="#fff" />
          </TouchableOpacity>
          <Ionicons name="lock-closed" size={64} color="#fff" />
          <Text style={styles.premiumText}>Premium Content</Text>
          <Text style={styles.premiumSubtext}>Upgrade to premium to watch this show</Text>
          <TouchableOpacity
            style={styles.upgradeButton}
            onPress={() => router.push('/subscription' as any)}
          >
            <Text style={styles.upgradeButtonText}>View Plans</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar hidden />
      
      {/* Full-Screen Video Player */}
      {isFullScreen ? (
        <View style={styles.fullScreenContainer}>
          <Video
            ref={videoRef}
            source={{ uri: video.cloudfront_url }}
            style={styles.fullScreenVideo}
            controls
            resizeMode="contain"
            paused={!isPlaying}
            onEnd={handleVideoEnd}
            onProgress={handleProgress}
          />
          
          {/* Exit Full Screen Button */}
          <TouchableOpacity style={styles.exitButton} onPress={exitFullScreen}>
            <Ionicons name="close" size={32} color="#fff" />
          </TouchableOpacity>

          {/* Episode Navigation */}
          {allEpisodes.length > 0 && (
            <View style={styles.episodeNavigation}>
              <TouchableOpacity
                style={[
                  styles.navButton,
                  currentEpisodeIndex === 0 && styles.navButtonDisabled,
                ]}
                onPress={goToPreviousEpisode}
                disabled={currentEpisodeIndex === 0}
              >
                <Ionicons
                  name="play-skip-back"
                  size={24}
                  color={currentEpisodeIndex === 0 ? '#666' : '#fff'}
                />
                <Text style={styles.navButtonText}>Previous</Text>
              </TouchableOpacity>

              <View style={styles.episodeInfo}>
                <Text style={styles.episodeText}>
                  Episode {video.episode_number || currentEpisodeIndex + 1} of {allEpisodes.length}
                </Text>
              </View>

              <TouchableOpacity
                style={[
                  styles.navButton,
                  currentEpisodeIndex === allEpisodes.length - 1 && styles.navButtonDisabled,
                ]}
                onPress={goToNextEpisode}
                disabled={currentEpisodeIndex === allEpisodes.length - 1}
              >
                <Text style={styles.navButtonText}>Next</Text>
                <Ionicons
                  name="play-skip-forward"
                  size={24}
                  color={
                    currentEpisodeIndex === allEpisodes.length - 1 ? '#666' : '#fff'
                  }
                />
              </TouchableOpacity>
            </View>
          )}

          {/* Video Title Overlay */}
          <View style={styles.titleOverlay}>
            <Text style={styles.videoTitle}>{video.title}</Text>
            {video.episode_number && (
              <Text style={styles.episodeLabel}>Episode {video.episode_number}</Text>
            )}
          </View>
        </View>
      ) : (
        /* Video Info Section (when not in fullscreen) */
        <ScrollView style={styles.infoContainer}>
          <View style={styles.header}>
            <View style={styles.titleContainer}>
              <Text style={styles.title}>{video.title}</Text>
              {video.episode_number && (
                <Text style={styles.episode}>Episode {video.episode_number}</Text>
              )}
            </View>
            <TouchableOpacity onPress={toggleMyList}>
              <Ionicons
                name={inMyList ? 'bookmark' : 'bookmark-outline'}
                size={28}
                color={inMyList ? '#e50914' : '#fff'}
              />
            </TouchableOpacity>
          </View>

          <View style={styles.meta}>
            <Text style={styles.genre}>{video.genre}</Text>
            <Text style={styles.separator}>•</Text>
            <Text style={styles.views}>{video.views_count} views</Text>
            <Text style={styles.separator}>•</Text>
            <Text style={styles.duration}>{Math.floor(video.duration / 60)} min</Text>
          </View>

          <Text style={styles.description}>{video.description}</Text>

          {/* Related Videos */}
          {relatedVideos.length > 0 && (
            <View style={styles.relatedSection}>
              <Text style={styles.relatedTitle}>More Like This</Text>
              {relatedVideos.map((relatedVideo) => (
                <TouchableOpacity
                  key={relatedVideo.id}
                  style={styles.relatedCard}
                  onPress={() => router.push(`/video/${relatedVideo.id}` as any)}
                >
                  <View style={styles.relatedInfo}>
                    <Text style={styles.relatedVideoTitle} numberOfLines={2}>
                      {relatedVideo.title}
                    </Text>
                    <Text style={styles.relatedGenre}>{relatedVideo.genre}</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color="#666" />
                </TouchableOpacity>
              ))}
            </View>
          )}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullScreenContainer: {
    flex: 1,
    backgroundColor: '#000',
    justifyContent: 'center',
  },
  fullScreenVideo: {
    width: width,
    height: height,
  },
  exitButton: {
    position: 'absolute',
    top: 44,
    right: 16,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 20,
    padding: 8,
    zIndex: 10,
  },
  closeButton: {
    position: 'absolute',
    top: 44,
    right: 16,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 20,
    padding: 8,
    zIndex: 10,
  },
  episodeNavigation: {
    position: 'absolute',
    bottom: 100,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingVertical: 16,
  },
  navButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(229, 9, 20, 0.8)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  navButtonDisabled: {
    backgroundColor: 'rgba(102, 102, 102, 0.5)',
  },
  navButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    marginHorizontal: 4,
  },
  episodeInfo: {
    alignItems: 'center',
  },
  episodeText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  titleOverlay: {
    position: 'absolute',
    top: 44,
    left: 16,
    right: 60,
    backgroundColor: 'rgba(0,0,0,0.6)',
    padding: 12,
    borderRadius: 8,
  },
  videoTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  episodeLabel: {
    fontSize: 14,
    color: '#ccc',
    marginTop: 4,
  },
  premiumBlocker: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000',
    paddingHorizontal: 32,
  },
  premiumText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginTop: 16,
  },
  premiumSubtext: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 24,
  },
  upgradeButton: {
    backgroundColor: '#e50914',
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 8,
  },
  upgradeButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  infoContainer: {
    flex: 1,
    backgroundColor: '#000',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: 16,
  },
  titleContainer: {
    flex: 1,
    marginRight: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  episode: {
    fontSize: 14,
    color: '#999',
  },
  meta: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  genre: {
    fontSize: 14,
    color: '#e50914',
    fontWeight: '600',
  },
  separator: {
    color: '#666',
    marginHorizontal: 8,
  },
  views: {
    fontSize: 14,
    color: '#999',
  },
  duration: {
    fontSize: 14,
    color: '#999',
  },
  description: {
    fontSize: 14,
    color: '#ccc',
    lineHeight: 20,
    paddingHorizontal: 16,
    marginBottom: 24,
  },
  relatedSection: {
    paddingHorizontal: 16,
    paddingBottom: 100,
  },
  relatedTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 16,
  },
  relatedCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
    padding: 16,
    borderRadius: 8,
    marginBottom: 12,
  },
  relatedInfo: {
    flex: 1,
  },
  relatedVideoTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 4,
  },
  relatedGenre: {
    fontSize: 12,
    color: '#e50914',
  },
});
