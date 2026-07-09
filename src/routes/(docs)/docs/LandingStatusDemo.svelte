<script lang="ts">
  import { onMount } from "svelte";

  type TickStatus = "up" | "degraded";

  interface Tick {
    id: number;
    status: TickStatus;
  }

  const WINDOW = 64;
  /** A degraded check still serves most requests; mirrors how Kener scores a degraded bucket. */
  const DEGRADED_VALUE = 97;
  /** Every CYCLE seconds the demo dips for two ticks, then recovers. */
  const CYCLE = 22;
  const DIP_AT = 14;

  let nextId = 0;

  function seedTicks(): Tick[] {
    // Seed with one healed dip mid-history so the bar tells its story at first paint.
    return Array.from({ length: WINDOW }, (_, i) => ({
      id: nextId++,
      status: i === 22 || i === 23 ? "degraded" : "up"
    }));
  }

  let ticks = $state<Tick[]>(seedTicks());
  let clock = $state(0);

  const isDegraded = $derived(ticks[ticks.length - 1]?.status === "degraded");
  const uptime = $derived(
    (ticks.reduce((sum, t) => sum + (t.status === "up" ? 100 : DEGRADED_VALUE), 0) / ticks.length).toFixed(3)
  );

  onMount(() => {
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (reduceMotion.matches) return; // static seeded bar, no live march

    let timer: ReturnType<typeof setInterval> | undefined;

    const tick = () => {
      clock += 1;
      const phase = clock % CYCLE;
      const status: TickStatus = phase === DIP_AT || phase === DIP_AT + 1 ? "degraded" : "up";
      ticks = [...ticks.slice(1), { id: nextId++, status }];
    };

    const start = () => {
      if (timer === undefined) timer = setInterval(tick, 1000);
    };
    const stop = () => {
      if (timer !== undefined) {
        clearInterval(timer);
        timer = undefined;
      }
    };

    // Run only while visible: on-screen and tab focused.
    const observer = new IntersectionObserver(
      ([entry]) => (entry.isIntersecting && !document.hidden ? start() : stop()),
      { threshold: 0.1 }
    );
    observer.observe(strip);

    const onVisibility = () => (document.hidden ? stop() : start());
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      stop();
      observer.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);
    };
  });

  let strip: HTMLElement;
</script>

<div class="demo-strip" bind:this={strip}>
  <div class="demo-head">
    <div class="demo-state" class:degraded={isDegraded}>
      <span class="demo-dot" aria-hidden="true"></span>
      <span class="demo-label">
        {isDegraded ? "Degraded performance" : "All systems operational"}
      </span>
    </div>
    <div class="demo-uptime">
      <span class="demo-uptime-value">{uptime}%</span>
      <span class="demo-uptime-meta">uptime</span>
    </div>
  </div>

  <div class="demo-bar" aria-hidden="true">
    {#each ticks as tick (tick.id)}
      <span class="demo-tick" class:degraded={tick.status === "degraded"}></span>
    {/each}
  </div>

  <div class="demo-meta" aria-hidden="true">
    <span>demo monitor &middot; HTTP</span>
    <span>last {WINDOW} checks</span>
  </div>
  <p class="sr-only">Demo of a Kener monitor: a rolling uptime bar that records a check every second.</p>
</div>

<style>
  .demo-strip {
    border: 1px solid color-mix(in oklch, var(--foreground) 10%, transparent);
    border-radius: calc(var(--radius) + 4px);
    background: var(--card);
    padding: 1.125rem 1.25rem 1rem;
  }

  .demo-head {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: 1rem;
    margin-bottom: 0.875rem;
  }

  .demo-state {
    display: inline-flex;
    align-items: center;
    gap: 0.625rem;
    min-width: 0;
  }

  .demo-dot {
    width: 0.5rem;
    height: 0.5rem;
    border-radius: 9999px;
    background: var(--demo-up);
    flex: none;
    transition: background 0.4s cubic-bezier(0.32, 0.72, 0, 1);
  }

  @media (prefers-reduced-motion: no-preference) {
    .demo-dot {
      animation: demoPing 2.4s cubic-bezier(0.32, 0.72, 0, 1) infinite;
    }
  }

  @keyframes demoPing {
    0% {
      box-shadow: 0 0 0 0 color-mix(in oklch, var(--demo-up) 45%, transparent);
    }
    70%,
    100% {
      box-shadow: 0 0 0 7px transparent;
    }
  }

  .demo-state.degraded .demo-dot {
    background: var(--primary);
    animation: none;
  }

  .demo-label {
    font-family: "Geist Mono", ui-monospace, monospace;
    font-size: 0.75rem;
    font-weight: 500;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: var(--foreground);
    white-space: nowrap;
  }

  @media (max-width: 520px) {
    .demo-head {
      flex-direction: column;
      align-items: flex-start;
      gap: 0.375rem;
    }
  }

  .demo-state.degraded .demo-label {
    color: var(--primary);
  }

  .demo-uptime {
    display: flex;
    align-items: baseline;
    gap: 0.375rem;
    flex: none;
  }

  .demo-uptime-value {
    font-family: "Geist Mono", ui-monospace, monospace;
    font-variant-numeric: tabular-nums;
    font-size: 0.9375rem;
    font-weight: 600;
    color: var(--foreground);
  }

  .demo-uptime-meta {
    font-size: 0.75rem;
    color: var(--muted-foreground);
  }

  .demo-bar {
    display: flex;
    gap: 3px;
    height: 2rem;
  }

  .demo-tick {
    flex: 1 1 0;
    min-width: 0;
    border-radius: 2px;
    background: var(--demo-up);
  }

  .demo-tick.degraded {
    background: var(--primary);
  }

  /* Newest tick announces itself, then settles. */
  @media (prefers-reduced-motion: no-preference) {
    .demo-tick:last-child {
      animation: tickIn 0.5s cubic-bezier(0.32, 0.72, 0, 1);
    }
  }

  @keyframes tickIn {
    from {
      transform: scaleY(0.4);
      opacity: 0.4;
    }
    to {
      transform: scaleY(1);
      opacity: 1;
    }
  }

  .demo-meta {
    display: flex;
    justify-content: space-between;
    gap: 1rem;
    margin-top: 0.75rem;
    font-family: "Geist Mono", ui-monospace, monospace;
    font-size: 0.6875rem;
    color: var(--muted-foreground);
  }

  /* Hide a third of the ticks on narrow screens so each tick keeps presence. */
  @media (max-width: 480px) {
    .demo-tick:nth-child(3n) {
      display: none;
    }
  }
</style>
