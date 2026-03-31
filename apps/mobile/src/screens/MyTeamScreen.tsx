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
  Modal,
  Clipboard,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { typography } from '../theme';
import {
  chatApi,
  departmentApi,
  DepartmentTeam,
  ChatMessage,
  tokenStorage,
  uploadMedia,
} from '../services/api';
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
  return da.getFullYear() === db.getFullYear()
    && da.getMonth() === db.getMonth()
    && da.getDate() === db.getDate();
}

function TypingDots() {
  const dot0 = useRef(new Animated.Value(0)).current;
  const dot1 = useRef(new Animated.Value(0)).current;
  const dot2 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const bounce = (dot: Animated.Value, delay: number) =>
      Animated.loop(Animated.sequence([
        Animated.delay(delay),
        Animated.timing(dot, { toValue: 1, duration: 300, useNativeDriver: true }),
        Animated.timing(dot, { toValue: 0, duration: 300, useNativeDriver: true }),
        Animated.delay(450 - delay),
      ]));
    const a0 = bounce(dot0, 0);
    const a1 = bounce(dot1, 150);
    const a2 = bounce(dot2, 300);
    a0.start(); a1.start(); a2.start();
    return () => { a0.stop(); a1.stop(); a2.stop(); };
  }, [dot0, dot1, dot2]);

  return (
    <View style={dotStyles.bubble}>
      {[dot0, dot1, dot2].map((dot, i) => (
        <Animated.View key={i} style={[dotStyles.dot, {
          opacity: dot,
          transform: [{ translateY: dot.interpolate({ inputRange: [0, 1], outputRange: [0, -4] }) }],
        }]} />
      ))}
    </View>
  );
}

const dotStyles = StyleSheet.create({
  bubble: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: RECV_BG, borderRadius: 18, borderBottomLeftRadius: 4,
    paddingHorizontal: 14, paddingVertical: 12, gap: 5,
    alignSelf: 'flex-start', marginLeft: 12, marginBottom: 6,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06, shadowRadius: 2, elevation: 1,
  },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#aaa' },
});

interface Props {
  navbarHeight: number;
}

type ContextMenuMsg = { msg: ChatMessage; isMine: boolean };
type ReplyTo = { id: string; content: string | null; senderName: string };

