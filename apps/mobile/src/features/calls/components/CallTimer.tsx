import { Text } from 'react-native';
import { formatCallDuration } from '../utils/callHelpers';

interface Props {
  seconds: number;
  style?: object;
}

export function CallTimer({ seconds, style }: Props) {
  return (
    <Text style={[{ color: '#fff', fontSize: 16, fontWeight: '500' }, style]}>
      {formatCallDuration(seconds)}
    </Text>
  );
}
