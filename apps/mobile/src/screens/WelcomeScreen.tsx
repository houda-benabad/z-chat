import { useEffect } from 'react';
import { View, Text, StyleSheet, Pressable, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { colors, spacing, typography, borderRadius } from '../theme';
import { tokenStorage } from '../services/api';

const { width } = Dimensions.get('window');

const FEATURES = [
  {
    icon: '🔒',
    title: 'End-to-End Encryption',
    description: 'Your messages are secured with the Signal Protocol',
  },
  {
    icon: '👥',
    title: 'Team Chat',
    description: 'Stay connected with your team in real-time',
  },
  {
    icon: '📞',
    title: 'Voice & Video Calls',
    description: 'Crystal clear calls powered by WebRTC',
  },
];

export default function WelcomeScreen() {
  const router = useRouter();

  useEffect(() => {
    tokenStorage.get().then((token) => {
      if (!token) return;
      try {
        const payload = JSON.parse(atob(token.split('.')[1]!));
        const isExpired = payload.exp && payload.exp * 1000 < Date.now();
        if (isExpired) {
          tokenStorage.remove();
          return;
        }
        router.replace('/chat-list');
      } catch {
        tokenStorage.remove();
      }
    });
  }, [router]);

  return (
    <View style={styles.container}>
      <View style={styles.topSection}>
        <View style={styles.logoContainer}>
          <LinearGradient
            colors={[colors.primary, colors.peach]}
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
              <Text style={styles.featureIcon}>{feature.icon}</Text>
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
            colors={[colors.primary, '#D45A42']}
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    paddingHorizontal: spacing.lg,
    paddingTop: 80,
    paddingBottom: 40,
  },
  topSection: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  logoContainer: {
    marginBottom: spacing.lg,
  },
  logoGradient: {
    width: 88,
    height: 88,
    borderRadius: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoText: {
    fontSize: 44,
    fontFamily: typography.fontFamily,
    fontWeight: typography.weights.bold,
    color: colors.white,
    marginTop: -2,
  },
  heading: {
    fontSize: 28,
    fontFamily: typography.fontFamily,
    fontWeight: typography.weights.bold,
    color: colors.text,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  subheading: {
    fontSize: typography.sizes.md,
    fontFamily: typography.fontFamily,
    fontWeight: typography.weights.regular,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  featuresSection: {
    flex: 1,
    justifyContent: 'center',
    gap: spacing.lg,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  featureIconContainer: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  featureIcon: {
    fontSize: 22,
  },
  featureText: {
    flex: 1,
  },
  featureTitle: {
    fontSize: typography.sizes.md,
    fontFamily: typography.fontFamily,
    fontWeight: typography.weights.semibold,
    color: colors.text,
    marginBottom: 2,
  },
  featureDescription: {
    fontSize: typography.sizes.sm,
    fontFamily: typography.fontFamily,
    fontWeight: typography.weights.regular,
    color: colors.textSecondary,
  },
  bottomSection: {
    alignItems: 'center',
    gap: spacing.md,
  },
  buttonContainer: {
    width: '100%',
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
    fontSize: typography.sizes.lg,
    fontFamily: typography.fontFamily,
    fontWeight: typography.weights.semibold,
    color: colors.white,
  },
  termsText: {
    fontSize: typography.sizes.xs,
    fontFamily: typography.fontFamily,
    fontWeight: typography.weights.regular,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
  },
  termsLink: {
    color: colors.secondary,
    fontWeight: typography.weights.medium,
  },
});
