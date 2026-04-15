import { memo } from 'react';
import { View, ViewStyle } from 'react-native';
import { Image } from 'expo-image';
import { useAppSettings } from '../context/AppSettingsContext';
import { useThemedStyles } from '../hooks/useThemedStyles';
import { createStyles } from './styles/Avatar.styles';

const DEFAULT_AVATAR = require('../../../assets/default-avatar.png');
const DEFAULT_GROUP_AVATAR = require('../../../assets/default-group.jpg');

interface AvatarProps {
  uri?: string | null;
  name: string;
  size?: number;
  isOnline?: boolean;
  isGroup?: boolean;
  style?: ViewStyle;
}

export const Avatar = memo(function Avatar({ uri, name, size = 48, isOnline = false, isGroup = false, style }: AvatarProps) {
  const styles = useThemedStyles(createStyles);
  const { appColors } = useAppSettings();
  const radius = size / 2;
  const dotSize = size * 0.28;
  const dotOffset = size * 0.02;
  const placeholder = isGroup ? DEFAULT_GROUP_AVATAR : DEFAULT_AVATAR;
  const bg = isGroup ? appColors.primary : 'transparent';

  return (
    <View style={[{ width: size, height: size }, style]}>
      <View style={[styles.circle, { width: size, height: size, borderRadius: radius, backgroundColor: bg }]}>
        <Image
          source={uri ?? placeholder}
          placeholder={placeholder}
          placeholderContentFit="cover"
          style={{ width: size, height: size, borderRadius: radius }}
          contentFit="cover"
          transition={200}
          cachePolicy="memory-disk"
          recyclingKey={uri ?? 'default'}
        />
      </View>

      {isOnline && (
        <View style={[
          styles.onlineDot,
          {
            width: dotSize,
            height: dotSize,
            borderRadius: dotSize / 2,
            bottom: dotOffset,
            right: dotOffset,
          },
        ]} />
      )}
    </View>
  );
});
