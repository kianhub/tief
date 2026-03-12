import { Modal, Pressable, StyleSheet, View } from 'react-native';
import Animated, { FadeIn, FadeOut, SlideInDown, SlideOutDown } from 'react-native-reanimated';

import { useTheme } from '@/hooks/useTheme';
import { ThemedText } from './ThemedText';

export interface SelectOption<T> {
  label: string;
  value: T;
  description?: string;
}

export interface SelectSheetProps<T> {
  visible: boolean;
  title: string;
  options: SelectOption<T>[];
  selected: T;
  onSelect: (value: T) => void;
  onClose: () => void;
}

export function SelectSheet<T>({
  visible,
  title,
  options,
  selected,
  onSelect,
  onClose,
}: SelectSheetProps<T>) {
  const { colors, spacing, radii, springs } = useTheme();

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Animated.View
          entering={FadeIn.duration(200)}
          exiting={FadeOut.duration(150)}
          style={styles.backdrop}
        >
          <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        </Animated.View>

        <Animated.View
          entering={SlideInDown.springify()
            .damping(springs.gentle.damping)
            .stiffness(springs.gentle.stiffness)
            .mass(springs.gentle.mass)}
          exiting={SlideOutDown.duration(200)}
          style={[
            styles.sheet,
            {
              backgroundColor: colors.surface,
              borderTopLeftRadius: radii.lg,
              borderTopRightRadius: radii.lg,
              paddingBottom: spacing.xxl,
            },
          ]}
        >
          <View style={[styles.handle, { backgroundColor: colors.border }]} />

          <ThemedText variant="titleSmall" style={[styles.title, { paddingHorizontal: spacing.contentPadding }]}>
            {title}
          </ThemedText>

          <View style={{ paddingHorizontal: spacing.contentPadding }}>
            {options.map((option, index) => {
              const isSelected = option.value === selected;
              return (
                <Pressable
                  key={String(option.value)}
                  onPress={() => {
                    onSelect(option.value);
                    onClose();
                  }}
                  style={[
                    styles.optionRow,
                    index < options.length - 1 && {
                      borderBottomWidth: StyleSheet.hairlineWidth,
                      borderBottomColor: colors.border,
                    },
                  ]}
                >
                  <View style={styles.optionText}>
                    <ThemedText
                      variant="ui"
                      color={isSelected ? 'accent' : 'primary'}
                    >
                      {option.label}
                    </ThemedText>
                    {option.description ? (
                      <ThemedText variant="caption" color="secondary">
                        {option.description}
                      </ThemedText>
                    ) : null}
                  </View>

                  <View
                    style={[
                      styles.radio,
                      {
                        borderColor: isSelected
                          ? colors.accent
                          : colors.textTertiary,
                      },
                    ]}
                  >
                    {isSelected && (
                      <View
                        style={[styles.radioFill, { backgroundColor: colors.accent }]}
                      />
                    )}
                  </View>
                </Pressable>
              );
            })}
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  sheet: {
    paddingTop: 12,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 16,
  },
  title: {
    marginBottom: 16,
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
  },
  optionText: {
    flex: 1,
    gap: 2,
    marginRight: 16,
  },
  radio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioFill: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
});
