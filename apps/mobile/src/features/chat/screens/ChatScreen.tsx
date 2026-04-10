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
  AppState,
  Pressable,
  StyleSheet,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { getSocket, connectSocket } from '@/shared/services/socket';
import { LoadingScreen, TypingDots, Snackbar } from '@/shared/components';
import { useCurrentUser } from '@/shared/hooks';
import { useAppSettings } from '@/shared/context/AppSettingsContext';
import { chatApi, uploadMedia, userApi, settingsApi, contactApi } from '@/shared/services/api';
import { alert, confirm } from '@/shared/utils/alert';
import { useMessages } from '../hooks/useMessages';
import { useMessageComposer } from '../hooks/useMessageComposer';
import { useVoiceRecorder } from '../hooks/useVoiceRecorder';
import { useChatSocket } from '../hooks/useChatSocket';
import { useBlockStatus } from '../hooks/useBlockStatus';
import { useContactStatus } from '../hooks/useContactStatus';
import { useKeyPair } from '../hooks/useKeyPair';
import { useMessageSearch } from '../hooks/useMessageSearch';
import {
  ChatHeader,
  MessageBubble,
  MessageInput,
  BlockedBar,
  RemovedFromGroupBar,
  UnknownContactBar,
  SearchResultList,
} from '../components';
import { MessageActions } from '../components/MessageActions';
import { ForwardModal } from '../components/ForwardModal';
import { useForwardModal } from '../hooks/useForwardModal';
import { useThemedStyles } from '@/shared/hooks/useThemedStyles';
import { createStyles } from './styles/ChatScreen.styles';
import type { Socket } from 'socket.io-client';
import type { ChatMessage, ContactItem } from '@/types';
import { resolveTypingLabel } from '@/shared/utils';

