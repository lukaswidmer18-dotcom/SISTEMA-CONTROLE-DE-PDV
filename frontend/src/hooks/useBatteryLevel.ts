import { useEffect, useState } from 'react';

interface BatteryManager {
  level: number;
  addEventListener: (event: string, cb: () => void) => void;
}

type NavigatorWithBattery = Navigator & { getBattery?: () => Promise<BatteryManager> };

// Battery Status API: só existe em Chrome/Android. Preenche automaticamente quando
// disponível (e trava o campo, pra não digitarem por cima) — se não, o promotor
// informa manualmente antes de iniciar a jornada.
export function useBatteryLevel() {
  const [batteryLevel, setBatteryLevel] = useState('');
  const [autoDetected, setAutoDetected] = useState(false);

  useEffect(() => {
    const nav = navigator as NavigatorWithBattery;
    if (!nav.getBattery) return;
    nav.getBattery()
      .then((battery) => {
        setAutoDetected(true);
        setBatteryLevel(String(Math.round(battery.level * 100)));
        battery.addEventListener('levelchange', () => setBatteryLevel(String(Math.round(battery.level * 100))));
      })
      .catch(() => {});
  }, []);

  return [batteryLevel, setBatteryLevel, autoDetected] as const;
}
