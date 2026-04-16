import { View, Text, Pressable, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useAppSettings } from '@/shared/context/AppSettingsContext';
import { useThemedStyles } from '@/shared/hooks/useThemedStyles';
import { useContactSyncScreen } from '../hooks/useContactSyncScreen';
import { createStyles } from './styles/ContactSyncScreen.styles';

export default function ContactSyncScreen() {
  const styles = useThemedStyles(createStyles);
  const { appColors } = useAppSettings();
  const { state, matchedCount, totalContacts, error, handleSync, handleContinue, handleSkip } =
    useContactSyncScreen();

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        {/* Icon */}
        <View style={styles.iconContainer}>
          <Ionicons
            name={state === 'done' ? 'checkmark-circle' : 'people'}
            size={56}
            color={state === 'done' ? appColors.primary : appColors.textSecondary}
          />
        </View>

        {/* Initial state */}
        {state === 'initial' && (
          <>
            <Text style={styles.heading}>Find your friends on z.chat</Text>
            <Text style={styles.subheading}>
              Allow z.chat to access your contacts to see who's already here and start chatting right away
            </Text>
            <Pressable
              onPress={handleSync}
              style={({ pressed }) => [styles.buttonContainer, pressed && styles.buttonPressed]}
            >
              <LinearGradient
                colors={[appColors.primary, '#D45A42']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.button}
              >
                <Text style={styles.buttonText}>Continue</Text>
              </LinearGradient>
            </Pressable>
            <Pressable onPress={handleSkip} style={styles.skipButton}>
              <Text style={styles.skipText}>Not now</Text>
            </Pressable>
          </>
        )}

        {/* Syncing state */}
        {state === 'syncing' && (
          <>
            <Text style={styles.heading}>Looking for your contacts...</Text>
            <Text style={styles.subheading}>
              This may take a moment
            </Text>
            <ActivityIndicator size="large" color={appColors.primary} />
          </>
        )}

        {/* Done state */}
        {state === 'done' && (
          <>
            <Text style={styles.heading}>You're all set!</Text>
            {matchedCount > 0 ? (
              <>
                <Text style={styles.resultText}>
                  {matchedCount} {matchedCount === 1 ? 'contact' : 'contacts'} found on z.chat
                </Text>
                <Text style={styles.resultSubtext}>
                  Out of {totalContacts} contacts in your phone book
                </Text>
              </>
            ) : (
              <Text style={styles.subheading}>
                None of your contacts are on z.chat yet. You can invite them later!
              </Text>
            )}
            {error && <Text style={styles.errorText}>{error}</Text>}
            <Pressable
              onPress={handleContinue}
              style={({ pressed }) => [styles.buttonContainer, pressed && styles.buttonPressed]}
            >
              <LinearGradient
                colors={[appColors.primary, '#D45A42']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.button}
              >
                <Text style={styles.buttonText}>Continue to z.chat</Text>
              </LinearGradient>
            </Pressable>
          </>
        )}

        {/* Denied state */}
        {state === 'denied' && (
          <>
            <Text style={styles.heading}>No worries!</Text>
            <Text style={styles.subheading}>
              You can always add contacts manually or enable contact access later in your phone's settings
            </Text>
            <Pressable
              onPress={handleContinue}
              style={({ pressed }) => [styles.buttonContainer, pressed && styles.buttonPressed]}
            >
              <LinearGradient
                colors={[appColors.primary, '#D45A42']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.button}
              >
                <Text style={styles.buttonText}>Continue to z.chat</Text>
              </LinearGradient>
            </Pressable>
          </>
        )}
      </View>
    </SafeAreaView>
  );
}
