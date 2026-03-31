import { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  ActivityIndicator,
  Image,
  Modal,
  Animated,
  Dimensions,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { colors, spacing, typography } from '../theme';
import { userApi, contactApi, settingsApi, PublicUserProfile } from '../services/api';

const CORAL = '#E46C53';
const TEAL = '#4D7E82';
const { width: SCREEN_WIDTH } = Dimensions.get('window');
const AVATAR_SIZE = 110;

function formatLastSeen(dateStr: string) {
  const date = new Date(dateStr);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  if (mins < 1) return 'last seen just now';
  if (mins < 60) return `last seen ${mins}m ago`;
  if (hours < 24) return `last seen ${hours}h ago`;
  if (days === 1) return 'last seen yesterday';
  return `last seen ${date.toLocaleDateString([], { month: 'short', day: 'numeric' })}`;
}

export default function UserProfileScreen() {
  const { userId, name: paramName, contactId: paramContactId } = useLocalSearchParams<{
    userId: string;
    name?: string;
    contactId?: string;
  }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [profile, setProfile] = useState<PublicUserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [contactId, setContactId] = useState<string | null>(paramContactId ?? null);
  const [menuVisible, setMenuVisible] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionDone, setActionDone] = useState<string | null>(null);
  const [isBlocked, setIsBlocked] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!userId) return;
    userApi.getUser(userId)
      .then(({ user }) => setProfile(user))
      .catch(() => {})
      .finally(() => setLoading(false));
    if (!paramContactId) {
      contactApi.getContacts().then(({ contacts }) => {
        const match = contacts.find((c) => c.contactUserId === userId);
        if (match) setContactId(match.id);
      }).catch(() => {});
    }
    settingsApi.getBlocked().then(({ blocked }) => {
      setIsBlocked(blocked.some((b) => b.blockedUserId === userId));
    }).catch(() => {});
  }, [userId, paramContactId]);

  const showToast = (msg: string) => {
    setActionDone(msg);
    Animated.sequence([
      Animated.timing(fadeAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
      Animated.delay(1800),
      Animated.timing(fadeAnim, { toValue: 0, duration: 300, useNativeDriver: true }),
    ]).start(() => setActionDone(null));
  };

  const handleBlock = () => {
    setMenuVisible(false);
    setTimeout(() => Alert.alert(
      'Block Contact',
      `Block ${displayName}? They won't be able to send you messages or calls.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Block',
          style: 'destructive',
          onPress: async () => {
            try {
              await settingsApi.blockUser(userId);
              setIsBlocked(true);
              showToast(`${displayName} blocked`);
            } catch (err) {
              setActionError(err instanceof Error ? err.message : 'Failed to block user');
            }
          },
        },
      ]
    ), 300);
  };

  const handleUnblock = () => {
    setMenuVisible(false);
    setTimeout(() => Alert.alert(
      'Unblock Contact',
      `Unblock ${displayName}? They'll be able to message and call you again.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Unblock',
          onPress: async () => {
            try {
              await settingsApi.unblockUser(userId);
              setIsBlocked(false);
              showToast(`${displayName} unblocked`);
            } catch (err) {
              setActionError(err instanceof Error ? err.message : 'Failed to unblock user');
            }
          },
        },
      ]
    ), 300);
  };

  const handleDeleteContact = async () => {
    setMenuVisible(false);
    if (!contactId) { setActionError('Not in your contacts'); return; }
    try {
      await contactApi.deleteContact(contactId);
      showToast('Contact removed');
      setContactId(null);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Failed to remove contact');
    }
  };

  const displayName = profile?.name ?? paramName ?? 'Unknown';
  const initials = displayName[0]?.toUpperCase() ?? '?';

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={CORAL} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Gradient hero — header + avatar fused together */}
      <LinearGradient
        colors={['#E46C53', '#C85240']}
        start={{ x: 0, y: 0 }}
        end={{ x: 0.6, y: 1 }}
        style={[styles.heroGradient, { paddingTop: insets.top + 8 }]}
      >
        {/* Top bar */}
        <View style={styles.topBar}>
          <Pressable onPress={() => router.back()} hitSlop={12} style={styles.topBarBtn}>
            <Ionicons name="arrow-back" size={22} color="#fff" />
          </Pressable>
          <Text style={styles.topBarTitle}>Contact Info</Text>
          <Pressable onPress={() => setMenuVisible(true)} hitSlop={12} style={styles.topBarBtn}>
            <Ionicons name="ellipsis-vertical" size={22} color="#fff" />
          </Pressable>
        </View>

        {/* Avatar */}
        <View style={styles.avatarArea}>
          <View style={styles.avatarRing}>
            {profile?.avatar ? (
              <Image source={{ uri: profile.avatar }} style={styles.avatarImg} />
            ) : (
              <View style={styles.avatarFallback}>
                <Text style={styles.avatarInitials}>{initials}</Text>
              </View>
            )}
          </View>
          {profile?.isOnline && !isBlocked && (
            <View style={styles.onlineDot} />
          )}
        </View>

        {/* Name + status inside gradient */}
        <Text style={styles.heroName}>{displayName}</Text>
        {isBlocked ? (
          <View style={styles.blockedBadge}>
            <Ionicons name="ban" size={12} color="#fff" />
            <Text style={styles.blockedBadgeText}>Blocked</Text>
          </View>
        ) : (
          <Text style={styles.heroStatus}>
            {profile?.isOnline
              ? 'online'
              : profile?.lastSeen
                ? formatLastSeen(profile.lastSeen)
                : ''}
          </Text>
        )}
        <View style={{ height: 24 }} />
      </LinearGradient>

      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 32 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Quick actions */}
        <View style={[styles.actionsCard, isBlocked && styles.actionsCardBlocked]}>
          <Pressable
            style={({ pressed }) => [styles.actionBtn, pressed && !isBlocked && styles.actionBtnPressed]}
            disabled={isBlocked}
          >
            <View style={[styles.actionIconWrap, { backgroundColor: isBlocked ? 'rgba(0,0,0,0.04)' : 'rgba(228,108,83,0.1)' }]}>
              <Ionicons name="chatbubble-ellipses-outline" size={22} color={isBlocked ? '#ccc' : CORAL} />
            </View>
            <Text style={[styles.actionLabel, isBlocked && styles.actionLabelDisabled]}>Message</Text>
          </Pressable>

          <View style={styles.actionSep} />

          <Pressable
            style={({ pressed }) => [styles.actionBtn, pressed && !isBlocked && styles.actionBtnPressed]}
            disabled={isBlocked}
          >
            <View style={[styles.actionIconWrap, { backgroundColor: isBlocked ? 'rgba(0,0,0,0.04)' : 'rgba(77,126,130,0.1)' }]}>
              <Ionicons name="call-outline" size={22} color={isBlocked ? '#ccc' : TEAL} />
            </View>
            <Text style={[styles.actionLabel, isBlocked && styles.actionLabelDisabled]}>Audio</Text>
          </Pressable>

          <View style={styles.actionSep} />

          <Pressable
            style={({ pressed }) => [styles.actionBtn, pressed && !isBlocked && styles.actionBtnPressed]}
            disabled={isBlocked}
          >
            <View style={[styles.actionIconWrap, { backgroundColor: isBlocked ? 'rgba(0,0,0,0.04)' : 'rgba(77,126,130,0.1)' }]}>
              <Ionicons name="videocam-outline" size={22} color={isBlocked ? '#ccc' : TEAL} />
            </View>
            <Text style={[styles.actionLabel, isBlocked && styles.actionLabelDisabled]}>Video</Text>
          </Pressable>
        </View>

        {/* Blocked notice */}
        {isBlocked && (
          <Pressable style={styles.blockedCard} onPress={handleUnblock}>
            <Ionicons name="ban" size={18} color="#ED2F3C" style={{ marginRight: 10 }} />
            <Text style={styles.blockedCardText}>
              You blocked this contact.{' '}
              <Text style={styles.blockedCardUnlink}>Tap to unblock.</Text>
            </Text>
          </Pressable>
        )}

        {/* Info card */}
        {(profile?.phone || profile?.about) && (
          <View style={styles.infoCard}>
            <Text style={styles.cardHeading}>Info</Text>

            {profile?.phone && (
              <View style={styles.infoRow}>
                <View style={styles.infoIconWrap}>
                  <Ionicons name="call-outline" size={18} color={TEAL} />
                </View>
                <View style={styles.infoContent}>
                  <Text style={styles.infoValue}>{profile.phone}</Text>
                  <Text style={styles.infoLabel}>Phone</Text>
                </View>
              </View>
            )}

            {profile?.phone && profile?.about && <View style={styles.rowDivider} />}

            {profile?.about && (
              <View style={styles.infoRow}>
                <View style={styles.infoIconWrap}>
                  <Ionicons name="information-circle-outline" size={18} color={TEAL} />
                </View>
                <View style={styles.infoContent}>
                  <Text style={styles.infoValue}>{profile.about}</Text>
                  <Text style={styles.infoLabel}>About</Text>
                </View>
              </View>
            )}
          </View>
        )}

        {actionError && (
          <Text style={styles.errorText}>{actionError}</Text>
        )}
      </ScrollView>

      {/* 3-dot menu */}
      <Modal
        visible={menuVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setMenuVisible(false)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setMenuVisible(false)}>
          <View style={[styles.menuCard, { marginTop: insets.top + 52 }]}>
            <Pressable
              style={({ pressed }) => [styles.menuItem, pressed && { backgroundColor: '#f8f8f8' }]}
              onPress={isBlocked ? handleUnblock : handleBlock}
            >
              <Ionicons
                name={isBlocked ? 'checkmark-circle-outline' : 'ban-outline'}
                size={17}
                color={isBlocked ? TEAL : '#ED2F3C'}
                style={styles.menuItemIcon}
              />
              <Text style={[styles.menuItemText, { color: isBlocked ? TEAL : '#ED2F3C' }]}>
                {isBlocked ? 'Unblock' : 'Block'}
              </Text>
            </Pressable>
            {contactId && (
              <Pressable
                style={({ pressed }) => [styles.menuItem, pressed && { backgroundColor: '#f8f8f8' }]}
                onPress={handleDeleteContact}
              >
                <Ionicons name="person-remove-outline" size={17} color="#ED2F3C" style={styles.menuItemIcon} />
                <Text style={[styles.menuItemText, { color: '#ED2F3C' }]}>Remove contact</Text>
              </Pressable>
            )}
          </View>
        </Pressable>
      </Modal>

      {/* Toast */}
      {actionDone && (
        <Animated.View style={[styles.toast, { opacity: fadeAnim, bottom: insets.bottom + 24 }]}>
          <Text style={styles.toastText}>{actionDone}</Text>
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
  },

  // Hero gradient
  heroGradient: {
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  topBar: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  topBarBtn: { padding: 4 },
  topBarTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: typography.sizes.lg,
    fontFamily: typography.fontFamily,
    fontWeight: typography.weights.semibold,
    color: '#fff',
  },
  avatarArea: {
    position: 'relative',
    marginBottom: 14,
  },
  avatarRing: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    borderRadius: AVATAR_SIZE / 2,
    overflow: 'hidden',
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.55)',
  },
  avatarImg: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
  },
  avatarFallback: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarInitials: {
    fontSize: 42,
    fontFamily: typography.fontFamily,
    fontWeight: typography.weights.bold,
    color: '#fff',
  },
  onlineDot: {
    position: 'absolute',
    bottom: 4,
    right: 4,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#4ADE80',
    borderWidth: 2.5,
    borderColor: CORAL,
  },
  heroName: {
    fontSize: 22,
    fontFamily: typography.fontFamily,
    fontWeight: typography.weights.bold,
    color: '#fff',
    marginBottom: 4,
    textAlign: 'center',
  },
  heroStatus: {
    fontSize: typography.sizes.sm,
    fontFamily: typography.fontFamily,
    color: 'rgba(255,255,255,0.8)',
    textAlign: 'center',
  },

  scrollContent: {
    paddingTop: 16,
    paddingHorizontal: 16,
    gap: 12,
  },

  // Actions card
  actionsCard: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  actionBtn: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 18,
    gap: 8,
  },
  actionBtnPressed: {
    backgroundColor: '#f5f5f5',
  },
  actionIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionLabel: {
    fontSize: 12,
    fontFamily: typography.fontFamily,
    fontWeight: typography.weights.medium,
    color: colors.text,
  },
  actionSep: {
    width: StyleSheet.hairlineWidth,
    backgroundColor: colors.border,
    marginVertical: 16,
  },

  // Info card
  infoCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  cardHeading: {
    fontSize: typography.sizes.xs,
    fontFamily: typography.fontFamily,
    fontWeight: typography.weights.semibold,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 8,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 12,
  },
  infoIconWrap: {
    width: 32,
    alignItems: 'center',
    marginRight: 12,
    marginTop: 1,
  },
  infoContent: {
    flex: 1,
  },
  infoValue: {
    fontSize: typography.sizes.md,
    fontFamily: typography.fontFamily,
    color: colors.text,
    lineHeight: 20,
  },
  infoLabel: {
    fontSize: typography.sizes.xs,
    fontFamily: typography.fontFamily,
    color: colors.textSecondary,
    marginTop: 2,
  },
  rowDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border,
    marginLeft: 44,
  },

  errorText: {
    fontSize: typography.sizes.sm,
    fontFamily: typography.fontFamily,
    color: '#ED2F3C',
    textAlign: 'center',
    paddingHorizontal: spacing.lg,
  },

  // Blocked state
  blockedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(237,47,60,0.75)',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  blockedBadgeText: {
    fontSize: 12,
    fontFamily: typography.fontFamily,
    fontWeight: typography.weights.semibold,
    color: '#fff',
  },
  actionsCardBlocked: {
    opacity: 0.5,
  },
  actionLabelDisabled: {
    color: '#bbb',
  },
  blockedCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(237,47,60,0.2)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  blockedCardText: {
    flex: 1,
    fontSize: typography.sizes.sm,
    fontFamily: typography.fontFamily,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  blockedCardUnlink: {
    color: '#ED2F3C',
    fontWeight: typography.weights.semibold,
  },

  // Menu
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.2)',
    justifyContent: 'flex-start',
    alignItems: 'flex-end',
  },
  menuCard: {
    backgroundColor: '#fff',
    borderRadius: 10,
    marginRight: 12,
    paddingVertical: 4,
    minWidth: 190,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.14,
    shadowRadius: 12,
    elevation: 8,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 13,
    borderRadius: 6,
  },
  menuItemIcon: { marginRight: 10 },
  menuItemText: {
    fontSize: typography.sizes.md,
    fontFamily: typography.fontFamily,
  },

  // Toast
  toast: {
    position: 'absolute',
    alignSelf: 'center',
    backgroundColor: 'rgba(30,30,30,0.82)',
    borderRadius: 20,
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  toastText: {
    color: '#fff',
    fontSize: typography.sizes.sm,
    fontFamily: typography.fontFamily,
  },
});
