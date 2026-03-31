import { useState, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Image,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { MAX_DISPLAY_NAME_LENGTH, MAX_ABOUT_LENGTH } from '@z-chat/shared';
import { colors, spacing, typography, borderRadius } from '../theme';
import { userApi, uploadAvatar, ApiError } from '../services/api';

const DEFAULT_AVATAR = require('../../assets/default-avatar.png');

export default function ProfileSetupScreen() {
  const router = useRouter();
  const [displayName, setDisplayName] = useState('');
  const [about, setAbout] = useState('');
  const [avatarUri, setAvatarUri] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isValid = displayName.trim().length > 0;

  const handlePickAvatar = useCallback(async () => {
    const permissionResult =
      await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permissionResult.granted) {
      Alert.alert(
        'Permission Required',
        'Please allow access to your photo library to set a profile picture.',
      );
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      setAvatarUri(result.assets[0].uri);
    }
  }, []);

  const handleContinue = useCallback(async () => {
    if (!isValid) return;

    setIsLoading(true);
    setError(null);
    try {
      let avatarUrl: string | undefined;
      if (avatarUri) {
        avatarUrl = await uploadAvatar(avatarUri);
      }
      await userApi.updateProfile({
        name: displayName.trim(),
        about: about.trim() || undefined,
        avatar: avatarUrl,
      });
      router.replace('/chat-list');
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : 'Failed to update profile. Please try again.',
      );
    } finally {
      setIsLoading(false);
    }
  }, [isValid, displayName, about, avatarUri, router]);

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.headerSection}>
          <Text style={styles.heading}>Set up your profile</Text>
          <Text style={styles.subheading}>
            Add your name and a photo so your team can recognize you
          </Text>
        </View>

        <View style={styles.avatarSection}>
          <Pressable onPress={handlePickAvatar} style={styles.avatarContainer}>
            <Image
              source={avatarUri ? { uri: avatarUri } : DEFAULT_AVATAR}
              style={styles.avatar}
            />
            <View style={styles.cameraOverlay}>
              <Text style={styles.cameraIcon}>📷</Text>
            </View>
          </Pressable>
        </View>

        <View style={styles.inputSection}>
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Name</Text>
            <TextInput
              style={styles.textInput}
              placeholder="Your display name"
              placeholderTextColor={colors.border}
              value={displayName}
              onChangeText={setDisplayName}
              maxLength={MAX_DISPLAY_NAME_LENGTH}
              autoFocus
            />
            <Text style={styles.charCount}>
              {displayName.length}/{MAX_DISPLAY_NAME_LENGTH}
            </Text>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>About</Text>
            <TextInput
              style={[styles.textInput, styles.aboutInput]}
              placeholder="What's on your mind? (optional)"
              placeholderTextColor={colors.border}
              value={about}
              onChangeText={setAbout}
              maxLength={MAX_ABOUT_LENGTH}
              multiline
              numberOfLines={3}
            />
            <Text style={styles.charCount}>
              {about.length}/{MAX_ABOUT_LENGTH}
            </Text>
          </View>
        </View>

        <View style={styles.bottomSection}>
          {error && <Text style={styles.errorText}>{error}</Text>}
          <Pressable
            onPress={handleContinue}
            disabled={!isValid || isLoading}
            style={({ pressed }) => [
              styles.buttonContainer,
              pressed && isValid && styles.buttonPressed,
            ]}
          >
            <LinearGradient
              colors={
                isValid
                  ? [colors.primary, '#D45A42']
                  : [colors.border, colors.border]
              }
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.button}
            >
              {isLoading ? (
                <ActivityIndicator color={colors.white} />
              ) : (
                <Text
                  style={[
                    styles.buttonText,
                    !isValid && styles.buttonTextDisabled,
                  ]}
                >
                  Continue to z.chat
                </Text>
              )}
            </LinearGradient>
          </Pressable>
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
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: spacing.lg,
    paddingTop: 60,
    paddingBottom: 40,
  },
  headerSection: {
    marginBottom: spacing.xl,
  },
  heading: {
    fontSize: typography.sizes.xl,
    fontFamily: typography.fontFamily,
    fontWeight: typography.weights.bold,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  subheading: {
    fontSize: typography.sizes.md,
    fontFamily: typography.fontFamily,
    fontWeight: typography.weights.regular,
    color: colors.textSecondary,
    lineHeight: 24,
  },
  avatarSection: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  avatarContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    position: 'relative',
  },
  avatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
  },
  cameraOverlay: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: colors.white,
  },
  cameraIcon: {
    fontSize: 16,
  },
  inputSection: {
    flex: 1,
    gap: spacing.lg,
  },
  inputGroup: {
    gap: spacing.xs,
  },
  inputLabel: {
    fontSize: typography.sizes.sm,
    fontFamily: typography.fontFamily,
    fontWeight: typography.weights.semibold,
    color: colors.text,
    marginBottom: 2,
  },
  textInput: {
    fontSize: typography.sizes.md,
    fontFamily: typography.fontFamily,
    fontWeight: typography.weights.regular,
    color: colors.text,
    paddingHorizontal: spacing.md,
    paddingVertical: 14,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  aboutInput: {
    height: 80,
    textAlignVertical: 'top',
    paddingTop: 14,
  },
  charCount: {
    fontSize: typography.sizes.xs,
    fontFamily: typography.fontFamily,
    fontWeight: typography.weights.regular,
    color: colors.textSecondary,
    textAlign: 'right',
  },
  bottomSection: {
    marginTop: spacing.xl,
    gap: spacing.md,
  },
  errorText: {
    fontSize: typography.sizes.sm,
    fontFamily: typography.fontFamily,
    color: '#ED2F3C',
    textAlign: 'center',
  },
  buttonContainer: {
    borderRadius: borderRadius.xl,
    overflow: 'hidden',
  },
  buttonPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.98 }],
  },
  button: {
    paddingVertical: 16,
    alignItems: 'center',
    borderRadius: borderRadius.xl,
  },
  buttonText: {
    fontSize: typography.sizes.md,
    fontFamily: typography.fontFamily,
    fontWeight: typography.weights.semibold,
    color: colors.white,
  },
  buttonTextDisabled: {
    color: colors.textSecondary,
  },
});
