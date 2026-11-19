import { Tabs } from 'expo-router/js-tabs';

import { Icono } from '@/components/icono';
import { useTheme } from '@/hooks/use-theme';

/** Barra de navegación inferior: Inicio, Biblioteca y Ajustes. */
export default function TabsLayout() {
  const theme = useTheme();
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: theme.tint,
        tabBarInactiveTintColor: theme.textSecondary,
        tabBarStyle: { backgroundColor: theme.background, borderTopColor: theme.border },
        headerStyle: { backgroundColor: theme.background },
        headerTintColor: theme.text,
        headerShadowVisible: false,
        sceneStyle: { backgroundColor: theme.background },
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Inicio',
          headerTitle: 'Biblioteca Virtual Eclesiástica',
          tabBarIcon: ({ color, size }) => <Icono nombre="inicio" size={size} tinte={color} />,
        }}
      />
      <Tabs.Screen
        name="biblioteca"
        options={{
          title: 'Biblioteca',
          tabBarIcon: ({ color, size }) => <Icono nombre="biblioteca" size={size} tinte={color} />,
        }}
      />
      <Tabs.Screen
        name="ajustes"
        options={{
          title: 'Ajustes',
          tabBarIcon: ({ color, size }) => <Icono nombre="ajustes" size={size} tinte={color} />,
        }}
      />
    </Tabs>
  );
}
