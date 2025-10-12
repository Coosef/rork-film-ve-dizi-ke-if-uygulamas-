import { useRouter } from 'expo-router';
import { Users, MessageCircle, Heart, TrendingUp, Search, UserPlus, X, Share2, BarChart3 } from 'lucide-react-native';
import React, { useState } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  Pressable,
  TextInput,
  Image,
  FlatList,
} from 'react-native';
import Colors from '@/constants/colors';
import GlassPanel from '@/components/GlassPanel';
import { useLibrary } from '@/contexts/LibraryContext';

type TabType = 'friends' | 'discover' | 'activity';

interface Friend {
  id: string;
  name: string;
  avatar: string;
  mutualFriends: number;
  recentActivity: string;
  favoriteGenres: string[];
  watchedCount: number;
}

interface Activity {
  id: string;
  user: {
    name: string;
    avatar: string;
  };
  type: 'watched' | 'rated' | 'commented' | 'added';
  show: {
    id: number;
    title: string;
    poster: string;
  };
  rating?: number;
  comment?: string;
  timestamp: string;
}

const mockFriends: Friend[] = [
  {
    id: '1',
    name: 'Ahmet Yılmaz',
    avatar: '🎭',
    mutualFriends: 12,
    recentActivity: '2 saat önce Breaking Bad izledi',
    favoriteGenres: ['Drama', 'Thriller'],
    watchedCount: 45,
  },
  {
    id: '2',
    name: 'Ayşe Demir',
    avatar: '🎬',
    mutualFriends: 8,
    recentActivity: '5 saat önce Stranger Things\'e 9.5 verdi',
    favoriteGenres: ['Sci-Fi', 'Horror'],
    watchedCount: 67,
  },
  {
    id: '3',
    name: 'Mehmet Kaya',
    avatar: '🎪',
    mutualFriends: 15,
    recentActivity: 'Dün The Crown hakkında yorum yaptı',
    favoriteGenres: ['Drama', 'History'],
    watchedCount: 89,
  },
];

const mockSuggestions: Friend[] = [
  {
    id: '4',
    name: 'Zeynep Arslan',
    avatar: '🎨',
    mutualFriends: 5,
    recentActivity: '3 gün önce aktif',
    favoriteGenres: ['Comedy', 'Romance'],
    watchedCount: 34,
  },
  {
    id: '5',
    name: 'Can Öztürk',
    avatar: '🎯',
    mutualFriends: 7,
    recentActivity: '1 hafta önce aktif',
    favoriteGenres: ['Action', 'Thriller'],
    watchedCount: 56,
  },
];

const mockActivities: Activity[] = [
  {
    id: '1',
    user: { name: 'Ahmet Yılmaz', avatar: '🎭' },
    type: 'watched',
    show: { id: 1, title: 'Breaking Bad', poster: 'https://via.placeholder.com/100x150' },
    timestamp: '2 saat önce',
  },
  {
    id: '2',
    user: { name: 'Ayşe Demir', avatar: '🎬' },
    type: 'rated',
    show: { id: 2, title: 'Stranger Things', poster: 'https://via.placeholder.com/100x150' },
    rating: 9.5,
    timestamp: '5 saat önce',
  },
  {
    id: '3',
    user: { name: 'Mehmet Kaya', avatar: '🎪' },
    type: 'commented',
    show: { id: 3, title: 'The Crown', poster: 'https://via.placeholder.com/100x150' },
    comment: 'Muhteşem bir sezon finali! Karakterlerin gelişimi harika.',
    timestamp: 'Dün',
  },
];

