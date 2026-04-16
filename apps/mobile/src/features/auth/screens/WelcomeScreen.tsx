import { View, Text, Pressable, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useThemedStyles } from '@/shared/hooks/useThemedStyles';
import { useAppSettings } from '@/shared/context/AppSettingsContext';
import { createStyles } from './styles/WelcomeScreen.styles';

const { width } = Dimensions.get('window');

const FEATURES = [
  {
    icon: 'lock-closed-outline' as const,
    title: 'End-to-End Encryption',
    description: 'Your messages are secured with the Signal Protocol',
  },
  {
    icon: 'people-outline' as const,
    title: 'Group Chat',
    description: 'Stay connected with your friends in real-time',
  },
  {
    icon: 'call-outline' as const,
    title: 'Voice & Video Calls',
    description: 'Crystal clear calls powered by WebRTC',
  },
];

export default function WelcomeScreen() {
  const styles = useThemedStyles(createStyles);
  const { appColors } = useAppSettings();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.container, { paddingTop: 80 + insets.top, paddingBottom: 40 + insets.bottom }]}>
      <View style={styles.topSection}>
        <View style={styles.logoContainer}>
          <LinearGradient
            colors={[appColors.primary, appColors.peach]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.logoGradient}
          >
            <Text style={styles.logoText}>z</Text>
          </LinearGradient>
        </View>

        <Text style={styles.heading}>Welcome to z.chat</Text>
        <Text style={styles.subheading}>
          Secure messaging for z.systems
        </Text>
      </View>

      <View style={styles.featuresSection}>
        {FEATURES.map((feature) => (
          <View key={feature.title} style={styles.featureRow}>
            <View style={styles.featureIconContainer}>
              <Ionicons name={feature.icon} size={22} color={appColors.secondary} />
            </View>
            <View style={styles.featureText}>
              <Text style={styles.featureTitle}>{feature.title}</Text>
              <Text style={styles.featureDescription}>
                {feature.description}
              </Text>
            </View>
          </View>
        ))}
      </View>

      <View style={styles.bottomSection}>
        <Pressable
          onPress={() => router.push('/phone-auth')}
          style={({ pressed }) => [
            styles.buttonContainer,
            pressed && styles.buttonPressed,
          ]}
        >
          <LinearGradient
            colors={[appColors.primary, '#D45A42']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.button}
          >
            <Text style={styles.buttonText}>Get Started</Text>
          </LinearGradient>
        </Pressable>

        <Text style={styles.termsText}>
          By continuing, you agree to our{' '}
          <Text style={styles.termsLink}>Terms of Service</Text>
          {' '}and{' '}
          <Text style={styles.termsLink}>Privacy Policy</Text>
        </Text>
      </View>
    </View>
  );
}
