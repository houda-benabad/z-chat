import { useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  Pressable,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Avatar } from '@/shared/components';
import { useAppSettings } from '@/shared/context/AppSettingsContext';
import { useAddGroupMembers } from '../hooks/useAddGroupMembers';
import type { ContactItem } from '@/types';
import { createStyles } from './styles/AddGroupMembersScreen.styles';
import { useThemedStyles } from '@/shared/hooks/useThemedStyles';


export default function AddGroupMembersScreen() {
  const styles = useThemedStyles(createStyles);
  const { appColors } = useAppSettings();
  const router = useRouter();
  const {
    filtered,
    loading,
    adding,
    search,
    setSearch,
    selectedIds,
    existingMemberIds,
    toggleMember,
    handleAdd,
  } = useAddGroupMembers();

  const renderContact = useCallback(
    ({ item }: { item: ContactItem }) => {
      const displayName = item.nickname ?? item.contactUser.name ?? item.contactUser.phone;
      const isExisting = existingMemberIds.has(item.contactUserId);
      const isSelected = selectedIds.has(item.contactUserId);

      return (
        <Pressable
          style={({ pressed }) => [
            styles.contactItem,
            pressed && !isExisting && styles.contactItemPressed,
            isExisting && styles.contactItemDisabled,
          ]}
          onPress={() => !isExisting && toggleMember(item.contactUserId)}
          disabled={isExisting}
        >
          {isSelected ? (
            <View style={[styles.avatar, styles.avatarSelected]}>
              <Text style={styles.checkmark}>{'\u2713'}</Text>
            </View>
          ) : (
            <Avatar uri={item.contactUser.avatar} name={displayName} size={48} style={styles.avatar} />
          )}
          <View style={styles.contactInfo}>
            <Text style={[styles.contactName, isExisting && styles.contactNameDisabled]} numberOfLines={1}>
              {displayName}
            </Text>
            <Text style={styles.contactSubtitle}>
              {isExisting ? 'Already in group' : item.contactUser.phone}
            </Text>
          </View>
        </Pressable>
      );
    },
    [selectedIds, existingMemberIds, toggleMember]
);

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={appColors.primary} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backArrow}>{'\u2190'}</Text>
        </Pressable>
        <Text style={{ flex: 1, ...styles.headerTitleStyle }}>Add Members</Text>
        <Pressable
          style={[styles.addButton, (selectedIds.size === 0 || adding) && styles.addButtonDisabled]}
          onPress={handleAdd}
          disabled={selectedIds.size === 0 || adding}
        >
          {adding ? (
            <ActivityIndicator color={appColors.white} size="small" />
          ) : (
            <Text style={styles.addButtonText}>
              Add{selectedIds.size > 0 ? ` (${selectedIds.size})` : ''}
            </Text>
          )}
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
        removeClippedSubviews
        maxToRenderPerBatch={12}
        windowSize={9}
      />
    </SafeAreaView>
  );
}
