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
import { useRouter } from 'expo-router';
import { spacing } from '@/theme';
import { useAppSettings } from '@/shared/context/AppSettingsContext';
import { Avatar } from '@/shared/components';
import { useThemedStyles } from '@/shared/hooks/useThemedStyles';
import { useAddContact } from '../hooks/useAddContact';
import { createStyles } from './styles/AddContactScreen.styles';

export default function AddContactScreen() {
  const styles = useThemedStyles(createStyles);
  const { appColors } = useAppSettings();
  const router = useRouter();
  const {
    phone,
    setPhone,
    contactName,
    setContactName,
    saving,
    added,
    addError,
    nameError,
    foundUser,
    searched,
    isValidPhone,
    handleSearch,
    handleAddContact,
    handleMessage,
    messagingLoading,
  } = useAddContact();

  const canAdd = contactName.trim().length > 0 && !saving && !added;

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
              placeholderTextColor={appColors.border}
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
                <ActivityIndicator size="small" color={appColors.white} />
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
                <Avatar uri={foundUser.avatar} name={foundUser.name ?? ''} size={52} />
              </View>
              <View style={styles.foundUserInfo}>
                <Text style={styles.foundUserName}>
                  {foundUser.name ?? 'No name set'}
                </Text>
                <Text style={styles.foundUserPhone}>{foundUser.phone}</Text>
              </View>
            </View>

            {foundUser.isContact ? (
              <>
                <View style={styles.alreadyContactBadge}>
                  <Text style={styles.alreadyContactText}>Already in your contacts</Text>
                </View>

                <Pressable
                  style={[styles.messageButton, messagingLoading && styles.addButtonDisabled]}
                  onPress={handleMessage}
                  disabled={messagingLoading}
                >
                  {messagingLoading ? (
                    <ActivityIndicator size="small" color={appColors.white} />
                  ) : (
                    <Text style={styles.addButtonText}>Message</Text>
                  )}
                </Pressable>
              </>
            ) : (
              <>
                {/* Contact Name — mandatory, pre-filled with their profile name */}
                <View style={[styles.inputGroup, { marginTop: spacing.lg }]}>
                  <Text style={styles.label}>Contact Name</Text>
                  <TextInput
                    style={[styles.input, nameError && styles.inputError]}
                    placeholder={foundUser.name ?? 'Enter a name for this contact'}
                    placeholderTextColor={appColors.border}
                    value={contactName}
                    onChangeText={setContactName}
                    maxLength={100}
                  />
                  {!!nameError && (
                    <Text style={styles.nameErrorText}>{nameError}</Text>
                  )}
                </View>

                {/* API error */}
                {!!addError && (
                  <Text style={styles.addError}>{addError}</Text>
                )}

                {/* Add button */}
                <Pressable
                  style={[styles.addButton, (!canAdd) && styles.addButtonDisabled, added && styles.addButtonSuccess]}
                  onPress={handleAddContact}
                  disabled={!canAdd}
                >
                  {saving ? (
                    <ActivityIndicator size="small" color={appColors.white} />
                  ) : added ? (
                    <Text style={styles.addButtonText}>Added!</Text>
                  ) : (
                    <Text style={styles.addButtonText}>Add to Contacts</Text>
                  )}
                </Pressable>
              </>
            )}
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
