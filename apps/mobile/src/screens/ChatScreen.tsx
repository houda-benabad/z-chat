import { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  Pressable,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Animated,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { colors, spacing, typography, borderRadius } from '../theme';
import { chatApi, ChatMessage, tokenStorage } from '../services/api';
import { getSocket, connectSocket } from '../services/socket';
import type { Socket } from 'socket.io-client';

const CHAT_BG = '#ECE5DD';
const SENT_BG = '#FFF0EC';
const RECV_BG = '#FFFFFF';
const CORAL = '#E46C53';
const TEAL = '#4D7E82';

function formatTime(dateStr: string) {
  return new Date(dateStr).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function formatDateSep(dateStr: string) {
  const date = new Date(dateStr);
  const now = new Date();
  const diff = Math.floor((now.getTime() - date.getTime()) / 86400000);
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Yesterday';
  return date.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' });
}

function sameDay(a: string, b: string) {
  const da = new Date(a), db = new Date(b);
  return da.getFullYear() === db.getFullYear() && da.getMonth() === db.getMonth() && da.getDate() === db.getDate();
}

/** Animated three-dot typing indicator */
function TypingDots() {
  const dot0 = useRef(new Animated.Value(0)).current;
  const dot1 = useRef(new Animated.Value(0)).current;
  const dot2 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const makeBounce = (dot: Animated.Value, delay: number) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(dot, { toValue: 1, duration: 300, useNativeDriver: true }),
          Animated.timing(dot, { toValue: 0, duration: 300, useNativeDriver: true }),
          Animated.delay(450 - delay),
        ])
      );
    const a0 = makeBounce(dot0, 0);
    const a1 = makeBounce(dot1, 150);
    const a2 = makeBounce(dot2, 300);
    a0.start(); a1.start(); a2.start();
    return () => { a0.stop(); a1.stop(); a2.stop(); };
  }, [dot0, dot1, dot2]);

  const dotStyle = (dot: Animated.Value) => ([
    typingStyles.dot,
    { opacity: dot, transform: [{ translateY: dot.interpolate({ inputRange: [0, 1], outputRange: [0, -4] }) }] },
  ]);

  return (
    <View style={typingStyles.bubble}>
      <Animated.View style={dotStyle(dot0)} />
      <Animated.View style={dotStyle(dot1)} />
      <Animated.View style={dotStyle(dot2)} />
    </View>
  );
}

const typingStyles = StyleSheet.create({
  bubble: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: RECV_BG,
    borderRadius: 18,
    borderBottomLeftRadius: 4,
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 5,
    alignSelf: 'flex-start',
    marginLeft: 12,
    marginBottom: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 2,
    elevation: 1,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#aaa',
  },
});

