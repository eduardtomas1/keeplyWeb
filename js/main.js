import { createScrollAnimator } from "./scroll-animate.js";

const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const track = (eventName, payload = {}) => {
  if (typeof window.plausible === "function") {
    window.plausible(eventName, { props: payload });
    return;
  }
  if (typeof window.gtag === "function") {
    window.gtag("event", eventName, payload);
    return;
  }
  if (Array.isArray(window.dataLayer)) {
    window.dataLayer.push({ event: eventName, ...payload });
  }
};

const enableThemeTransitions = () => {
  if (prefersReducedMotion) {
    return;
  }
  document.body.classList.add("theme-transition");
};

enableThemeTransitions();

const themeToggle = document.querySelector(".theme-toggle");
if (themeToggle) {
  const setToggleState = () => {
    const isDark = document.documentElement.getAttribute("data-theme") === "dark";
    themeToggle.setAttribute("aria-pressed", isDark.toString());
  };

  const toggleTheme = () => {
    const isDark = document.documentElement.getAttribute("data-theme") === "dark";
    if (isDark) {
      document.documentElement.removeAttribute("data-theme");
      localStorage.setItem("keeply-theme", "light");
    } else {
      document.documentElement.setAttribute("data-theme", "dark");
      localStorage.setItem("keeply-theme", "dark");
    }
    setToggleState();
  };

  themeToggle.addEventListener("click", toggleTheme);
  setToggleState();
}

const setStaggerIndexes = () => {
  document.querySelectorAll(".stagger-child").forEach((container) => {
    Array.from(container.children).forEach((child, index) => {
      child.style.setProperty("--stagger-index", index);
    });
  });
};

setStaggerIndexes();

const animateInElements = Array.from(document.querySelectorAll(".animate-in"));

createScrollAnimator({
  elements: animateInElements,
  prefersReducedMotion,
  onEnter: (el) => el.classList.add("is-visible"),
});

const stickyCta = document.querySelector(".sticky-cta");
const mobileCta = document.querySelector(".mobile-cta");
const heroSection = document.querySelector(".hero");

const toggleStickyCta = () => {
  if (!stickyCta || !heroSection) {
    return;
  }
  const heroBottom = heroSection.getBoundingClientRect().bottom;
  const shouldShow = heroBottom <= 0;
  stickyCta.classList.toggle("is-visible", shouldShow);
  stickyCta.setAttribute("aria-hidden", (!shouldShow).toString());
  if (mobileCta) {
    mobileCta.classList.toggle("is-visible", shouldShow);
    mobileCta.setAttribute("aria-hidden", (!shouldShow).toString());
  }
};

toggleStickyCta();
window.addEventListener("scroll", () => requestAnimationFrame(toggleStickyCta), {
  passive: true,
});

const featureCards = document.querySelectorAll(".feature-card");
featureCards.forEach((card) => {
  card.addEventListener("mouseenter", () => {
    if (card.dataset.hoverTracked) {
      return;
    }
    track("feature_card_hover", { feature: card.querySelector("h3")?.textContent || "" });
    card.dataset.hoverTracked = "true";
  });
});

const featureToggles = document.querySelectorAll(".feature-toggle");
featureToggles.forEach((toggle) => {
  toggle.addEventListener("click", () => {
    const targetId = toggle.getAttribute("aria-controls");
    if (!targetId) {
      return;
    }
    const target = document.getElementById(targetId);
    const isExpanded = toggle.getAttribute("aria-expanded") === "true";
    toggle.setAttribute("aria-expanded", (!isExpanded).toString());
    if (target) {
      target.hidden = isExpanded;
    }
  });
});

const faqItems = document.querySelectorAll(".faq-item");
faqItems.forEach((item) => {
  const button = item.querySelector(".faq-question");
  const answer = item.querySelector(".faq-answer");
  if (!button || !answer) {
    return;
  }
  button.addEventListener("click", () => {
    const isExpanded = button.getAttribute("aria-expanded") === "true";
    button.setAttribute("aria-expanded", (!isExpanded).toString());
    answer.setAttribute("aria-hidden", isExpanded.toString());
    answer.style.maxHeight = isExpanded ? "0px" : `${answer.scrollHeight}px`;
    track("faq_open", { question: button.textContent?.trim() || "" });
  });
});

if (!prefersReducedMotion) {
  window.addEventListener("resize", () => {
    faqItems.forEach((item) => {
      const button = item.querySelector(".faq-question");
      const answer = item.querySelector(".faq-answer");
      if (button?.getAttribute("aria-expanded") === "true" && answer) {
        answer.style.maxHeight = `${answer.scrollHeight}px`;
      }
    });
  });
}

const trackLinks = document.querySelectorAll("[data-track]");
trackLinks.forEach((link) => {
  link.addEventListener("click", () => {
    const eventName = link.dataset.track;
    if (eventName) {
      track(eventName, { label: link.textContent?.trim() || "" });
    }
  });
});

const waitlistForm = document.querySelector("[data-waitlist-form]");
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const subscribe = (email) =>
  new Promise((resolve) => {
    window.__keeplyEmails = window.__keeplyEmails || [];
    window.__keeplyEmails.push({ email, createdAt: Date.now() });
    setTimeout(resolve, 900);
  });

