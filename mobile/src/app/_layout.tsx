import { QueryClientProvider } from '@tanstack/react-query';
import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useState } from 'react';
import { useColorScheme, View } from 'react-native';

import { AvisoConexion } from '@/components/aviso-conexion';
import { Colors } from '@/constants/theme';
import { ProveedorAjustes } from '@/lib/ajustes';
import { ProveedorBusqueda } from '@/lib/busqueda';
import { crearClienteDeConsultas } from '@/lib/consultas';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const esquema = useColorScheme() === 'dark' ? 'dark' : 'light';
  const colores = Colors[esquema];
  const base = esquema === 'dark' ? DarkTheme : DefaultTheme;
  const tema = {
    ...base,
    colors: {
      ...base.colors,
      primary: colores.tint,
      background: colores.background,
      card: colores.background,
      text: colores.text,
      border: colores.border,
    },
  };

  // Un solo cliente de consultas para toda la app (caché compartida)
  const [cliente] = useState(crearClienteDeConsultas);

  useEffect(() => {
    SplashScreen.hideAsync();
  }, []);

  return (
    <QueryClientProvider client={cliente}>
      <ProveedorAjustes>
        <ProveedorBusqueda>
          <ThemeProvider value={tema}>
            <View style={{ flex: 1, backgroundColor: colores.background }}>
              <AvisoConexion />
              <Stack screenOptions={{ headerBackButtonDisplayMode: 'minimal', headerTintColor: colores.tint }}>
                <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
                <Stack.Screen name="libro/[id]" options={{ title: 'Detalles del libro' }} />
                <Stack.Screen name="lector/[id]" options={{ title: 'Lectura' }} />
                <Stack.Screen name="admin" options={{ title: 'Panel de administración' }} />
              </Stack>
            </View>
          </ThemeProvider>
        </ProveedorBusqueda>
      </ProveedorAjustes>
    </QueryClientProvider>
  );
}
