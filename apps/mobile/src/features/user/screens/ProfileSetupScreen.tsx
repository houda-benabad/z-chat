import {
  View,
  Text,
  TextInput,
  Pressable,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MAX_DISPLAY_NAME_LENGTH, MAX_ABOUT_LENGTH } from '@z-chat/shared';
import { useAppSettings } from '@/shared/context/AppSettingsContext';
import { useThemedStyles } from '@/shared/hooks/useThemedStyles';
import { Avatar, ImageCropperModal } from '@/shared/components';
import { useProfileSetup } from '../hooks/useProfileSetup';
import { createStyles } from './styles/ProfileSetupScreen.styles';

export default function ProfileSetupScreen() {
  const styles = useThemedStyles(createStyles);
  const { appColors } = useAppSettings();
  const {
    displayName,
    setDisplayName,
    about,
    setAbout,
    avatarUri,
    isLoading,
    error,
    isValid,
    handlePickAvatar,
    handleContinue,
    cropper,
  } = useProfileSetup();

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
            <Avatar uri={avatarUri} name="" size={120} />
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
              placeholderTextColor={appColors.border}
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
              placeholderTextColor={appColors.border}
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
                  ? [appColors.primary, '#D45A42']
                  : [appColors.border, appColors.border]
              }
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.button}
            >
              {isLoading ? (
                <ActivityIndicator color={appColors.white} />
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

      <ImageCropperModal
        visible={cropper.visible}
        sourceUri={cropper.sourceUri}
        sourceWidth={cropper.sourceWidth}
        sourceHeight={cropper.sourceHeight}
        processing={cropper.processing}
        onConfirm={cropper.confirmCrop}
        onCancel={cropper.cancelCrop}
      />
    </KeyboardAvoidingView>
  );
}

