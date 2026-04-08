import {
  View,
  Text,
  Pressable,
  ActivityIndicator,
  ScrollView,
  Image,
  TextInput,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useGroupInfo } from '../hooks/useGroupInfo';
import { useAppSettings } from '@/shared/context/AppSettingsContext';
import { createStyles } from './styles/GroupInfoScreen.styles';
import { useThemedStyles } from '@/shared/hooks/useThemedStyles';


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
    handlePickAvatar,
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
          <Pressable
            onPress={isAdmin ? handlePickAvatar : undefined}
            style={styles.groupAvatarWrapper}
            disabled={!isAdmin || uploadingAvatar}
          >
            {group.avatar ? (
              <Image source={{ uri: group.avatar }} style={styles.groupAvatarImage} />
            ) : (
              <View style={styles.groupAvatarLarge}>
                <Text style={styles.groupAvatarLargeText}>
                  {group.name[0]?.toUpperCase() ?? 'G'}
                </Text>
              </View>
            )}
            {uploadingAvatar && (
              <View style={styles.groupAvatarUploadOverlay}>
                <ActivityIndicator size="small" color="#fff" />
              </View>
            )}
            {isAdmin && !uploadingAvatar && (
              <View style={styles.groupAvatarEditOverlay}>
                <Text style={styles.groupAvatarEditIcon}>✎</Text>
              </View>
            )}
          </Pressable>

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
                <View style={styles.memberAvatar}>
                  <Text style={styles.memberAvatarText}>
                    {displayName[0]?.toUpperCase() ?? '?'}
                  </Text>
                </View>
                <View style={styles.memberInfo}>
                  <Text style={styles.memberName} numberOfLines={1}>
                    {displayName}{isMe ? ' (You)' : ''}
                  </Text>
                  <Text style={styles.memberPhone}>{user.phone}</Text>
                </View>
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
