import {
  View,
  Text,
  TextInput,
  Pressable,
  ActivityIndicator,
  KeyboardAvoidingView,
  ScrollView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAppSettings } from '@/shared/context/AppSettingsContext';
import { useThemedStyles } from '@/shared/hooks/useThemedStyles';
import { usePhoneAuth, COUNTRY_CODES } from '../hooks/usePhoneAuth';
import { createStyles } from './styles/PhoneAuthScreen.styles';

export default function PhoneAuthScreen() {
  const styles = useThemedStyles(createStyles);
  const { appColors } = useAppSettings();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const {
    countryCode,
    setCountryCode,
    phoneNumber,
    setPhoneNumber,
    showCountryPicker,
    setShowCountryPicker,
    isLoading,
    error,
    isValidPhone,
    handleSendCode,
  } = usePhoneAuth();

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior="padding"
    >
      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingTop: 60 + insets.top, paddingBottom: 40 + insets.bottom }]}
        keyboardShouldPersistTaps="handled"
      >
        <Pressable
          style={styles.backButton}
          onPress={() => router.back()}
          hitSlop={12}
        >
          <Text style={styles.backArrow}>←</Text>
        </Pressable>

        <View style={styles.headerSection}>
          <Text style={styles.heading}>Enter your phone number</Text>
          <Text style={styles.subheading}>
            We'll send you a verification code to confirm your identity
          </Text>
        </View>

        <View style={styles.inputSection}>
          <View style={styles.phoneRow}>
            <Pressable
              style={styles.countrySelector}
              onPress={() => setShowCountryPicker(!showCountryPicker)}
            >
              <Text style={styles.countryFlag}>{countryCode.flag}</Text>
              <Text style={styles.countryCode}>{countryCode.code}</Text>
              <Text style={styles.dropdownArrow}>▾</Text>
            </Pressable>

            <TextInput
              style={styles.phoneInput}
              placeholder="Phone number"
              placeholderTextColor={appColors.border}
              value={phoneNumber}
              onChangeText={setPhoneNumber}
              keyboardType="phone-pad"
              autoFocus
              maxLength={15}
            />
          </View>

          {showCountryPicker && (
            <View style={styles.countryList}>
              {COUNTRY_CODES.map((item) => (
                <Pressable
                  key={item.code}
                  style={[
                    styles.countryItem,
                    item.code === countryCode.code && styles.countryItemActive,
                  ]}
                  onPress={() => {
                    setCountryCode(item);
                    setShowCountryPicker(false);
                  }}
                >
                  <Text style={styles.countryItemFlag}>{item.flag}</Text>
                  <Text style={styles.countryItemName}>{item.country}</Text>
                  <Text style={styles.countryItemCode}>{item.code}</Text>
                </Pressable>
              ))}
            </View>
          )}
        </View>

        <View style={styles.bottomSection}>
          {error && (
            <Text style={styles.errorText}>{error}</Text>
          )}
          <Pressable
            onPress={handleSendCode}
            disabled={!isValidPhone || isLoading}
            style={({ pressed }) => [
              styles.buttonContainer,
              pressed && isValidPhone && styles.buttonPressed,
            ]}
          >
            <LinearGradient
              colors={
                isValidPhone
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
                    !isValidPhone && styles.buttonTextDisabled,
                  ]}
                >
                  Send Verification Code
                </Text>
              )}
            </LinearGradient>
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
