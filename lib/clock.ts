/** The wall clock, read only from event handlers and timers — never during render. */
export const nowMs = () => Date.now();
