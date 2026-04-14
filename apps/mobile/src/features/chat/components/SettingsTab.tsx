import { ScrollView, View, Text, Pressable, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { SETTINGS_SECTIONS, APP_NAME, APP_VERSION, APP_COMPANY } from '@/constants';
import { createStyles } from '../screens/styles/ChatListScreen.styles';
import { useThemedStyles } from '@/shared/hooks/useThemedStyles';
import { useAppSettings } from '@/shared/context/AppSettingsContext';
import { Avatar } from '@/shared/components';
import type { UserProfile } from '@/types';

interface SettingsTabProps {
  profile: UserProfile | null;
  profileLoading: boolean;
  navHeight: number;
  onLogout: () => void;
}

export function SettingsTab({
  profile,
  profileLoading,
  navHeight,
  onLogout,
}: SettingsTabProps) {
  const styles = useThemedStyles(createStyles);
  const { appColors } = useAppSettings();
  const router = useRouter();

  return (
    <ScrollView
      contentContainerStyle={{ paddingBottom: navHeight + 16 }}
      showsVerticalScrollIndicator={false}
    >
      {/* Profile card */}
      <Pressable
        style={({ pressed }) => [styles.profileCard, pressed && styles.pressed]}
        onPress={() => router.push('/settings-profile')}
      >
        <View style={styles.profileAvatar}>
          {profileLoading ? (
            <ActivityIndicator size="small" color={appColors.white} />
          ) : (
            <Avatar uri={profile?.avatar} name={profile?.name ?? ''} size={64} />
          )}
        </View>
        <View style={styles.profileInfo}>
          <Text style={styles.profileName}>{profile?.name ?? 'Set up your name'}</Text>
          <Text style={styles.profileAbout} numberOfLines={1}>
            {profile?.phone ?? profile?.about ?? 'Hey there! I am using z.chat'}
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color={appColors.text} />
      </Pressable>

      {/* Settings sections */}
      {SETTINGS_SECTIONS.map((section, si) => (
        <View key={si} style={styles.section}>
          {section.title ? (
            <Text style={styles.sectionTitle}>{section.title}</Text>
          ) : null}
          {section.rows.map((row) => (
            <Pressable
              key={row.route}
              style={({ pressed }) => [styles.settingsRow, pressed && styles.pressed]}
              onPress={() => router.push(row.route as Parameters<typeof router.push>[0])}
            >
              <Text style={styles.rowIcon}>{row.icon}</Text>
              <View style={styles.rowContent}>
                <Text style={styles.rowLabel}>{row.label}</Text>
                {row.subtitle && (
                  <Text style={styles.rowSubtitle}>{row.subtitle}</Text>
                )}
              </View>
              <Ionicons name="chevron-forward" size={16} color={appColors.text} />
            </Pressable>
          ))}
        </View>
      ))}

      {/* Logout */}
      <View style={styles.section}>
        <Pressable
          style={({ pressed }) => [styles.settingsRow, pressed && styles.pressed]}
          onPress={onLogout}
        >
          <Text style={[styles.rowIcon, { color: '#ED2F3C' }]}>↩</Text>
          <Text style={styles.logoutLabel}>Log Out</Text>
        </Pressable>
      </View>

      {/* App info */}
      <View style={styles.appInfo}>
        <Text style={styles.appInfoText}>{APP_NAME} by {APP_COMPANY}</Text>
        <Text style={styles.appInfoVersion}>Version {APP_VERSION}</Text>
      </View>
    </ScrollView>
  );
}
