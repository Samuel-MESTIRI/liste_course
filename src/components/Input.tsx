import { FontAwesome } from '@expo/vector-icons';
import React, { forwardRef } from 'react';
import { StyleSheet, Text, TextInput, TextInputProps, TextStyle, View } from 'react-native';
import { theme } from '../styles/theme';

interface InputProps extends Omit<TextInputProps, 'style'> {
  label?: string;
  error?: string;
  icon?: any;
  variant?: 'default' | 'outlined' | 'filled';
  style?: TextStyle;
  containerStyle?: any;
}

export const Input = forwardRef<TextInput, InputProps>(({
  label,
  error,
  icon,
  variant = 'outlined',
  style,
  containerStyle,
  ...props
}, ref) => {
  const inputStyle = [
    styles.base,
    styles[variant],
    icon && styles.withIcon,
    error && styles.error,
    style,
  ];

  return (
    <View style={[styles.container, containerStyle]}>
      {label && <Text style={styles.label}>{label}</Text>}
      <View style={styles.inputContainer}>
        {icon && (
          <FontAwesome
            name={icon}
            size={16}
            color={theme.colors.textSecondary}
            style={styles.icon}
          />
        )}
        <TextInput
          ref={ref}
          style={inputStyle}
          placeholderTextColor={theme.colors.textLight}
          {...props}
        />
      </View>
      {error && <Text style={styles.errorText}>{error}</Text>}
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    marginBottom: theme.spacing.md,
  },
  
  label: {
    ...theme.typography.bodySmall,
    color: theme.colors.text,
    fontWeight: '600',
    marginBottom: theme.spacing.sm,
  },
  
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  
  base: {
    flex: 1,
    ...theme.typography.body,
    color: theme.colors.text,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    minHeight: 52,
    fontSize: 16,
  },

  withIcon: {
    paddingLeft: 44, // Espace pour l'icône + padding
  },
  
  outlined: {
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.borderLight,
  },
  
  filled: {
    backgroundColor: '#F1F3F4',
    borderWidth: 1,
    borderColor: theme.colors.borderLight,
  },
  
  default: {
    backgroundColor: theme.colors.surface,
    ...theme.shadows.small,
  },
  
  error: {
    borderColor: theme.colors.error,
  },
  
  icon: {
    position: 'absolute',
    left: theme.spacing.md,
    zIndex: 1,
  },
  
  errorText: {
    ...theme.typography.caption,
    color: theme.colors.error,
    marginTop: theme.spacing.xs,
  },
});
