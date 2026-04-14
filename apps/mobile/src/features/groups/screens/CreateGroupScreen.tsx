import { useCallback } from 'react';
import {
  View,
  Text,
  Image,
  FlatList,
  Pressable,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { spacing, typography, borderRadius } from '@/theme';
import { useAppSettings } from '@/shared/context/AppSettingsContext';
import { Avatar, ImageCropperModal } from '@/shared/components';
import { useCreateGroup } from '../hooks/useCreateGroup';
import type { ContactItem } from '@/types';
import { createStyles } from './styles/CreateGroupScreen.styles';
import { useThemedStyles } from '@/shared/hooks/useThemedStyles';

const DEFAULT_GROUP_AVATAR = require('../../../../assets/default-group.jpg');

export default function CreateGroupScreen() {
  const styles = useThemedStyles(createStyles);
  const { appColors } = useAppSettings();
  const router = useRouter();
  const {
    contacts,
    filtered,
    loading,
    creating,
    search,
    setSearch,
    step,
    setStep,
    selectedIds,
    toggleMember,
    groupName,
    setGroupName,
    groupDescription,
    setGroupDescription,
    groupAvatar,
    uploadingAvatar,
    handlePickAvatar,
    handleNext,
    handleCreate,
    cropper,
  } = useCreateGroup();

  const renderContact = useCallback(
    ({ item }: { item: ContactItem }) => {
      const displayName = item.nickname ?? item.contactUser.name ?? item.contactUser.phone;
      const isSelected = selectedIds.has(item.contactUserId);

      return (
        <Pressable
          style={({ pressed }) => [styles.contactItem, pressed && styles.contactItemPressed]}
          onPress={() => toggleMember(item.contactUserId)}
        >
          <View style={styles.avatarContainer}>
            {isSelected ? (
              <View style={[styles.avatar, styles.avatarSelected]}>
                <Text style={styles.checkmark}>{'\u2713'}</Text>
              </View>
            ) : (
              <Avatar uri={item.contactUser.avatar} name={displayName} size={48} />
            )}
          </View>
          <View style={styles.contactInfo}>
            <Text style={styles.contactName} numberOfLines={1}>
              {displayName}
            </Text>
            <Text style={styles.contactSubtitle} numberOfLines={1}>
              {item.contactUser.about ?? item.contactUser.phone}
            </Text>
          </View>
        </Pressable>
      );
    },
    [selectedIds, toggleMember],
  );

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={appColors.primary} />
      </View>
    );
  }

  if (step === 'group-details') {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Pressable onPress={() => setStep('select-members')} style={styles.backButton}>
            <Text style={styles.backArrow}>{'\u2190'}</Text>
          </Pressable>
          <Text style={styles.headerTitle}>New Group</Text>
        </View>

        <View style={styles.detailsContainer}>
          <Pressable style={styles.groupAvatarLarge} onPress={handlePickAvatar} disabled={uploadingAvatar}>
            {uploadingAvatar ? (
              <ActivityIndicator color={appColors.white} />
            ) : groupAvatar ? (
              <Image source={{ uri: groupAvatar }} style={styles.groupAvatarImage} />
            ) : (
              <Image source={DEFAULT_GROUP_AVATAR} style={styles.groupAvatarImage} />
            )}
            <View style={styles.groupAvatarBadge}>
              <Ionicons name="camera" size={12} color={appColors.white} />
            </View>
          </Pressable>

          <TextInput
            style={styles.groupNameInput}
            placeholder="Group name"
            placeholderTextColor={appColors.textSecondary}
            value={groupName}
            onChangeText={setGroupName}
            maxLength={100}
            autoFocus
          />

          <TextInput
            style={styles.groupDescInput}
            placeholder="Group description (optional)"
            placeholderTextColor={appColors.textSecondary}
            value={groupDescription}
            onChangeText={setGroupDescription}
            maxLength={500}
            multiline
          />

          <Text style={styles.memberCount}>
            {selectedIds.size} member{selectedIds.size !== 1 ? 's' : ''} selected
          </Text>

          <View style={styles.selectedMembersRow}>
            {contacts
              .filter((c) => selectedIds.has(c.contactUserId))
              .slice(0, 6)
              .map((c) => {
                const name = c.nickname ?? c.contactUser.name ?? c.contactUser.phone;
                return (
                  <View key={c.contactUserId} style={styles.selectedChip}>
                    <Text style={styles.selectedChipText} numberOfLines={1}>
                      {name}
                    </Text>
                  </View>
                );
              })}
            {selectedIds.size > 6 && (
              <Text style={styles.moreText}>+{selectedIds.size - 6} more</Text>
            )}
          </View>

          <Pressable
            style={[styles.createButton, (!groupName.trim() || creating) && styles.createButtonDisabled]}
            onPress={handleCreate}
            disabled={!groupName.trim() || creating}
          >
            {creating ? (
              <ActivityIndicator color={appColors.white} />
            ) : (
              <Text style={styles.createButtonText}>Create Group</Text>
            )}
          </Pressable>
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
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backArrow}>{'\u2190'}</Text>
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>Select Members</Text>
          {selectedIds.size > 0 && (
            <Text style={styles.headerSubtitle}>
              {selectedIds.size} selected
            </Text>
          )}
        </View>
        <Pressable
          style={[styles.nextButton, selectedIds.size === 0 && styles.nextButtonDisabled]}
          onPress={handleNext}
          disabled={selectedIds.size === 0}
        >
          <Text style={[styles.nextButtonText, selectedIds.size === 0 && styles.nextButtonTextDisabled]}>
            Next
          </Text>
        </Pressable>
      </View>

      <View style={styles.searchBar}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search contacts..."
          placeholderTextColor={appColors.textSecondary}
          value={search}
          onChangeText={setSearch}
        />
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        renderItem={renderContact}
        contentContainerStyle={filtered.length === 0 ? styles.emptyContainer : undefined}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>
              {search ? 'No contacts match your search' : 'No contacts yet'}
            </Text>
          </View>
        }
      />
    </View>
  );
}

