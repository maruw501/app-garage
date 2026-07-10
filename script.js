(function () {
  "use strict";

  const config = window.SITE_CONFIG || {
    siteName: "APP GARAGE",
    contactEmail: "",
    contactSubject: "お問い合わせ",
  };
  const apps = Array.isArray(window.APPS) ? window.APPS : [];
  const categories = Array.isArray(window.APP_CATEGORIES)
    ? window.APP_CATEGORIES
    : [{ id: "all", label: "すべて" }];

  const state = {
    category: "all",
    query: "",
    lastFocus: null,
  };

  const $ = (selector) => document.querySelector(selector);
  const $$ = (selector) => Array.from(document.querySelectorAll(selector));

  document.addEventListener("DOMContentLoaded", init);

  function init() {
    applySiteConfig();
    renderCategoryTabs();
    renderApps();
    bindSearch();
    bindModalEvents();
    setupRevealAnimation();
  }

  function applySiteConfig() {
    const siteName = config.siteName || "APP GARAGE";
    $$("[data-site-name]").forEach((element) => {
      element.textContent = siteName;
    });
    document.title = `${siteName} | オリジナルWebアプリ集`;

    const appCount = $("#appCount");
    if (appCount) {
      appCount.textContent = String(apps.length);
    }

    const year = $("#copyrightYear");
    if (year) {
      year.textContent = String(new Date().getFullYear());
    }

    const contactLink = $("[data-contact-link]");
    if (contactLink) {
      const email = (config.contactEmail || "").trim();
      const subject = encodeURIComponent(config.contactSubject || "お問い合わせ");
      contactLink.href = email ? `mailto:${email}?subject=${subject}` : "#";
      if (!email) {
        contactLink.setAttribute("aria-disabled", "true");
        contactLink.classList.add("is-disabled");
        contactLink.addEventListener("click", (event) => event.preventDefault());
      }
    }
  }

  function bindSearch() {
    const searchInput = $("#appSearch");
    if (!searchInput) return;
    searchInput.addEventListener("input", (event) => {
      state.query = event.target.value.trim().toLowerCase();
      renderApps();
    });
  }

  function renderCategoryTabs() {
    const tabs = $("#categoryTabs");
    if (!tabs) return;
    tabs.innerHTML = "";

    categories.forEach((category) => {
      const button = document.createElement("button");
      button.type = "button";
      button.textContent = category.label;
      button.setAttribute("aria-pressed", String(category.id === state.category));
      button.addEventListener("click", () => {
        state.category = category.id;
        renderCategoryTabs();
        renderApps();
      });
      tabs.append(button);
    });
  }

  function renderApps() {
    const grid = $("#appGrid");
    const empty = $("#emptyState");
    if (!grid || !empty) return;

    const visibleApps = apps.filter(matchesCurrentFilter);
    grid.innerHTML = "";

    visibleApps.forEach((app) => {
      grid.append(createAppCard(app));
    });

    empty.hidden = visibleApps.length > 0;
  }

  function matchesCurrentFilter(app) {
    const categoryMatches = state.category === "all" || app.category === state.category;
    if (!categoryMatches) return false;
    if (!state.query) return true;

    const searchable = [
      app.title,
      app.categoryLabel,
      app.description,
      app.longDescription,
      ...(Array.isArray(app.tags) ? app.tags : []),
    ]
      .join(" ")
      .toLowerCase();

    return searchable.includes(state.query);
  }

  function createAppCard(app) {
    const article = document.createElement("article");
    article.className = "app-card reveal is-visible";

    const button = document.createElement("button");
    button.type = "button";
    button.className = "app-card-button";
    button.style.setProperty("--app-accent", app.accentColor || "#6dff9f");
    button.setAttribute("aria-label", `${app.title}の詳細を見る`);
    button.addEventListener("click", () => openModal(app));

    const top = document.createElement("div");
    top.className = "card-top";

    const icon = document.createElement("span");
    icon.className = "app-icon";
    icon.setAttribute("aria-hidden", "true");
    icon.textContent = app.icon || "APP";
    top.append(icon);

    const badges = document.createElement("div");
    badges.className = "tag-list";
    if (app.featured) {
      const featured = document.createElement("span");
      featured.className = "featured-badge";
      featured.textContent = "おすすめ";
      badges.append(featured);
    }
    const status = document.createElement("span");
    status.className = "card-status";
    status.textContent = app.status || "準備中";
    badges.append(status);
    top.append(badges);

    const category = document.createElement("p");
    category.className = "card-category";
    category.textContent = app.categoryLabel || "その他";

    const title = document.createElement("h3");
    title.className = "card-title";
    title.textContent = app.title || "名称未設定";

    const description = document.createElement("p");
    description.className = "card-description";
    description.textContent = app.description || "";

    const tags = document.createElement("div");
    tags.className = "tag-list";
    (app.tags || []).forEach((tag) => {
      const tagElement = document.createElement("span");
      tagElement.textContent = tag;
      tags.append(tagElement);
    });

    const detail = document.createElement("span");
    detail.className = "card-detail";
    detail.textContent = "詳細を見る";

    button.append(top, category, title, description, tags, detail);
    article.append(button);
    return article;
  }

  function openModal(app) {
    const modal = $("#appModal");
    if (!modal) return;

    state.lastFocus = document.activeElement;

    setText("#modalTitle", app.title || "名称未設定");
    setText("#modalCategory", app.categoryLabel || "その他");
    setText("#modalIcon", app.icon || "APP");
    setText("#modalStatus", app.status || "準備中");
    setText("#modalDescription", app.description || "");
    setText("#modalLongDescription", app.longDescription || "");

    const icon = $("#modalIcon");
    if (icon) {
      icon.style.color = app.accentColor || "#6dff9f";
      icon.style.borderColor = app.accentColor || "#6dff9f";
    }

    const tags = $("#modalTags");
    if (tags) {
      tags.innerHTML = "";
      (app.tags || []).forEach((tag) => {
        const tagElement = document.createElement("span");
        tagElement.textContent = tag;
        tags.append(tagElement);
      });
    }

    const openLink = $("#modalOpenLink");
    const url = (app.url || "").trim();
    if (openLink) {
      if (url) {
        openLink.href = url;
        openLink.textContent = "アプリを開く";
        openLink.classList.remove("is-disabled");
        openLink.removeAttribute("aria-disabled");
        openLink.removeAttribute("tabindex");
      } else {
        openLink.href = "#";
        openLink.textContent = "準備中";
        openLink.classList.add("is-disabled");
        openLink.setAttribute("aria-disabled", "true");
        openLink.setAttribute("tabindex", "-1");
      }
    }

    modal.hidden = false;
    modal.setAttribute("aria-hidden", "false");
    document.body.classList.add("modal-open");
    $(".modal-panel")?.focus();
  }

  function closeModal() {
    const modal = $("#appModal");
    if (!modal || modal.hidden) return;
    modal.hidden = true;
    modal.setAttribute("aria-hidden", "true");
    document.body.classList.remove("modal-open");

    if (state.lastFocus && typeof state.lastFocus.focus === "function") {
      state.lastFocus.focus();
    }
  }

  function bindModalEvents() {
    document.addEventListener("click", (event) => {
      if (event.target.closest("[data-modal-close]")) {
        closeModal();
      }

      const disabledLink = event.target.closest(".button.is-disabled");
      if (disabledLink) {
        event.preventDefault();
      }
    });

    document.addEventListener("keydown", (event) => {
      const modal = $("#appModal");
      if (!modal || modal.hidden) return;

      if (event.key === "Escape") {
        event.preventDefault();
        closeModal();
        return;
      }

      if (event.key === "Tab") {
        keepFocusInsideModal(event);
      }
    });
  }

  function keepFocusInsideModal(event) {
    const panel = $(".modal-panel");
    if (!panel) return;
    const focusable = Array.from(
      panel.querySelectorAll(
        'a[href]:not([tabindex="-1"]), button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])',
      ),
    );
    if (focusable.length === 0) return;

    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  function setupRevealAnimation() {
    const elements = $$(".reveal");
    if (!("IntersectionObserver" in window)) {
      elements.forEach((element) => element.classList.add("is-visible"));
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.14 },
    );

    elements.forEach((element) => observer.observe(element));
  }

  function setText(selector, value) {
    const element = $(selector);
    if (element) {
      element.textContent = value;
    }
  }
})();
