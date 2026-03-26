import { useRouter, useLocalSearchParams } from 'expo-router';
import { Video, Users, MessageCircle, Send, X, Play, Pause, SkipForward, SkipBack } from 'lucide-react-native';
import React, { useState, useRef } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  Pressable,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import Colors from '@/constants/colors';
import GlassPanel from '@/components/GlassPanel';

interface Participant {
  id: string;
  name: string;
  avatar: string;
  isHost: boolean;
}

interface ChatMessage {
  id: string;
  userId: string;
  userName: string;
  userAvatar: string;
  message: string;
  timestamp: string;
}

const mockParticipants: Participant[] = [
  { id: '1', name: 'Sen', avatar: '👤', isHost: true },
  { id: '2', name: 'Ahmet', avatar: '🎭', isHost: false },
  { id: '3', name: 'Ayşe', avatar: '🎬', isHost: false },
];

const mockMessages: ChatMessage[] = [
  {
    id: '1',
    userId: '2',
    userName: 'Ahmet',
    userAvatar: '🎭',
    message: 'Bu sahne muhteşem!',
    timestamp: '20:15',
  },
  {
    id: '2',
    userId: '3',
    userName: 'Ayşe',
    userAvatar: '🎬',
    message: 'Kesinlikle! Karakterlerin gelişimi harika',
    timestamp: '20:16',
  },
];

