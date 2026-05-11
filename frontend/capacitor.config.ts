import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.grupopluma.pdv',
  appName: 'Grupo Pluma PDV',
  webDir: 'dist',
  android: {
    // Permite chamadas HTTP (não HTTPS) ao backend na rede local
    allowMixedContent: true,
  },
};

export default config;
