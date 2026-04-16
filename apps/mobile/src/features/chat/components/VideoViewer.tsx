import { useState, useCallback, useEffect } from 'react';
import { Modal, View, Pressable, StatusBar, Dimensions, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { VideoView, useVideoPlayer } from 'expo-video';

interface VideoViewerProps {
  uri: string | null;
  onClose: () => void;
}

const { width, height } = Dimensions.get('window');

export function VideoViewer({ uri, onClose }: VideoViewerProps) {
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(true);

  const player = useVideoPlayer(uri ?? '', (p) => {
    p.loop = false;
  });

  useEffect(() => {
    if (!uri) return;
    setLoading(true);
    const sub = player.addListener('statusChange', ({ status }) => {
      if (status === 'readyToPlay') {
        setLoading(false);
        player.play();
      } else if (status === 'error') {
        setLoading(false);
      }
    });
    return () => sub.remove();
  }, [uri, player]);

  const handleClose = useCallback(() => {
    player.pause();
    setLoading(true);
    onClose();
  }, [player, onClose]);

  return (
    <Modal
      visible={uri !== null}
      transparent
      animationType="fade"
      onRequestClose={handleClose}
      statusBarTranslucent
    >
      <StatusBar barStyle="light-content" backgroundColor="#000" />
      <View style={{ flex: 1, backgroundColor: '#000', justifyContent: 'center', alignItems: 'center' }}>
        {uri && (
          <VideoView
            player={player}
            style={{ width, height: height * 0.85 }}
            contentFit="contain"
            nativeControls
          />
        )}

        {loading && uri && (
          <ActivityIndicator
            size="large"
            color="#E46C53"
            style={{ position: 'absolute' }}
          />
        )}

        <Pressable
          onPress={handleClose}
          hitSlop={12}
          style={{
            position: 'absolute',
            top: insets.top + 12,
            right: 16,
            backgroundColor: 'rgba(0,0,0,0.5)',
            borderRadius: 20,
            padding: 6,
          }}
        >
          <Ionicons name="close" size={24} color="#fff" />
        </Pressable>
      </View>
    </Modal>
  );
}
