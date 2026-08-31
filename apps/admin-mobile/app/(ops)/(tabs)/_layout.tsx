import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';

import { colors } from '../../../src/theme/tokens';

export default function OpsTabsLayout() {
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
        name="inbox"
        options={{
          title: 'Inbox',
          headerTitle: 'Inbox',
          tabBarIcon: ({ color, size }) => <Ionicons name="call-outline" color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="board"
        options={{
          title: 'Jobs',
          headerTitle: 'Jobs',
          tabBarIcon: ({ color, size }) => <Ionicons name="list-outline" color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="people"
        options={{
          title: 'People',
          headerTitle: 'People',
          tabBarIcon: ({ color, size }) => <Ionicons name="people-outline" color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="more"
        options={{
          title: 'More',
          headerTitle: 'More',
          tabBarIcon: ({ color, size }) => <Ionicons name="ellipsis-horizontal" color={color} size={size} />,
        }}
      />
    </Tabs>
  );
}
