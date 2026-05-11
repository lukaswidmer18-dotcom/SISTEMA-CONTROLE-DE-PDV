import React, { createContext, useContext, useEffect, useState } from 'react';
import { syncOfflineQueue, getOfflinePendingCount } from '../services/offlineQueue';

interface OfflineSyncContextType {
  pendingCount: number;
  syncing: boolean;
  lastSyncTime: number;
  triggerSync: () => Promise<void>;
  refreshCount: () => Promise<void>;
}

const OfflineSyncContext = createContext<OfflineSyncContextType | undefined>(undefined);

export function OfflineSyncProvider({ children, onSyncSuccess }: { children: React.ReactNode, onSyncSuccess?: (synced: number) => void }) {
  const [pendingCount, setPendingCount] = useState(0);
  const [syncing, setSyncing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState(0);

  async function refreshCount() {
    const count = await getOfflinePendingCount();
    setPendingCount(count);
  }

  async function triggerSync() {
    if (!navigator.onLine || syncing) return;
    setSyncing(true);
    try {
      const result = await syncOfflineQueue();
      if (result.synced > 0) {
        setLastSyncTime(Date.now());
        if (onSyncSuccess) onSyncSuccess(result.synced);
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

  return (
    <OfflineSyncContext.Provider value={{ pendingCount, syncing, lastSyncTime, triggerSync, refreshCount }}>
      {children}
    </OfflineSyncContext.Provider>
  );
}

export function useOfflineSyncContext() {
  const context = useContext(OfflineSyncContext);
  if (context === undefined) {
    throw new Error('useOfflineSyncContext must be used within an OfflineSyncProvider');
  }
  return context;
}