export default function MyTeamScreen({ navbarHeight }: Props) {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [team, setTeam] = useState<DepartmentTeam | null>(null);
  const [loadingTeam, setLoadingTeam] = useState(true);
  const [teamError, setTeamError] = useState<string | null>(null);

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loadingMsgs, setLoadingMsgs] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | null>(null);

  const [myUserId, setMyUserId] = useState('');
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [replyTo, setReplyTo] = useState<ReplyTo | null>(null);
  const [contextMenu, setContextMenu] = useState<ContextMenuMsg | null>(null);
  const [uploading, setUploading] = useState(false);

  const socketRef = useRef<Socket | null>(null);
  const typingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const flatListRef = useRef<FlatList>(null);
  const chatIdRef = useRef<string | null>(null);
  const myUserIdRef = useRef('');

  // Load user id
  useEffect(() => {
    tokenStorage.get().then((token) => {
      if (token) {
        try {
          const payload = JSON.parse(atob(token.split('.')[1]!));
          setMyUserId(payload.sub);
          myUserIdRef.current = payload.sub;
        } catch { /* ignore */ }
      }
    });
  }, []);

  // Load team + messages
  const loadTeam = useCallback(async () => {
    setLoadingTeam(true);
    setTeamError(null);
    try {
      const data = await departmentApi.getMyTeam();
      setTeam(data);
      chatIdRef.current = data.chatId;

      // Load messages
      setLoadingMsgs(true);
      const msgData = await chatApi.getMessages(data.chatId);
      setMessages(msgData.messages.reverse());
      setNextCursor(msgData.nextCursor);
    } catch (err: any) {
      setTeamError(err?.message ?? 'Failed to load team');
    } finally {
      setLoadingTeam(false);
      setLoadingMsgs(false);
    }
  }, []);

  useEffect(() => { loadTeam(); }, [loadTeam]);

  // Socket setup
  useEffect(() => {
    const setup = async () => {
      let sock = getSocket();
      if (!sock) sock = await connectSocket();
      socketRef.current = sock;

      const handleNew = (message: ChatMessage) => {
        if (message.chatId !== chatIdRef.current) return;
        setMessages((prev) =>
          prev.some((m) => m.id === message.id) ? prev : [...prev, message]
        );
        sock!.emit('message:read', { chatId: chatIdRef.current, messageId: message.id });
      };

      const handleTypingStart = (d: { chatId: string; userId: string }) => {
        if (d.chatId !== chatIdRef.current || d.userId === myUserIdRef.current) return;
        setIsTyping(true);
      };

      const handleTypingStop = (d: { chatId: string }) => {
        if (d.chatId !== chatIdRef.current) return;
        setIsTyping(false);
      };

      sock.on('message:new', handleNew);
      sock.on('typing:start', handleTypingStart);
      sock.on('typing:stop', handleTypingStop);

      return () => {
        sock!.off('message:new', handleNew);
        sock!.off('typing:start', handleTypingStart);
        sock!.off('typing:stop', handleTypingStop);
      };
    };

    const cleanup = setup();
    return () => { cleanup.then((fn) => fn?.()); };
  }, []);

  // Auto read last message
  useEffect(() => {
    const chatId = chatIdRef.current;
    const sock = socketRef.current;
    if (!sock || !chatId || messages.length === 0) return;
    const last = messages[messages.length - 1];
    if (last && last.senderId !== myUserId) {
      sock.emit('message:read', { chatId, messageId: last.id });
    }
  }, [messages, myUserId]);

  const loadOlderMessages = useCallback(async () => {
    const chatId = chatIdRef.current;
    if (!chatId || !nextCursor || loadingMore) return;
    setLoadingMore(true);
    try {
      const data = await chatApi.getMessages(chatId, nextCursor);
      setMessages((prev) => [...data.messages.reverse(), ...prev]);
      setNextCursor(data.nextCursor);
    } catch { /* ignore */ }
    finally { setLoadingMore(false); }
  }, [nextCursor, loadingMore]);

  const sendMessage = useCallback((type: 'text' | 'image', content?: string, mediaUrl?: string) => {
    const sock = socketRef.current;
    const chatId = chatIdRef.current;
    if (!sock || !chatId) return;

    sock.emit('message:send', {
      chatId,
      type,
      content,
      mediaUrl,
      ...(replyTo ? { replyToId: replyTo.id } : {}),
    }, (res: { message?: ChatMessage }) => {
      if (res?.message) {
        setMessages((prev) =>
          prev.some((m) => m.id === res.message!.id) ? prev : [...prev, res.message!]
        );
      }
    });

    setReplyTo(null);
  }, [replyTo]);

  const handleSend = useCallback(() => {
    const content = inputText.trim();
    if (!content) return;
    setInputText('');
    const sock = socketRef.current;
    const chatId = chatIdRef.current;
    if (sock && chatId) {
      sock.emit('typing:stop', { chatId });
      if (typingTimerRef.current) { clearTimeout(typingTimerRef.current); typingTimerRef.current = null; }
    }
    sendMessage('text', content);
  }, [inputText, sendMessage]);

  const handleTextChange = useCallback((text: string) => {
    setInputText(text);
    const sock = socketRef.current;
    const chatId = chatIdRef.current;
    if (!sock || !chatId) return;
    if (text.length > 0) {
      sock.emit('typing:start', { chatId });
      if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
      typingTimerRef.current = setTimeout(() => {
        sock.emit('typing:stop', { chatId });
        typingTimerRef.current = null;
      }, 2000);
    } else {
      sock.emit('typing:stop', { chatId });
      if (typingTimerRef.current) { clearTimeout(typingTimerRef.current); typingTimerRef.current = null; }
    }
  }, []);

  const handleAttach = useCallback(async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permission needed', 'Please allow access to your photo library.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.8,
    });
    if (result.canceled || !result.assets[0]) return;

    setUploading(true);
    try {
      const url = await uploadMedia(result.assets[0].uri);
      sendMessage('image', undefined, url);
    } catch {
      Alert.alert('Upload failed', 'Could not upload the image. Please try again.');
    } finally {
      setUploading(false);
    }
  }, [sendMessage]);

  const handleDeleteMessage = useCallback(async (messageId: string) => {
    // Optimistic removal
    setMessages((prev) => prev.filter((m) => m.id !== messageId));
    setContextMenu(null);
    // TODO: add REST delete endpoint
  }, []);

  const renderMessage = useCallback(({ item, index }: { item: ChatMessage; index: number }) => {
    const isMine = item.senderId === myUserId;
    const prev = index > 0 ? messages[index - 1] : null;
    const showDate = !prev || !sameDay(prev.createdAt, item.createdAt);
    const showSender = !isMine && prev?.senderId !== item.senderId;
    const nextMsg = index < messages.length - 1 ? messages[index + 1] : null;
    const isTail = !nextMsg || nextMsg.senderId !== item.senderId;

    return (
      <>
        {showDate && (
          <View style={s.dateSep}>
            <View style={s.dateLine} />
            <View style={s.datePill}>
              <Text style={s.datePillText}>{formatDateSep(item.createdAt)}</Text>
            </View>
            <View style={s.dateLine} />
          </View>
        )}
        <Pressable
          style={[s.row, isMine ? s.rowMine : s.rowTheirs]}
          onLongPress={() => setContextMenu({ msg: item, isMine })}
          delayLongPress={350}
        >
          {!isMine && showSender && (
            <View style={s.senderAvatarWrap}>
              <View style={s.senderAvatar}>
                {item.sender?.avatar ? (
                  <Image source={{ uri: item.sender.avatar }} style={s.senderAvatarImg} />
                ) : (
                  <Text style={s.senderAvatarText}>{(item.sender?.name ?? '?')[0]?.toUpperCase()}</Text>
                )}
              </View>
            </View>
          )}
          {!isMine && !showSender && <View style={s.senderAvatarSpacer} />}

          <View style={[
            s.bubble,
            isMine ? s.bubbleMine : s.bubbleTheirs,
            isTail && isMine && s.bubbleTailMine,
            isTail && !isMine && s.bubbleTailTheirs,
          ]}>
            {showSender && !isMine && (
              <Text style={s.senderName}>{item.sender?.name ?? 'Unknown'}</Text>
            )}
            {item.replyTo && (
              <View style={[s.replyBar, isMine && s.replyBarMine]}>
                <Text style={s.replyText} numberOfLines={2}>
                  {item.replyTo.content ?? item.replyTo.type}
                </Text>
              </View>
            )}
            {item.type === 'image' && item.mediaUrl ? (
              <Image source={{ uri: item.mediaUrl }} style={s.msgImage} resizeMode="cover" />
            ) : (
              <Text style={[s.msgText, isMine ? s.msgTextMine : s.msgTextTheirs]}>
                {item.isDeleted ? <Text style={s.deletedText}>This message was deleted</Text> : item.content}
              </Text>
            )}
            <View style={s.msgMeta}>
              <Text style={[s.msgTime, isMine ? s.msgTimeMine : s.msgTimeTheirs]}>
                {formatTime(item.createdAt)}
              </Text>
              {isMine && (
                <Ionicons name="checkmark-done" size={14} color="rgba(0,0,0,0.35)" style={{ marginLeft: 2 }} />
              )}
            </View>
          </View>
        </Pressable>
      </>
    );
  }, [myUserId, messages]);

  // ─── Loading / Error states ───────────────────────────────────────────────
  if (loadingTeam) {
    return (
      <View style={[s.container, { paddingTop: insets.top, paddingBottom: navbarHeight }]}>
        <View style={s.centered}>
          <ActivityIndicator size="large" color={CORAL} />
        </View>
      </View>
    );
  }

  if (teamError || !team) {
    return (
      <View style={[s.container, { paddingTop: insets.top, paddingBottom: navbarHeight }]}>
        <View style={s.centered}>
          <Ionicons name="people-outline" size={48} color="#ccc" style={{ marginBottom: 12 }} />
          <Text style={s.errorTitle}>Team unavailable</Text>
          <Text style={s.errorSub}>{teamError ?? 'Could not load your department chat.'}</Text>
          <Pressable style={s.retryBtn} onPress={loadTeam}>
            <Text style={s.retryText}>Retry</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  const hasText = inputText.trim().length > 0;

  return (
    <View style={s.container}>
      {/* Header */}
      <LinearGradient
        colors={['#E46C53', '#D45A42']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[s.header, { paddingTop: insets.top + 8 }]}
      >
        <Pressable
          style={s.headerInfo}
          onPress={() => router.push({
            pathname: '/department-info',
            params: { chatId: team.chatId, name: team.name },
          })}
        >
          <View style={s.headerIconWrap}>
            <Ionicons name="people" size={22} color="#fff" />
          </View>
          <View style={s.headerText}>
            <Text style={s.headerName}>{team.name}</Text>
            <Text style={s.headerSub}>{team.memberCount} members · tap for team info</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color="rgba(255,255,255,0.6)" />
        </Pressable>
      </LinearGradient>

      {/* Chat area */}
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {loadingMsgs ? (
          <View style={s.centered}>
            <ActivityIndicator size="large" color={CORAL} />
          </View>
        ) : (
          <FlatList
            ref={flatListRef}
            data={messages}
            keyExtractor={(item) => item.id}
            renderItem={renderMessage}
            style={s.msgList}
            contentContainerStyle={s.msgContent}
            onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: false })}
            onStartReached={loadOlderMessages}
            onStartReachedThreshold={0.1}
            ListHeaderComponent={loadingMore ? (
              <View style={{ paddingVertical: 12, alignItems: 'center' }}>
                <ActivityIndicator size="small" color={CORAL} />
              </View>
            ) : null}
            ListEmptyComponent={
              <View style={s.emptyMsgs}>
                <View style={s.emptyPill}>
                  <Ionicons name="lock-closed-outline" size={13} color={TEAL} style={{ marginRight: 5 }} />
                  <Text style={s.emptyPillText}>Messages are end-to-end encrypted</Text>
                </View>
                <Text style={s.emptySub}>Say hello to your team 👋</Text>
              </View>
            }
          />
        )}

        {isTyping && <TypingDots />}

        {/* Reply preview */}
        {replyTo && (
          <View style={s.replyPreview}>
            <View style={s.replyPreviewBar} />
            <View style={s.replyPreviewContent}>
              <Text style={s.replyPreviewName}>{replyTo.senderName}</Text>
              <Text style={s.replyPreviewText} numberOfLines={1}>{replyTo.content ?? ''}</Text>
            </View>
            <Pressable onPress={() => setReplyTo(null)} hitSlop={8}>
              <Ionicons name="close" size={18} color="#999" />
            </Pressable>
          </View>
        )}

        {/* Input bar */}
        <View style={[s.inputBar, { paddingBottom: Math.max(navbarHeight, insets.bottom + 8) + 4 }]}>
          <View style={s.inputWrap}>
            <Pressable hitSlop={8}>
              <Ionicons name="happy-outline" size={22} color="#aaa" />
            </Pressable>
            <TextInput
              style={s.textInput}
              placeholder="Message your team…"
              placeholderTextColor="#bbb"
              value={inputText}
              onChangeText={handleTextChange}
              multiline
              maxLength={4096}
            />
            <Pressable hitSlop={8} onPress={handleAttach} disabled={uploading}>
              {uploading
                ? <ActivityIndicator size="small" color={CORAL} />
                : <Ionicons name="attach" size={22} color="#aaa" />
              }
            </Pressable>
          </View>
          <Pressable
            style={s.sendBtn}
            onPress={hasText ? handleSend : undefined}
          >
            <LinearGradient
              colors={hasText ? ['#E46C53', '#ED2F3C'] : ['#E0E0E0', '#E0E0E0']}
              style={s.sendBtnGrad}
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

      {/* Long-press context menu */}
      <Modal
        visible={!!contextMenu}
        transparent
        animationType="fade"
        onRequestClose={() => setContextMenu(null)}
      >
        <Pressable style={s.menuOverlay} onPress={() => setContextMenu(null)}>
          <View style={s.menuCard}>
            {/* Reply */}
            <Pressable
              style={s.menuRow}
              onPress={() => {
                if (!contextMenu) return;
                setReplyTo({
                  id: contextMenu.msg.id,
                  content: contextMenu.msg.content,
                  senderName: contextMenu.msg.sender?.name ?? 'Unknown',
                });
                setContextMenu(null);
              }}
            >
              <Ionicons name="return-down-back-outline" size={20} color="#333" />
              <Text style={s.menuLabel}>Reply</Text>
            </Pressable>

            {/* Copy */}
            {contextMenu?.msg.type === 'text' && (
              <Pressable
                style={s.menuRow}
                onPress={() => {
                  if (contextMenu?.msg.content) Clipboard.setString(contextMenu.msg.content);
                  setContextMenu(null);
                }}
              >
                <Ionicons name="copy-outline" size={20} color="#333" />
                <Text style={s.menuLabel}>Copy</Text>
              </Pressable>
            )}

            {/* Delete (own messages only) */}
            {contextMenu?.isMine && (
              <Pressable
                style={[s.menuRow, s.menuRowDanger]}
                onPress={() => {
                  if (contextMenu) handleDeleteMessage(contextMenu.msg.id);
                }}
              >
                <Ionicons name="trash-outline" size={20} color="#ED2F3C" />
                <Text style={[s.menuLabel, s.menuLabelDanger]}>Delete</Text>
              </Pressable>
            )}
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: CHAT_BG },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  // Header
  header: {
    paddingHorizontal: 16, paddingBottom: 14,
    flexDirection: 'row', alignItems: 'center',
  },
  headerInfo: { flex: 1, flexDirection: 'row', alignItems: 'center' },
  headerIconWrap: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center', alignItems: 'center',
    marginRight: 10, borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.35)',
  },
  headerText: { flex: 1 },
  headerName: {
    fontSize: 16, fontFamily: typography.fontFamily,
    fontWeight: typography.weights.semibold, color: '#fff',
  },
  headerSub: {
    fontSize: 12, fontFamily: typography.fontFamily,
    color: 'rgba(255,255,255,0.8)', marginTop: 1,
  },

  // Error / empty
  errorTitle: {
    fontSize: 16, fontFamily: typography.fontFamily,
    fontWeight: typography.weights.semibold, color: '#444', marginBottom: 6,
  },
  errorSub: {
    fontSize: 13, fontFamily: typography.fontFamily,
    color: '#888', textAlign: 'center', paddingHorizontal: 32, marginBottom: 20,
  },
  retryBtn: {
    paddingHorizontal: 24, paddingVertical: 10,
    backgroundColor: CORAL, borderRadius: 20,
  },
  retryText: {
    fontSize: 14, fontFamily: typography.fontFamily,
    fontWeight: typography.weights.semibold, color: '#fff',
  },

  // Messages
  msgList: { flex: 1, backgroundColor: CHAT_BG },
  msgContent: { paddingHorizontal: 10, paddingVertical: 12, flexGrow: 1 },
  emptyMsgs: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: 60, gap: 16 },
  emptyPill: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(243,210,146,0.4)', borderRadius: 20,
    paddingHorizontal: 16, paddingVertical: 7,
  },
  emptyPillText: { fontSize: 12, fontFamily: typography.fontFamily, color: TEAL },
  emptySub: { fontSize: 14, fontFamily: typography.fontFamily, color: '#888' },

  // Date separator
  dateSep: { flexDirection: 'row', alignItems: 'center', marginVertical: 14, paddingHorizontal: 4 },
  dateLine: { flex: 1, height: StyleSheet.hairlineWidth, backgroundColor: 'rgba(0,0,0,0.12)' },
  datePill: {
    backgroundColor: 'rgba(243,210,146,0.5)', borderRadius: 10,
    paddingHorizontal: 10, paddingVertical: 3, marginHorizontal: 10,
  },
  datePillText: { fontSize: 11, fontFamily: typography.fontFamily, fontWeight: '600' as any, color: '#666' },

  // Bubble rows
  row: { marginBottom: 2, paddingHorizontal: 2, flexDirection: 'row', alignItems: 'flex-end' },
  rowMine: { justifyContent: 'flex-end' },
  rowTheirs: { justifyContent: 'flex-start' },
  senderAvatarWrap: { marginRight: 6 },
  senderAvatar: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: TEAL, justifyContent: 'center', alignItems: 'center',
  },
  senderAvatarImg: { width: 28, height: 28, borderRadius: 14 },
  senderAvatarText: {
    fontSize: 11, fontFamily: typography.fontFamily,
    fontWeight: typography.weights.bold, color: '#fff',
  },
  senderAvatarSpacer: { width: 34 },

  bubble: {
    maxWidth: '76%', paddingHorizontal: 12, paddingTop: 8, paddingBottom: 6,
    borderRadius: 18,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06, shadowRadius: 2, elevation: 1,
  },
  bubbleMine: { backgroundColor: SENT_BG },
  bubbleTheirs: { backgroundColor: RECV_BG },
  bubbleTailMine: { borderBottomRightRadius: 4 },
  bubbleTailTheirs: { borderBottomLeftRadius: 4 },
  senderName: {
    fontSize: 12, fontFamily: typography.fontFamily,
    fontWeight: typography.weights.semibold, color: CORAL, marginBottom: 3,
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
  deletedText: { color: '#aaa', fontStyle: 'italic' },
  msgImage: { width: 200, height: 200, borderRadius: 10, marginBottom: 4 },
  msgMeta: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'flex-end', marginTop: 3, gap: 2,
  },
  msgTime: { fontSize: 10, fontFamily: typography.fontFamily },
  msgTimeMine: { color: '#999' },
  msgTimeTheirs: { color: '#aaa' },

  // Reply preview bar
  replyPreview: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#F0EBE3', borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(0,0,0,0.1)', paddingHorizontal: 12, paddingVertical: 8,
  },
  replyPreviewBar: {
    width: 3, height: '100%', backgroundColor: CORAL,
    borderRadius: 2, marginRight: 8,
  },
  replyPreviewContent: { flex: 1 },
  replyPreviewName: {
    fontSize: 12, fontFamily: typography.fontFamily,
    fontWeight: typography.weights.semibold, color: CORAL, marginBottom: 2,
  },
  replyPreviewText: {
    fontSize: 12, fontFamily: typography.fontFamily, color: '#666',
  },

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
    flex: 1, fontSize: 15, fontFamily: typography.fontFamily,
    color: '#1A1A1A', maxHeight: 110, padding: 0, lineHeight: 20,
  },
  sendBtn: { marginBottom: 2 },
  sendBtnGrad: {
    width: 44, height: 44, borderRadius: 22,
    justifyContent: 'center', alignItems: 'center',
  },

  // Context menu
  menuOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center', alignItems: 'center', paddingHorizontal: 40,
  },
  menuCard: {
    backgroundColor: '#fff', borderRadius: 16, overflow: 'hidden',
    width: '100%',
    shadowColor: '#000', shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15, shadowRadius: 20, elevation: 10,
  },
  menuRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 20, paddingVertical: 16, gap: 14,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#f0f0f0',
  },
  menuRowDanger: { borderBottomWidth: 0 },
  menuLabel: { fontSize: 15, fontFamily: typography.fontFamily, color: '#222' },
  menuLabelDanger: { color: '#ED2F3C' },
});
