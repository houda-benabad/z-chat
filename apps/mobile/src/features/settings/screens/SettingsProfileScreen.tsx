import {
  View,
  Text,
  Pressable,
  TextInput,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAppSettings } from '@/shared/context/AppSettingsContext';
import { Avatar, ImageCropperModal } from '@/shared/components';
import { useSettingsProfile } from '../hooks/useSettingsProfile';
import { createStyles } from './styles/SettingsProfileScreen.styles';
import { useThemedStyles } from '@/shared/hooks/useThemedStyles';

export default function SettingsProfileScreen() {
  const styles = useThemedStyles(createStyles);
  const { appColors } = useAppSettings();
  const router = useRouter();
  const {
    profile,
    loading,
    saving,
    uploadingAvatar,
    name,
    about,
    avatarUri,
    hasChanges,
    setName,
    setAbout,
    handlePickAvatar,
    handleSave,
    cropper,
  } = useSettingsProfile();

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={appColors.primary} />
      </View>
    );
  }

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
              <ActivityIndicator size="small" color={appColors.white} />
            ) : (
              <Text style={styles.saveText}>Save</Text>
            )}
          </Pressable>
        )}
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Avatar */}
        <View style={styles.avatarSection}>
          <Pressable
            style={styles.avatarWrapper}
            onPress={handlePickAvatar}
            disabled={uploadingAvatar || saving}
          >
            <Avatar
              uri={avatarUri ?? profile?.avatar}
              name={profile?.name ?? ''}
              size={96}
            />
            {uploadingAvatar ? (
              <View style={styles.avatarOverlay}>
                <ActivityIndicator size="small" color={appColors.white} />
              </View>
            ) : (
              <View style={styles.cameraOverlay}>
                <Ionicons name="camera" size={14} color={appColors.white} />
              </View>
            )}
          </Pressable>
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
            placeholderTextColor={appColors.textSecondary}
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
            placeholderTextColor={appColors.textSecondary}
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