export default function SocialScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { getInteractionsByType } = useLibrary();
  const [activeTab, setActiveTab] = useState<TabType>('friends');
  const [searchQuery, setSearchQuery] = useState('');
  const [friends, setFriends] = useState(mockFriends);
  const [suggestions, setSuggestions] = useState(mockSuggestions);

  const tabs = [
    { key: 'friends' as TabType, label: 'Arkadaşlar', icon: Users, count: friends.length },
    { key: 'discover' as TabType, label: 'Keşfet', icon: UserPlus, count: suggestions.length },
    { key: 'activity' as TabType, label: 'Aktivite', icon: TrendingUp, count: mockActivities.length },
  ];

  const handleAddFriend = (friendId: string) => {
    const friend = suggestions.find(s => s.id === friendId);
    if (friend) {
      setFriends([...friends, friend]);
      setSuggestions(suggestions.filter(s => s.id !== friendId));
    }
  };

  const handleRemoveFriend = (friendId: string) => {
    setFriends(friends.filter(f => f.id !== friendId));
  };

  const handleShareLibrary = () => {
    console.log('[Social] Sharing library...');
  };

  const handleCompareLibraries = (friendId: string) => {
    console.log('[Social] Comparing libraries with friend:', friendId);
  };

  const renderFriendCard = (friend: Friend, showActions: boolean = true) => (
    <GlassPanel key={friend.id} style={styles.friendCard}>
      <View style={styles.friendHeader}>
        <View style={styles.friendAvatar}>
          <Text style={styles.friendAvatarText}>{friend.avatar}</Text>
        </View>
        <View style={styles.friendInfo}>
          <Text style={styles.friendName}>{friend.name}</Text>
          <Text style={styles.friendMutual}>{friend.mutualFriends} ortak arkadaş</Text>
          <Text style={styles.friendActivity}>{friend.recentActivity}</Text>
        </View>
      </View>
      <View style={styles.friendStats}>
        <View style={styles.friendStat}>
          <Text style={styles.friendStatValue}>{friend.watchedCount}</Text>
          <Text style={styles.friendStatLabel}>İzlenen</Text>
        </View>
        <View style={styles.friendGenres}>
          {friend.favoriteGenres.map((genre, index) => (
            <View key={index} style={styles.genreTag}>
              <Text style={styles.genreTagText}>{genre}</Text>
            </View>
          ))}
        </View>
      </View>
      {showActions && (
        <View style={styles.friendActions}>
          {activeTab === 'friends' ? (
            <>
              <Pressable 
                style={[styles.friendActionButton, styles.compareButton]}
                onPress={() => handleCompareLibraries(friend.id)}
              >
                <BarChart3 size={18} color={Colors.dark.primary} />
                <Text style={styles.friendActionText}>Karşılaştır</Text>
              </Pressable>
              <Pressable 
                style={[styles.friendActionButton, styles.messageButton]}
                onPress={() => {}}
              >
                <MessageCircle size={18} color={Colors.dark.text} />
              </Pressable>
              <Pressable 
                style={[styles.friendActionButton, styles.removeButton]}
                onPress={() => handleRemoveFriend(friend.id)}
              >
                <X size={18} color={Colors.dark.error} />
              </Pressable>
            </>
          ) : (
            <>
              <Pressable 
                style={[styles.friendActionButton, styles.messageButton]}
                onPress={() => {}}
              >
                <MessageCircle size={18} color={Colors.dark.text} />
                <Text style={styles.friendActionText}>Mesaj</Text>
              </Pressable>
              <Pressable 
                style={[styles.friendActionButton, styles.addButton]}
                onPress={() => handleAddFriend(friend.id)}
              >
                <UserPlus size={18} color={Colors.dark.primary} />
                <Text style={styles.friendActionText}>Ekle</Text>
              </Pressable>
            </>
          )}
        </View>
      )}
    </GlassPanel>
  );

  const renderActivityItem = ({ item }: { item: Activity }) => (
    <GlassPanel style={styles.activityCard}>
      <View style={styles.activityHeader}>
        <View style={styles.activityUserAvatar}>
          <Text style={styles.activityUserAvatarText}>{item.user.avatar}</Text>
        </View>
        <View style={styles.activityUserInfo}>
          <Text style={styles.activityUserName}>{item.user.name}</Text>
          <Text style={styles.activityTimestamp}>{item.timestamp}</Text>
        </View>
      </View>
      <View style={styles.activityContent}>
        <Image 
          source={{ uri: item.show.poster }} 
          style={styles.activityShowPoster}
          resizeMode="cover"
        />
        <View style={styles.activityShowInfo}>
          <Text style={styles.activityShowTitle}>{item.show.title}</Text>
          {item.type === 'watched' && (
            <View style={styles.activityBadge}>
              <Text style={styles.activityBadgeText}>İzledi</Text>
            </View>
          )}
          {item.type === 'rated' && item.rating && (
            <View style={[styles.activityBadge, styles.ratingBadge]}>
              <Text style={styles.activityBadgeText}>⭐ {item.rating}</Text>
            </View>
          )}
          {item.type === 'commented' && item.comment && (
            <View style={styles.activityComment}>
              <Text style={styles.activityCommentText}>{item.comment}</Text>
            </View>
          )}
        </View>
      </View>
      <View style={styles.activityActions}>
        <Pressable style={styles.activityActionButton}>
          <Heart size={20} color={Colors.dark.textSecondary} />
          <Text style={styles.activityActionText}>Beğen</Text>
        </Pressable>
        <Pressable style={styles.activityActionButton}>
          <MessageCircle size={20} color={Colors.dark.textSecondary} />
          <Text style={styles.activityActionText}>Yorum Yap</Text>
        </Pressable>
      </View>
    </GlassPanel>
  );

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <View style={styles.headerTop}>
          <Pressable onPress={() => router.back()} style={styles.backButton}>
            <X size={24} color={Colors.dark.text} />
          </Pressable>
          <Text style={styles.headerTitle}>Sosyal</Text>
          <Pressable onPress={handleShareLibrary} style={styles.shareButton}>
            <Share2 size={20} color={Colors.dark.primary} />
          </Pressable>
        </View>
        <View style={styles.searchContainer}>
          <Search size={20} color={Colors.dark.textSecondary} />
          <TextInput
            style={styles.searchInput}
            placeholder="Arkadaş ara..."
            placeholderTextColor={Colors.dark.textSecondary}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.tabsContainer}
        contentContainerStyle={styles.tabsContent}
      >
        {tabs.map(tab => (
          <Pressable
            key={tab.key}
            style={[styles.tab, activeTab === tab.key && styles.tabActive]}
            onPress={() => setActiveTab(tab.key)}
          >
            <tab.icon 
              size={20} 
              color={activeTab === tab.key ? Colors.dark.text : Colors.dark.textSecondary} 
            />
            <Text style={[styles.tabText, activeTab === tab.key && styles.tabTextActive]}>
              {tab.label}
            </Text>
            <View style={[styles.tabBadge, activeTab === tab.key && styles.tabBadgeActive]}>
              <Text style={[styles.tabBadgeText, activeTab === tab.key && styles.tabBadgeTextActive]}>
                {tab.count}
              </Text>
            </View>
          </Pressable>
        ))}
      </ScrollView>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {activeTab === 'friends' && (
          <View style={styles.section}>
            {friends.length === 0 ? (
              <View style={styles.emptyState}>
                <Users size={64} color={Colors.dark.textSecondary} />
                <Text style={styles.emptyStateTitle}>Henüz arkadaşın yok</Text>
                <Text style={styles.emptyStateText}>
                  Keşfet sekmesinden yeni arkadaşlar ekleyebilirsin
                </Text>
              </View>
            ) : (
              friends.map(friend => renderFriendCard(friend))
            )}
          </View>
        )}

        {activeTab === 'discover' && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Önerilen Arkadaşlar</Text>
            {suggestions.map(friend => renderFriendCard(friend, true))}
          </View>
        )}

        {activeTab === 'activity' && (
          <View style={styles.section}>
            <FlatList
              data={mockActivities}
              renderItem={renderActivityItem}
              keyExtractor={item => item.id}
              scrollEnabled={false}
              contentContainerStyle={styles.activityList}
            />
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.dark.background,
  },
  header: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    gap: 16,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center' as const,
    justifyContent: 'space-between',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.dark.surfaceLight,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  headerTitle: {
    color: Colors.dark.text,
    fontSize: 24,
    fontWeight: '700' as const,
  },
  shareButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: `${Colors.dark.primary}20`,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    borderWidth: 1,
    borderColor: Colors.dark.primary,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center' as const,
    gap: 12,
    backgroundColor: Colors.dark.surfaceLight,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: Colors.dark.border,
  },
  searchInput: {
    flex: 1,
    color: Colors.dark.text,
    fontSize: 16,
  },
  tabsContainer: {
    maxHeight: 60,
  },
  tabsContent: {
    paddingHorizontal: 16,
    gap: 12,
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center' as const,
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: Colors.dark.surfaceLight,
    borderWidth: 1,
    borderColor: Colors.dark.border,
  },
  tabActive: {
    backgroundColor: Colors.dark.primary,
    borderColor: Colors.dark.primary,
  },
  tabText: {
    color: Colors.dark.textSecondary,
    fontSize: 14,
    fontWeight: '600' as const,
  },
  tabTextActive: {
    color: Colors.dark.text,
  },
  tabBadge: {
    backgroundColor: Colors.dark.border,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    minWidth: 24,
    alignItems: 'center' as const,
  },
  tabBadgeActive: {
    backgroundColor: Colors.dark.primaryLight,
  },
  tabBadgeText: {
    color: Colors.dark.textSecondary,
    fontSize: 12,
    fontWeight: '700' as const,
  },
  tabBadgeTextActive: {
    color: Colors.dark.text,
  },
  content: {
    flex: 1,
  },
  section: {
    padding: 16,
    gap: 16,
  },
  sectionTitle: {
    color: Colors.dark.text,
    fontSize: 20,
    fontWeight: '700' as const,
    marginBottom: 8,
  },
  friendCard: {
    padding: 16,
    gap: 16,
  },
  friendHeader: {
    flexDirection: 'row',
    gap: 12,
  },
  friendAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.dark.primary,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  friendAvatarText: {
    fontSize: 28,
  },
  friendInfo: {
    flex: 1,
    gap: 4,
  },
  friendName: {
    color: Colors.dark.text,
    fontSize: 18,
    fontWeight: '700' as const,
  },
  friendMutual: {
    color: Colors.dark.textSecondary,
    fontSize: 13,
  },
  friendActivity: {
    color: Colors.dark.textSecondary,
    fontSize: 12,
  },
  friendStats: {
    flexDirection: 'row',
    alignItems: 'center' as const,
    gap: 16,
  },
  friendStat: {
    alignItems: 'center' as const,
  },
  friendStatValue: {
    color: Colors.dark.text,
    fontSize: 20,
    fontWeight: '700' as const,
  },
  friendStatLabel: {
    color: Colors.dark.textSecondary,
    fontSize: 12,
  },
  friendGenres: {
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  genreTag: {
    backgroundColor: Colors.dark.surfaceLight,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.dark.border,
  },
  genreTagText: {
    color: Colors.dark.text,
    fontSize: 11,
    fontWeight: '600' as const,
  },
  friendActions: {
    flexDirection: 'row',
    gap: 12,
  },
  friendActionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    gap: 6,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
  },
  messageButton: {
    backgroundColor: Colors.dark.surfaceLight,
    borderColor: Colors.dark.border,
    flex: 0,
    paddingHorizontal: 12,
  },
  compareButton: {
    backgroundColor: `${Colors.dark.primary}20`,
    borderColor: Colors.dark.primary,
  },
  addButton: {
    backgroundColor: `${Colors.dark.primary}20`,
    borderColor: Colors.dark.primary,
  },
  removeButton: {
    backgroundColor: `${Colors.dark.error}20`,
    borderColor: Colors.dark.error,
    flex: 0,
    paddingHorizontal: 12,
  },
  friendActionText: {
    color: Colors.dark.text,
    fontSize: 14,
    fontWeight: '600' as const,
  },
  emptyState: {
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    paddingVertical: 64,
    gap: 16,
  },
  emptyStateTitle: {
    color: Colors.dark.text,
    fontSize: 20,
    fontWeight: '700' as const,
  },
  emptyStateText: {
    color: Colors.dark.textSecondary,
    fontSize: 14,
    textAlign: 'center' as const,
    paddingHorizontal: 32,
  },
  activityList: {
    gap: 16,
  },
  activityCard: {
    padding: 16,
    gap: 16,
  },
  activityHeader: {
    flexDirection: 'row',
    alignItems: 'center' as const,
    gap: 12,
  },
  activityUserAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.dark.primary,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  activityUserAvatarText: {
    fontSize: 20,
  },
  activityUserInfo: {
    flex: 1,
  },
  activityUserName: {
    color: Colors.dark.text,
    fontSize: 16,
    fontWeight: '600' as const,
  },
  activityTimestamp: {
    color: Colors.dark.textSecondary,
    fontSize: 12,
  },
  activityContent: {
    flexDirection: 'row',
    gap: 12,
  },
  activityShowPoster: {
    width: 80,
    height: 120,
    borderRadius: 8,
    backgroundColor: Colors.dark.surfaceLight,
  },
  activityShowInfo: {
    flex: 1,
    gap: 8,
  },
  activityShowTitle: {
    color: Colors.dark.text,
    fontSize: 16,
    fontWeight: '700' as const,
  },
  activityBadge: {
    backgroundColor: Colors.dark.primary,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start' as const,
  },
  ratingBadge: {
    backgroundColor: Colors.dark.warning,
  },
  activityBadgeText: {
    color: Colors.dark.text,
    fontSize: 12,
    fontWeight: '700' as const,
  },
  activityComment: {
    backgroundColor: Colors.dark.surfaceLight,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.dark.border,
  },
  activityCommentText: {
    color: Colors.dark.text,
    fontSize: 13,
    lineHeight: 18,
  },
  activityActions: {
    flexDirection: 'row',
    gap: 16,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: Colors.dark.border,
  },
  activityActionButton: {
    flexDirection: 'row',
    alignItems: 'center' as const,
    gap: 6,
  },
  activityActionText: {
    color: Colors.dark.textSecondary,
    fontSize: 14,
    fontWeight: '600' as const,
  },
});
