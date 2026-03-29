import { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  TextInput,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { colors, spacing, typography, borderRadius } from '../theme';
import { userApi, UserProfile } from '../services/api';

export default function SettingsProfileScreen() {
  const router = useRouter();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState('');
  const [about, setAbout] = useState('');

  useEffect(() => {
    const load = async () => {
      try {
        const { user } = await userApi.getMe();
        setProfile(user);
        setName(user.name ?? '');
        setAbout(user.about ?? '');
      } catch {
        Alert.alert('Error', 'Failed to load profile');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const handleSave = useCallback(async () => {
    const trimmedName = name.trim();
    if (!trimmedName) {
      Alert.alert('Name Required', 'Please enter a display name');
      return;
    }
    setSaving(true);
    try {
      const { user } = await userApi.updateProfile({
        name: trimmedName,
        about: about.trim() || undefined,
      });
      setProfile(user);
      Alert.alert('Saved', 'Profile updated successfully');
    } catch {
      Alert.alert('Error', 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  }, [name, about]);

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const hasChanges = name.trim() !== (profile?.name ?? '') || about.trim() !== (profile?.about ?? '');

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backArrow}>{'\u2190'}</Text>
        </Pressable>
        <Text style={styles.headerTitle}>Edit Profile</Text>
        {hasChanges && (
          <Pressable onPress={handleSave} disabled={saving} style={styles.saveButton}>
            {saving ? (
              <ActivityIndicator size="small" color={colors.white} />
            ) : (
              <Text style={styles.saveText}>Save</Text>
            )}
          </Pressable>
        )}
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Avatar */}
        <View style={styles.avatarSection}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {name.trim() ? name[0]!.toUpperCase() : '?'}
            </Text>
          </View>
          <Text style={styles.phoneText}>{profile?.phone}</Text>
        </View>

        {/* Name */}
        <View style={styles.field}>
          <Text style={styles.fieldLabel}>Name</Text>
          <TextInput
            style={styles.fieldInput}
            value={name}
            onChangeText={setName}
            placeholder="Your name"
            placeholderTextColor={colors.textSecondary}
            maxLength={50}
          />
          <Text style={styles.charCount}>{name.length}/50</Text>
        </View>

        {/* About */}
        <View style={styles.field}>
          <Text style={styles.fieldLabel}>About</Text>
          <TextInput
            style={[styles.fieldInput, styles.fieldInputMultiline]}
            value={about}
            onChangeText={setAbout}
            placeholder="Hey there! I am using z.chat"
            placeholderTextColor={colors.textSecondary}
            maxLength={140}
            multiline
          />
          <Text style={styles.charCount}>{about.length}/140</Text>
        </View>

        {/* Phone (read-only) */}
        <View style={styles.field}>
          <Text style={styles.fieldLabel}>Phone</Text>
          <Text style={styles.fieldReadOnly}>{profile?.phone}</Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingTop: 60,
    paddingBottom: spacing.md,
    backgroundColor: colors.background,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backButton: {
    padding: spacing.sm,
    marginRight: spacing.sm,
  },
  backArrow: {
    fontSize: 24,
    color: colors.primary,
  },
  headerTitle: {
    flex: 1,
    fontSize: typography.sizes.xl,
    fontFamily: typography.fontFamily,
    fontWeight: typography.weights.bold,
    color: colors.text,
  },
  saveButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.primary,
    minWidth: 60,
    alignItems: 'center',
  },
  saveText: {
    fontSize: typography.sizes.sm,
    fontFamily: typography.fontFamily,
    fontWeight: typography.weights.semibold,
    color: colors.white,
  },
  content: {
    padding: spacing.lg,
  },
  avatarSection: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  avatar: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: colors.secondary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  avatarText: {
    fontSize: 40,
    fontFamily: typography.fontFamily,
    fontWeight: typography.weights.bold,
    color: colors.white,
  },
  phoneText: {
    fontSize: typography.sizes.sm,
    fontFamily: typography.fontFamily,
    color: colors.textSecondary,
  },
  field: {
    marginBottom: spacing.lg,
  },
  fieldLabel: {
    fontSize: typography.sizes.sm,
    fontFamily: typography.fontFamily,
    fontWeight: typography.weights.semibold,
    color: colors.primary,
    marginBottom: spacing.sm,
  },
  fieldInput: {
    fontSize: typography.sizes.md,
    fontFamily: typography.fontFamily,
    color: colors.text,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  fieldInputMultiline: {
    minHeight: 60,
    textAlignVertical: 'top',
  },
  charCount: {
    fontSize: typography.sizes.xs,
    fontFamily: typography.fontFamily,
    color: colors.textSecondary,
    textAlign: 'right',
    marginTop: spacing.xs,
  },
  fieldReadOnly: {
    fontSize: typography.sizes.md,
    fontFamily: typography.fontFamily,
    color: colors.textSecondary,
    paddingVertical: spacing.sm,
  },
});
