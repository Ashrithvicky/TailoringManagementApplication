import { useTranslation } from 'react-i18next';
import { StyleSheet, Text, View } from 'react-native';

import { GARMENT_SECTIONS, HAND_SECTIONS, type GarmentType, type SectionKey } from '../domain/types';
import { formatDate } from '../domain/date';
import { EMPTY_SECTION, emptyOrderForm, type FieldErrors, type OrderFormValues } from '../domain/validation';
import { colors, radius, spacing } from '../theme';
import { Field } from './Field';
import { GlassCard } from './GlassCard';
import { RadioGroup } from './RadioGroup';
import { Select } from './Select';

interface Props {
  values: OrderFormValues;
  errors: FieldErrors;
  onChange: (values: OrderFormValues) => void;
}

type SectionField = 'length' | 'breadth' | 'handLength' | 'handBreadth';

export function OrderFormFields({ values, errors, onChange }: Props) {
  const { t, i18n } = useTranslation();
  const err = (key: string) => (errors[key] ? t(errors[key]) : undefined);
  const yesNo = [
    { value: 'yes', label: t('order.yes') },
    { value: 'no', label: t('order.no') },
  ] as const;

  const setSection = (section: SectionKey, field: SectionField, text: string) => {
    const current = values.measurements[section] ?? EMPTY_SECTION;
    onChange({ ...values, measurements: { ...values.measurements, [section]: { ...current, [field]: text } } });
  };

  const setGarment = (garmentType: GarmentType) =>
    onChange({ ...values, garmentType, measurements: emptyOrderForm(garmentType).measurements });

  const setLining = (given: 'yes' | 'no') =>
    onChange({ ...values, liningGiven: given === 'yes', liningCount: given === 'yes' ? values.count : '' });

  const measureField = (section: SectionKey, field: SectionField, label: string) => (
    <Field
      key={field}
      label={label}
      value={values.measurements[section]?.[field] ?? ''}
      onChangeText={(text) => setSection(section, field, text)}
      keyboardType="decimal-pad"
      maxLength={6}
      error={err(`${section}.${field}`)}
    />
  );

  return (
    <View style={styles.wrap}>
      <View style={styles.dateChip}>
        <Text style={styles.dateLabel}>{t('order.date')}</Text>
        <Text style={styles.dateValue}>{formatDate(new Date().toISOString(), i18n.language)}</Text>
      </View>

      <RadioGroup
        label={t('order.material')}
        value={values.garmentType}
        onChange={setGarment}
        options={[
          { value: 'saree_blouse', label: t('order.sareeBlouse') },
          { value: 'chudidhar', label: t('order.chudidhar') },
        ]}
      />

      <Field
        label={t('order.count')}
        value={values.count}
        onChangeText={(count) => onChange({ ...values, count })}
        keyboardType="number-pad"
        maxLength={2}
        error={err('count')}
      />

      {GARMENT_SECTIONS[values.garmentType].map((section) => (
        <GlassCard key={section}>
          <Text style={styles.sectionTitle}>{t(`order.${section}`)}</Text>
          <View style={styles.sectionBody}>
            {measureField(section, 'length', t('order.lengthIn'))}
            {measureField(section, 'breadth', t('order.breadthIn'))}
            {HAND_SECTIONS.includes(section) ? (
              <>
                {measureField(section, 'handLength', t('order.handLengthIn'))}
                {measureField(section, 'handBreadth', t('order.handBreadthIn'))}
              </>
            ) : null}
          </View>
        </GlassCard>
      ))}

      {values.garmentType === 'saree_blouse' ? (
        <GlassCard>
          <Select
            label={t('order.fallNeeded')}
            value={values.fallNeeded ? 'yes' : 'no'}
            options={yesNo}
            onChange={(v) => onChange({ ...values, fallNeeded: v === 'yes', fallGiven: v === 'yes' && values.fallGiven })}
          />
          {values.fallNeeded ? (
            <Select
              label={t('order.fallGiven')}
              value={values.fallGiven ? 'yes' : 'no'}
              options={yesNo}
              onChange={(v) => onChange({ ...values, fallGiven: v === 'yes' })}
            />
          ) : null}
        </GlassCard>
      ) : null}

      <RadioGroup
        label={t('order.lining')}
        value={values.liningGiven ? 'yes' : 'no'}
        onChange={setLining}
        options={yesNo}
      />
      {values.liningGiven ? (
        <Field
          label={t('order.liningCount')}
          value={values.liningCount}
          onChangeText={(liningCount) => onChange({ ...values, liningCount })}
          keyboardType="number-pad"
          maxLength={2}
          error={err('lining')}
        />
      ) : null}

      <Field
        label={t('order.notes')}
        value={values.notes}
        onChangeText={(notes) => onChange({ ...values, notes })}
        placeholder={t('order.notesPlaceholder')}
        multiline
        maxLength={1000}
        error={err('notes')}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.lg },
  dateChip: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    backgroundColor: colors.accentSoft,
  },
  dateLabel: { color: colors.muted, fontSize: 13, fontWeight: '600' },
  dateValue: { color: colors.accent, fontSize: 14, fontWeight: '700' },
  sectionTitle: { color: colors.accent, fontSize: 16, fontWeight: '700', marginBottom: spacing.md },
  sectionBody: { gap: spacing.md },
});
