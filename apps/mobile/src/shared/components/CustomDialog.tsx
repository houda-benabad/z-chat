import { useEffect, useState, useCallback } from 'react';
import { Modal, View, Text, Pressable } from 'react-native';
import { useThemedStyles } from '@/shared/hooks/useThemedStyles';
import { dialogManager, type DialogConfig, type DialogButton } from '@/shared/services/dialogManager';
import { createStyles } from './styles/CustomDialog.styles';

export function CustomDialog() {
  const styles = useThemedStyles(createStyles);
  const [config, setConfig] = useState<DialogConfig | null>(null);

  useEffect(() => {
    return dialogManager.subscribe(setConfig);
  }, []);

  const handlePress = useCallback((button: DialogButton) => {
    button.onPress?.();
    dialogManager.dismiss();
  }, []);

  const handleBackdrop = useCallback(() => {
    if (!config) return;
    // Find cancel button, or fall back to first button
    const cancelBtn = config.buttons.find((b) => b.style === 'cancel');
    if (cancelBtn) {
      cancelBtn.onPress?.();
    }
    dialogManager.dismiss();
  }, [config]);

  if (!config) return null;

  const cancelBtn = config.buttons.find((b) => b.style === 'cancel');
  const actionButtons = config.buttons.filter((b) => b.style !== 'cancel');

  return (
    <Modal transparent visible animationType="fade" onRequestClose={handleBackdrop}>
      <Pressable style={styles.overlay} onPress={handleBackdrop}>
        <Pressable style={styles.card} onPress={() => {}}>
          <Text style={styles.title}>{config.title}</Text>
          {!!config.message && (
            <Text style={styles.message}>{config.message}</Text>
          )}
          <View style={styles.buttonRow}>
            {cancelBtn && (
              <Pressable
                style={[styles.buttonSingle, styles.buttonCancel]}
                onPress={() => handlePress(cancelBtn)}
              >
                <Text style={[styles.buttonText, styles.buttonTextCancel]}>
                  {cancelBtn.text}
                </Text>
              </Pressable>
            )}
            {actionButtons.map((btn, i) => {
              const isDestructive = btn.style === 'destructive';
              return (
                <Pressable
                  key={i}
                  style={[
                    styles.buttonSingle,
                    isDestructive ? styles.buttonDestructive : styles.buttonDefault,
                  ]}
                  onPress={() => handlePress(btn)}
                >
                  <Text
                    style={[
                      styles.buttonText,
                      isDestructive ? styles.buttonTextDestructive : styles.buttonTextDefault,
                    ]}
                  >
                    {btn.text}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
