import {
  View,
  Text,
  Pressable,
  ActivityIndicator,
  ScrollView,
  TextInput,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useGroupInfo } from '../hooks/useGroupInfo';
import { useAppSettings } from '@/shared/context/AppSettingsContext';
import { createStyles } from './styles/GroupInfoScreen.styles';
import { useThemedStyles } from '@/shared/hooks/useThemedStyles';
import { Avatar, ImageCropperModal } from '@/shared/components';


export default function GroupInfoScreen() {
  const styles = useThemedStyles(createStyles);
  const { appColors } = useAppSettings();
  const router = useRouter();
  const {
    group,
    loading,
    myUserId,
    isAdmin,
    actionLoading,
    contactMap,
    editingName,
    nameInput,
    setNameInput,
    savingName,
    uploadingAvatar,
    handleStartEditName,
    handleSaveName,
    handleCancelEditName,
    handleAvatarEdit,
    cropper,
    handleRemoveMember,
    handleToggleAdmin,
    handleLeaveGroup,
    handleAddMembers,
  } = useGroupInfo();

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={appColors.primary} />
      </View>
    );
  }

  if (!group) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>Group not found</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backArrow}>{'\u2190'}</Text>
        </Pressable>
        <Text style={styles.headerTitle}>Group Info</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Group avatar & name */}
        <View style={styles.profileSection}>
          {/* Avatar */}
          <View style={styles.groupAvatarWrapper}>
            <Avatar
              uri={group.avatar}
              name={group.name}
              size={80}
              isGroup
            />
            {uploadingAvatar && (
              <View style={styles.groupAvatarUploadOverlay}>
                <ActivityIndicator size="small" color="#fff" />
              </View>
            )}
          </View>
          {isAdmin && !uploadingAvatar && (
            <Pressable onPress={handleAvatarEdit}>
              <Text style={styles.editAvatarText}>Edit</Text>
            </Pressable>
          )}

          {/* Name */}
          {editingName ? (
            <View style={styles.editNameContainer}>
              <TextInput
                style={styles.editNameInput}
                value={nameInput}
                onChangeText={setNameInput}
                autoFocus
                maxLength={50}
                selectTextOnFocus
              />
              <View style={styles.editNameActionsRow}>
                <Pressable
                  style={[styles.editNameBtn, styles.editNameCancelBtn]}
                  onPress={handleCancelEditName}
                  disabled={savingName}
                >
                  <Text style={styles.editNameCancelText}>Cancel</Text>
                </Pressable>
                <Pressable
                  style={[styles.editNameBtn, styles.editNameSaveBtn, savingName && { opacity: 0.6 }]}
                  onPress={handleSaveName}
                  disabled={savingName}
                >
                  {savingName ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Text style={styles.editNameSaveText}>Save</Text>
                  )}
                </Pressable>
              </View>
            </View>
          ) : (
            <View style={styles.groupNameRow}>
              <Text style={styles.groupName}>{group.name}</Text>
              {isAdmin && (
                <Pressable onPress={handleStartEditName} style={styles.editNameIconBtn}>
                  <Text style={styles.editNameIconText}>✎</Text>
                </Pressable>
              )}
            </View>
          )}

          {group.description && (
            <Text style={styles.groupDescription}>{group.description}</Text>
          )}
          <Text style={styles.memberCountText}>
            {group.memberCount} member{group.memberCount !== 1 ? 's' : ''}
          </Text>
        </View>

        {/* Actions */}
        <View style={styles.section}>
          {isAdmin && (
            <Pressable
              style={({ pressed }) => [styles.actionRow, pressed && styles.actionRowPressed]}
              onPress={handleAddMembers}
            >
              <View style={[styles.actionIcon, { backgroundColor: appColors.primary }]}>
                <Text style={styles.actionIconText}>+</Text>
              </View>
              <Text style={styles.actionText}>Add Members</Text>
            </Pressable>
          )}
        </View>

        {/* Members list */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Members</Text>
          {group.participants.map((p) => {
            const user = p.user;
            const isMe = p.userId === myUserId;
            const displayName = isMe
              ? (user.name ?? user.phone)
              : (contactMap[p.userId] ?? user.phone);
            const isCreator = p.userId === group.createdBy;

            return (
              <View key={p.id} style={styles.memberRow}>
                <Pressable
                  style={styles.memberPressableInfo}
                  onPress={isMe ? undefined : () => router.push({
                    pathname: '/user-profile',
                    params: { userId: p.userId, name: displayName },
                  })}
                  disabled={isMe}
                >
                  <Avatar uri={user.avatar} name={displayName} size={40} />
                  <View style={styles.memberInfo}>
                    <Text style={styles.memberName} numberOfLines={1}>
                      {isMe ? 'You' : displayName}
                    </Text>
                    <Text style={styles.memberPhone}>{user.phone}</Text>
                  </View>
                </Pressable>
                <View style={styles.memberActions}>
                  {p.role === 'admin' && (
                    <View style={styles.adminBadge}>
                      <Text style={styles.adminBadgeText}>Admin</Text>
                    </View>
                  )}
                  {isAdmin && !isMe && (
                    <View style={styles.memberButtons}>
                      {!isCreator && (
                        <Pressable
                          style={[styles.memberActionButton, actionLoading && { opacity: 0.5 }]}
                          onPress={() => !actionLoading && handleToggleAdmin(p.userId, p.role)}
                          disabled={actionLoading}
                        >
                          <Text style={styles.memberActionButtonText}>
                            {p.role === 'admin' ? 'Demote' : 'Make Admin'}
                          </Text>
                        </Pressable>
                      )}
                      {!isCreator && (
                        <Pressable
                          style={[styles.memberActionButton, styles.memberRemoveButton, actionLoading && { opacity: 0.5 }]}
                          onPress={() => !actionLoading && handleRemoveMember(p.userId, displayName)}
                          disabled={actionLoading}
                        >
                          <Text style={styles.memberRemoveText}>Remove</Text>
                        </Pressable>
                      )}
                    </View>
                  )}
                </View>
              </View>
            );
          })}
        </View>

        <ImageCropperModal
          visible={cropper.visible}
          sourceUri={cropper.sourceUri}
          sourceWidth={cropper.sourceWidth}
          sourceHeight={cropper.sourceHeight}
          processing={cropper.processing}
          onConfirm={cropper.confirmCrop}
          onCancel={cropper.cancelCrop}
        />

        {/* Leave group */}
        <Pressable
          style={({ pressed }) => [styles.leaveButton, pressed && !actionLoading && styles.leaveButtonPressed, actionLoading && { opacity: 0.5 }]}
          onPress={handleLeaveGroup}
          disabled={actionLoading}
        >
          <Text style={styles.leaveButtonText}>Leave Group</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}
