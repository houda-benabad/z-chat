import { createElement } from 'react';
import { Modal, View, Pressable, StatusBar, Dimensions, Platform } from 'react-native';
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

  return (
    <Modal
      visible={uri !== null}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <StatusBar barStyle="light-content" backgroundColor="#000" />
      <View style={{ flex: 1, backgroundColor: '#000', justifyContent: 'center', alignItems: 'center' }}>
        {uri && Platform.OS === 'web' && createElement('style', {
          dangerouslySetInnerHTML: {
            __html: `video.z-video-viewer { accent-color: #4D7E82; }`,
          },
        })}
        {uri && (Platform.OS === 'web'
          ? createElement('video', {
              className: 'z-video-viewer',
              src: uri,
              controls: true,
              autoPlay: true,
              playsInline: true,
              style: {
                maxWidth: '100vw',
                maxHeight: '85vh',
                width: 'auto',
                height: 'auto',
                objectFit: 'contain',
                backgroundColor: '#000',
              },
            })
          : (
            <Video
              source={{ uri }}
              style={{ width, height: height * 0.85 }}
              useNativeControls
              resizeMode={ResizeMode.CONTAIN}
              shouldPlay
            />
          )
        )}
        <Pressable
          onPress={onClose}
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
