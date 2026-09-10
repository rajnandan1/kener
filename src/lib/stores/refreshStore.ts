import { writable } from "svelte/store";
import type { RefreshState } from "$lib/client/types/refresh";

export const DEFAULT_REFRESH_INTERVAL = 60;
export const MIN_REFRESH_INTERVAL = 5;
export const MAX_REFRESH_INTERVAL = 86400;

const defaultState: RefreshState = {
  enabled: false,
  interval: DEFAULT_REFRESH_INTERVAL,
  lastRefresh: null
};

function createRefreshStore() {
  const { subscribe, set, update } = writable<RefreshState>(defaultState);

  return {
    subscribe,

    toggle: () =>
      update((state) => ({
        ...state,
        enabled: !state.enabled
      })),

    setInterval: (interval: number) =>
      update((state) => ({
        ...state,
        interval
      })),

    updateLastRefresh: () =>
      update((state) => ({
        ...state,
        lastRefresh: Date.now()
      })),

    setState: (newState: RefreshState) => set(newState),

    reset: () => set(defaultState)
  };
}

export const refreshStore = createRefreshStore();
