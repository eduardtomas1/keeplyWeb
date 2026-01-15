export const createScrollAnimator = ({
  elements,
  prefersReducedMotion,
  options = { threshold: 0.15, rootMargin: "0px 0px -10% 0px" },
  onEnter,
}) => {
  if (!elements?.length) {
    return null;
  }

  if (prefersReducedMotion || typeof IntersectionObserver === "undefined") {
    elements.forEach((el) => onEnter?.(el));
    return null;
  }

  const observer = new IntersectionObserver((entries, obs) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        onEnter?.(entry.target);
        obs.unobserve(entry.target);
      }
    });
  }, options);

  elements.forEach((el) => observer.observe(el));
  return observer;
};
