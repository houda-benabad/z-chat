import { useState } from 'react';
import { Modal, View, Text, TextInput, Pressable, KeyboardAvoidingView } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { styles } from './styles/MediaPreviewModal.styles';

export interface PendingMedia {
  uri: string;
  mimeType: string;
  mediaType: 'image' | 'video' | 'document';
  filename?: string;
}

interface MediaPreviewModalProps {
  media: PendingMedia | null;
  onSend: (caption: string) => void;
  onClose: () => void;
}

export function MediaPreviewModal({ media, onSend, onClose }: MediaPreviewModalProps) {
  const [caption, setCaption] = useState('');

  const handleSend = () => {
    onSend(caption.trim());
    setCaption('');
  };

  const handleClose = () => {
    setCaption('');
    onClose();
  };

  return (
    <Modal
      visible={!!media}
      animationType="slide"
      statusBarTranslucent
      onRequestClose={handleClose}
    >
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior="padding"
      >
        {/* Close button */}
        <Pressable style={styles.closeBtn} onPress={handleClose} hitSlop={8}>
          <Ionicons name="close" size={20} color="#fff" />
        </Pressable>

        {/* Preview area */}
        <View style={styles.previewArea}>
          {media?.mediaType === 'image' && (
            <Image
              source={{ uri: media.uri }}
              style={styles.image}
              contentFit="contain"
            />
          )}

          {media?.mediaType === 'video' && (
            <View style={styles.videoBox}>
              <Ionicons name="play-circle-outline" size={64} color="#fff" />
              <Text style={styles.videoLabel}>Video</Text>
            </View>
          )}

          {media?.mediaType === 'document' && (
            <View style={styles.docBox}>
              <Ionicons name="document-text-outline" size={72} color="#F1A167" />
              <Text style={styles.docName} numberOfLines={3}>
                {media.filename ?? 'Document'}
              </Text>
            </View>
          )}
        </View>

        {/* Caption bar */}
        <View style={styles.bottomBar}>
          <TextInput
            style={styles.captionInput}
            placeholder="Add a caption…"
            placeholderTextColor="rgba(255,255,255,0.4)"
            value={caption}
            onChangeText={setCaption}
            maxLength={1024}
            multiline
            selectionColor="#E46C53"
          />
          <Pressable style={styles.sendBtn} onPress={handleSend}>
            <Ionicons name="send" size={18} color="#fff" style={{ marginLeft: 2 }} />
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
