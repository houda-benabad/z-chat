import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Ionicons } from '@expo/vector-icons';
import {
  View,
  Text,
  TextInput,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
  AppState,
  Pressable,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { getSocket, connectSocket } from '@/shared/services/socket';
import { LoadingScreen, TypingDots } from '@/shared/components';
import { useCurrentUser } from '@/shared/hooks';
import { useAppSettings } from '@/shared/context/AppSettingsContext';
import { chatApi, uploadMedia, userApi, settingsApi, contactApi } from '@/shared/services/api';
import { useMessages } from '../hooks/useMessages';
import { useMessageComposer } from '../hooks/useMessageComposer';
import { useVoiceRecorder } from '../hooks/useVoiceRecorder';
import { useChatSocket } from '../hooks/useChatSocket';
import { useBlockStatus } from '../hooks/useBlockStatus';
import { useContactStatus } from '../hooks/useContactStatus';
import { useKeyPair } from '../hooks/useKeyPair';
import {
  ChatHeader,
  MessageBubble,
  MessageInput,
  BlockedBar,
  UnknownContactBar,
} from '../components';
import { MessageActions } from '../components/MessageActions';
import { useThemedStyles } from '@/shared/hooks/useThemedStyles';
import { createStyles } from './styles/ChatScreen.styles';
import type { Socket } from 'socket.io-client';
import type { ChatMessage, ContactItem } from '@/types';
import { resolveTypingLabel } from '@/shared/utils';
const CHAT_BG = '#ECE5DD';

export default function ChatScreen() {
  const styles = useThemedStyles(createStyles);
  const {
    chatId, name, recipientId = '', chatType, recipientIsOnline, forwardContent, recipientAvatar, backTo,
  } = useLocalSearchParams<{
    chatId: string; name: string; recipientId: string;
    chatType?: string; recipientIsOnline?: string;
    forwardContent?: string; recipientAvatar?: string;
    backTo?: string;
  }>();
  const isGroup = chatType === 'group';
  const router  = useRouter();
  const insets  = useSafeAreaInsets();
  const { userId: myUserId, loading: userLoading } = useCurrentUser();
  const { accentColor, settings, appColors } = useAppSettings();
  const CORAL = accentColor;

  // ─── Socket ───────────────────────────────────────────────────────────────
  const [socket, setSocket] = useState<Socket | null>(() => getSocket());
  const [isConnected, setIsConnected] = useState(() => !!getSocket()?.connected);

  useEffect(() => {
    const s = getSocket();
    if (s) { setSocket(s); setIsConnected(s.connected); return; }
    connectSocket()
      .then((sock) => { setSocket(sock); setIsConnected(true); })
      .catch(() => setIsConnected(false));
  }, []);

  useEffect(() => {
    if (!socket) return;
    const onConnect    = () => setIsConnected(true);
    const onDisconnect = () => setIsConnected(false);
    socket.on('connect',    onConnect);
    socket.on('disconnect', onDisconnect);
    return () => { socket.off('connect', onConnect); socket.off('disconnect', onDisconnect); };
  }, [socket]);

  // ─── Ensure device key pair exists ────────────────────────────────────────
  const { encryptionError } = useKeyPair();

  // ─── Message state (loading, pagination, decryption) ──────────────────────
  const {
    messages, loading, loadingMore, loadError,
    groupKey, recipientPublicKey, participants,
    addMessage, confirmMessage, markMessageFailed, removeMessage, updateMessage, loadMessages, loadOlderMessages,
  } = useMessages({ chatId, isGroup, recipientId });

  // ─── Session state ─────────────────────────────────────────────────────────
  const [isOnline, setIsOnline] = useState(recipientIsOnline === '1');
  const [typingUserIds, setTypingUserIds] = useState<Set<string>>(new Set());
  const isTyping = typingUserIds.size > 0;
  const [contacts, setContacts] = useState<ContactItem[]>([]);
  const [recipientLastReadMsgId, setRecipientLastReadMsgId] = useState<string | null>(null);
  const [deliveredUpToMsgId, setDeliveredUpToMsgId] = useState<string | null>(null);
  const onlineSetBySocket = useRef(false);
  const flatListRef = useRef<FlatList>(null);

  // Verify online status on mount (URL param may be stale)
  useEffect(() => {
    if (isGroup || !recipientId) return;
    userApi.getUser(recipientId)
      .then(({ user }) => { if (!onlineSetBySocket.current) setIsOnline(user.isOnline); })
      .catch(() => {});
  }, [isGroup, recipientId]);

  // Re-check online status when app returns from background
  useEffect(() => {
    if (isGroup || !recipientId) return;
    const sub = AppState.addEventListener('change', async (state) => {
      if (state === 'active') {
        try {
          const { user } = await userApi.getUser(recipientId);
          if (!onlineSetBySocket.current) {
            setIsOnline(user.isOnline);
          }
        } catch { /* ignore */ }
      }
    });
    return () => sub.remove();
  }, [isGroup, recipientId]);

  // Fetch contacts once for group typing labels
  useEffect(() => {
    if (!isGroup) return;
    contactApi.getContacts(0, 500)
      .then(({ contacts: c }) => setContacts(c))
      .catch(() => {});
  }, [isGroup]);

  // ─── Block status ──────────────────────────────────────────────────────────
  const { isBlocked, handleUnblock } = useBlockStatus({ recipientId, isGroup });
  const { isContact, contactNickname, handleAddContact: handleAddUnknownContact } = useContactStatus({ recipientId, isGroup });
  const displayName = contactNickname ?? name ?? '';

  // ─── Message actions (long-press) ──────────────────────────────────────────
  const [actionMessage, setActionMessage] = useState<ChatMessage | null>(null);
  const [replyToMessage, setReplyToMessage] = useState<ChatMessage | null>(null);

  // ─── Media upload ──────────────────────────────────────────────────────────
  const [uploadingMedia, setUploadingMedia] = useState(false);

  // ─── Voice notes ───────────────────────────────────────────────────────────
  const { isRecording, durationMs, startRecording, stopRecording, cancelRecording } = useVoiceRecorder();

  const sendMedia = useCallback(async (uri: string, mimeType: string, type: 'voice_note' | 'image') => {
    if (!socket || !chatId) return;
    setUploadingMedia(true);
    const pendingId = `pending-media-${Date.now()}`;
    addMessage({
      id: pendingId, chatId, senderId: myUserId, type,
      content: null, mediaUrl: uri, replyToId: null,
      isForwarded: false, isDeleted: false, disappearsAt: null,
      createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
      sender: { id: myUserId, name: null },
      pending: true, localUri: uri, localMimeType: mimeType,
    });
    try {
      const mediaUrl = await uploadMedia(uri, mimeType);
      socket.emit(
        'message:send',
        { chatId, type, mediaUrl },
        (res: { message?: ChatMessage; error?: string }) => {
          if (res?.message) {
            confirmMessage(pendingId, { ...res.message, mediaUrl }, '');
          } else {
            markMessageFailed(pendingId);
          }
        },
      );
    } catch {
      markMessageFailed(pendingId);
    } finally {
      setUploadingMedia(false);
    }
  }, [socket, chatId, myUserId, addMessage, confirmMessage, markMessageFailed]);

  const handleVoiceStop = useCallback(async () => {
    const uri = await stopRecording();
    if (!uri) return;
    const mimeType = Platform.OS === 'web' ? 'audio/webm' : 'audio/m4a';
    await sendMedia(uri, mimeType, 'voice_note');
  }, [stopRecording, sendMedia]);

  const handleMediaSelected = useCallback(async (uri: string, mimeType: string) => {
    await sendMedia(uri, mimeType, 'image');
  }, [sendMedia]);

  const handleRetryMedia = useCallback(async (msg: ChatMessage) => {
    if (!msg.localUri) return;
    removeMessage(msg.id);
    await sendMedia(msg.localUri, msg.localMimeType ?? 'image/jpeg', msg.type as 'voice_note' | 'image');
  }, [removeMessage, sendMedia]);

  // ─── Search ───────────────────────────────────────────────────────────────
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<ChatMessage[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);

  const handleSearch = useCallback(async (q: string) => {
    setSearchQuery(q);
    if (!q.trim()) { setSearchResults([]); return; }
    setSearchLoading(true);
    try {
      const { messages } = await chatApi.searchMessages(chatId, q);
      setSearchResults(messages);
    } catch { /* ignore */ }
    finally { setSearchLoading(false); }
  }, [chatId]);

  // Load messages on mount
  useEffect(() => { loadMessages(); }, [loadMessages]);

  // Advance delivered watermark when recipient is online
  useEffect(() => {
    if (!isOnline || !myUserId || messages.length === 0) return;
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i]?.senderId === myUserId) {
        setDeliveredUpToMsgId(messages[i]!.id);
        break;
      }
    }
  }, [isOnline, messages, myUserId]);

  // Send read receipt when last message changes
  useEffect(() => {
    if (!socket || !chatId || !myUserId || messages.length === 0) return;
    const last = messages[messages.length - 1];
    if (last && last.senderId !== myUserId) {
      socket.emit('message:read', { chatId, messageId: last.id });
    }
  }, [socket, messages, chatId, myUserId]);

  // Derived indexes for tick marks
  const readUpToIndex = useMemo(
    () => (!recipientLastReadMsgId ? -1 : messages.findIndex((m) => m.id === recipientLastReadMsgId)),
    [messages, recipientLastReadMsgId],
  );
  const deliveredUpToIndex = useMemo(
    () => (!deliveredUpToMsgId ? -1 : messages.findIndex((m) => m.id === deliveredUpToMsgId)),
    [messages, deliveredUpToMsgId],
  );

  const typingLabel = useMemo(() => {
    if (!isGroup) return 'typing...';
    return resolveTypingLabel(typingUserIds, participants, contacts);
  }, [isGroup, typingUserIds, participants, contacts]);

  // ─── Real-time events ──────────────────────────────────────────────────────
  const handleKeyUpdated = useCallback(() => { loadMessages(); }, [loadMessages]);

  useChatSocket({
    socket, chatId, myUserId, recipientId, isGroup,
    recipientPublicKey, groupKey,
    onNewMessage:  addMessage,
    onRead:        setRecipientLastReadMsgId,
    onTypingStart: (userId) => setTypingUserIds((prev) => new Set([...prev, userId])),
    onTypingStop:  (userId) => setTypingUserIds((prev) => { const s = new Set(prev); s.delete(userId); return s; }),
    onOnline:          () => { onlineSetBySocket.current = true; setIsOnline(true); },
    onOffline:         () => { onlineSetBySocket.current = true; setIsOnline(false); },
    onKeyUpdated:      handleKeyUpdated,
    onMessageDeleted:  (messageId) => updateMessage(messageId, { isDeleted: true, content: null }),
  });

  const handleDeleteMessage = useCallback(async (msg: ChatMessage) => {
    try {
      await chatApi.deleteMessage(chatId, msg.id);
      updateMessage(msg.id, { isDeleted: true, content: null });
    } catch {
      Alert.alert('Error', 'Could not delete message');
    }
  }, [chatId, updateMessage]);

  const handleForwardMessage = useCallback((msg: ChatMessage) => {
    // Navigate to contact picker to forward
    router.push({ pathname: '/new-chat', params: { forwardContent: msg.content ?? '' } });
  }, [router]);

  // ─── Composer ──────────────────────────────────────────────────────────────
  const handleMessageFailed = useCallback((pendingId: string) => {
    markMessageFailed(pendingId);
  }, [markMessageFailed]);

  const { inputText, handleTextChange, handleSend } = useMessageComposer({
    socket, chatId, myUserId, isGroup, recipientPublicKey, groupKey,
    replyToId: replyToMessage?.id ?? null,
    initialText: forwardContent,
    onPendingMessage: addMessage,
    onMessageSent: (pendingId, msg, plaintext) => {
      confirmMessage(pendingId, msg, plaintext);
      setReplyToMessage(null);
    },
    onMessageFailed: handleMessageFailed,
    onEncryptionError: (msg) => Alert.alert('Encryption Error', msg),
  });

  // ─── Render ────────────────────────────────────────────────────────────────
  if (loading || userLoading) return <LoadingScreen backgroundColor={CHAT_BG} color={CORAL} />;

  if (loadError) {
    return (
      <View style={[styles.container, { backgroundColor: CHAT_BG, justifyContent: 'center', alignItems: 'center' }]}>
        <Text style={{ color: '#555', marginBottom: 16, fontSize: 15 }}>Could not load messages</Text>
        <Pressable
          onPress={loadMessages}
          style={{ paddingHorizontal: 24, paddingVertical: 10, backgroundColor: CORAL, borderRadius: 20 }}
        >
          <Text style={{ color: '#fff', fontWeight: '600' }}>Retry</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ChatHeader
        name={displayName}
        recipientAvatar={recipientAvatar || undefined}
        isOnline={isOnline}
        isTyping={isTyping}
        isGroup={isGroup}
        topInset={insets.top}
        typingLabel={typingLabel}
        onBack={() => backTo ? router.navigate(backTo as any) : router.back()}
        onHeaderPress={
          isGroup
            ? () => router.push({ pathname: '/group-info', params: { chatId } })
            : recipientId
            ? () => router.push({ pathname: '/user-profile', params: { userId: recipientId, name: displayName } })
            : undefined
        }
        onSearchPress={() => setSearchOpen((o) => !o)}
      />

      {!isConnected && (
        <View style={styles.offlineBanner}>
          <Text style={styles.offlineBannerText}>No connection — messages may not send</Text>
        </View>
      )}

      {encryptionError && (
        <View style={[styles.offlineBanner, { backgroundColor: '#ED2F3C' }]}>
          <Text style={styles.offlineBannerText}>{encryptionError}</Text>
        </View>
      )}

      {!isGroup && !isContact && !isBlocked && (
        <UnknownContactBar
          onAdd={handleAddUnknownContact}
          onBlock={() => {
            Alert.alert(
              'Block Contact',
              'Block this person? They won\'t be able to send you messages or calls.',
              [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'Block',
                  style: 'destructive',
                  onPress: async () => {
                    try {
                      await settingsApi.blockUser(recipientId);
                    } catch { /* ignore */ }
                  },
                },
              ],
            );
          }}
        />
      )}

      {searchOpen && (
        <View style={styles.searchBar}>
          <TextInput
            style={styles.searchInput}
            placeholder="Search messages..."
            placeholderTextColor="#999"
            value={searchQuery}
            onChangeText={handleSearch}
            autoFocus
          />
          {searchLoading && <ActivityIndicator size="small" color={CORAL} style={{ marginRight: 8 }} />}
        </View>
      )}
      {searchOpen && searchResults.length > 0 && (
        <FlatList
          data={searchResults}
          keyExtractor={(m) => m.id}
          style={styles.searchResults}
          renderItem={({ item }) => (
            <View style={styles.searchResultItem}>
              <Text style={styles.searchResultSender}>{item.sender?.name ?? 'Unknown'}</Text>
              <Text style={styles.searchResultText} numberOfLines={2}>{item.content}</Text>
            </View>
          )}
        />
      )}

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={0}
      >
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(item) => item.id}
          renderItem={({ item, index }) => (
            <MessageBubble
              message={item}
              prevMessage={messages[index - 1] ?? null}
              nextMessage={messages[index + 1] ?? null}
              myUserId={myUserId}
              isGroup={isGroup}
              readUpToIndex={readUpToIndex}
              deliveredUpToIndex={deliveredUpToIndex}
              index={index}
              showReadReceipts={settings?.readReceipts ?? true}
              onLongPress={setActionMessage}
              onRetryFailed={(msg) => {
                if (msg.localUri) {
                  handleRetryMedia(msg);
                } else {
                  removeMessage(msg.id);
                  handleTextChange(msg.content ?? '');
                }
              }}
            />
          )}
          style={styles.msgList}
          contentContainerStyle={styles.msgContent}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: false })}
          onStartReached={loadOlderMessages}
          onStartReachedThreshold={0.1}
          ListHeaderComponent={
            loadingMore
              ? <View style={styles.loadingMore}><ActivityIndicator size="small" color={CORAL} /></View>
              : null
          }
          ListEmptyComponent={
            <View style={styles.emptyMsgs}>
              <View style={styles.emptyPill}>
                <Ionicons name="lock-closed" size={12} color="#4D7E82" />
                <Text style={{ fontSize: 11, color: '#4D7E82', textAlign: 'center' }}>
                  Messages are end-to-end encrypted
                </Text>
              </View>
            </View>
          }
        />

        {isTyping && !isBlocked && <TypingDots label={isGroup ? typingLabel : undefined} />}

        {isBlocked ? (
          <BlockedBar onUnblock={handleUnblock} bottomInset={insets.bottom} />
        ) : (
          <MessageInput
            value={inputText}
            onChangeText={handleTextChange}
            onSend={handleSend}
            bottomInset={insets.bottom}
            replyToMessage={replyToMessage}
            onCancelReply={() => setReplyToMessage(null)}
            onMediaSelected={handleMediaSelected}
            uploadingMedia={uploadingMedia}
            isRecordingVoice={isRecording}
            recordingDurationMs={durationMs}
            onVoiceStart={startRecording}
            onVoiceStop={handleVoiceStop}
            onVoiceCancel={cancelRecording}
          />
        )}
      </KeyboardAvoidingView>

      <MessageActions
        message={actionMessage}
        myUserId={myUserId}
        visible={actionMessage !== null}
        onClose={() => setActionMessage(null)}
        onReply={(msg) => setReplyToMessage(msg)}
        onDelete={handleDeleteMessage}
        onForward={handleForwardMessage}
      />
    </View>
  );
}

