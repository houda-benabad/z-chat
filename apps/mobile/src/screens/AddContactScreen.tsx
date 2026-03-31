import { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  TextInput,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Image,
} from 'react-native';
import { useRouter } from 'expo-router';
import { colors, spacing, typography, borderRadius } from '../theme';
import { contactApi, ApiError } from '../services/api';

export default function AddContactScreen() {
  const router = useRouter();
  const [phone, setPhone] = useState('+');
  const [nickname, setNickname] = useState('');
  const [saving, setSaving] = useState(false);
  const [added, setAdded] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);
  const [foundUser, setFoundUser] = useState<{
    id: string;
    phone: string;
    name: string | null;
    avatar: string | null;
  } | null>(null);
  const [searched, setSearched] = useState(false);

  const isValidPhone = /^\+[1-9]\d{6,14}$/.test(phone);

  const handleSearch = useCallback(async () => {
    if (!isValidPhone) return;
    setSaving(true);
    setSearched(false);
    setFoundUser(null);
    setAddError(null);
    setAdded(false);
    try {
      // Use sync to check if user exists
      const { users } = await contactApi.syncContacts([phone]);
      if (users.length > 0) {
        const u = users[0]!;
        setFoundUser({ id: u.id, phone: u.phone, name: u.name, avatar: u.avatar });
      }
      setSearched(true);
    } catch {
      setSearched(true);
      setAddError('Failed to search. Please try again.');
    } finally {
      setSaving(false);
    }
  }, [phone, isValidPhone]);

  const handleAddContact = useCallback(async () => {
    if (!foundUser) return;
    setSaving(true);
    try {
      await contactApi.addContact(foundUser.phone, nickname.trim() || undefined);
      setAdded(true);
      setTimeout(() => router.back(), 900);
    } catch (error) {
      const message = error instanceof ApiError ? error.message : 'Failed to add contact.';
      setAddError(message);
      setSaving(false);
    }
  }, [foundUser, nickname, router]);

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backArrow}>{'\u2190'}</Text>
        </Pressable>
        <Text style={styles.headerTitle}>Add Contact</Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.description}>
          Enter a phone number to find someone on z.chat
        </Text>

        {/* Phone input */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Phone Number</Text>
          <View style={styles.phoneRow}>
            <TextInput
              style={[styles.input, styles.phoneInput]}
              placeholder="+1234567890"
              placeholderTextColor={colors.border}
              value={phone}
              onChangeText={setPhone}
              keyboardType="phone-pad"
              autoFocus
            />
            <Pressable
              style={[
                styles.searchButton,
                (!isValidPhone || saving) && styles.searchButtonDisabled,
              ]}
              onPress={handleSearch}
              disabled={!isValidPhone || saving}
            >
              {saving && !foundUser ? (
                <ActivityIndicator size="small" color={colors.white} />
              ) : (
                <Text style={styles.searchButtonText}>Find</Text>
              )}
            </Pressable>
          </View>
        </View>

        {/* Search result */}
        {searched && !foundUser && (
          <View style={styles.notFoundCard}>
            <Text style={styles.notFoundText}>
              No z.chat user found with this number
            </Text>
            <Text style={styles.notFoundHint}>
              They may not have registered yet
            </Text>
          </View>
        )}

        {foundUser && (
          <View style={styles.foundCard}>
            <View style={styles.foundUserRow}>
              <View style={styles.avatar}>
                {foundUser.avatar ? (
                  <Image source={{ uri: foundUser.avatar }} style={styles.avatarImage} />
                ) : (
                  <Text style={styles.avatarText}>
                    {(foundUser.name ?? foundUser.phone)[0]?.toUpperCase() ?? '?'}
                  </Text>
                )}
              </View>
              <View style={styles.foundUserInfo}>
                <Text style={styles.foundUserName}>
                  {foundUser.name ?? 'No name set'}
                </Text>
                <Text style={styles.foundUserPhone}>{foundUser.phone}</Text>
              </View>
            </View>

            {/* Nickname */}
            <View style={[styles.inputGroup, { marginTop: spacing.lg }]}>
              <Text style={styles.label}>Nickname (optional)</Text>
              <TextInput
                style={styles.input}
                placeholder="How you want to remember them"
                placeholderTextColor={colors.border}
                value={nickname}
                onChangeText={setNickname}
                maxLength={100}
              />
            </View>

            {/* Error message */}
            {!!addError && (
              <Text style={styles.addError}>{addError}</Text>
            )}

            {/* Add button */}
            <Pressable
              style={[styles.addButton, (saving || added) && styles.addButtonDisabled, added && styles.addButtonSuccess]}
              onPress={handleAddContact}
              disabled={saving || added}
            >
              {saving ? (
                <ActivityIndicator size="small" color={colors.white} />
              ) : added ? (
                <Text style={styles.addButtonText}>Added!</Text>
              ) : (
                <Text style={styles.addButtonText}>Add to Contacts</Text>
              )}
            </Pressable>
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
    fontSize: typography.sizes.xl,
    fontFamily: typography.fontFamily,
    fontWeight: typography.weights.bold,
    color: colors.text,
  },
  content: {
    padding: spacing.lg,
  },
  description: {
    fontSize: typography.sizes.md,
    fontFamily: typography.fontFamily,
    color: colors.textSecondary,
    marginBottom: spacing.lg,
    lineHeight: 22,
  },
  inputGroup: {
    marginBottom: spacing.md,
  },
  label: {
    fontSize: typography.sizes.sm,
    fontFamily: typography.fontFamily,
    fontWeight: typography.weights.semibold,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  input: {
    fontSize: typography.sizes.md,
    fontFamily: typography.fontFamily,
    color: colors.text,
    paddingHorizontal: spacing.md,
    paddingVertical: 14,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  phoneRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  phoneInput: {
    flex: 1,
  },
  searchButton: {
    paddingHorizontal: spacing.lg,
    backgroundColor: colors.primary,
    borderRadius: borderRadius.lg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchButtonDisabled: {
    backgroundColor: colors.border,
  },
  searchButtonText: {
    fontSize: typography.sizes.md,
    fontFamily: typography.fontFamily,
    fontWeight: typography.weights.semibold,
    color: colors.white,
  },
  notFoundCard: {
    marginTop: spacing.lg,
    padding: spacing.lg,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
  },
  notFoundText: {
    fontSize: typography.sizes.md,
    fontFamily: typography.fontFamily,
    fontWeight: typography.weights.medium,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  notFoundHint: {
    fontSize: typography.sizes.sm,
    fontFamily: typography.fontFamily,
    color: colors.textSecondary,
  },
  foundCard: {
    marginTop: spacing.lg,
    padding: spacing.lg,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
  },
  foundUserRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.secondary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  avatarImage: {
    width: 52,
    height: 52,
    borderRadius: 26,
  },
  avatarText: {
    fontSize: typography.sizes.lg,
    fontFamily: typography.fontFamily,
    fontWeight: typography.weights.semibold,
    color: colors.white,
  },
  foundUserInfo: {
    flex: 1,
  },
  foundUserName: {
    fontSize: typography.sizes.md,
    fontFamily: typography.fontFamily,
    fontWeight: typography.weights.semibold,
    color: colors.text,
    marginBottom: 2,
  },
  foundUserPhone: {
    fontSize: typography.sizes.sm,
    fontFamily: typography.fontFamily,
    color: colors.textSecondary,
  },
  addButton: {
    marginTop: spacing.lg,
    paddingVertical: 14,
    backgroundColor: colors.primary,
    borderRadius: borderRadius.xl,
    alignItems: 'center',
  },
  addButtonDisabled: {
    opacity: 0.6,
  },
  addButtonSuccess: {
    backgroundColor: '#4CAF50',
    opacity: 1,
  },
  addError: {
    fontSize: typography.sizes.sm,
    fontFamily: typography.fontFamily,
    color: '#ED2F3C',
    marginTop: spacing.sm,
    textAlign: 'center',
  },
  addButtonText: {
    fontSize: typography.sizes.md,
    fontFamily: typography.fontFamily,
    fontWeight: typography.weights.semibold,
    color: colors.white,
  },
});
