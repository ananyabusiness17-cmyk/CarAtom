import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';

import { colors } from '../../../src/theme/tokens';

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerTintColor: colors.textStrong,
        headerStyle: { backgroundColor: colors.canvas },
        headerShadowVisible: false,
        tabBarActiveTintColor: colors.brandStrong,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: {
          height: 74,
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
        },
        tabBarLabelStyle: { fontSize: 10, fontWeight: '700' },
      }}
    >
      <Tabs.Screen
        name="today"
        options={{
          title: 'Jobs',
          headerTitle: 'Today',
          tabBarIcon: ({ color, size }) => <Ionicons name="briefcase-outline" color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="map"
        options={{
          title: 'Map',
          headerTitle: 'Map',
          tabBarIcon: ({ color, size }) => <Ionicons name="map-outline" color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="me"
        options={{
          title: 'Me',
          tabBarIcon: ({ color, size }) => <Ionicons name="person-outline" color={color} size={size} />,
        }}
      />
    </Tabs>
  );
}
