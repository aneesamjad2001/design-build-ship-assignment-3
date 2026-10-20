/** After the view changes (route change, or onboarding swapping to Today),
 *  start at the top and put focus on the new page's heading so keyboard and
 *  screen-reader users know the content changed. The heading may render a
 *  frame or two later (after storage is read), so wait for it briefly. */
export function focusPageHeading() {
  let tries = 0;
  const tick = () => {
    const h1 = document.querySelector<HTMLElement>("main h1");
    if (h1) {
      h1.setAttribute("tabindex", "-1");
      h1.focus({ preventScroll: true });
      window.scrollTo({ top: 0 });
      return;
    }
    if (++tries < 30) requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}
