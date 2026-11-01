import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { StyleSheet } from 'react-native';

import { colors } from '../../theme';

type IconName = keyof typeof Ionicons.glyphMap;

const TABS: { name: string; labelKey: string; icon: IconName }[] = [
  { name: 'index', labelKey: 'tabs.dashboard', icon: 'grid-outline' },
  { name: 'users', labelKey: 'tabs.users', icon: 'people-outline' },
  { name: 'new-client', labelKey: 'tabs.newClient', icon: 'person-add-outline' },
  { name: 'inventory', labelKey: 'tabs.inventory', icon: 'layers-outline' },
  { name: 'payments', labelKey: 'tabs.payments', icon: 'receipt-outline' },
  { name: 'profile', labelKey: 'tabs.profile', icon: 'person-circle-outline' },
];

export default function TabsLayout() {
  const { t } = useTranslation();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.muted,
        tabBarStyle: styles.bar,
        sceneStyle: { backgroundColor: colors.gradient[0] },
      }}
    >
      {TABS.map(({ name, labelKey, icon }) => (
        <Tabs.Screen
          key={name}
          name={name}
          options={{
            title: t(labelKey),
            tabBarIcon: ({ color, size }) => <Ionicons name={icon} size={size} color={String(color)} />,
          }}
        />
      ))}
    </Tabs>
  );
}

// Opaque and in the layout flow so content never shows through or sits under the system navigation bar.
const styles = StyleSheet.create({
  bar: {
    backgroundColor: colors.barBg,
    borderTopColor: colors.glassBorder,
    borderTopWidth: StyleSheet.hairlineWidth * 2,
    elevation: 0,
  },
});
