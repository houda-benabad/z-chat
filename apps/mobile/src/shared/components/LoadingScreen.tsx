import { View, ActivityIndicator } from 'react-native';
import { useAppSettings } from '../context/AppSettingsContext';
import { useThemedStyles } from '../hooks/useThemedStyles';
import { createStyles } from './styles/LoadingScreen.styles';

export function LoadingScreen() {
  const styles = useThemedStyles(createStyles);
  const { appColors } = useAppSettings();
  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color={appColors.primary} />
    </View>
  );
}
