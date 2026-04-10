import { createElement, useEffect } from 'react';
import { Modal, View, Pressable, StatusBar, Platform, Linking } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface DocumentViewerProps {
  uri: string | null;
  onClose: () => void;
}

export function DocumentViewer({ uri, onClose }: DocumentViewerProps) {
  const insets = useSafeAreaInsets();

  // Native has no WebView/PDF library — open externally and close immediately
  useEffect(() => {
    if (uri && Platform.OS !== 'web') {
      Linking.openURL(uri).finally(onClose);
    }
  }, [uri, onClose]);

  if (!uri || Platform.OS !== 'web' || !uri.toLowerCase().endsWith('.pdf')) return null;

  return (
    <Modal
      visible
      transparent
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <StatusBar barStyle="light-content" backgroundColor="#000" />
      <View style={{ flex: 1, backgroundColor: '#000' }}>
        <View style={{ flex: 1, padding: 16, paddingTop: insets.top + 56 }}>
          {createElement('iframe' as never, {
            src: uri,
            style: {
              width: '100%',
              height: '100%',
              border: 'none',
              backgroundColor: '#fff',
              borderRadius: 8,
            },
          })}
        </View>
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