if (waitlistForm) {
  const emailInput = waitlistForm.querySelector("input[name='email']");
  const honeypotInput = waitlistForm.querySelector("input[name='company']");
  const button = waitlistForm.querySelector("button[type='submit']");
  const status = waitlistForm.querySelector(".form-status");

  const setStatus = (message, type) => {
    if (!status) {
      return;
    }
    status.textContent = message;
    status.className = `form-status ${type}`;
  };

  waitlistForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!emailInput || !button) {
      return;
    }

    track("form_submit");

    if (honeypotInput && honeypotInput.value) {
      setStatus("Thanks! You're on the list.", "success");
      track("form_success");
      return;
    }

    const emailValue = emailInput.value.trim();
    if (!emailPattern.test(emailValue)) {
      setStatus("Please enter a valid email.", "error");
      track("form_error", { reason: "invalid_email" });
      return;
    }

    button.disabled = true;
    button.textContent = "Joining...";
    setStatus("", "");

    try {
      await subscribe(emailValue);
      setStatus("You're on the list!", "success");
      waitlistForm.classList.add("is-success");
      button.textContent = "Joined";
      track("form_success");
    } catch (error) {
      setStatus("Something went wrong. Please try again.", "error");
      button.textContent = "Get early access";
      track("form_error", { reason: "network" });
    } finally {
      button.disabled = false;
    }
  });
}

const slider = document.querySelector("[data-slider]");
if (slider) {
  const range = slider.querySelector("input[type='range']");
  const handle = slider.querySelector(".slider-handle");

  const updateSlider = () => {
    if (!range) {
      return;
    }
    const value = Number(range.value);
    slider.style.setProperty("--position", value);
    if (handle) {
      handle.style.left = `${value}%`;
    }
  };

  range?.addEventListener("input", () => {
    updateSlider();
    track("demo_interaction", { type: "before_after" });
  });

  updateSlider();
}

const calculatorInput = document.getElementById("photo-count");
const duplicateOutput = document.querySelector("[data-output='duplicates']");
const storageOutput = document.querySelector("[data-output='storage']");

const animateNumber = (element, value, formatter) => {
  if (!element) {
    return;
  }
  if (prefersReducedMotion) {
    element.textContent = formatter(value);
    return;
  }
  const startValue = Number(element.dataset.currentValue || 0);
  const startTime = performance.now();
  const duration = 500;

  const step = (now) => {
    const progress = Math.min((now - startTime) / duration, 1);
    const current = startValue + (value - startValue) * progress;
    element.textContent = formatter(current);
    if (progress < 1) {
      requestAnimationFrame(step);
    } else {
      element.dataset.currentValue = value;
    }
  };

  requestAnimationFrame(step);
};

const updateCalculator = (shouldTrack = false) => {
  if (!calculatorInput) {
    return;
  }
  const photos = Number(calculatorInput.value || 0);
  const duplicates = Math.round(photos * 0.08);
  const savedGb = (duplicates * 3.5) / 1024;

  animateNumber(duplicateOutput, duplicates, (val) => Math.round(val).toLocaleString());
  animateNumber(storageOutput, savedGb, (val) => `${val.toFixed(1)} GB`);
  if (shouldTrack) {
    track("demo_interaction", { type: "calculator" });
  }
};

calculatorInput?.addEventListener("input", () => updateCalculator(true));
updateCalculator();

const metrics = document.querySelectorAll("[data-count]");
if (metrics.length) {
  const animateMetric = (el) => {
    const target = Number(el.dataset.count || 0);
    const duration = 1200;
    const start = performance.now();

    const formatMetric = (value) => {
      if (target === 10000) {
        return `${Math.round(value).toLocaleString()}+`;
      }
      if (target === 3000000) {
        return `${Math.round(value / 1000000)}M`;
      }
      if (target === 15) {
        return `${Math.round(value)}GB`;
      }
      if (target === 4.9) {
        return `${value.toFixed(1)}/5`;
      }
      return Math.round(value).toString();
    };

    if (prefersReducedMotion) {
      el.textContent = formatMetric(target);
      return;
    }

    const step = (now) => {
      const progress = Math.min((now - start) / duration, 1);
      const value = target * progress;
      el.textContent = formatMetric(value);
      if (progress < 1) {
        requestAnimationFrame(step);
      }
    };

    requestAnimationFrame(step);
  };

  if (!prefersReducedMotion) {
    const metricObserver = new IntersectionObserver(
      (entries, obs) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            animateMetric(entry.target);
            obs.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.5 }
    );
    metrics.forEach((el) => metricObserver.observe(el));
  } else {
    metrics.forEach((el) => animateMetric(el));
  }
}

const scrollDepths = [25, 50, 75, 100];
const recordedDepths = new Set();
const trackScrollDepth = () => {
  const scrollPosition = window.scrollY + window.innerHeight;
  const docHeight = document.documentElement.scrollHeight;
  const percent = Math.round((scrollPosition / docHeight) * 100);

  scrollDepths.forEach((depth) => {
    if (percent >= depth && !recordedDepths.has(depth)) {
      recordedDepths.add(depth);
      track("scroll_depth", { depth });
    }
  });
};

window.addEventListener("scroll", () => requestAnimationFrame(trackScrollDepth), {
  passive: true,
});
trackScrollDepth();
