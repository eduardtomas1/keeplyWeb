import { createScrollAnimator } from "./scroll-animate.js";

const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const DUPLICATE_RATE = 0.1;
const AVG_PHOTO_MB = 3.5;
const DEMO_BASE_PHOTOS = 12000;

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

const demoPhone = document.querySelector("[data-demo-phone]");
if (demoPhone) {
  const photos = demoPhone.querySelectorAll(".demo-photo");
  const scanBar = demoPhone.querySelector("[data-scan-bar]");
  const scanText = demoPhone.querySelector("[data-scan-text]");
  const resultsPanel = demoPhone.querySelector("[data-results-panel]");
  const cleanBtn = demoPhone.querySelector("[data-demo-clean]");
  const rescanBtn = demoPhone.querySelector("[data-demo-rescan]");

  let isScanning = false;
  let isClean = false;

  const runScanAnimation = () => {
    if (isScanning) return;
    isScanning = true;
    isClean = false;

    photos.forEach((photo) => {
      photo.classList.remove("scanned", "removing");
      photo.style.display = "";
    });
    resultsPanel?.classList.remove("visible");
    scanBar?.classList.remove("complete");
    if (scanBar) scanBar.style.width = "0%";
    if (scanText) scanText.textContent = "Scanning...";
    if (cleanBtn) cleanBtn.disabled = true;

    let scanned = 0;
    const totalPhotos = photos.length;

    const scanNext = () => {
      if (scanned >= totalPhotos) {
        if (scanBar) scanBar.classList.add("complete");
        if (scanText) scanText.textContent = "Complete";
        resultsPanel?.classList.add("visible");
        if (cleanBtn) cleanBtn.disabled = false;
        isScanning = false;
        track("demo_interaction", { type: "scan_complete" });
        return;
      }

      const photo = photos[scanned];
      photo.classList.add("scanning");

      setTimeout(() => {
        photo.classList.remove("scanning");
        photo.classList.add("scanned");
        scanned++;

        const progress = (scanned / totalPhotos) * 100;
        if (scanBar) scanBar.style.width = `${progress}%`;

        setTimeout(scanNext, prefersReducedMotion ? 50 : 150);
      }, prefersReducedMotion ? 50 : 200);
    };

    setTimeout(scanNext, 300);
  };

  const runCleanAnimation = () => {
    if (isClean || isScanning) return;
    isClean = true;

    const duplicates = demoPhone.querySelectorAll('.demo-photo[data-type="duplicate"]');
    const qualityIssues = demoPhone.querySelectorAll('.demo-photo[data-type="blur"], .demo-photo[data-type="dark"]');

    let removed = 0;
    const toRemove = [...duplicates, ...qualityIssues];

    toRemove.forEach((photo, index) => {
      setTimeout(() => {
        photo.classList.add("removing");
        removed++;

        if (removed === toRemove.length) {
          setTimeout(() => {
            toRemove.forEach((p) => (p.style.display = "none"));
            track("demo_interaction", { type: "cleanup_complete" });
          }, 300);
        }
      }, index * (prefersReducedMotion ? 50 : 100));
    });
  };

  cleanBtn?.addEventListener("click", runCleanAnimation);
  rescanBtn?.addEventListener("click", () => {
    isClean = false;
    runScanAnimation();
  });

  const demoObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting && !isScanning) {
          setTimeout(runScanAnimation, 500);
          demoObserver.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.3 }
  );

  demoObserver.observe(demoPhone);
}

const demoSliders = document.querySelectorAll("[data-demo-slider]");
const statElements = {
  review: document.querySelector("[data-stat='review']"),
  delete: document.querySelector("[data-stat='delete']"),
  storage: document.querySelector("[data-stat='storage']"),
};
const statBars = {
  review: document.querySelector("[data-stat-bar='review']"),
  delete: document.querySelector("[data-stat-bar='delete']"),
  storage: document.querySelector("[data-stat-bar='storage']"),
};
const sliderValues = {
  photos: document.querySelector("[data-slider-value='photos']"),
  "duplicate-rate": document.querySelector("[data-slider-value='duplicate-rate']"),
  "quality-rate": document.querySelector("[data-slider-value='quality-rate']"),
};

const updateDemoStats = () => {
  const photosSlider = document.querySelector("[data-demo-slider='photos']");
  const dupRateSlider = document.querySelector("[data-demo-slider='duplicate-rate']");
  const qualityRateSlider = document.querySelector("[data-demo-slider='quality-rate']");

  if (!photosSlider || !dupRateSlider || !qualityRateSlider) return;

  const totalPhotos = Number(photosSlider.value);
  const dupRate = Number(dupRateSlider.value) / 100;
  const qualityRate = Number(qualityRateSlider.value) / 100;

  const duplicates = Math.round(totalPhotos * dupRate);
  const qualityIssues = Math.round(totalPhotos * qualityRate);
  const toReview = duplicates + qualityIssues;
  const safeToDelete = Math.round(duplicates * 0.8 + qualityIssues * 0.6);
  const storageSaved = (safeToDelete * AVG_PHOTO_MB) / 1024;

  const reviewPercent = Math.min((toReview / totalPhotos) * 100, 100);
  const deletePercent = Math.min((safeToDelete / totalPhotos) * 100, 100);
  const storagePercent = Math.min(storageSaved * 2, 100);

  if (sliderValues.photos) sliderValues.photos.textContent = totalPhotos.toLocaleString();
  if (sliderValues["duplicate-rate"]) sliderValues["duplicate-rate"].textContent = `${Math.round(dupRate * 100)}%`;
  if (sliderValues["quality-rate"]) sliderValues["quality-rate"].textContent = `${Math.round(qualityRate * 100)}%`;

  if (statElements.review) statElements.review.textContent = toReview.toLocaleString();
  if (statElements.delete) statElements.delete.textContent = safeToDelete.toLocaleString();
  if (statElements.storage) statElements.storage.textContent = `${storageSaved.toFixed(1)} GB`;

  if (statBars.review) statBars.review.style.setProperty("--percent", `${reviewPercent}%`);
  if (statBars.delete) statBars.delete.style.setProperty("--percent", `${deletePercent}%`);
  if (statBars.storage) statBars.storage.style.setProperty("--percent", `${storagePercent}%`);
};

demoSliders.forEach((slider) => {
  slider.addEventListener("input", () => {
    updateDemoStats();
    track("demo_interaction", { type: "slider", slider: slider.dataset.demoSlider });
  });
});

updateDemoStats();

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
