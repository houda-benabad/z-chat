import {
  View,
  Text,
  FlatList,
  Pressable,
  ActivityIndicator,
  Image,
} from 'react-native';

import { useRouter } from 'expo-router';
import { useAppSettings } from '@/shared/context/AppSettingsContext';
import { useBlockedUsers } from '../hooks/useBlockedUsers';
import type { BlockedUserItem } from '@/types';
import { createStyles } from './styles/SettingsBlockedScreen.styles';
import { useThemedStyles } from '@/shared/hooks/useThemedStyles';

const DEFAULT_AVATAR = require('../../../../assets/default-avatar.png');

export default function SettingsBlockedScreen() {
  const styles = useThemedStyles(createStyles);
  const { appColors } = useAppSettings();
  const router = useRouter();
  const { blocked, loading, loadingMore, hasMore, loadMore, handleUnblock } = useBlockedUsers();

  const renderItem = ({ item }: { item: BlockedUserItem }) => {
    const displayName = item.blockedUser.name ?? item.blockedUser.phone;
    return (
      <View style={styles.contactRow}>
        <View style={styles.avatar}>
          <Image source={DEFAULT_AVATAR} style={styles.avatarImage} />
        </View>
        <View style={styles.contactInfo}>
          <Text style={styles.contactName}>{displayName}</Text>
          <Text style={styles.contactPhone}>{item.blockedUser.phone}</Text>
        </View>
        <Pressable
          style={({ pressed }) => [styles.unblockButton, pressed && styles.unblockButtonPressed]}
          onPress={() => handleUnblock(item)}
        >
          <Text style={styles.unblockText}>Unblock</Text>
        </Pressable>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={appColors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backArrow}>{'\u2190'}</Text>
        </Pressable>
        <Text style={styles.headerTitle}>Blocked Contacts</Text>
      </View>

      <FlatList
        data={blocked}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        removeClippedSubviews
        maxToRenderPerBatch={10}
        windowSize={9}
        contentContainerStyle={blocked.length === 0 ? styles.emptyContainer : undefined}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>No blocked contacts</Text>
            <Text style={styles.emptySubtitle}>
              Blocked contacts cannot send you messages or call you
            </Text>
          </View>
        }
        ListFooterComponent={
          loadingMore ? (
            <View style={{ paddingVertical: 16 }}>
              <ActivityIndicator size="small" color={appColors.primary} />
            </View>
          ) : null
        }
        onEndReached={hasMore ? loadMore : undefined}
        onEndReachedThreshold={0.3}
      />
    </View>
  );
}
