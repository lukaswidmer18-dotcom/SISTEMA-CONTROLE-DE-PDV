import { useEffect, useState } from 'react';

interface BatteryManager {
  level: number;
  addEventListener: (event: string, cb: () => void) => void;
}

type NavigatorWithBattery = Navigator & { getBattery?: () => Promise<BatteryManager> };

// Battery Status API: só existe em Chrome/Android. Preenche automaticamente quando
// disponível; se não, o promotor informa manualmente antes de iniciar a jornada.
export function useBatteryLevel() {
  const [batteryLevel, setBatteryLevel] = useState('');

  useEffect(() => {
    const nav = navigator as NavigatorWithBattery;
    if (!nav.getBattery) return;
    nav.getBattery()
      .then((battery) => {
        setBatteryLevel(String(Math.round(battery.level * 100)));
        battery.addEventListener('levelchange', () => setBatteryLevel(String(Math.round(battery.level * 100))));
      })
      .catch(() => {});
  }, []);

  return [batteryLevel, setBatteryLevel] as const;
}
