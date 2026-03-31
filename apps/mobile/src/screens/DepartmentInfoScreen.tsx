import { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  Image,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, spacing, typography } from '../theme';
import { departmentApi, chatApi, DepartmentMember, tokenStorage } from '../services/api';

const CORAL = '#E46C53';
const TEAL = '#4D7E82';

export default function DepartmentInfoScreen() {
  const { chatId, name } = useLocalSearchParams<{ chatId: string; name: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [members, setMembers] = useState<DepartmentMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [memberCount, setMemberCount] = useState(0);
  const [myUserId, setMyUserId] = useState('');
  const [actionTarget, setActionTarget] = useState<DepartmentMember | null>(null);

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

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await departmentApi.getMyTeam();
      setMembers(data.members);
      setMemberCount(data.memberCount);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleSendDM = useCallback(async (member: DepartmentMember) => {
    setActionTarget(null);
    try {
      const { chat } = await chatApi.createChat(member.userId);
      router.push({
        pathname: '/chat',
        params: {
          chatId: chat.id,
          name: member.user.name ?? member.user.id,
          recipientId: member.userId,
          recipientAvatar: member.user.avatar ?? '',
        },
      });
    } catch { /* ignore */ }
  }, [router]);

  const handleViewProfile = useCallback((member: DepartmentMember) => {
    setActionTarget(null);
    router.push({
      pathname: '/user-profile',
      params: { userId: member.userId, name: member.user.name ?? '' },
    });
  }, [router]);

  // Section: admin first (department head), then members
  const head = members.filter((m) => m.role === 'admin');
  const rest = members.filter((m) => m.role !== 'admin');

  const renderMember = ({ item, index }: { item: DepartmentMember; index: number }) => {
    const isHead = item.role === 'admin';
    const isMe = item.userId === myUserId;

    return (
      <Pressable
        style={({ pressed }) => [s.memberRow, pressed && s.memberRowPressed]}
        onPress={() => { if (!isMe) setActionTarget(item); }}
      >
        <View style={s.avatarWrap}>
          <View style={[s.avatar, isHead && s.avatarHead]}>
            {item.user.avatar ? (
              <Image source={{ uri: item.user.avatar }} style={s.avatarImg} />
            ) : (
              <Text style={s.avatarText}>{(item.user.name ?? '?')[0]?.toUpperCase()}</Text>
            )}
          </View>
          <View style={[s.onlineDot, item.user.isOnline ? s.onlineDotActive : s.onlineDotInactive]} />
        </View>

        <View style={s.memberInfo}>
          <View style={s.memberNameRow}>
            <Text style={s.memberName} numberOfLines={1}>
              {item.user.name ?? 'Unknown'}
              {isMe ? ' (You)' : ''}
            </Text>
            {isHead && (
              <View style={s.headBadge}>
                <Text style={s.headBadgeText}>Head</Text>
              </View>
            )}
          </View>
          {item.user.jobTitle && (
            <Text style={s.memberRole} numberOfLines={1}>{item.user.jobTitle}</Text>
          )}
        </View>

        {!isMe && (
          <Ionicons name="chevron-forward" size={16} color={colors.border} />
        )}
      </Pressable>
    );
  };

  return (
    <View style={s.container}>
      {/* Header */}
      <LinearGradient
        colors={['#E46C53', '#D45A42']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[s.header, { paddingTop: insets.top + 8 }]}
      >
        <Pressable onPress={() => router.back()} style={s.backBtn} hitSlop={10}>
          <Ionicons name="arrow-back" size={22} color="#fff" />
        </Pressable>
        <View style={s.headerText}>
          <Text style={s.headerTitle}>{name}</Text>
          <Text style={s.headerSub}>{memberCount} members</Text>
        </View>
      </LinearGradient>

      {loading ? (
        <View style={s.centered}>
          <ActivityIndicator size="large" color={CORAL} />
        </View>
      ) : (
        <FlatList
          data={[...head, ...rest]}
          keyExtractor={(item) => item.userId}
          renderItem={renderMember}
          ListHeaderComponent={
            <View style={s.sectionHeader}>
              <Text style={s.sectionLabel}>TEAM MEMBERS</Text>
            </View>
          }
          contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}
          ItemSeparatorComponent={() => <View style={s.separator} />}
        />
      )}

      {/* Member action modal */}
      <Modal
        visible={!!actionTarget}
        transparent
        animationType="slide"
        onRequestClose={() => setActionTarget(null)}
      >
        <Pressable style={s.modalOverlay} onPress={() => setActionTarget(null)}>
          <View style={s.modalSheet}>
            {/* Person header */}
            <View style={s.modalPersonRow}>
              <View style={s.modalAvatar}>
                {actionTarget?.user.avatar ? (
                  <Image source={{ uri: actionTarget.user.avatar }} style={s.modalAvatarImg} />
                ) : (
                  <Text style={s.modalAvatarText}>
                    {(actionTarget?.user.name ?? '?')[0]?.toUpperCase()}
                  </Text>
                )}
              </View>
              <View>
                <Text style={s.modalName}>{actionTarget?.user.name ?? 'Unknown'}</Text>
                {actionTarget?.user.jobTitle && (
                  <Text style={s.modalRole}>{actionTarget.user.jobTitle}</Text>
                )}
              </View>
            </View>

            <Pressable
              style={({ pressed }) => [s.modalAction, pressed && s.modalActionPressed]}
              onPress={() => actionTarget && handleViewProfile(actionTarget)}
            >
              <Ionicons name="person-outline" size={20} color="#333" />
              <Text style={s.modalActionLabel}>View Profile</Text>
            </Pressable>

            <Pressable
              style={({ pressed }) => [s.modalAction, pressed && s.modalActionPressed]}
              onPress={() => actionTarget && handleSendDM(actionTarget)}
            >
              <Ionicons name="chatbubble-outline" size={20} color={CORAL} />
              <Text style={[s.modalActionLabel, { color: CORAL }]}>Send DM</Text>
            </Pressable>
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  // Header
  header: {
    paddingHorizontal: 16, paddingBottom: 16,
    flexDirection: 'row', alignItems: 'center',
  },
  backBtn: { marginRight: 10, padding: 4 },
  headerText: {},
  headerTitle: {
    fontSize: 18, fontFamily: typography.fontFamily,
    fontWeight: typography.weights.bold, color: '#fff',
  },
  headerSub: {
    fontSize: 12, fontFamily: typography.fontFamily,
    color: 'rgba(255,255,255,0.8)', marginTop: 1,
  },

  // Section
  sectionHeader: {
    paddingHorizontal: spacing.lg, paddingTop: spacing.lg, paddingBottom: spacing.xs,
  },
  sectionLabel: {
    fontSize: typography.sizes.xs, fontFamily: typography.fontFamily,
    fontWeight: typography.weights.semibold,
    color: colors.textSecondary, letterSpacing: 0.8,
  },

  // Member row
  memberRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: spacing.lg, paddingVertical: 12,
    backgroundColor: colors.background,
  },
  memberRowPressed: { backgroundColor: colors.surface },
  avatarWrap: { position: 'relative', marginRight: 14 },
  avatar: {
    width: 50, height: 50, borderRadius: 25,
    backgroundColor: TEAL, justifyContent: 'center', alignItems: 'center',
  },
  avatarHead: { backgroundColor: CORAL },
  avatarImg: { width: 50, height: 50, borderRadius: 25 },
  avatarText: {
    fontSize: 18, fontFamily: typography.fontFamily,
    fontWeight: typography.weights.bold, color: '#fff',
  },
  onlineDot: {
    position: 'absolute', bottom: 1, right: 1,
    width: 13, height: 13, borderRadius: 7,
    borderWidth: 2, borderColor: colors.background,
  },
  onlineDotActive: { backgroundColor: '#4CAF50' },
  onlineDotInactive: { backgroundColor: '#ccc' },
  memberInfo: { flex: 1 },
  memberNameRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 2 },
  memberName: {
    fontSize: typography.sizes.md, fontFamily: typography.fontFamily,
    fontWeight: typography.weights.semibold, color: colors.text, flex: 1,
  },
  headBadge: {
    backgroundColor: 'rgba(228,108,83,0.12)',
    borderRadius: 6, paddingHorizontal: 8, paddingVertical: 2,
    borderWidth: 1, borderColor: 'rgba(228,108,83,0.3)',
  },
  headBadgeText: {
    fontSize: 10, fontFamily: typography.fontFamily,
    fontWeight: typography.weights.semibold, color: CORAL,
  },
  memberRole: {
    fontSize: typography.sizes.sm, fontFamily: typography.fontFamily, color: colors.textSecondary,
  },
  separator: { height: StyleSheet.hairlineWidth, backgroundColor: colors.border, marginLeft: 76 },

  // Modal
  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20,
    paddingBottom: 34, paddingTop: 8,
    shadowColor: '#000', shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1, shadowRadius: 12, elevation: 10,
  },
  modalPersonRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 24, paddingVertical: 16,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#f0f0f0',
    gap: 14,
  },
  modalAvatar: {
    width: 48, height: 48, borderRadius: 24,
    backgroundColor: TEAL, justifyContent: 'center', alignItems: 'center',
  },
  modalAvatarImg: { width: 48, height: 48, borderRadius: 24 },
  modalAvatarText: {
    fontSize: 18, fontFamily: typography.fontFamily,
    fontWeight: typography.weights.bold, color: '#fff',
  },
  modalName: {
    fontSize: 16, fontFamily: typography.fontFamily,
    fontWeight: typography.weights.semibold, color: '#1a1a1a',
  },
  modalRole: {
    fontSize: 13, fontFamily: typography.fontFamily, color: '#888', marginTop: 2,
  },
  modalAction: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 24, paddingVertical: 18, gap: 16,
  },
  modalActionPressed: { backgroundColor: colors.surface },
  modalActionLabel: {
    fontSize: 16, fontFamily: typography.fontFamily,
    fontWeight: typography.weights.medium, color: '#222',
  },
});
