import { StyleSheet, Text, TextInput, View, type TextInputProps } from 'react-native';

import { colors, radius, spacing } from '../theme';

interface Props extends Pick<TextInputProps, 'keyboardType' | 'multiline' | 'placeholder' | 'maxLength' | 'autoCapitalize'> {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  error?: string;
}

export function Field({ label, value, onChangeText, error, multiline, ...rest }: Props) {
  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        {...rest}
        multiline={multiline}
        value={value}
        onChangeText={onChangeText}
        accessibilityLabel={label}
        placeholderTextColor={colors.muted}
        style={[styles.input, multiline && styles.multiline, error ? styles.inputError : null]}
      />
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.xs },
  label: { color: colors.muted, fontSize: 13, fontWeight: '600' },
  input: {
    backgroundColor: colors.inputBg,
    borderColor: colors.glassBorder,
    borderWidth: 1,
    borderRadius: radius.md,
    color: colors.text,
    fontSize: 16,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  multiline: { minHeight: 90, textAlignVertical: 'top' },
  inputError: { borderColor: colors.danger },
  error: { color: colors.danger, fontSize: 12 },
});
