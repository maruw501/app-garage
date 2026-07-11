(function () {
  "use strict";

  const config = window.SITE_CONFIG || {};
  const apps = Array.isArray(window.APPS) ? window.APPS.filter((app) => app.published !== false) : [];
  const typeFilters = Array.isArray(window.TYPE_FILTERS) ? window.TYPE_FILTERS : [{ id: "all", label: "すべて" }];
  const categoryFilters = Array.isArray(window.CATEGORY_FILTERS)
    ? window.CATEGORY_FILTERS
    : [{ id: "all", label: "すべてのカテゴリ" }];

  const state = {
    type: "all",
    category: "all",
    query: "",
    lastFocus: null,
  };

  const $ = (selector) => document.querySelector(selector);
  const $$ = (selector) => Array.from(document.querySelectorAll(selector));

  document.addEventListener("DOMContentLoaded", init);

  function init() {
    applySiteConfig();
    renderFeaturedSections();
    renderFilterTabs();
    renderCatalog();
    bindSearch();
    bindModalEvents();
    setupRevealAnimation();
  }

  function applySiteConfig() {
    const siteName = config.siteName || "APP GARAGE";
    $$("[data-site-name]").forEach((element) => {
      element.textContent = siteName;
    });

    const year = $("#copyrightYear");
    if (year) year.textContent = String(new Date().getFullYear());

    const publishedFreeCount = apps.filter((app) => app.type === "free" && hasUsableUrl(app)).length;
    const freeCount = $("[data-free-app-count]");
    const freeStatus = $("[data-free-app-status]");
    if (freeCount) freeCount.textContent = publishedFreeCount > 0 ? `${publishedFreeCount}個` : "3個";
    if (freeStatus) freeStatus.textContent = publishedFreeCount > 0 ? "公開中" : "公開予定";

    const contactLink = $("[data-contact-link]");
    if (contactLink) {
      contactLink.href = buildMailto();
    }
  }

  function buildMailto() {
    const email = config.contactEmail || "maruw@outlook.jp";
    const subject = encodeURIComponent(config.contactSubject || "アプリ開発についての相談");
    const body = encodeURIComponent((config.contactBodyItems || []).join("\n"));
    return `mailto:${email}?subject=${subject}&body=${body}`;
  }

  function renderFeaturedSections() {
    renderSection("#freeAppGrid", apps.filter((app) => app.type === "free"), {
      cardMode: "spotlight",
    });
    renderSection("#developmentGrid", apps.filter((app) => app.type === "development"), {
      cardMode: "development",
    });
    renderSection("#caseStudyGrid", apps.filter((app) => app.type === "case-study"), {
      cardMode: "case-study",
    });
  }

  function renderSection(selector, list, options) {
    const container = $(selector);
    if (!container) return;
    container.innerHTML = "";
    list.forEach((app) => container.append(createAppCard(app, options)));
  }

  function bindSearch() {
    const searchInput = $("#appSearch");
    if (!searchInput) return;
    searchInput.addEventListener("input", (event) => {
      state.query = event.target.value.trim().toLowerCase();
      renderCatalog();
    });
  }

  function renderFilterTabs() {
    renderTabs("#typeTabs", typeFilters, state.type, (id) => {
      state.type = id;
      renderFilterTabs();
      renderCatalog();
    });

    renderTabs("#categoryTabs", categoryFilters, state.category, (id) => {
      state.category = id;
      renderFilterTabs();
      renderCatalog();
    });
  }

  function renderTabs(selector, filters, activeId, onSelect) {
    const tabs = $(selector);
    if (!tabs) return;
    tabs.innerHTML = "";
    filters.forEach((filter) => {
      const button = document.createElement("button");
      button.type = "button";
      button.textContent = filter.label;
      button.setAttribute("aria-pressed", String(filter.id === activeId));
      button.addEventListener("click", () => onSelect(filter.id));
      tabs.append(button);
    });
  }

  function renderCatalog() {
    const grid = $("#appGrid");
    const empty = $("#emptyState");
    if (!grid || !empty) return;

    const visibleApps = apps.filter(matchesCurrentFilter);
    grid.innerHTML = "";
    visibleApps.forEach((app) => grid.append(createAppCard(app, { cardMode: "catalog" })));
    empty.hidden = visibleApps.length > 0;
  }

  function matchesCurrentFilter(app) {
    if (state.type !== "all" && app.type !== state.type) return false;
    if (state.category !== "all" && app.category !== state.category && !(app.tags || []).includes(state.category)) {
      return false;
    }
    if (!state.query) return true;

    const searchable = [
      app.title,
      app.catchCopy,
      app.category,
      app.description,
      app.longDescription,
      ...(app.features || []),
      ...(app.usage || []),
      ...(app.tags || []),
    ]
      .join(" ")
      .toLowerCase();
    return searchable.includes(state.query);
  }

  function createAppCard(app, options = {}) {
    const article = document.createElement("article");
    article.className = `app-card reveal is-visible type-${app.type || "case-study"}`;
    if (app.featured && app.type === "free") article.classList.add("is-featured");

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
    icon.textContent = app.icon || "AG";
    top.append(icon);

    const badges = document.createElement("div");
    badges.className = "badge-list";
    if (app.label) badges.append(createBadge(app.label, "badge-soft"));
    if (app.type === "free") badges.append(createBadge("FREE", "badge-free"));
    if (app.type === "development") badges.append(createBadge("開発中", "badge-dev"));
    if (app.type === "case-study") badges.append(createBadge("開発事例", "badge-case"));
    badges.append(createBadge(app.status || "開発事例", "card-status"));
    top.append(badges);

    const category = document.createElement("p");
    category.className = "card-category";
    category.textContent = app.category || "その他";

    const title = document.createElement("h3");
    title.className = "card-title";
    title.textContent = app.title || "名称未設定";

    const catchCopy = document.createElement("p");
    catchCopy.className = "card-catch";
    catchCopy.textContent = app.catchCopy || "";
    catchCopy.hidden = !app.catchCopy;

    const description = document.createElement("p");
    description.className = "card-description";
    description.textContent = app.description || "詳細準備中";

    const tags = document.createElement("div");
    tags.className = "tag-list";
    (app.tags || []).slice(0, options.cardMode === "spotlight" ? 6 : 4).forEach((tag) => {
      const tagElement = document.createElement("span");
      tagElement.textContent = tag;
      tags.append(tagElement);
    });

    const action = document.createElement("span");
    action.className = `card-detail ${app.type === "free" && hasUsableUrl(app) ? "is-openable" : ""}`;
    action.textContent = getCardActionLabel(app);

    button.append(top, category, title, catchCopy, description);
    if (app.features?.length && options.cardMode === "spotlight" && app.type === "free") {
      button.append(createFeatureList(app.features.slice(0, 6)));
    }
    button.append(tags, action);
    article.append(button);
    return article;
  }

  function createBadge(text, className) {
    const badge = document.createElement("span");
    badge.className = className;
    badge.textContent = text;
    return badge;
  }

  function createFeatureList(features) {
    const list = document.createElement("ul");
    list.className = "mini-feature-list";
    features.forEach((feature) => {
      const item = document.createElement("li");
      item.textContent = feature;
      list.append(item);
    });
    return list;
  }

  function getCardActionLabel(app) {
    if (app.type === "free") return hasUsableUrl(app) ? "無料で使う" : "近日公開";
    if (app.type === "development") return app.progress || "開発中";
    return "開発事例";
  }

  function hasUsableUrl(app) {
    const url = (app.url || "").trim();
    return Boolean(url && url !== "#");
  }

  function openModal(app) {
    const modal = $("#appModal");
    if (!modal) return;
    state.lastFocus = document.activeElement;

    setText("#modalTitle", app.title || "名称未設定");
    setText("#modalCategory", app.category || "その他");
    setText("#modalIcon", app.icon || "AG");
    setText("#modalStatus", app.status || "開発事例");
    setText("#modalDescription", app.description || "詳細準備中");
    setText("#modalLongDescription", app.longDescription || "詳細準備中");

    const icon = $("#modalIcon");
    if (icon) {
      icon.style.color = app.accentColor || "#6dff9f";
      icon.style.borderColor = app.accentColor || "#6dff9f";
    }

    renderModalDetails(app);
    renderModalUsage(app);
    renderModalTags(app);
    configureModalLink(app);

    const caseNote = $("#caseNote");
    if (caseNote) caseNote.hidden = app.type !== "case-study";

    modal.hidden = false;
    modal.setAttribute("aria-hidden", "false");
    document.body.classList.add("modal-open");
    $(".modal-panel")?.focus();
  }

  function renderModalDetails(app) {
    const details = $("#modalDetails");
    if (!details) return;
    details.innerHTML = "";
    const rows = [
      ["解決したかった課題", app.longDescription || "詳細準備中"],
      ["主な機能", app.features?.length ? app.features.join(" / ") : "詳細準備中"],
      ["利用する人", app.targetUsers || "詳細準備中"],
      ["対応端末", app.devices || "スマートフォン / パソコン"],
      ["公開状態", app.status || "開発事例"],
    ];
    rows.forEach(([term, value]) => {
      const item = document.createElement("div");
      const dt = document.createElement("dt");
      const dd = document.createElement("dd");
      dt.textContent = term;
      dd.textContent = value;
      item.append(dt, dd);
      details.append(item);
    });
  }

  function renderModalUsage(app) {
    const usage = $("#modalUsage");
    const terms = $("#modalFreeTerms");
    const isFreeApp = app.type === "free";

    if (terms) terms.hidden = !isFreeApp;
    if (!usage) return;

    usage.innerHTML = "";
    usage.hidden = !isFreeApp;
    if (!isFreeApp) return;

    const title = document.createElement("h3");
    title.textContent = "使い方";

    const lead = document.createElement("p");
    lead.textContent = "直感的に使えるようにしています。基本は画面の案内に沿って進めれば利用できます。";

    const steps = Array.isArray(app.usage) && app.usage.length ? app.usage : ["アプリを開き、画面の案内に沿って入力します。"];
    const list = document.createElement("ol");
    steps.forEach((step) => {
      const item = document.createElement("li");
      item.textContent = step;
      list.append(item);
    });

    usage.append(title, lead, list);
  }

  function renderModalTags(app) {
    const tags = $("#modalTags");
    if (!tags) return;
    tags.innerHTML = "";
    (app.tags || []).forEach((tag) => {
      const tagElement = document.createElement("span");
      tagElement.textContent = tag;
      tags.append(tagElement);
    });
  }

  function configureModalLink(app) {
    const openLink = $("#modalOpenLink");
    if (!openLink) return;
    const canOpen = app.type === "free" && hasUsableUrl(app);
    openLink.hidden = !canOpen;
    if (canOpen) {
      openLink.href = app.url.trim();
      openLink.textContent = "アプリを開く（無料）";
    } else {
      openLink.href = "#";
    }
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
      if (event.target.closest("[data-modal-close]")) closeModal();
    });

    document.addEventListener("keydown", (event) => {
      const modal = $("#appModal");
      if (!modal || modal.hidden) return;
      if (event.key === "Escape") {
        event.preventDefault();
        closeModal();
      }
      if (event.key === "Tab") keepFocusInsideModal(event);
    });
  }

  function keepFocusInsideModal(event) {
    const panel = $(".modal-panel");
    if (!panel) return;
    const focusable = Array.from(
      panel.querySelectorAll(
        'a[href]:not([hidden]), button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])',
      ),
    ).filter((element) => !element.hidden);
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
      { threshold: 0.12 },
    );

    elements.forEach((element) => observer.observe(element));
  }

  function setText(selector, value) {
    const element = $(selector);
    if (element) element.textContent = value;
  }
})();
