import { useState } from 'react';
import { View, Text, Image, ViewStyle } from 'react-native';
import { useAppSettings } from '../context/AppSettingsContext';
import { getAvatarColor } from '../utils';
import { useThemedStyles } from '../hooks/useThemedStyles';
import { createStyles } from './styles/Avatar.styles';

const DEFAULT_AVATAR = require('../../../assets/default-avatar.png');

interface AvatarProps {
  uri?: string | null;
  name: string;
  size?: number;
  isOnline?: boolean;
  isGroup?: boolean;
  style?: ViewStyle;
}

export function Avatar({ uri, name, size = 48, isOnline = false, isGroup = false, style }: AvatarProps) {
  const styles = useThemedStyles(createStyles);
  const { appColors } = useAppSettings();
  const [imgError, setImgError] = useState(false);
  const radius = size / 2;
  const fontSize = size * 0.38;
  const dotSize = size * 0.28;
  const dotOffset = size * 0.02;
  const bg = isGroup ? appColors.primary : getAvatarColor(name || '?');

  return (
    <View style={[{ width: size, height: size }, style]}>
      <View style={[styles.circle, { width: size, height: size, borderRadius: radius, backgroundColor: bg }]}>
        {uri && !imgError ? (
          <Image
            source={{ uri }}
            style={{ width: size, height: size, borderRadius: radius }}
            onError={() => setImgError(true)}
          />
        ) : isGroup ? (
          <Text style={[styles.initial, { fontSize, color: appColors.white }]}>
            {(name || '?')[0]?.toUpperCase()}
          </Text>
        ) : (
          <Image
            source={DEFAULT_AVATAR}
            style={{ width: size, height: size, borderRadius: radius }}
          />
        )}
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
}
