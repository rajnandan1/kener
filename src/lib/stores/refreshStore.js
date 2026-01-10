import { writable } from 'svelte/store';

// Store for global refresh configuration
function createRefreshStore() {
  const { subscribe, set, update } = writable({
    enabled: false,
    interval: 60, // seconds
    lastRefresh: null
  });

  return {
    subscribe,
    enable: () => update(state => ({ ...state, enabled: true })),
    disable: () => update(state => ({ ...state, enabled: false })),
    toggle: () => update(state => ({ ...state, enabled: !state.enabled })),
    setInterval: (interval) => update(state => ({ ...state, interval })),
    updateLastRefresh: () => update(state => ({ ...state, lastRefresh: Date.now() })),
    setState: (newState) => set(newState)
  };
}

export const refreshStore = createRefreshStore();
