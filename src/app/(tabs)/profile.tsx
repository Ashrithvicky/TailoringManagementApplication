import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, StyleSheet, Text, TextInput, View } from 'react-native';

import { Button } from '../../components/Button';
import { Field } from '../../components/Field';
import { GlassCard } from '../../components/GlassCard';
import { RadioGroup } from '../../components/RadioGroup';
import { Screen } from '../../components/Screen';
import { useDb } from '../../data/DatabaseProvider';
import { getPrices, savePrices } from '../../data/billingRepo';
import { getProfile, saveLanguage, saveProfile } from '../../data/settingsRepo';
import { EMPTY_PRICES, PRICE_KEYS, formatAmount, parseAmount, type Prices } from '../../domain/billing';
import { EMPTY_PROFILE, validateProfile } from '../../domain/profile';
import type { Language } from '../../domain/types';
import type { FieldErrors } from '../../domain/validation';
import { setLanguage } from '../../i18n';
import { colors, radius, spacing } from '../../theme';

export default function ProfileScreen() {
  const { t, i18n } = useTranslation();
  const db = useDb();
  const [profile, setProfile] = useState(EMPTY_PROFILE);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [saved, setSaved] = useState<Prices>(EMPTY_PRICES);
  const [priceText, setPriceText] = useState<Record<string, string>>({});

  useEffect(() => {
    void getProfile(db).then(setProfile);
    void getPrices(db).then((prices) => {
      setSaved(prices);
      setPriceText(Object.fromEntries(PRICE_KEYS.map((key) => [key, prices[key] ? formatAmount(prices[key]) : ''])));
    });
  }, [db]);

  const parsed = PRICE_KEYS.map((key) => parseAmount(priceText[key] ?? ''));
  const pricesValid = parsed.every((value) => value !== null);
  const pricesDirty = PRICE_KEYS.some((key, i) => parsed[i] !== saved[key]);

  const savePriceList = async () => {
    if (!pricesValid || !pricesDirty) return;
    const next = { ...EMPTY_PRICES };
    PRICE_KEYS.forEach((key, i) => {
      next[key] = parsed[i] ?? 0;
    });
    try {
      await savePrices(db, next);
      setSaved(next);
      Alert.alert(t('prices.saved'));
    } catch {
      Alert.alert(t('common.error'));
    }
  };

  const err = (key: string) => (errors[key] ? t(errors[key]) : undefined);

  const changeLanguage = async (language: Language) => {
    await setLanguage(language);
    await saveLanguage(db, language);
  };

  const save = async () => {
    const result = validateProfile(profile);
    setErrors(result.errors);
    if (!result.value) return;
    try {
      await saveProfile(db, result.value);
      Alert.alert(t('profile.saved'));
    } catch {
      Alert.alert(t('common.error'));
    }
  };

  return (
    <Screen title={t('profile.title')}>
      <GlassCard>
        <Field
          label={t('profile.shopName')}
          value={profile.shopName}
          onChangeText={(shopName) => setProfile({ ...profile, shopName })}
          maxLength={100}
          error={err('shopName')}
        />
        <Field
          label={t('profile.ownerName')}
          value={profile.ownerName}
          onChangeText={(ownerName) => setProfile({ ...profile, ownerName })}
          maxLength={100}
          error={err('ownerName')}
        />
        <Field
          label={t('profile.phone')}
          value={profile.phone}
          onChangeText={(phone) => setProfile({ ...profile, phone })}
          keyboardType="phone-pad"
          maxLength={20}
          error={err('phone')}
        />
      </GlassCard>

      <GlassCard>
        <RadioGroup<Language>
          label={t('profile.language')}
          value={i18n.language === 'ta' ? 'ta' : 'en'}
          onChange={(language) => void changeLanguage(language)}
          options={[
            { value: 'en', label: 'English' },
            { value: 'ta', label: 'தமிழ்' },
          ]}
        />
      </GlassCard>

      <Button title={t('profile.save')} onPress={save} />

      <GlassCard>
        <Text style={styles.sectionTitle}>{t('prices.title')}</Text>
        {PRICE_KEYS.map((key, i) => (
          <View key={key} style={styles.priceRow}>
            <Text style={styles.priceLabel}>{t(`billing.items.${key}`)}</Text>
            <TextInput
              value={priceText[key] ?? ''}
              onChangeText={(text) => setPriceText({ ...priceText, [key]: text })}
              keyboardType="decimal-pad"
              maxLength={9}
              placeholder="0"
              placeholderTextColor={colors.muted}
              accessibilityLabel={t(`billing.items.${key}`)}
              style={[styles.priceInput, parsed[i] === null && styles.priceInvalid]}
            />
          </View>
        ))}
        <Button title={t('prices.save')} onPress={() => void savePriceList()} disabled={!pricesDirty || !pricesValid} />
      </GlassCard>

      <Text style={styles.note}>{t('profile.security')}</Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  sectionTitle: { color: colors.accent, fontSize: 16, fontWeight: '700' },
  priceRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.md },
  priceLabel: { color: colors.text, fontSize: 14, flex: 1 },
  priceInput: {
    width: 110,
    textAlign: 'right',
    backgroundColor: colors.inputBg,
    borderColor: colors.glassBorder,
    borderWidth: 1,
    borderRadius: radius.md,
    color: colors.text,
    fontSize: 16,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  priceInvalid: { borderColor: colors.danger },
  note: { color: colors.muted, fontSize: 13, textAlign: 'center', marginTop: spacing.sm },
});
