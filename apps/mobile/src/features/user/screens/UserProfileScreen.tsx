import {
  View,
  Text,
  Pressable,
  ScrollView,
  ActivityIndicator,
  Modal,
  Animated,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Avatar } from '@/shared/components';
import { useUserProfile, formatLastSeen } from '../hooks/useUserProfile';
import { createStyles } from './styles/UserProfileScreen.styles';
import { useThemedStyles } from '@/shared/hooks/useThemedStyles';
import { useAppSettings } from '@/shared/context/AppSettingsContext';

const CORAL = '#E46C53';
const TEAL = '#4D7E82';

export default function UserProfileScreen() {
  const styles = useThemedStyles(createStyles);
  const { appColors } = useAppSettings();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const {
    profile,
    loading,
    contactId,
    contactNickname,
    menuVisible,
    setMenuVisible,
    actionError,
    actionDone,
    actionLoading,
    isBlocked,
    fadeAnim,
    displayName,
    editNameVisible,
    editNameValue,
    editNameLoading,
    setEditNameValue,
    handleOpenEditName,
    handleCloseEditName,
    handleSaveNickname,
    handleBlock,
    handleUnblock,
    handleDeleteContact,
    handleAddContact,
    handleMessagePress,
  } = useUserProfile();

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
            <Avatar uri={profile?.avatar} name={profile?.name ?? ''} size={110} />
          </View>
          {profile?.isOnline && !isBlocked && (
            <View style={styles.onlineDot} />
          )}
        </View>

        {/* Name + status inside gradient */}
        <View style={styles.heroNameRow}>
          <Text style={styles.heroName}>{displayName}</Text>
          {contactId && (
            <Pressable onPress={handleOpenEditName} hitSlop={12} style={styles.heroNameEditBtn}>
              <Ionicons name="pencil" size={15} color="rgba(255,255,255,0.75)" />
            </Pressable>
          )}
        </View>
        {contactNickname && profile?.name && (
          <Text style={styles.heroRealName}>{profile.name}</Text>
        )}
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
            onPress={() => { void handleMessagePress(); }}
          >
            <View style={[styles.actionIconWrap, { backgroundColor: isBlocked ? appColors.border : 'rgba(228,108,83,0.1)' }]}>
              <Ionicons name="chatbubble-ellipses-outline" size={22} color={isBlocked ? appColors.textSecondary : CORAL} />
            </View>
            <Text style={[styles.actionLabel, isBlocked && styles.actionLabelDisabled]}>Message</Text>
          </Pressable>

          <View style={styles.actionSep} />

          <Pressable
            style={({ pressed }) => [styles.actionBtn, pressed && !isBlocked && styles.actionBtnPressed]}
            disabled={isBlocked}
          >
            <View style={[styles.actionIconWrap, { backgroundColor: isBlocked ? appColors.border : 'rgba(77,126,130,0.1)' }]}>
              <Ionicons name="call-outline" size={22} color={isBlocked ? appColors.textSecondary : TEAL} />
            </View>
            <Text style={[styles.actionLabel, isBlocked && styles.actionLabelDisabled]}>Audio</Text>
          </Pressable>

          <View style={styles.actionSep} />

          <Pressable
            style={({ pressed }) => [styles.actionBtn, pressed && !isBlocked && styles.actionBtnPressed]}
            disabled={isBlocked}
          >
            <View style={[styles.actionIconWrap, { backgroundColor: isBlocked ? appColors.border : 'rgba(77,126,130,0.1)' }]}>
              <Ionicons name="videocam-outline" size={22} color={isBlocked ? appColors.textSecondary : TEAL} />
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
            {!contactId && (
              <Pressable
                style={({ pressed }) => [styles.menuItem, pressed && { backgroundColor: appColors.border }]}
                onPress={handleAddContact}
              >
                <Ionicons name="person-add-outline" size={17} color={TEAL} style={styles.menuItemIcon} />
                <Text style={[styles.menuItemText, { color: TEAL }]}>Add to Contacts</Text>
              </Pressable>
            )}
            <Pressable
              style={({ pressed }) => [styles.menuItem, pressed && !actionLoading && { backgroundColor: appColors.border }]}
              onPress={actionLoading ? undefined : (isBlocked ? handleUnblock : handleBlock)}
              disabled={actionLoading}
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
                style={({ pressed }) => [styles.menuItem, pressed && { backgroundColor: appColors.border }]}
                onPress={handleDeleteContact}
              >
                <Ionicons name="person-remove-outline" size={17} color="#ED2F3C" style={styles.menuItemIcon} />
                <Text style={[styles.menuItemText, { color: '#ED2F3C' }]}>Remove contact</Text>
              </Pressable>
            )}
          </View>
        </Pressable>
      </Modal>

      {/* Edit name bottom sheet */}
      <Modal
        visible={editNameVisible}
        transparent
        animationType="slide"
        onRequestClose={handleCloseEditName}
      >
        <Pressable style={styles.editSheetOverlay} onPress={handleCloseEditName}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={styles.editSheetKAV}
          >
            <Pressable style={[styles.editSheet, { paddingBottom: insets.bottom + 16 }]}>
              <View style={styles.editSheetHandle} />
              <Text style={styles.editSheetTitle}>Edit name</Text>
              <TextInput
                style={styles.editSheetInput}
                value={editNameValue}
                onChangeText={setEditNameValue}
                placeholder="Enter a name"
                placeholderTextColor={styles.editSheetInputPlaceholder?.color as string}
                autoFocus
                maxLength={100}
                returnKeyType="done"
                onSubmitEditing={() => { void handleSaveNickname(); }}
              />
              {editNameValue.trim() !== (profile?.name ?? '') && (
                <Pressable
                  onPress={() => setEditNameValue('')}
                  style={({ pressed }) => [styles.editSheetClear, pressed && { opacity: 0.6 }]}
                >
                  <Text style={styles.editSheetClearText}>Clear custom name</Text>
                </Pressable>
              )}
              <View style={styles.editSheetActions}>
                <Pressable
                  style={({ pressed }) => [styles.editSheetCancel, pressed && { opacity: 0.7 }]}
                  onPress={handleCloseEditName}
                >
                  <Text style={styles.editSheetCancelText}>Cancel</Text>
                </Pressable>
                <Pressable
                  style={({ pressed }) => [styles.editSheetSave, pressed && { opacity: 0.85 }, editNameLoading && { opacity: 0.6 }]}
                  onPress={() => { void handleSaveNickname(); }}
                  disabled={editNameLoading}
                >
                  {editNameLoading
                    ? <ActivityIndicator size="small" color="#fff" />
                    : <Text style={styles.editSheetSaveText}>Save</Text>
                  }
                </Pressable>
              </View>
            </Pressable>
          </KeyboardAvoidingView>
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

