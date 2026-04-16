import { Platform } from 'react-native';
import { dialogManager } from '@/shared/services/dialogManager';

interface AlertButton {
  text: string;
  style?: 'cancel' | 'destructive' | 'default';
  onPress?: () => void;
}

/**
 * Cross-platform alert that works on iOS, Android, AND web.
 * On native, renders a custom dialog via dialogManager for
 * consistent styling across platforms.
 * On web, falls back to window.confirm / window.alert.
 */
export function alert(title: string, message: string, buttons?: AlertButton[]): void {
  if (Platform.OS === 'web') {
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
    return;
  }

  dialogManager.show({
    title,
    message,
    buttons: buttons ?? [{ text: 'OK', style: 'default' }],
  });
}

/**
 * Cross-platform confirmation dialog that returns a Promise<boolean>.
 * On web: window.confirm.  On native: custom dialog via dialogManager.
 */
export function confirm(
  title: string,
  message: string,
  confirmLabel = 'OK',
  destructive = false,
): Promise<boolean> {
  if (Platform.OS === 'web') {
    return Promise.resolve(window.confirm(`${title}\n${message}`));
  }
  return new Promise((resolve) => {
    dialogManager.show({
      title,
      message,
      buttons: [
        { text: 'Cancel', style: 'cancel', onPress: () => resolve(false) },
        {
          text: confirmLabel,
          style: destructive ? 'destructive' : 'default',
          onPress: () => resolve(true),
        },
      ],
    });
  });
}
