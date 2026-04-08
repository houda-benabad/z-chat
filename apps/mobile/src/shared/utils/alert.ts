import { Platform, Alert } from 'react-native';

interface AlertButton {
  text: string;
  style?: 'cancel' | 'destructive' | 'default';
  onPress?: () => void;
}

/**
 * Cross-platform alert that works on iOS, Android, AND web.
 * react-native-web stubs Alert.alert as a no-op, so on web
 * we fall back to window.confirm / window.alert.
 */
export function alert(title: string, message: string, buttons?: AlertButton[]): void {
  if (Platform.OS !== 'web') {
    Alert.alert(title, message, buttons);
    return;
  }

  if (!buttons || buttons.length === 0) {
    window.alert(`${title}\n${message}`);
    return;
  }

  const cancelBtn = buttons.find((b) => b.style === 'cancel');
  const actionBtn = buttons.find((b) => b.style !== 'cancel');

  if (!actionBtn) {
    window.alert(`${title}\n${message}`);
    cancelBtn?.onPress?.();
    return;
  }

  if (window.confirm(`${title}\n${message}`)) {
    actionBtn.onPress?.();
  } else {
    cancelBtn?.onPress?.();
  }
}
