import '../i18n';

import { Stack } from 'expo-router';

import { DatabaseProvider } from '../data/DatabaseProvider';
import { colors } from '../theme';

export default function RootLayout() {
  return (
    <DatabaseProvider>
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.gradient[0] } }} />
    </DatabaseProvider>
  );
}
