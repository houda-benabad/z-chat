import { useRef, useState, useCallback } from 'react';
import { Modal, View, Pressable, StatusBar, Dimensions, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Video, ResizeMode } from 'expo-av';

interface VideoViewerProps {
  uri: string | null;
  onClose: () => void;
}

const { width, height } = Dimensions.get('window');

export function VideoViewer({ uri, onClose }: VideoViewerProps) {
  const insets = useSafeAreaInsets();
  const videoRef = useRef<Video>(null);
  const [loading, setLoading] = useState(true);

  const handleLoad = useCallback(async () => {
    setLoading(false);
    await videoRef.current?.playAsync();
  }, []);

  const handleClose = useCallback(async () => {
    await videoRef.current?.stopAsync();
    await videoRef.current?.unloadAsync();
    setLoading(true);
    onClose();
  }, [onClose]);

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
          <Video
            key={uri}
            ref={videoRef}
            source={{ uri }}
            style={{ width, height: height * 0.85 }}
            resizeMode={ResizeMode.CONTAIN}
            useNativeControls
            shouldPlay={false}
            isLooping={false}
            onLoad={handleLoad}
            onError={() => setLoading(false)}
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
