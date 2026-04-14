import { useState, useEffect } from 'react';
import { View, Text, Image, ViewStyle } from 'react-native';
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

export function Avatar({ uri, name, size = 48, isOnline = false, isGroup = false, style }: AvatarProps) {
  const styles = useThemedStyles(createStyles);
  const { appColors } = useAppSettings();
  const [imgError,   setImgError]   = useState(false);
  const [imgLoading, setImgLoading] = useState(true);

  useEffect(() => { setImgLoading(true); setImgError(false); }, [uri]);
  const radius = size / 2;
  const fontSize = size * 0.38;
  const dotSize = size * 0.28;
  const dotOffset = size * 0.02;
  const showNetworkImage = !!uri && !imgError;
  const bg = isGroup ? appColors.primary : 'transparent';

  return (
    <View style={[{ width: size, height: size }, style]}>
      <View style={[styles.circle, { width: size, height: size, borderRadius: radius, backgroundColor: bg }]}>
        {isGroup && !showNetworkImage ? (
          <Image
            source={DEFAULT_GROUP_AVATAR}
            style={{ width: size * 1.15, height: size * 1.15 }}
          />
        ) : (
          <>
            {/* Default avatar always rendered as base layer for non-group avatars */}
            {!isGroup && (
              <Image
                source={DEFAULT_AVATAR}
                style={{ width: size * 1.05, height: size * 1.05, position: 'absolute' }}
              />
            )}
            {showNetworkImage && (
              <Image
                source={{ uri }}
                style={{ width: size, height: size, borderRadius: radius, opacity: imgLoading ? 0 : 1 }}
                onLoadEnd={() => setImgLoading(false)}
                onError={() => { console.warn('[Avatar] Failed to load image:', uri); setImgLoading(false); setImgError(true); }}
              />
            )}
          </>
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
