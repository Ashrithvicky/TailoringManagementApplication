import { useEffect, useMemo, useRef } from 'react';
import { Animated, Easing, StyleSheet, View, useWindowDimensions } from 'react-native';

const STAR_COUNT = 130;

interface StarSpec {
  left: number;
  top: number;
  size: number;
  opacity: number;
  twinkleMs: number;
  driftMs: number;
  drift: number;
  delay: number;
  tint: string;
}

const TINTS = ['#FFFFFF', '#CFE8FF', '#E6DCFF', '#FFF3D6'];

// Deterministic pseudo-random so stars do not jump between renders.
function seeded(seed: number): () => number {
  let state = seed;
  return () => {
    state = (state * 1664525 + 1013904223) % 4294967296;
    return state / 4294967296;
  };
}

function buildStars(): StarSpec[] {
  const rand = seeded(42);
  return Array.from({ length: STAR_COUNT }, () => ({
    left: rand(),
    top: rand(),
    size: 1 + rand() * 2,
    opacity: 0.35 + rand() * 0.65,
    twinkleMs: 1200 + rand() * 2800,
    driftMs: 9000 + rand() * 12000,
    drift: 8 + rand() * 26,
    delay: rand() * 3000,
    tint: TINTS[Math.floor(rand() * TINTS.length)],
  }));
}

function loop(value: Animated.Value, to: number, from: number, duration: number, delay: number) {
  const step = (target: number) =>
    Animated.timing(value, { toValue: target, duration, easing: Easing.inOut(Easing.sin), useNativeDriver: true });
  const animation = Animated.loop(Animated.sequence([Animated.delay(delay), step(to), step(from)]));
  animation.start();
  return animation;
}

function Star({ spec, width, height }: { spec: StarSpec; width: number; height: number }) {
  const twinkle = useRef(new Animated.Value(0)).current;
  const drift = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const a = loop(twinkle, 1, 0, spec.twinkleMs, spec.delay);
    const b = loop(drift, 1, 0, spec.driftMs, spec.delay);
    return () => {
      a.stop();
      b.stop();
    };
  }, [twinkle, drift, spec]);

  return (
    <Animated.View
      style={{
        position: 'absolute',
        left: spec.left * width,
        top: spec.top * height,
        width: spec.size,
        height: spec.size,
        borderRadius: spec.size / 2,
        backgroundColor: spec.tint,
        opacity: twinkle.interpolate({ inputRange: [0, 1], outputRange: [0.12, spec.opacity] }),
        transform: [
          { translateY: drift.interpolate({ inputRange: [0, 1], outputRange: [0, -spec.drift] }) },
          { translateX: drift.interpolate({ inputRange: [0, 1], outputRange: [0, spec.drift / 3] }) },
          { scale: twinkle.interpolate({ inputRange: [0, 1], outputRange: [0.7, 1.25] }) },
        ],
      }}
    />
  );
}

// Tiny animated stars on a dark sky; purely decorative.
export function StarField() {
  const { width, height } = useWindowDimensions();
  const stars = useMemo(buildStars, []);

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none" importantForAccessibility="no-hide-descendants">
      {stars.map((spec, index) => (
        <Star key={index} spec={spec} width={width} height={height} />
      ))}
    </View>
  );
}
