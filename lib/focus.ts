/** After the view changes (route change, onboarding swapping to Today, or moving to
 *  the next exercise card), start at the top and put focus on the *new* heading so
 *  keyboard and screen-reader users know the content changed.
 *
 *  Two things it must never do:
 *  - grab the OLD heading while the swap is still happening, and
 *  - steal focus from someone who has already started using the new page
 *    (a slow device can take a few frames to render the new heading).
 *  Focus on the header navigation doesn't count as "already using the page":
 *  someone who just clicked a nav link should land on the new heading.
 *
 *  `waitForNewHeading`: when the view swaps inside one route (onboarding → Today)
 *  the old heading is still on screen when this is called, so wait for a different
 *  one. After a route change the new page has already rendered, so any heading
 *  present is the new page's.
 *
 *  `force`: for moving between cards inside one page — the person just pressed a
 *  button in the page, which would otherwise count as "already using it". */
export function focusPageHeading(waitForNewHeading = true, force = false) {
  const before = waitForNewHeading ? document.querySelector<HTMLElement>("main h1") : null;
  let tries = 0;
  const tick = () => {
    const h1 = document.querySelector<HTMLElement>("main h1");
    if (h1 && h1 !== before) {
      const active = document.activeElement;
      const alreadyInPage =
        !force && active instanceof HTMLElement && active !== document.body && document.contains(active) && !!active.closest("main");
      if (!alreadyInPage) {
        h1.setAttribute("tabindex", "-1");
        h1.focus({ preventScroll: true });
        window.scrollTo({ top: 0 });
      }
      return;
    }
    if (++tries < 90) requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}
