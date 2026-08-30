(() => {
  "use strict";

  const root = document.documentElement;
  root.classList.add("js");

  const navToggle = document.querySelector(".nav-toggle");
  const primaryNav = document.querySelector("#primary-nav");

  const closeNavigation = () => {
    if (!navToggle || !primaryNav) return;
    navToggle.setAttribute("aria-expanded", "false");
    navToggle.querySelector(".sr-only").textContent = "메뉴 열기";
    primaryNav.classList.remove("is-open");
  };

  const openNavigation = () => {
    if (!navToggle || !primaryNav) return;
    navToggle.setAttribute("aria-expanded", "true");
    navToggle.querySelector(".sr-only").textContent = "메뉴 닫기";
    primaryNav.classList.add("is-open");
  };

  if (navToggle && primaryNav) {
    navToggle.addEventListener("click", () => {
      const isOpen = navToggle.getAttribute("aria-expanded") === "true";
      if (isOpen) {
        closeNavigation();
      } else {
        openNavigation();
      }
    });

    primaryNav.querySelectorAll("a").forEach((link) => {
      link.addEventListener("click", closeNavigation);
    });

    document.addEventListener("click", (event) => {
      if (!primaryNav.classList.contains("is-open")) return;
      const target = event.target;
      if (target instanceof Node && !primaryNav.contains(target) && !navToggle.contains(target)) {
        closeNavigation();
      }
    });

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape") {
        closeNavigation();
        navToggle.focus();
      }
    });
  }

  const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
  const revealItems = [...document.querySelectorAll("[data-reveal]")];

  const showRevealItems = () => {
    revealItems.forEach((item) => item.classList.add("is-visible"));
  };

  if (motionQuery.matches || !("IntersectionObserver" in window)) {
    showRevealItems();
  } else {
    const revealObserver = new IntersectionObserver(
      (entries, observer) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        });
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0.08 },
    );

    revealItems.forEach((item) => revealObserver.observe(item));
  }

  const handleMotionPreferenceChange = () => {
    if (motionQuery.matches) showRevealItems();
  };

  if (typeof motionQuery.addEventListener === "function") {
    motionQuery.addEventListener("change", handleMotionPreferenceChange);
  } else if (typeof motionQuery.addListener === "function") {
    motionQuery.addListener(handleMotionPreferenceChange);
  }

  const filterButtons = [...document.querySelectorAll("[data-filter-button]")];
  const releaseCards = [...document.querySelectorAll("[data-release-card]")];
  const filterStatus = document.querySelector("[data-filter-status]");
  const emptyState = document.querySelector("[data-release-empty]");

  const applyReleaseFilter = (filter) => {
    let visibleCount = 0;

    releaseCards.forEach((card) => {
      const types = (card.dataset.releaseTypes || "").split(" ");
      const shouldShow = filter === "all" || types.includes(filter);
      card.hidden = !shouldShow;
      if (shouldShow) visibleCount += 1;
    });

    filterButtons.forEach((button) => {
      const isActive = button.dataset.filterButton === filter;
      button.classList.toggle("is-active", isActive);
      button.setAttribute("aria-pressed", String(isActive));
    });

    if (filterStatus) {
      filterStatus.textContent = `${visibleCount}개의 공개 릴리즈`;
    }

    if (emptyState) {
      emptyState.hidden = visibleCount !== 0;
    }
  };

  filterButtons.forEach((button) => {
    button.addEventListener("click", () => {
      applyReleaseFilter(button.dataset.filterButton || "all");
    });
  });

  const resetFilter = document.querySelector("[data-reset-filter]");
  if (resetFilter) {
    resetFilter.addEventListener("click", () => applyReleaseFilter("all"));
  }
})();
