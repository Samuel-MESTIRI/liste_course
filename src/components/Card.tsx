import React from 'react';
import { StyleSheet, View, ViewStyle } from 'react-native';
import { theme } from '../styles/theme';

interface CardProps {
  children: React.ReactNode;
  variant?: 'default' | 'elevated' | 'outlined';
  style?: ViewStyle;
}

export const Card: React.FC<CardProps> = ({
  children,
  variant = 'default',
  style,
}) => {
  const cardStyle = [
    styles.base,
    styles[variant],
    style,
  ];

  return (
    <View style={cardStyle}>
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  base: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
  },
  
  default: {
    ...theme.shadows.small,
  },
  
  elevated: {
    ...theme.shadows.medium,
  },
  
  outlined: {
    borderWidth: 1,
    borderColor: theme.colors.borderLight,
    shadowOpacity: 0,
    elevation: 0,
  },
});
