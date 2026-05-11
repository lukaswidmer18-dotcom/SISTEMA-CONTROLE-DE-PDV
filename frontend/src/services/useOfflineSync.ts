import { useEffect, useState } from 'react';
import { syncOfflineQueue, getOfflinePendingCount } from './offlineQueue';

export function useOfflineSync(onSyncSuccess?: (synced: number) => void) {
  const [pendingCount, setPendingCount] = useState(0);
  const [syncing, setSyncing] = useState(false);

  async function refreshCount() {
    const count = await getOfflinePendingCount();
    setPendingCount(count);
  }

  async function triggerSync() {
    if (!navigator.onLine || syncing) return;
    setSyncing(true);
    try {
      const result = await syncOfflineQueue();
      if (result.synced > 0 && onSyncSuccess) {
        onSyncSuccess(result.synced);
      }
      await refreshCount();
    } catch (error) {
      console.error('Offline sync failed:', error);
    } finally {
      setSyncing(false);
    }
  }

  useEffect(() => {
    refreshCount();

    function handleOnline() {
      triggerSync();
    }

    function handleQueueUpdated() {
      refreshCount();
    }

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline-queue-updated', handleQueueUpdated);

    if (navigator.onLine) {
      triggerSync();
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline-queue-updated', handleQueueUpdated);
    };
  }, []);

  return { pendingCount, triggerSync, refreshCount };
}
