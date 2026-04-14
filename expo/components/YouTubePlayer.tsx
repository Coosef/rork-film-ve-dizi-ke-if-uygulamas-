import React from 'react';
import {
  StyleSheet,
  View,
  Modal,
  Pressable,
  Text,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { X } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Colors from '@/constants/colors';

interface YouTubePlayerProps {
  videoKey: string | null;
  videoTitle?: string;
  visible: boolean;
  onClose: () => void;
}

function YouTubePlayerContent({ videoKey }: { videoKey: string }) {
  if (Platform.OS === 'web') {
    return (
      <iframe
        src={`https://www.youtube.com/embed/${videoKey}?autoplay=1&rel=0&modestbranding=1`}
        style={{ width: '100%', height: '100%', border: 'none' } as any}
        allow="autoplay; encrypted-media"
        allowFullScreen
      />
    );
  }

  const WebView = require('react-native-webview').default;
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0">
      <style>
        * { margin: 0; padding: 0; }
        body { background: #000; }
        .container { position: relative; width: 100%; padding-bottom: 56.25%; height: 0; }
        .container iframe { position: absolute; top: 0; left: 0; width: 100%; height: 100%; border: none; }
      </style>
    </head>
    <body>
      <div class="container">
        <iframe 
          src="https://www.youtube.com/embed/${videoKey}?autoplay=1&rel=0&modestbranding=1&playsinline=1"
          allow="autoplay; encrypted-media"
          allowfullscreen>
        </iframe>
      </div>
    </body>
    </html>
  `;

  return (
    <WebView
      source={{ html }}
      style={styles.webview}
      allowsInlineMediaPlayback
      mediaPlaybackRequiresUserAction={false}
      javaScriptEnabled
      startInLoadingState
      renderLoading={() => (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color={Colors.dark.primary} />
        </View>
      )}
    />
  );
}

export default function YouTubePlayer({ videoKey, videoTitle, visible, onClose }: YouTubePlayerProps) {
  const insets = useSafeAreaInsets();

  if (!videoKey) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      supportedOrientations={['portrait', 'landscape']}
    >
      <View style={styles.overlay}>
        <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
          {videoTitle ? (
            <Text style={styles.title} numberOfLines={1}>{videoTitle}</Text>
          ) : (
            <View />
          )}
          <Pressable style={styles.closeButton} onPress={onClose} hitSlop={12}>
            <X size={22} color={Colors.dark.text} />
          </Pressable>
        </View>

        <View style={styles.playerContainer}>
          <YouTubePlayerContent videoKey={videoKey} />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: '#000',
    justifyContent: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  title: {
    flex: 1,
    color: Colors.dark.text,
    fontSize: 16,
    fontWeight: '600' as const,
    marginRight: 12,
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  playerContainer: {
    width: '100%',
    aspectRatio: 16 / 9,
    backgroundColor: '#000',
  },
  webview: {
    flex: 1,
    backgroundColor: '#000',
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