export default function ChatScreen() {
  const { chatId, name, recipientId, chatType, recipientAvatar } = useLocalSearchParams<{
    chatId: string; name: string; recipientId: string; chatType?: string; recipientAvatar?: string;
  }>();
  const isGroup = chatType === 'group';
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [inputText, setInputText] = useState('');
  const [myUserId, setMyUserId] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isOnline, setIsOnline] = useState(false);
  const [socket, setSocket] = useState<Socket | null>(() => getSocket());
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    tokenStorage.get().then((token) => {
      if (token) {
        try {
          const payload = JSON.parse(atob(token.split('.')[1]!));
          setMyUserId(payload.sub);
        } catch { /* ignore */ }
      }
    });
  }, []);

  // Ensure socket is available — connect if ChatListScreen hasn't done so yet
  useEffect(() => {
    const s = getSocket();
    if (s) { setSocket(s); return; }
    connectSocket().then(setSocket).catch(() => {});
  }, []);

  const loadMessages = useCallback(async () => {
    if (!chatId) return;
    try {
      const data = await chatApi.getMessages(chatId);
      setMessages(data.messages.reverse());
      setNextCursor(data.nextCursor);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, [chatId]);

  const loadOlderMessages = useCallback(async () => {
    if (!chatId || !nextCursor || loadingMore) return;
    setLoadingMore(true);
    try {
      const data = await chatApi.getMessages(chatId, nextCursor);
      setMessages((prev) => [...data.messages.reverse(), ...prev]);
      setNextCursor(data.nextCursor);
    } catch { /* ignore */ }
    finally { setLoadingMore(false); }
  }, [chatId, nextCursor, loadingMore]);

  useEffect(() => { loadMessages(); }, [loadMessages]);

  // Re-subscribe whenever socket becomes available (covers race conditions)
  useEffect(() => {
    if (!socket || !chatId) return;

    const handleNew = (message: ChatMessage) => {
      if (message.chatId !== chatId) return;
      setMessages((prev) => prev.some((m) => m.id === message.id) ? prev : [...prev, message]);
      socket.emit('message:read', { chatId, messageId: message.id });
    };
    const handleTypingStart = (d: { chatId: string; userId: string }) => {
      if (d.chatId !== chatId || d.userId === myUserId) return;
      setIsTyping(true);
    };
    const handleTypingStop = (d: { chatId: string; userId: string }) => {
      if (d.chatId !== chatId) return;
      setIsTyping(false);
    };
    const handleOnline = (d: { userId: string }) => { if (d.userId === recipientId) setIsOnline(true); };
    const handleOffline = (d: { userId: string }) => { if (d.userId === recipientId) setIsOnline(false); };

    socket.on('message:new', handleNew);
    socket.on('typing:start', handleTypingStart);
    socket.on('typing:stop', handleTypingStop);
    socket.on('user:online', handleOnline);
    socket.on('user:offline', handleOffline);

    return () => {
      socket.off('message:new', handleNew);
      socket.off('typing:start', handleTypingStart);
      socket.off('typing:stop', handleTypingStop);
      socket.off('user:online', handleOnline);
      socket.off('user:offline', handleOffline);
    };
  }, [socket, chatId, myUserId, recipientId]);

  // Send read receipt when the last message changes
  useEffect(() => {
    if (!socket || !chatId || !myUserId || messages.length === 0) return;
    const last = messages[messages.length - 1];
    if (last && last.senderId !== myUserId) {
      socket.emit('message:read', { chatId, messageId: last.id });
    }
  }, [socket, messages, chatId, myUserId]);

  const handleSend = useCallback(() => {
    const content = inputText.trim();
    if (!content || !chatId || !socket) return;

    setInputText('');
    socket.emit('typing:stop', { chatId });
    if (typingTimeoutRef.current) { clearTimeout(typingTimeoutRef.current); typingTimeoutRef.current = null; }

    // Use ack to add sender's own message immediately without waiting for the broadcast
    socket.emit('message:send', { chatId, type: 'text', content }, (res: { message?: ChatMessage; error?: string }) => {
      if (res?.message) {
        setMessages((prev) =>
          prev.some((m) => m.id === res.message!.id) ? prev : [...prev, res.message!]
        );
      }
    });
  }, [socket, inputText, chatId]);

  const handleTextChange = useCallback((text: string) => {
    setInputText(text);
    if (!socket || !chatId) return;
    if (text.length > 0) {
      socket.emit('typing:start', { chatId });
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(() => {
        socket.emit('typing:stop', { chatId });
        typingTimeoutRef.current = null;
      }, 2000);
    } else {
      socket.emit('typing:stop', { chatId });
      if (typingTimeoutRef.current) { clearTimeout(typingTimeoutRef.current); typingTimeoutRef.current = null; }
    }
  }, [socket, chatId]);

  const renderMessage = useCallback(({ item, index }: { item: ChatMessage; index: number }) => {
    const isMine = item.senderId === myUserId;
    const prev = index > 0 ? messages[index - 1] : null;
    const showDate = !prev || !sameDay(prev.createdAt, item.createdAt);
    const showSender = isGroup && !isMine && prev?.senderId !== item.senderId;
    const isLast = index === messages.length - 1;
    const nextMsg = index < messages.length - 1 ? messages[index + 1] : null;
    const isTail = !nextMsg || nextMsg.senderId !== item.senderId;

    return (
      <>
        {showDate && (
          <View style={styles.dateSep}>
            <View style={styles.dateLine} />
            <View style={styles.datePill}>
              <Text style={styles.datePillText}>{formatDateSep(item.createdAt)}</Text>
            </View>
            <View style={styles.dateLine} />
          </View>
        )}
        <View style={[styles.row, isMine ? styles.rowMine : styles.rowTheirs]}>
          <View style={[
            styles.bubble,
            isMine ? styles.bubbleMine : styles.bubbleTheirs,
            isTail && isMine && styles.bubbleTailMine,
            isTail && !isMine && styles.bubbleTailTheirs,
          ]}>
            {showSender && (
              <Text style={styles.senderName}>{item.sender?.name ?? 'Unknown'}</Text>
            )}
            {item.replyTo && (
              <View style={[styles.replyBar, isMine && styles.replyBarMine]}>
                <Text style={styles.replyText} numberOfLines={2}>
                  {item.replyTo.content ?? item.replyTo.type}
                </Text>
              </View>
            )}
            <Text style={[styles.msgText, isMine ? styles.msgTextMine : styles.msgTextTheirs]}>
              {item.content}
            </Text>
            <View style={styles.msgMeta}>
              <Text style={[styles.msgTime, isMine ? styles.msgTimeMine : styles.msgTimeTheirs]}>
                {formatTime(item.createdAt)}
              </Text>
              {isMine && (
                <Ionicons
                  name="checkmark-done"
                  size={14}
                  color="rgba(0,0,0,0.35)"
                  style={{ marginLeft: 2 }}
                />
              )}
            </View>
          </View>
        </View>
      </>
    );
  }, [myUserId, messages, isGroup]);

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={CORAL} />
      </View>
    );
  }

  const hasText = inputText.trim().length > 0;

  return (
    <View style={styles.container}>
      {/* Coral gradient header */}
      <LinearGradient
        colors={['#E46C53', '#D45A42']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.header, { paddingTop: insets.top + 8 }]}
      >
        <Pressable onPress={() => router.back()} style={styles.backBtn} hitSlop={10}>
          <Ionicons name="arrow-back" size={22} color="#fff" />
        </Pressable>

        <Pressable
          style={styles.headerInfo}
          onPress={isGroup ? () => router.push({ pathname: '/group-info', params: { chatId } }) : recipientId ? () => router.push({ pathname: '/user-profile', params: { userId: recipientId, name: name ?? '' } }) : undefined}
        >
          <View style={styles.headerAvatar}>
            {recipientAvatar ? (
              <Image source={{ uri: recipientAvatar }} style={styles.headerAvatarImage} />
            ) : (
              <Text style={styles.headerAvatarText}>{(name ?? '?')[0]?.toUpperCase()}</Text>
            )}
          </View>
          <View style={styles.headerText}>
            <Text style={styles.headerName} numberOfLines={1}>{name}</Text>
            <Text style={styles.headerStatus}>
              {isTyping ? 'typing...' : !isGroup && isOnline ? 'online' : isGroup ? 'tap for group info' : ''}
            </Text>
          </View>
        </Pressable>

        <View style={styles.headerActions}>
          <Pressable hitSlop={10} style={styles.headerActionBtn}>
            <Ionicons name="videocam-outline" size={22} color="#fff" />
          </Pressable>
          <Pressable hitSlop={10} style={styles.headerActionBtn}>
            <Ionicons name="call-outline" size={20} color="#fff" />
          </Pressable>
        </View>
      </LinearGradient>

      {/* Messages */}
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={0}
      >
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(item) => item.id}
          renderItem={renderMessage}
          style={styles.msgList}
          contentContainerStyle={styles.msgContent}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: false })}
          onStartReached={loadOlderMessages}
          onStartReachedThreshold={0.1}
          ListHeaderComponent={loadingMore ? (
            <View style={styles.loadingMore}><ActivityIndicator size="small" color={CORAL} /></View>
          ) : null}
          ListEmptyComponent={
            <View style={styles.emptyMsgs}>
              <View style={styles.emptyMsgsPill}>
                <Ionicons name="lock-closed-outline" size={13} color={TEAL} style={{ marginRight: 5 }} />
                <Text style={styles.emptyMsgsText}>Messages are end-to-end encrypted</Text>
              </View>
              <Text style={styles.emptyMsgsSub}>Say hello 👋</Text>
            </View>
          }
        />

        {/* Typing indicator */}
        {isTyping && <TypingDots />}

        {/* Input bar */}
        <View style={[styles.inputBar, { paddingBottom: Math.max(insets.bottom, 12) }]}>
          <View style={styles.inputWrap}>
            <Pressable hitSlop={8}>
              <Ionicons name="happy-outline" size={22} color="#aaa" />
            </Pressable>
            <TextInput
              style={styles.textInput}
              placeholder="Message"
              placeholderTextColor="#bbb"
              value={inputText}
              onChangeText={handleTextChange}
              multiline
              maxLength={4096}
              onSubmitEditing={handleSend}
            />
            <Pressable hitSlop={8}>
              <Ionicons name="attach" size={22} color="#aaa" />
            </Pressable>
          </View>
          <Pressable
            style={[styles.sendBtn, hasText && styles.sendBtnActive]}
            onPress={hasText ? handleSend : undefined}
          >
            <LinearGradient
              colors={hasText ? ['#E46C53', '#ED2F3C'] : ['#E0E0E0', '#E0E0E0']}
              style={styles.sendBtnGrad}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <Ionicons
                name={hasText ? 'send' : 'mic-outline'}
                size={18}
                color="#fff"
                style={hasText ? { marginLeft: 2 } : {}}
              />
            </LinearGradient>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: CHAT_BG },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: CHAT_BG },

  // Header
  header: { paddingHorizontal: 12, paddingBottom: 12, flexDirection: 'row', alignItems: 'center' },
  backBtn: { marginRight: 6, padding: 4 },
  headerInfo: { flex: 1, flexDirection: 'row', alignItems: 'center' },
  headerAvatar: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.25)',
    justifyContent: 'center', alignItems: 'center',
    marginRight: 10,
    borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.4)',
  },
  headerAvatarImage: { width: 40, height: 40, borderRadius: 20 },
  headerAvatarText: { fontSize: 16, fontFamily: typography.fontFamily, fontWeight: typography.weights.bold, color: '#fff' },
  headerText: { flex: 1 },
  headerName: { fontSize: 16, fontFamily: typography.fontFamily, fontWeight: typography.weights.semibold, color: '#fff' },
  headerStatus: { fontSize: 12, fontFamily: typography.fontFamily, color: 'rgba(255,255,255,0.8)', marginTop: 1 },
  headerActions: { flexDirection: 'row', gap: 4 },
  headerActionBtn: { padding: 6 },

  // Messages
  msgList: { flex: 1, backgroundColor: CHAT_BG },
  msgContent: { paddingHorizontal: 10, paddingVertical: 12, flexGrow: 1 },
  loadingMore: { paddingVertical: 12, alignItems: 'center' },

  emptyMsgs: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: 60, gap: 16 },
  emptyMsgsPill: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(243,210,146,0.4)', borderRadius: 20,
    paddingHorizontal: 16, paddingVertical: 7,
  },
  emptyMsgsText: { fontSize: 12, fontFamily: typography.fontFamily, color: TEAL },
  emptyMsgsSub: { fontSize: 14, fontFamily: typography.fontFamily, color: '#888' },

  // Date separator
  dateSep: { flexDirection: 'row', alignItems: 'center', marginVertical: 14, paddingHorizontal: 4 },
  dateLine: { flex: 1, height: StyleSheet.hairlineWidth, backgroundColor: 'rgba(0,0,0,0.12)' },
  datePill: {
    backgroundColor: 'rgba(243,210,146,0.5)', borderRadius: 10,
    paddingHorizontal: 10, paddingVertical: 3, marginHorizontal: 10,
  },
  datePillText: { fontSize: 11, fontFamily: typography.fontFamily, fontWeight: '600' as any, color: '#666' },

  // Bubble rows
  row: { marginBottom: 2, paddingHorizontal: 2 },
  rowMine: { alignItems: 'flex-end' },
  rowTheirs: { alignItems: 'flex-start' },

  bubble: {
    maxWidth: '78%', paddingHorizontal: 12, paddingTop: 8, paddingBottom: 6,
    borderRadius: 18,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06, shadowRadius: 2, elevation: 1,
  },
  bubbleMine: { backgroundColor: SENT_BG, borderBottomRightRadius: 18 },
  bubbleTheirs: { backgroundColor: RECV_BG, borderBottomLeftRadius: 18 },
  bubbleTailMine: { borderBottomRightRadius: 4 },
  bubbleTailTheirs: { borderBottomLeftRadius: 4 },

  senderName: {
    fontSize: 12, fontFamily: typography.fontFamily, fontWeight: typography.weights.semibold,
    color: CORAL, marginBottom: 3,
  },
  replyBar: {
    borderLeftWidth: 3, borderLeftColor: TEAL,
    paddingLeft: 8, marginBottom: 6,
    backgroundColor: 'rgba(77,126,130,0.08)', borderRadius: 4, padding: 6,
  },
  replyBarMine: { borderLeftColor: CORAL, backgroundColor: 'rgba(228,108,83,0.08)' },
  replyText: { fontSize: 12, fontFamily: typography.fontFamily, color: '#666' },

  msgText: { fontSize: 15, fontFamily: typography.fontFamily, lineHeight: 21 },
  msgTextMine: { color: '#2C2C2C' },
  msgTextTheirs: { color: '#1A1A1A' },

  msgMeta: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', marginTop: 3, gap: 2 },
  msgTime: { fontSize: 10, fontFamily: typography.fontFamily },
  msgTimeMine: { color: '#999' },
  msgTimeTheirs: { color: '#aaa' },

  // Input bar
  inputBar: {
    flexDirection: 'row', alignItems: 'flex-end', gap: 8,
    paddingHorizontal: 10, paddingTop: 8,
    backgroundColor: '#F0EBE3',
    borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: 'rgba(0,0,0,0.1)',
  },
  inputWrap: {
    flex: 1, flexDirection: 'row', alignItems: 'flex-end',
    backgroundColor: '#fff', borderRadius: 24,
    paddingHorizontal: 12, paddingVertical: 8, gap: 8,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05, shadowRadius: 3, elevation: 1,
  },
  textInput: {
    flex: 1, fontSize: 15, fontFamily: typography.fontFamily, color: '#1A1A1A',
    maxHeight: 110, padding: 0, lineHeight: 20,
  },
  sendBtn: { marginBottom: 2 },
  sendBtnActive: {},
  sendBtnGrad: {
    width: 44, height: 44, borderRadius: 22,
    justifyContent: 'center', alignItems: 'center',
  },
});
