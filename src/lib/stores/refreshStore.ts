import { writable } from "svelte/store";

export type RefreshState = {
  enabled: boolean;
  interval: number;
  lastRefresh: number | null;
};

const defaultState: RefreshState = {
  enabled: false,
  interval: 30,
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
