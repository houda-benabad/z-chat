import { useEffect, useRef } from 'react';
import { Animated, Text, Pressable, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface SnackbarProps {
  message: string;
  actionLabel?: string;
  onAction?: () => void;
  onDismiss: () => void;
  duration?: number;
}

export function Snackbar({
  message,
  actionLabel,
  onAction,
  onDismiss,
  duration = 4000,
}: SnackbarProps) {
  const opacity = useRef(new Animated.Value(0)).current;
  const insets = useSafeAreaInsets();

  useEffect(() => {
    Animated.timing(opacity, { toValue: 1, duration: 200, useNativeDriver: true }).start();
    const t = setTimeout(() => {
      Animated.timing(opacity, { toValue: 0, duration: 200, useNativeDriver: true }).start(onDismiss);
    }, duration);
    return () => clearTimeout(t);
  }, [opacity, duration, onDismiss]);

  return (
    <Animated.View style={[styles.container, { opacity, bottom: 90 + insets.bottom }]}>
      <Text style={styles.message} numberOfLines={1}>{message}</Text>
      {actionLabel && (
        <Pressable
          onPress={() => {
            onAction?.();
            onDismiss();
          }}
          hitSlop={8}
        >
          <Text style={styles.action}>{actionLabel}</Text>
        </Pressable>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 16,
    right: 16,
    backgroundColor: '#323232',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 6,
    zIndex: 9999,
  },
  message: {
    flex: 1,
    color: '#fff',
    fontSize: 14,
  },
  action: {
    color: '#E46C53',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 16,
  },
});
