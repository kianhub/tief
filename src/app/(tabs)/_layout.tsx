import {
  Pressable,
  View,
  StyleSheet,
  type GestureResponderEvent,
  type PressableProps,
} from 'react-native';
import { Tabs, Redirect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '@/lib/auth-context';
import { useTheme } from '@/hooks/useTheme';
import { ThemedText } from '@/components/ui';
import { haptics } from '@/lib/haptics';

const TAB_BAR_HEIGHT = 54;

type TabConfig = {
  name: string;
  title: string;
  icon: string;
};

const tabs: TabConfig[] = [
  { name: 'index', title: 'Home', icon: '⌂' },
  { name: 'library', title: 'Library', icon: '📖' },
  { name: 'settings', title: 'Settings', icon: '⚙' },
];

function HapticTab(props: PressableProps) {
  const { onPress, ...rest } = props;

  const handlePress = (e: GestureResponderEvent) => {
    haptics.selection();
    (onPress as ((e: GestureResponderEvent) => void) | undefined)?.(e);
  };

  return <Pressable onPress={handlePress} {...rest} style={styles.tabButton} />;
}

export default function TabsLayout() {
  const { user, isOnboarded } = useAuth();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  if (!user) {
    return <Redirect href="/(auth)/sign-in" />;
  }

  if (!isOnboarded) {
    return <Redirect href="/(onboarding)/welcome" />;
  }

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: colors.surface + 'F2', // slight transparency
          borderTopWidth: 0,
          elevation: 0,
          shadowOpacity: 0,
          height: TAB_BAR_HEIGHT + insets.bottom,
          paddingBottom: insets.bottom,
        },
        tabBarActiveTintColor: colors.textPrimary,
        tabBarInactiveTintColor: colors.textTertiary,
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '400',
          lineHeight: 12 * 1.4,
        },
        tabBarButton: (props) => <HapticTab {...props} />,
      }}
    >
      {tabs.map((tab) => (
        <Tabs.Screen
          key={tab.name}
          name={tab.name}
          options={{
            title: tab.title,
            tabBarIcon: ({ color, focused }) => (
              <View style={styles.iconContainer}>
                <ThemedText
                  style={{ fontSize: 22, color }}
                  variant="ui"
                >
                  {tab.icon}
                </ThemedText>
                {focused && (
                  <View
                    style={[
                      styles.activeDot,
                      { backgroundColor: colors.accent },
                    ]}
                  />
                )}
              </View>
            ),
          }}
        />
      ))}
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    height: 28,
  },
  activeDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    position: 'absolute',
    bottom: -2,
  },
});
