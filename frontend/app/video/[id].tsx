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
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Video, ResizeMode } from 'expo-av';
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
  const videoRef = useRef<Video>(null);
  const router = useRouter();
  const { user } = useAuth();

  useEffect(() => {
    if (id) {
      fetchVideo();
      checkIfInMyList();
    }
  }, [id]);

  const fetchVideo = async () => {
    try {
      const response = await api.get(`/videos/${id}`);
      setVideo(response.data);
      
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

  const handlePlaybackStatusUpdate = (status: any) => {
    if (status.isLoaded) {
      setIsPlaying(status.isPlaying);
      
      // Save watch history every 5 seconds
      if (status.positionMillis && status.positionMillis % 5000 < 100) {
        saveWatchHistory(status.positionMillis / 1000, status.didJustFinish);
      }
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

  const togglePlayPause = async () => {
    if (videoRef.current) {
      if (isPlaying) {
        await videoRef.current.pauseAsync();
      } else {
        await videoRef.current.playAsync();
      }
    }
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

  return (
    <View style={styles.container}>
      <StatusBar hidden />
      
      {/* Video Player */}
      <View style={styles.videoContainer}>
        {needsPremium ? (
          <View style={styles.premiumBlocker}>
            <Ionicons name="lock-closed" size={64} color="#fff" />
            <Text style={styles.premiumText}>Premium Content</Text>
            <Text style={styles.premiumSubtext}>Upgrade to premium to watch this show</Text>
            <TouchableOpacity style={styles.upgradeButton}>
              <Text style={styles.upgradeButtonText}>Upgrade Now</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <Video
            ref={videoRef}
            source={{ uri: video.cloudfront_url }}
            style={styles.video}
            useNativeControls
            resizeMode={ResizeMode.CONTAIN}
            shouldPlay
            onPlaybackStatusUpdate={handlePlaybackStatusUpdate}
          />
        )}
        
        {/* Back Button */}
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={28} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Video Info */}
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
  videoContainer: {
    width: width,
    height: height * 0.4,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  video: {
    width: '100%',
    height: '100%',
  },
  backButton: {
    position: 'absolute',
    top: 44,
    left: 16,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 20,
    padding: 8,
  },
  premiumBlocker: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
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
