import { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  Pressable,
  TextInput,
  ActivityIndicator,
  RefreshControl,
  SectionList,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { colors, spacing, typography } from '../theme';
import { contactApi, chatApi, ContactItem, tokenStorage } from '../services/api';

const AVATAR_COLORS = ['#E46C53', '#4D7E82', '#F1A167', '#ED2F3C', '#F3D292'];

function avatarColor(name: string): string {
  const code = name.charCodeAt(0) || 65;
  return AVATAR_COLORS[code % AVATAR_COLORS.length]!;
}

function groupByLetter(contacts: ContactItem[]): { title: string; data: ContactItem[] }[] {
  const map = new Map<string, ContactItem[]>();
  for (const c of contacts) {
    const name = c.nickname ?? c.contactUser.name ?? c.contactUser.phone;
    const letter = name[0]?.toUpperCase() ?? '#';
    if (!map.has(letter)) map.set(letter, []);
    map.get(letter)!.push(c);
  }
  return Array.from(map.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([title, data]) => ({ title, data }));
}

export default function NewChatScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const searchRef = useRef<TextInput>(null);
  const [contacts, setContacts] = useState<ContactItem[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [myUserId, setMyUserId] = useState('');
  const [openingId, setOpeningId] = useState<string | null>(null);

  const loadContacts = useCallback(async () => {
    try {
      const { contacts: data } = await contactApi.getContacts();
      setContacts(data);
    } catch {
      // retry on refresh
    }
  }, []);

  useEffect(() => {
    const init = async () => {
      const token = await tokenStorage.get();
      if (token) {
        try {
          const payload = JSON.parse(atob(token.split('.')[1]!));
          setMyUserId(payload.sub);
        } catch { /* ignore */ }
      }
      await loadContacts();
      setLoading(false);
      setTimeout(() => searchRef.current?.focus(), 350);
    };
    init();
  }, [loadContacts]);

  // Reload contacts every time the screen comes back into focus (e.g. after adding a contact)
  useFocusEffect(
    useCallback(() => {
      if (!loading) {
        loadContacts();
      }
    }, [loading, loadContacts]),
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadContacts();
    setRefreshing(false);
  }, [loadContacts]);

  const handleSelectContact = useCallback(async (contact: ContactItem) => {
    if (openingId) return;
    setOpeningId(contact.id);
    try {
      const { chat } = await chatApi.createChat(contact.contactUserId);
      const otherUser = chat.participants.find((p) => p.userId !== myUserId)?.user;
      router.replace({
        pathname: '/chat',
        params: {
          chatId: chat.id,
          name: contact.nickname ?? otherUser?.name ?? otherUser?.phone ?? 'Chat',
          recipientId: contact.contactUserId,
        },
      });
    } catch {
      setOpeningId(null);
    }
  }, [myUserId, router, openingId]);

  const q = search.toLowerCase().trim();
  const filtered: ContactItem[] = q
    ? contacts.filter((c) => {
        const name = (c.nickname ?? c.contactUser.name ?? '').toLowerCase();
        return name.includes(q) || c.contactUser.phone.includes(q);
      })
    : contacts;

  const sections = groupByLetter(filtered);

  const renderContact = useCallback((item: ContactItem) => {
    const displayName = item.nickname ?? item.contactUser.name ?? item.contactUser.phone;
    const subtitle = item.contactUser.about ?? item.contactUser.phone;
    const isOnline = item.contactUser.isOnline;
    const isOpening = openingId === item.id;
    const bg = avatarColor(displayName);

    return (
      <Pressable
        key={item.id}
        style={({ pressed }) => [styles.contactRow, pressed && styles.contactRowPressed]}
        onPress={() => handleSelectContact(item)}
        disabled={!!openingId}
      >
        <View style={styles.avatarWrap}>
          <View style={[styles.avatar, { backgroundColor: bg }]}>
            {item.contactUser.avatar ? (
              <Image source={{ uri: item.contactUser.avatar }} style={styles.avatarImage} />
            ) : (
              <Text style={styles.avatarText}>{displayName[0]?.toUpperCase() ?? '?'}</Text>
            )}
          </View>
          {isOnline && <View style={styles.onlineDot} />}
        </View>
        <View style={styles.contactInfo}>
          <Text style={styles.contactName} numberOfLines={1}>{displayName}</Text>
          {!!subtitle && (
            <Text style={styles.contactSub} numberOfLines={1}>{subtitle}</Text>
          )}
        </View>
        {isOpening
          ? <ActivityIndicator size="small" color={colors.primary} />
          : <Ionicons name="chevron-forward" size={16} color="#ccc" />
        }
      </Pressable>
    );
  }, [handleSelectContact, openingId]);

  return (
    <View style={styles.container}>
      {/* Coral header */}
      <LinearGradient
        colors={['#E46C53', '#D45A42']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.header, { paddingTop: insets.top + 10 }]}
      >
        <View style={styles.headerTop}>
          <Pressable onPress={() => router.back()} hitSlop={12}>
            <Ionicons name="arrow-back" size={22} color="#fff" />
          </Pressable>
          <Text style={styles.headerTitle}>New Chat</Text>
        </View>
        <View style={styles.searchBar}>
          <Ionicons name="search" size={15} color="rgba(255,255,255,0.75)" />
          <TextInput
            ref={searchRef}
            style={styles.searchInput}
            placeholder="Search contacts..."
            placeholderTextColor="rgba(255,255,255,0.6)"
            value={search}
            onChangeText={setSearch}
            returnKeyType="search"
            autoCorrect={false}
          />
          {search.length > 0 && (
            <Pressable onPress={() => setSearch('')} hitSlop={8}>
              <Ionicons name="close-circle" size={16} color="rgba(255,255,255,0.7)" />
            </Pressable>
          )}
        </View>
      </LinearGradient>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={(item) => item.id}
          renderSectionHeader={({ section }) => (
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionHeaderText}>{section.title}</Text>
            </View>
          )}
          renderItem={({ item }) => renderContact(item)}
          ListHeaderComponent={
            <View style={styles.actionsRow}>
              <Pressable
                style={({ pressed }) => [styles.actionCard, pressed && { opacity: 0.85 }]}
                onPress={() => router.push('/create-group')}
              >
                <View style={[styles.actionIcon, { backgroundColor: '#4D7E82' }]}>
                  <Ionicons name="people" size={20} color="#fff" />
                </View>
                <Text style={styles.actionLabel}>New Group</Text>
              </Pressable>
              <Pressable
                style={({ pressed }) => [styles.actionCard, pressed && { opacity: 0.85 }]}
                onPress={() => router.push('/add-contact')}
              >
                <View style={[styles.actionIcon, { backgroundColor: '#E46C53' }]}>
                  <Ionicons name="person-add" size={20} color="#fff" />
                </View>
                <Text style={styles.actionLabel}>Add Contact</Text>
              </Pressable>
            </View>
          }
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Ionicons name="people-outline" size={52} color={colors.border} />
              <Text style={styles.emptyTitle}>
                {q ? 'No contacts found' : 'No contacts yet'}
              </Text>
              <Text style={styles.emptySub}>
                {q ? 'Try a different name or number' : 'Add a contact to start chatting'}
              </Text>
              {!q && (
                <Pressable style={styles.emptyBtn} onPress={() => router.push('/add-contact')}>
                  <Text style={styles.emptyBtnText}>Add Contact</Text>
                </Pressable>
              )}
            </View>
          }
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
          }
          contentContainerStyle={{ paddingBottom: 40 }}
          stickySectionHeadersEnabled
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F5F5' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  header: { paddingHorizontal: 16, paddingBottom: 14 },
  headerTop: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
  headerTitle: {
    fontSize: 18,
    fontFamily: typography.fontFamily,
    fontWeight: typography.weights.semibold,
    color: '#fff',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 22,
    paddingHorizontal: 12,
    paddingVertical: 9,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    fontFamily: typography.fontFamily,
    color: '#fff',
    padding: 0,
  },

  actionsRow: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: '#F5F5F5',
  },
  actionCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  actionIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionLabel: {
    fontSize: 13,
    fontFamily: typography.fontFamily,
    fontWeight: typography.weights.semibold,
    color: '#333',
  },

  sectionHeader: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    backgroundColor: '#F5F5F5',
  },
  sectionHeaderText: {
    fontSize: 12,
    fontFamily: typography.fontFamily,
    fontWeight: typography.weights.semibold,
    color: '#4D7E82',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },

  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#F0F0F0',
  },
  contactRowPressed: { backgroundColor: '#FFF5F3' },

  avatarWrap: { position: 'relative', marginRight: 14 },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarImage: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  avatarText: {
    fontSize: 18,
    fontFamily: typography.fontFamily,
    fontWeight: typography.weights.bold,
    color: '#fff',
  },
  onlineDot: {
    position: 'absolute',
    bottom: 1,
    right: 1,
    width: 13,
    height: 13,
    borderRadius: 7,
    backgroundColor: '#4CAF50',
    borderWidth: 2,
    borderColor: '#fff',
  },

  contactInfo: { flex: 1 },
  contactName: {
    fontSize: 15,
    fontFamily: typography.fontFamily,
    fontWeight: typography.weights.semibold,
    color: '#333',
    marginBottom: 2,
  },
  contactSub: {
    fontSize: 13,
    fontFamily: typography.fontFamily,
    color: '#888',
  },

  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 40,
    gap: 8,
  },
  emptyTitle: {
    fontSize: 16,
    fontFamily: typography.fontFamily,
    fontWeight: typography.weights.semibold,
    color: '#333',
    marginTop: 8,
  },
  emptySub: {
    fontSize: 13,
    fontFamily: typography.fontFamily,
    color: '#888',
    textAlign: 'center',
    lineHeight: 20,
  },
  emptyBtn: {
    marginTop: 12,
    paddingHorizontal: 28,
    paddingVertical: 12,
    backgroundColor: '#E46C53',
    borderRadius: 22,
  },
  emptyBtnText: {
    fontSize: 14,
    fontFamily: typography.fontFamily,
    fontWeight: typography.weights.semibold,
    color: '#fff',
  },
});
