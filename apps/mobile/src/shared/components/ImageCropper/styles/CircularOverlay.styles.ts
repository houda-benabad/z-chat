import { StyleSheet } from 'react-native';

export const createStyles = () =>
  StyleSheet.create({
    container: {
      ...StyleSheet.absoluteFillObject,
      justifyContent: 'center',
      alignItems: 'center',
    },
    ring: {
      position: 'absolute',
    },
    innerRing: {
      position: 'absolute',
      borderWidth: 1.5,
      borderColor: 'rgba(255, 255, 255, 0.45)',
    },
  });