export default function WatchPartyScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams();
  const [participants] = useState(mockParticipants);
  const [messages, setMessages] = useState(mockMessages);
  const [messageText, setMessageText] = useState('');
  const [isPlaying, setIsPlaying] = useState(false);
  const [showChat, setShowChat] = useState(true);
  const scrollViewRef = useRef<ScrollView>(null);

  const showTitle = params.title as string || 'Breaking Bad';
  const showId = params.id as string || '1';

  const handleSendMessage = () => {
    if (messageText.trim()) {
      const newMessage: ChatMessage = {
        id: Date.now().toString(),
        userId: '1',
        userName: 'Sen',
        userAvatar: '👤',
        message: messageText.trim(),
        timestamp: new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages([...messages, newMessage]);
      setMessageText('');
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  };

  const handlePlayPause = () => {
    setIsPlaying(!isPlaying);
    console.log('[WatchParty] Play/Pause toggled:', !isPlaying);
  };

  const handleSkipForward = () => {
    console.log('[WatchParty] Skip forward 10s');
  };

  const handleSkipBack = () => {
    console.log('[WatchParty] Skip back 10s');
  };

  const handleLeaveParty = () => {
    console.log('[WatchParty] Leaving party...');
    router.back();
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <View style={styles.headerTop}>
          <Pressable onPress={handleLeaveParty} style={styles.backButton}>
            <X size={24} color={Colors.dark.text} />
          </Pressable>
          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle}>{showTitle}</Text>
            <View style={styles.liveIndicator}>
              <View style={styles.liveDot} />
              <Text style={styles.liveText}>Canlı İzleniyor</Text>
            </View>
          </View>
          <Pressable 
            onPress={() => setShowChat(!showChat)} 
            style={styles.chatToggleButton}
          >
            <MessageCircle size={24} color={showChat ? Colors.dark.primary : Colors.dark.text} />
          </Pressable>
        </View>
      </View>

      <View style={styles.content}>
        <View style={styles.videoContainer}>
          <View style={styles.videoPlaceholder}>
            <Video size={64} color={Colors.dark.textSecondary} />
            <Text style={styles.videoPlaceholderText}>Video Oynatıcı</Text>
          </View>
          
          <View style={styles.videoControls}>
            <Pressable style={styles.controlButton} onPress={handleSkipBack}>
              <SkipBack size={24} color={Colors.dark.text} />
            </Pressable>
            <Pressable style={styles.playButton} onPress={handlePlayPause}>
              {isPlaying ? (
                <Pause size={32} color={Colors.dark.background} fill={Colors.dark.background} />
              ) : (
                <Play size={32} color={Colors.dark.background} fill={Colors.dark.background} />
              )}
            </Pressable>
            <Pressable style={styles.controlButton} onPress={handleSkipForward}>
              <SkipForward size={24} color={Colors.dark.text} />
            </Pressable>
          </View>
        </View>

        <GlassPanel style={styles.participantsPanel}>
          <View style={styles.participantsHeader}>
            <Users size={20} color={Colors.dark.primary} />
            <Text style={styles.participantsTitle}>
              Katılımcılar ({participants.length})
            </Text>
          </View>
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.participantsList}
          >
            {participants.map(participant => (
              <View key={participant.id} style={styles.participantCard}>
                <View style={styles.participantAvatar}>
                  <Text style={styles.participantAvatarText}>{participant.avatar}</Text>
                  {participant.isHost && (
                    <View style={styles.hostBadge}>
                      <Text style={styles.hostBadgeText}>HOST</Text>
                    </View>
                  )}
                </View>
                <Text style={styles.participantName}>{participant.name}</Text>
              </View>
            ))}
          </ScrollView>
        </GlassPanel>

        {showChat && (
          <View style={styles.chatContainer}>
            <View style={styles.chatHeader}>
              <MessageCircle size={20} color={Colors.dark.primary} />
              <Text style={styles.chatTitle}>Sohbet</Text>
            </View>
            <ScrollView 
              ref={scrollViewRef}
              style={styles.chatMessages}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.chatMessagesContent}
            >
              {messages.map(message => (
                <View 
                  key={message.id} 
                  style={[
                    styles.messageCard,
                    message.userId === '1' && styles.myMessageCard,
                  ]}
                >
                  <View style={styles.messageHeader}>
                    <View style={styles.messageAvatar}>
                      <Text style={styles.messageAvatarText}>{message.userAvatar}</Text>
                    </View>
                    <View style={styles.messageInfo}>
                      <Text style={styles.messageName}>{message.userName}</Text>
                      <Text style={styles.messageTimestamp}>{message.timestamp}</Text>
                    </View>
                  </View>
                  <Text style={styles.messageText}>{message.message}</Text>
                </View>
              ))}
            </ScrollView>
            <View style={styles.chatInput}>
              <TextInput
                style={styles.chatInputField}
                placeholder="Mesaj yaz..."
                placeholderTextColor={Colors.dark.textSecondary}
                value={messageText}
                onChangeText={setMessageText}
                onSubmitEditing={handleSendMessage}
                returnKeyType="send"
              />
              <Pressable 
                style={[styles.sendButton, !messageText.trim() && styles.sendButtonDisabled]}
                onPress={handleSendMessage}
                disabled={!messageText.trim()}
              >
                <Send size={20} color={messageText.trim() ? Colors.dark.text : Colors.dark.textSecondary} />
              </Pressable>
            </View>
          </View>
        )}
      </View>
    </KeyboardAvoidingView>
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
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.dark.surfaceLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  headerTitle: {
    color: Colors.dark.text,
    fontSize: 18,
    fontWeight: '700' as const,
  },
  liveIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: `${Colors.dark.error}20`,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.dark.error,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.dark.error,
  },
  liveText: {
    color: Colors.dark.error,
    fontSize: 11,
    fontWeight: '700' as const,
  },
  chatToggleButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.dark.surfaceLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
    gap: 16,
  },
  videoContainer: {
    aspectRatio: 16 / 9,
    backgroundColor: Colors.dark.backgroundSecondary,
    position: 'relative',
  },
  videoPlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  videoPlaceholderText: {
    color: Colors.dark.textSecondary,
    fontSize: 16,
    fontWeight: '600' as const,
  },
  videoControls: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 32,
    padding: 24,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  controlButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.dark.glass.background,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.dark.glass.border,
  },
  playButton: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: Colors.dark.text,
    alignItems: 'center',
    justifyContent: 'center',
  },
  participantsPanel: {
    marginHorizontal: 16,
    padding: 16,
    gap: 12,
  },
  participantsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  participantsTitle: {
    color: Colors.dark.text,
    fontSize: 16,
    fontWeight: '700' as const,
  },
  participantsList: {
    gap: 12,
  },
  participantCard: {
    alignItems: 'center',
    gap: 8,
  },
  participantAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.dark.primary,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  participantAvatarText: {
    fontSize: 28,
  },
  hostBadge: {
    position: 'absolute',
    bottom: -4,
    backgroundColor: Colors.dark.accent,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: Colors.dark.background,
  },
  hostBadgeText: {
    color: Colors.dark.text,
    fontSize: 8,
    fontWeight: '700' as const,
  },
  participantName: {
    color: Colors.dark.text,
    fontSize: 12,
    fontWeight: '600' as const,
  },
  chatContainer: {
    flex: 1,
    marginHorizontal: 16,
    marginBottom: 16,
    backgroundColor: Colors.dark.surfaceLight,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.dark.border,
    overflow: 'hidden',
  },
  chatHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.dark.border,
  },
  chatTitle: {
    color: Colors.dark.text,
    fontSize: 16,
    fontWeight: '700' as const,
  },
  chatMessages: {
    flex: 1,
  },
  chatMessagesContent: {
    padding: 16,
    gap: 12,
  },
  messageCard: {
    backgroundColor: Colors.dark.backgroundSecondary,
    padding: 12,
    borderRadius: 12,
    gap: 8,
  },
  myMessageCard: {
    backgroundColor: `${Colors.dark.primary}20`,
    borderWidth: 1,
    borderColor: Colors.dark.primary,
  },
  messageHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  messageAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.dark.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  messageAvatarText: {
    fontSize: 16,
  },
  messageInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  messageName: {
    color: Colors.dark.text,
    fontSize: 14,
    fontWeight: '600' as const,
  },
  messageTimestamp: {
    color: Colors.dark.textSecondary,
    fontSize: 11,
  },
  messageText: {
    color: Colors.dark.text,
    fontSize: 14,
    lineHeight: 20,
  },
  chatInput: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: Colors.dark.border,
  },
  chatInputField: {
    flex: 1,
    backgroundColor: Colors.dark.backgroundSecondary,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    color: Colors.dark.text,
    fontSize: 14,
    borderWidth: 1,
    borderColor: Colors.dark.border,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.dark.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: Colors.dark.surfaceLight,
  },
});
