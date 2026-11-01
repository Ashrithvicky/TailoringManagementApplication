import { Ionicons } from '@expo/vector-icons';
import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, radius, spacing } from '../theme';
import { GlassCard } from './GlassCard';

type IconName = keyof typeof Ionicons.glyphMap;

function useCountUp(target: number): number {
  const value = useRef(new Animated.Value(0)).current;
  const [shown, setShown] = useState(0);

  useEffect(() => {
    const id = value.addListener(({ value: v }) => setShown(Math.round(v)));
    Animated.timing(value, { toValue: target, duration: 700, easing: Easing.out(Easing.cubic), useNativeDriver: false }).start();
    return () => value.removeListener(id);
  }, [target, value]);

  return shown;
}

interface Props {
  label: string;
  value: number;
  color: string;
  icon: IconName;
  size?: 'large' | 'small';
  hint?: string;
  onPress?: () => void;
}

export function StatTile({ label, value, color, icon, size = 'small', hint, onPress }: Props) {
  const scale = useRef(new Animated.Value(1)).current;
  const appear = useRef(new Animated.Value(0)).current;
  const shown = useCountUp(value);
  const large = size === 'large';

  useEffect(() => {
    Animated.spring(appear, { toValue: 1, friction: 7, tension: 60, useNativeDriver: true }).start();
  }, [appear]);

  const press = (to: number) => Animated.spring(scale, { toValue: to, friction: 5, useNativeDriver: true }).start();

  return (
    <Animated.View
      style={[
        large ? styles.large : styles.small,
        {
          opacity: appear,
          transform: [{ scale }, { translateY: appear.interpolate({ inputRange: [0, 1], outputRange: [16, 0] }) }],
        },
      ]}
    >
      <Pressable
        style={styles.fill}
        accessibilityRole={onPress ? 'button' : 'text'}
        accessibilityLabel={`${label}: ${value}`}
        disabled={!onPress}
        onPress={onPress}
        onPressIn={() => press(0.96)}
        onPressOut={() => press(1)}
      >
        <GlassCard strong={large} style={[styles.fill, { borderColor: color }]}>
          <View style={styles.top}>
            <View style={[styles.iconWrap, { backgroundColor: `${color}26` }]}>
              <Ionicons name={icon} size={large ? 22 : 18} color={color} />
            </View>
            {onPress ? <Ionicons name="chevron-forward" size={16} color={colors.muted} /> : null}
          </View>
          <Text style={[large ? styles.valueLarge : styles.valueSmall, { color }]}>{shown}</Text>
          <Text style={styles.label} numberOfLines={2}>
            {label}
          </Text>
          {hint ? <Text style={styles.hint}>{hint}</Text> : null}
        </GlassCard>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  large: { flexGrow: 1, flexBasis: '47%' },
  small: { flexGrow: 1, flexBasis: '47%' },
  fill: { flex: 1 },
  top: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  iconWrap: { width: 36, height: 36, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center' },
  valueLarge: { fontSize: 44, fontWeight: '800' },
  valueSmall: { fontSize: 28, fontWeight: '800' },
  label: { color: colors.text, fontSize: 13, fontWeight: '600' },
  hint: { color: colors.muted, fontSize: 12, marginTop: -spacing.xs },
});
