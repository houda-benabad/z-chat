import { useRef } from 'react';
import {
  View,
  Text,
  Pressable,
  TextInput,
  ActivityIndicator,
  KeyboardAvoidingView,
  ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BottomSheetModal } from '@gorhom/bottom-sheet';
import { useAppSettings } from '@/shared/context/AppSettingsContext';
import { Avatar, ImageCropperModal, PhotoActionSheet } from '@/shared/components';
import { useSettingsProfile } from '../hooks/useSettingsProfile';
import { createStyles } from './styles/SettingsProfileScreen.styles';
import { useThemedStyles } from '@/shared/hooks/useThemedStyles';

export default function SettingsProfileScreen() {
  const styles = useThemedStyles(createStyles);
  const { appColors } = useAppSettings();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const {
    profile,
    loading,
    saving,
    uploadingAvatar,
    name,
    about,
    avatarUri,
    avatarRemoved,
    hasChanges,
    setName,
    setAbout,
    handleTakePhoto,
    handleChoosePhoto,
    handleDeletePhoto,
    handleSave,
    cropper,
  } = useSettingsProfile();
  const photoSheetRef = useRef<BottomSheetModal>(null);

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
      behavior="padding"
    >
      <View style={[styles.header, { paddingTop: 60 + insets.top }]}>
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

      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 20 }]}>
        {/* Avatar */}
        <View style={styles.avatarSection}>
          <View style={styles.avatarWrapper}>
            <Avatar
              uri={avatarRemoved ? null : (avatarUri ?? profile?.avatar)}
              name={profile?.name ?? ''}
              size={96}
            />
            {uploadingAvatar && (
              <View style={styles.avatarOverlay}>
                <ActivityIndicator size="small" color={appColors.white} />
              </View>
            )}
          </View>
          <Pressable
            onPress={() => photoSheetRef.current?.present()}
            disabled={uploadingAvatar || saving}
          >
            <Text style={styles.editAvatarText}>Edit</Text>
          </Pressable>
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

      <PhotoActionSheet
        ref={photoSheetRef}
        onTakePhoto={handleTakePhoto}
        onChoosePhoto={handleChoosePhoto}
        onDeletePhoto={handleDeletePhoto}
      />
    </KeyboardAvoidingView>
  );
}
