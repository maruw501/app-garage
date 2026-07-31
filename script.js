(function () {
  "use strict";

  const config = window.SITE_CONFIG || {};
  const apps = Array.isArray(window.APPS) ? window.APPS.filter((app) => app.published !== false) : [];

  const state = {
    lastFocus: null,
  };

  const $ = (selector) => document.querySelector(selector);
  const $$ = (selector) => Array.from(document.querySelectorAll(selector));

  document.addEventListener("DOMContentLoaded", init);

  function init() {
    applySiteConfig();
    renderFeaturedSections();
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
    if (freeCount) freeCount.textContent = publishedFreeCount > 0 ? `${publishedFreeCount}本` : "3本";
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
    const section = container.closest(".apps-section");
    if (section) section.hidden = list.length === 0;
    container.innerHTML = "";
    list.forEach((app) => container.append(createAppCard(app, options)));
  }

  function createAppCard(app, options = {}) {
    const article = document.createElement("article");
    article.className = `app-card reveal is-visible type-${app.type || "case-study"}`;
    if (app.featured && app.type === "free") article.classList.add("is-featured");

    const isFreeApp = app.type === "free";
    const cardControl = document.createElement(isFreeApp ? "div" : "button");
    cardControl.className = `app-card-button${isFreeApp ? " app-card-surface" : ""}`;
    cardControl.style.setProperty("--app-accent", app.accentColor || "#6dff9f");
    if (isFreeApp) {
      cardControl.setAttribute("aria-labelledby", `app-title-${app.id}`);
    } else {
      cardControl.type = "button";
      cardControl.setAttribute("aria-label", `${app.title}の詳細を見る`);
      cardControl.addEventListener("click", () => openModal(app));
    }

    const top = document.createElement("div");
    top.className = "card-top";

    const icon = document.createElement("span");
    icon.className = "app-icon";
    icon.setAttribute("aria-hidden", "true");
    icon.textContent = app.icon || "AG";
    top.append(icon);

    const badges = document.createElement("div");
    badges.className = "badge-list";
    let typeLabel = "";
    if (app.label) badges.append(createBadge(app.label, "badge-soft"));
    if (app.type === "free") {
      typeLabel = "FREE";
      badges.append(createBadge(typeLabel, "badge-free"));
    }
    if (app.type === "development") {
      typeLabel = "開発中";
      badges.append(createBadge(typeLabel, "badge-dev"));
    }
    if (app.type === "case-study") {
      typeLabel = "開発事例";
      badges.append(createBadge(typeLabel, "badge-case"));
    }
    const statusLabel = app.status || "開発事例";
    if (statusLabel !== typeLabel) badges.append(createBadge(statusLabel, "card-status"));
    top.append(badges);

    const category = document.createElement("p");
    category.className = "card-category";
    category.textContent = app.category || "その他";

    const title = document.createElement("h3");
    title.className = "card-title";
    if (isFreeApp) title.id = `app-title-${app.id}`;
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
    (app.tags || []).slice(0, options.cardMode === "spotlight" ? 3 : 4).forEach((tag) => {
      const tagElement = document.createElement("span");
      tagElement.textContent = tag;
      tags.append(tagElement);
    });

    const content = document.createElement("div");
    content.className = "app-card-content";
    content.append(top, category, title, catchCopy, description);

    if (isFreeApp) {
      content.append(createFreeCardActions(app));
      cardControl.append(createAppCardMedia(app), content);
    } else {
      content.append(tags);
      const action = document.createElement("span");
      action.className = "card-detail";
      action.textContent = getCardActionLabel(app);
      content.append(action);
      cardControl.append(content);
    }

    article.append(cardControl);
    return article;
  }

  function createFreeCardActions(app) {
    const area = document.createElement("div");
    area.className = "free-card-actions";

    if (hasUsableUrl(app)) {
      const openLink = document.createElement("a");
      openLink.className = "button button-primary";
      openLink.href = app.url.trim();
      openLink.target = "_blank";
      openLink.rel = "noopener";
      openLink.textContent = app.actionLabel || "今すぐ無料で使う";
      area.append(openLink);
    } else {
      const unavailable = document.createElement("span");
      unavailable.className = "card-detail free-card-unavailable";
      unavailable.textContent = "近日公開";
      area.append(unavailable);
    }

    const detailsUrl = (app.detailsUrl || "").trim();
    if (detailsUrl && detailsUrl !== "#") {
      const detailsLink = document.createElement("a");
      detailsLink.className = "button button-secondary";
      detailsLink.href = detailsUrl;
      detailsLink.textContent = "使い方を見る";
      area.append(detailsLink);
    }

    const guideUrl = (app.guideUrl || "").trim();
    if (guideUrl && guideUrl !== "#") {
      const guideLink = document.createElement("a");
      guideLink.className = "free-card-guide";
      guideLink.href = guideUrl;
      guideLink.textContent = "使い方のコツ";
      area.append(guideLink);
    }

    return area;
  }

  function createAppCardMedia(app) {
    const media = document.createElement("div");
    media.className = "app-card-media";

    if (app.image) {
      const image = document.createElement("img");
      image.src = app.image;
      image.alt = app.imageAlt || `${app.title || "アプリ"}の画面`;
      image.width = 390;
      image.height = 844;
      image.loading = "lazy";
      media.append(image);
      return media;
    }

    media.classList.add("app-card-media-fallback");
    const windowBar = document.createElement("div");
    windowBar.className = "linkboard-window-bar";
    ["", "", ""].forEach(() => {
      const dot = document.createElement("span");
      windowBar.append(dot);
    });

    const heading = document.createElement("p");
    heading.textContent = "よく使うページ";
    const shortcutGrid = document.createElement("div");
    shortcutGrid.className = "linkboard-grid";
    ["予約", "売上", "勤怠", "日報", "週報", "社内"].forEach((label) => {
      const shortcut = document.createElement("span");
      shortcut.textContent = label;
      shortcutGrid.append(shortcut);
    });
    media.append(windowBar, heading, shortcutGrid);
    return media;
  }

  function createBadge(text, className) {
    const badge = document.createElement("span");
    badge.className = className;
    badge.textContent = text;
    return badge;
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
      ["どんな仕事に使うか", app.longDescription || "詳細準備中"],
      ["できること", app.features?.length ? app.features.join(" / ") : "詳細準備中"],
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
    openLink.toggleAttribute("aria-hidden", !canOpen);
    openLink.tabIndex = canOpen ? 0 : -1;
    if (canOpen) {
      openLink.href = app.url.trim();
      openLink.target = "_blank";
      openLink.rel = "noopener";
      openLink.textContent = "無料で使う";
    } else {
      openLink.removeAttribute("href");
      openLink.removeAttribute("target");
      openLink.removeAttribute("rel");
      openLink.textContent = "";
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
