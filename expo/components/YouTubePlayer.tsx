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
      <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        html, body { width: 100%; height: 100%; background: #000; overflow: hidden; }
        #player { position: absolute; top: 0; left: 0; width: 100%; height: 100%; }
      </style>
    </head>
    <body>
      <div id="player"></div>
      <script>
        var tag = document.createElement('script');
        tag.src = 'https://www.youtube.com/iframe_api';
        var firstScriptTag = document.getElementsByTagName('script')[0];
        firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);

        var player;
        function onYouTubeIframeAPIReady() {
          player = new YT.Player('player', {
            videoId: '${videoKey}',
            playerVars: {
              autoplay: 1,
              playsinline: 1,
              rel: 0,
              modestbranding: 1,
              controls: 1,
              fs: 1,
              origin: 'https://www.youtube.com'
            },
            events: {
              onError: function(e) {
                if (e.data === 150 || e.data === 101 || e.data === 153) {
                  document.getElementById('player').innerHTML = 
                    '<div style="display:flex;align-items:center;justify-content:center;height:100%;color:#fff;font-family:sans-serif;text-align:center;padding:20px;">' +
                    '<div><p style="font-size:16px;margin-bottom:12px;">Bu video gömülü oynatmayı desteklemiyor</p>' +
                    '<a href="https://www.youtube.com/watch?v=${videoKey}" style="color:#FF6B6B;font-size:14px;">YouTube\'da Aç</a></div></div>';
                }
              }
            }
          });
        }
      </script>
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
      domStorageEnabled
      allowsFullscreenVideo
      mixedContentMode="compatibility"
      originWhitelist={['*']}
      userAgent="Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1"
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
