import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  Dimensions,
  RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import api from '../../utils/api';
import { useAuth } from '../../contexts/AuthContext';

const { width } = Dimensions.get('window');
const CARD_WIDTH = (width - 48) / 2;

interface Video {
  id: string;
  title: string;
  description: string;
  cloudfront_url: string;
  thumbnail_url: string;
  duration: number;
  genre: string;
  is_premium: boolean;
  views_count: number;
}

export default function HomeScreen() {
  const [videos, setVideos] = useState<Video[]>([]);
  const [trendingVideos, setTrendingVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedGenre, setSelectedGenre] = useState<string | null>(null);
  const router = useRouter();
  const { user } = useAuth();

  const genres = ['All', 'Drama', 'Romance', 'Thriller', 'Revenge', 'Comedy', 'Action', 'Horror'];

  useEffect(() => {
    fetchVideos();
    fetchTrending();
  }, [selectedGenre]);

  const fetchVideos = async () => {
    try {
      const params = selectedGenre && selectedGenre !== 'All' ? { genre: selectedGenre } : {};
      const response = await api.get('/videos', { params });
      setVideos(response.data);
    } catch (error) {
      console.error('Failed to fetch videos:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const fetchTrending = async () => {
    try {
      const response = await api.get('/videos/trending/top', { params: { limit: 10 } });
      setTrendingVideos(response.data);
    } catch (error) {
      console.error('Failed to fetch trending:', error);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchVideos();
    fetchTrending();
  };

  const renderVideoCard = ({ item }: { item: Video }) => (
    <TouchableOpacity
      style={styles.videoCard}
      onPress={() => router.push(`/video/${item.id}` as any)}
    >
      <Image
        source={{ uri: item.thumbnail_url }}
        style={styles.thumbnail}
        resizeMode="cover"
      />
      {item.is_premium && user?.subscription_status !== 'premium' && (
        <View style={styles.premiumBadge}>
          <Ionicons name="lock-closed" size={12} color="#fff" />
          <Text style={styles.premiumText}>Premium</Text>
        </View>
      )}
      <View style={styles.cardContent}>
        <Text style={styles.videoTitle} numberOfLines={2}>
          {item.title}
        </Text>
        <View style={styles.cardFooter}>
          <Text style={styles.genre}>{item.genre}</Text>
          <Text style={styles.views}>{item.views_count} views</Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  const renderTrendingCard = ({ item }: { item: Video }) => (
    <TouchableOpacity
      style={styles.trendingCard}
      onPress={() => router.push(`/video/${item.id}` as any)}
    >
      <Image
        source={{ uri: item.thumbnail_url }}
        style={styles.trendingThumbnail}
        resizeMode="cover"
      />
      <View style={styles.trendingOverlay}>
        <Ionicons name="play-circle" size={48} color="#fff" />
      </View>
      <View style={styles.trendingInfo}>
        <Text style={styles.trendingTitle} numberOfLines={1}>
          {item.title}
        </Text>
      </View>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#e50914" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.logo}>Viralo TV</Text>
      </View>

      <FlatList
        data={videos}
        renderItem={renderVideoCard}
        keyExtractor={(item) => item.id}
        numColumns={2}
        columnWrapperStyle={styles.row}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#e50914"
          />
        }
        ListHeaderComponent={
          <>
            {/* Trending Section */}
            {trendingVideos.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>🔥 Trending Now</Text>
                <FlatList
                  data={trendingVideos}
                  renderItem={renderTrendingCard}
                  keyExtractor={(item) => item.id}
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.horizontalList}
                />
              </View>
            )}

            {/* Genre Filter */}
            <View style={styles.genreContainer}>
              <FlatList
                data={genres}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={[
                      styles.genreChip,
                      (selectedGenre === item || (item === 'All' && !selectedGenre)) &&
                        styles.genreChipActive,
                    ]}
                    onPress={() => setSelectedGenre(item === 'All' ? null : item)}
                  >
                    <Text
                      style={[
                        styles.genreText,
                        (selectedGenre === item || (item === 'All' && !selectedGenre)) &&
                          styles.genreTextActive,
                      ]}
                    >
                      {item}
                    </Text>
                  </TouchableOpacity>
                )}
                keyExtractor={(item) => item}
                horizontal
                showsHorizontalScrollIndicator={false}
              />
            </View>

            {/* All Videos Title */}
            <Text style={styles.sectionTitle}>All Shows</Text>
          </>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  centerContainer: {
    flex: 1,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1a1a1a',
  },
  logo: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#e50914',
  },
  listContent: {
    paddingBottom: 100,
  },
  section: {
    marginVertical: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 12,
    paddingHorizontal: 16,
  },
  horizontalList: {
    paddingHorizontal: 16,
  },
  trendingCard: {
    width: 280,
    height: 160,
    marginRight: 12,
    borderRadius: 12,
    overflow: 'hidden',
  },
  trendingThumbnail: {
    width: '100%',
    height: '100%',
  },
  trendingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  trendingInfo: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 12,
    backgroundColor: 'rgba(0,0,0,0.7)',
  },
  trendingTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
  },
  genreContainer: {
    marginVertical: 16,
    paddingHorizontal: 16,
  },
  genreChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#1a1a1a',
    marginRight: 8,
  },
  genreChipActive: {
    backgroundColor: '#e50914',
  },
  genreText: {
    color: '#666',
    fontSize: 14,
    fontWeight: '600',
  },
  genreTextActive: {
    color: '#fff',
  },
  row: {
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  videoCard: {
    width: CARD_WIDTH,
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    overflow: 'hidden',
  },
  thumbnail: {
    width: '100%',
    height: 180,
    backgroundColor: '#333',
  },
  premiumBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(229, 9, 20, 0.9)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  premiumText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
    marginLeft: 4,
  },
  cardContent: {
    padding: 12,
  },
  videoTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  genre: {
    fontSize: 12,
    color: '#e50914',
    fontWeight: '600',
  },
  views: {
    fontSize: 11,
    color: '#666',
  },
});