export default function ChatScreen() {
  const styles = useThemedStyles(createStyles);
  const {
    chatId: paramChatId, name, recipientId = '', chatType, recipientIsOnline, recipientAvatar, backTo, messageId: jumpToMessageId,
  } = useLocalSearchParams<{
    chatId: string; name: string; recipientId: string;
    chatType?: string; recipientIsOnline?: string;
    recipientAvatar?: string;
    backTo?: string;
    messageId?: string;
  }>();
  const isGroup = chatType === 'group';
  // activeChatId starts empty for new chats and is set once the first message creates the chat
  const [activeChatId, setActiveChatId] = useState(paramChatId ?? '');
  const router  = useRouter();
  const insets  = useSafeAreaInsets();
  const { userId: myUserId, loading: userLoading } = useCurrentUser();
  const { accentColor, settings, appColors } = useAppSettings();
  const CORAL = accentColor;
  const CHAT_BG = '#ECE5DD';

  // Live group metadata (updated via socket when admin changes name/avatar)
  const [liveGroupName, setLiveGroupName] = useState(name || '');
  const [liveAvatar, setLiveAvatar]       = useState<string | undefined>(recipientAvatar || undefined);

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

  useEffect(() => {
    if (!socket || !isGroup || !activeChatId) return;
    const handler = (d: { chatId: string; name?: string; avatar?: string | null }) => {
      if (d.chatId !== activeChatId) return;
      if (d.name   !== undefined) setLiveGroupName(d.name);
      if (d.avatar !== undefined) setLiveAvatar(d.avatar || undefined);
    };
    socket.on('group:updated', handler);
    return () => { socket.off('group:updated', handler); };
  }, [socket, activeChatId, isGroup]);

  // ─── Ensure device key pair exists ────────────────────────────────────────
  const { encryptionError } = useKeyPair();

  // ─── Message state (loading, pagination, decryption) ──────────────────────
  const {
    messages, loading, loadingMore, loadError, isForbidden,
    groupKey, recipientPublicKey, participants,
    addMessage, confirmMessage, markMessageFailed, markMessageBlocked, removeMessage, updateMessage, loadMessages, loadOlderMessages,
    starredMessageIds, toggleStar,
  } = useMessages({ chatId: activeChatId, isGroup, recipientId });

  // ─── Session state ─────────────────────────────────────────────────────────
  const [isOnline, setIsOnline] = useState(false);
  const [typingUserIds, setTypingUserIds] = useState<Set<string>>(new Set());
  const isTyping = typingUserIds.size > 0;
  const [contacts, setContacts] = useState<ContactItem[]>([]);
  const [recipientLastReadMsgId, setRecipientLastReadMsgId] = useState<string | null>(null);
  const [recipientLastReadAt, setRecipientLastReadAt] = useState<string | null>(null);
  const [deliveredUpToMsgId, setDeliveredUpToMsgId] = useState<string | null>(null);

  // Seed read-receipt watermark from server data so ticks render on first load
  // (socket events will override this with newer values in real time).
  // Also sync avatar and online status from server data, which has block filtering applied
  // (blocked-by-recipient users get isOnline:false and avatar:null from getMessages).
  useEffect(() => {
    if (isGroup || !myUserId || participants.length === 0) return;
    const other = participants.find((p) => p.userId !== myUserId);
    if (other?.lastReadMessageId) {
      setRecipientLastReadMsgId(other.lastReadMessageId);
    }
    setRecipientLastReadAt(other?.lastReadMessageCreatedAt ?? null);
    setLiveAvatar(other?.user.avatar || undefined);
    if (!onlineSetBySocket.current) setIsOnline(other?.user.isOnline ?? false);
  }, [participants, myUserId, isGroup]);
  const onlineSetBySocket = useRef(false);
  const flatListRef = useRef<FlatList>(null);
  const isAtBottomRef = useRef(true);

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

  // ─── Group removal state ───────────────────────────────────────────────────
  const [isRemovedFromGroup, setIsRemovedFromGroup] = useState(false);
  const [showRemovedSnackbar, setShowRemovedSnackbar] = useState(false);

  // Deferred detection: server returned 403 on message load
  useEffect(() => {
    if (isForbidden && isGroup) setIsRemovedFromGroup(true);
  }, [isForbidden, isGroup]);

  // Real-time detection: socket event fires while user is in the chat
  const handleRemovedFromGroup = useCallback(() => {
    setIsRemovedFromGroup(true);
    setShowRemovedSnackbar(true);
  }, []);

  // ─── Block status ──────────────────────────────────────────────────────────
  const { isBlocked, setIsBlocked, handleUnblock, handleDeleteConversation } = useBlockStatus({ recipientId, isGroup, chatId: activeChatId });

  // Re-fetch recipient's profile when they get unblocked so the header reflects
  // their current online status immediately (isBlocked: true → false edge only)
  const wasBlocked = useRef(isBlocked);
  useEffect(() => {
    const justUnblocked = wasBlocked.current && !isBlocked;
    wasBlocked.current = isBlocked;
    if (!justUnblocked || isGroup || !recipientId) return;
    userApi.getUser(recipientId)
      .then(({ user }) => { if (!onlineSetBySocket.current) setIsOnline(user.isOnline); })
      .catch(() => {});
  }, [isBlocked, isGroup, recipientId]);
  const { isContact, contactNickname, recipientPhone, handleAddContact: handleAddUnknownContact } = useContactStatus({ recipientId, isGroup });
  const displayName = contactNickname ?? (isContact ? name : (recipientPhone ?? name)) ?? '';

  // ─── Message actions (long-press) ──────────────────────────────────────────
  const [actionMessage, setActionMessage] = useState<ChatMessage | null>(null);
  const [replyToMessage, setReplyToMessage] = useState<ChatMessage | null>(null);

  // ─── Media upload ──────────────────────────────────────────────────────────
  const [uploadingMedia, setUploadingMedia] = useState(false);

  // ─── Voice notes ───────────────────────────────────────────────────────────
  const { isRecording, durationMs, startRecording, stopRecording, cancelRecording, getMimeType } = useVoiceRecorder();

  const sendMedia = useCallback(async (uri: string, mimeType: string, type: 'voice_note' | 'image' | 'video' | 'document') => {
    if (!socket) return;
    setUploadingMedia(true);

    // Resolve chatId — create the chat on first media message if needed
    let chatIdToUse = activeChatId;
    if (!chatIdToUse) {
      if (!recipientId) { setUploadingMedia(false); return; }
      try {
        const { chat } = await chatApi.createChat(recipientId);
        chatIdToUse = chat.id;
        setActiveChatId(chatIdToUse);
      } catch {
        setUploadingMedia(false);
        return;
      }
    }

    const pendingId = `pending-media-${Date.now()}`;
    addMessage({
      id: pendingId, chatId: chatIdToUse, senderId: myUserId, type,
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
        { chatId: chatIdToUse, type, mediaUrl },
        (res: { message?: ChatMessage; error?: string; code?: string }) => {
          if (res?.message) {
            confirmMessage(pendingId, { ...res.message, mediaUrl }, '');
          } else if (res?.code === 'BLOCKED') {
            markMessageBlocked(pendingId);
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
  }, [socket, activeChatId, recipientId, myUserId, addMessage, confirmMessage, markMessageFailed, markMessageBlocked]);

  const handleVoiceStop = useCallback(async () => {
    const uri = await stopRecording();
    if (!uri) return;
    const mimeType = getMimeType() || (Platform.OS === 'web' ? 'audio/webm' : 'audio/m4a');
    await sendMedia(uri, mimeType, 'voice_note');
  }, [stopRecording, sendMedia, getMimeType]);

  const handleMediaSelected = useCallback(async (uri: string, mimeType: string, mediaType: 'image' | 'video' | 'document') => {
    await sendMedia(uri, mimeType, mediaType);
  }, [sendMedia]);

  const handleRetryMedia = useCallback(async (msg: ChatMessage) => {
    if (!msg.localUri) return;
    removeMessage(msg.id);
    await sendMedia(msg.localUri, msg.localMimeType ?? 'image/jpeg', msg.type as 'voice_note' | 'image' | 'video' | 'document');
  }, [removeMessage, sendMedia]);

  // ─── Search ─────────────────────────────────────────────────────────────────────────
  const {
    searchOpen, searchQuery, searchResults,
    openSearch, closeSearch, handleQueryChange, clearQuery,
  } = useMessageSearch(messages);

  const [highlightedMessageId, setHighlightedMessageId] = useState<string | null>(null);
  const [snackbarMsg, setSnackbarMsg] = useState<string | null>(null);

  const handleResultPress = useCallback((messageId: string) => {
    const index = messages.findIndex((m) => m.id === messageId);
    if (index === -1) return;
    closeSearch();

    // FlatList is always mounted — small delay for state flush, then scroll
    setTimeout(() => {
      flatListRef.current?.scrollToIndex({ index, animated: true, viewPosition: 0.5 });
    }, 50);

    // Highlight fires after scroll (and any onScrollToIndexFailed retry) has settled
    setTimeout(() => {
      setHighlightedMessageId(messageId);
    }, 700);

    setTimeout(() => {
      setHighlightedMessageId(null);
    }, 1900);
  }, [closeSearch, messages]);

  const handleReplyPress = useCallback((replyToId: string) => {
    const index = messages.findIndex((m) => m.id === replyToId);
    if (index === -1) {
      setSnackbarMsg('Scroll up to find this message');
      return;
    }
    setTimeout(() => {
      flatListRef.current?.scrollToIndex({ index, animated: true, viewPosition: 0.5 });
    }, 50);
    setTimeout(() => { setHighlightedMessageId(replyToId); }, 700);
    setTimeout(() => { setHighlightedMessageId(null); }, 2600);
  }, [messages]);

  // Load messages on mount
  useEffect(() => { loadMessages(); }, [loadMessages]);

  // Jump to a specific message when navigated from starred messages
  const hasJumpedRef = useRef(false);
  useEffect(() => {
    if (!jumpToMessageId || hasJumpedRef.current || messages.length === 0) return;
    const index = messages.findIndex((m) => m.id === jumpToMessageId);
    if (index === -1) return;
    hasJumpedRef.current = true;

    setTimeout(() => {
      flatListRef.current?.scrollToIndex({ index, animated: true, viewPosition: 0.5 });
    }, 50);
    setTimeout(() => { setHighlightedMessageId(jumpToMessageId); }, 700);
    setTimeout(() => { setHighlightedMessageId(null); }, 1900);
  }, [messages, jumpToMessageId]);

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

  // Send read receipt when last message changes — only if scrolled to bottom
  useEffect(() => {
    if (!socket || !activeChatId || !myUserId || messages.length === 0) return;
    if (!isAtBottomRef.current) return;
    const last = messages[messages.length - 1];
    if (last && last.senderId !== myUserId) {
      socket.emit('message:read', { chatId: activeChatId, messageId: last.id });
    }
  }, [socket, messages, activeChatId, myUserId]);

  // Derived indexes for tick marks
  const readUpToIndex = useMemo(() => {
    if (!recipientLastReadMsgId) return -1;
    const idx = messages.findIndex((m) => m.id === recipientLastReadMsgId);
    if (idx !== -1) return idx;
    // Watermark message was deleted — fall back to timestamp so older messages still show seen
    if (recipientLastReadAt && messages.length > 0) {
      const last = messages[messages.length - 1]!;
      if (last.createdAt <= recipientLastReadAt) return messages.length - 1;
    }
    return -1;
  }, [messages, recipientLastReadMsgId, recipientLastReadAt]);
  const deliveredUpToIndex = useMemo(
    () => (!deliveredUpToMsgId ? -1 : messages.findIndex((m) => m.id === deliveredUpToMsgId)),
    [messages, deliveredUpToMsgId],
  );

  const typingLabel = useMemo(() => {
    if (!isGroup) return 'typing...';
    return resolveTypingLabel(typingUserIds, participants, contacts);
  }, [isGroup, typingUserIds, participants, contacts]);

  const resolveName = useCallback((userId: string): string | null => {
    const contact = contacts.find((c) => c.contactUserId === userId);
    if (contact) {
      return contact.nickname ?? contact.contactUser.name ?? contact.contactUser.phone;
    }
    const participant = participants.find((p) => p.userId === userId);
    return participant?.user.phone ?? null;
  }, [contacts, participants]);

  const resolveAvatar = useCallback((userId: string): string | null => {
    const contact = contacts.find((c) => c.contactUserId === userId);
    return contact?.contactUser.avatar ?? null;
  }, [contacts]);

  // Update isAtBottomRef on scroll; emit read receipt when user scrolls back to bottom
  const handleScroll = useCallback((event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const { contentOffset, contentSize, layoutMeasurement } = event.nativeEvent;
    const isAtBottom = contentSize.height - layoutMeasurement.height - contentOffset.y < 60;
    const wasAtBottom = isAtBottomRef.current;
    isAtBottomRef.current = isAtBottom;
    if (!wasAtBottom && isAtBottom && socket && activeChatId && myUserId && messages.length > 0) {
      for (let i = messages.length - 1; i >= 0; i--) {
        if (messages[i]?.senderId !== myUserId) {
          socket.emit('message:read', { chatId: activeChatId, messageId: messages[i]!.id });
          break;
        }
      }
    }
  }, [socket, activeChatId, myUserId, messages]);

  // ─── Real-time events ──────────────────────────────────────────────────────
  const handleKeyUpdated = useCallback(() => { loadMessages(); }, [loadMessages]);

  useChatSocket({
    socket, chatId: activeChatId, myUserId, recipientId, isGroup,
    recipientPublicKey, groupKey,
    onNewMessage:  addMessage,
    onRead:        setRecipientLastReadMsgId,
    onTypingStart: (userId) => setTypingUserIds((prev) => new Set([...prev, userId])),
    onTypingStop:  (userId) => setTypingUserIds((prev) => { const s = new Set(prev); s.delete(userId); return s; }),
    onOnline:          () => { onlineSetBySocket.current = true; setIsOnline(true); },
    onOffline:         () => { onlineSetBySocket.current = true; setIsOnline(false); },
    onKeyUpdated:        handleKeyUpdated,
    onMessageDeleted:    (messageId) => updateMessage(messageId, { isDeleted: true, content: null }),
    onRemovedFromGroup:  handleRemovedFromGroup,
  });

  const handleDeleteMessage = useCallback(async (msg: ChatMessage) => {
    try {
      await chatApi.deleteMessage(activeChatId, msg.id);
      updateMessage(msg.id, { isDeleted: true, content: null });
    } catch {
      alert('Error', 'Could not delete message');
    }
  }, [activeChatId, updateMessage]);

  const forwardModal = useForwardModal({
    socket,
    myUserId,
    onSent: ({ chatId, name, chatType, recipientId: rid, recipientAvatar: rAvatar, isOnline }) => {
      router.push({
        pathname: '/chat',
        params: {
          chatId,
          name,
          chatType,
          recipientId: rid,
          recipientAvatar: rAvatar ?? '',
          recipientIsOnline: isOnline ? '1' : '0',
          backTo: '/chat-list',
        },
      });
    },
  });

  const handleForwardMessage = useCallback((msg: ChatMessage) => {
    forwardModal.open(msg);
  }, [forwardModal]);

  // ─── Composer ──────────────────────────────────────────────────────────────
  const handleMessageFailed = useCallback((pendingId: string) => {
    markMessageFailed(pendingId);
  }, [markMessageFailed]);

  const { inputText, handleTextChange, handleSend } = useMessageComposer({
    socket, chatId: activeChatId, myUserId, isGroup, recipientPublicKey, groupKey,
    replyToId: replyToMessage?.id ?? null,
    recipientId,
    onChatCreated: setActiveChatId,
    onPendingMessage: addMessage,
    onMessageSent: (pendingId, msg, plaintext) => {
      confirmMessage(pendingId, msg, plaintext);
      setReplyToMessage(null);
    },
    onMessageFailed: handleMessageFailed,
    onMessageBlocked: markMessageBlocked,
    onEncryptionError: (msg) => alert('Encryption Error', msg),
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
        name={isGroup ? liveGroupName : displayName}
        recipientAvatar={liveAvatar}
        isOnline={isOnline}
        isTyping={isTyping}
        isGroup={isGroup}
        isBlocked={isBlocked}
        topInset={insets.top}
        typingLabel={typingLabel}
        onBack={() => backTo ? router.navigate(backTo as any) : router.back()}
        onHeaderPress={
          isGroup
            ? () => router.push({ pathname: '/group-info', params: { chatId: activeChatId } })
            : recipientId
            ? () => router.push({ pathname: '/user-profile', params: { userId: recipientId, name: displayName } })
            : undefined
        }
        isSearchOpen={searchOpen}
        onSearchPress={isRemovedFromGroup ? undefined : (searchOpen ? closeSearch : openSearch)}
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
          onBlock={async () => {
            const ok = await confirm(
              'Block Contact',
              'Block this person? They won\'t be able to send you messages or calls.',
              'Block',
              true,
            );
            if (!ok) return;
            try {
              await settingsApi.blockUser(recipientId);
              setIsBlocked(true);
            } catch { /* ignore */ }
          }}
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
              isStarred={starredMessageIds.has(item.id)}
              isHighlighted={item.id === highlightedMessageId}
              onLongPress={setActionMessage}
              onReplyPress={handleReplyPress}
              resolveName={resolveName}
              resolveAvatar={resolveAvatar}
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
          onScroll={handleScroll}
          scrollEventThrottle={16}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: false })}
          onStartReached={loadOlderMessages}
          onStartReachedThreshold={0.1}
          onScrollToIndexFailed={(info) => {
            // Scroll to top to force old items to render, then retry
            flatListRef.current?.scrollToOffset({ offset: 0, animated: false });
            setTimeout(() => {
              flatListRef.current?.scrollToIndex({
                index: info.index,
                animated: true,
                viewPosition: 0.5,
              });
            }, 300);
          }}
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

        {isTyping && !isBlocked && !isRemovedFromGroup && <TypingDots label={isGroup ? typingLabel : undefined} />}

        {isBlocked ? (
          <BlockedBar onUnblock={handleUnblock} onDelete={handleDeleteConversation} bottomInset={insets.bottom} />
        ) : isRemovedFromGroup ? (
          <RemovedFromGroupBar bottomInset={insets.bottom} />
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

        {/* Search overlay — always-mounted FlatList stays intact underneath */}
        {searchOpen && (
          <View style={[StyleSheet.absoluteFillObject, { backgroundColor: '#FFFFFF' }]}>
            <View style={styles.searchBar}>
              <Ionicons name="search-outline" size={16} color="#999" style={{ marginRight: 8 }} />
              <TextInput
                style={styles.searchInput}
                placeholder="Search messages..."
                placeholderTextColor="#999"
                value={searchQuery}
                onChangeText={handleQueryChange}
                autoFocus
              />
              {searchQuery.length > 0 && (
                <Pressable onPress={clearQuery} hitSlop={8}>
                  <Ionicons name="close-circle" size={18} color="#999" />
                </Pressable>
              )}
            </View>
            <SearchResultList
              results={searchResults}
              query={searchQuery}
              onResultPress={handleResultPress}
            />
          </View>
        )}
      </KeyboardAvoidingView>

      <MessageActions
        message={actionMessage}
        myUserId={myUserId}
        visible={actionMessage !== null}
        isStarred={!!actionMessage && starredMessageIds.has(actionMessage.id)}
        onClose={() => setActionMessage(null)}
        onReply={(msg) => setReplyToMessage(msg)}
        onDelete={handleDeleteMessage}
        onForward={handleForwardMessage}
        onToggleStar={(msg) => toggleStar(msg.id)}
      />

      <ForwardModal
        visible={forwardModal.visible}
        chats={forwardModal.filteredChats}
        selectedIds={forwardModal.selectedIds}
        search={forwardModal.search}
        sending={forwardModal.sending}
        onSearch={forwardModal.onSearch}
        onToggle={forwardModal.toggleRecipient}
        onSend={forwardModal.handleSend}
        onClose={forwardModal.close}
      />

      {showRemovedSnackbar && (
        <Snackbar
          message="You were removed from this group"
          onDismiss={() => setShowRemovedSnackbar(false)}
        />
      )}

      {snackbarMsg && (
        <Snackbar
          message={snackbarMsg}
          onDismiss={() => setSnackbarMsg(null)}
        />
      )}
    </View>
  );
}

