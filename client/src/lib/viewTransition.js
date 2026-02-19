export function navigateWithTransition(navigate, to, options) {
  const runNavigate = () => navigate(to, options);

  if (typeof document !== "undefined" && "startViewTransition" in document) {
    document.startViewTransition(runNavigate);
    return;
  }

  runNavigate();
}
