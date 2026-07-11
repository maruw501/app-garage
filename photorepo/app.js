const elements = {
  cameraButton: document.getElementById("cameraButton"),
  fileButton: document.getElementById("fileButton"),
  cameraInput: document.getElementById("cameraInput"),
  fileInput: document.getElementById("fileInput"),
  storeName: document.getElementById("storeName"),
  visitDate: document.getElementById("visitDate"),
  inspectorName: document.getElementById("inspectorName"),
  summaryNote: document.getElementById("summaryNote"),
  photoCount: document.getElementById("photoCount"),
  emptyState: document.getElementById("emptyState"),
  photoGrid: document.getElementById("photoGrid"),
  pdfButton: document.getElementById("pdfButton"),
  excelButton: document.getElementById("excelButton"),
  clearButton: document.getElementById("clearButton"),
  statusLine: document.getElementById("statusLine"),
  downloadBox: document.getElementById("downloadBox"),
  downloadLink: document.getElementById("downloadLink"),
  shareAgainButton: document.getElementById("shareAgainButton")
};

const state = {
  items: [],
  activeCommentIndex: -1,
  pdfBlob: null,
  pdfFileName: "",
  pdfUrl: "",
  pdfPageCount: 0,
  pdfSize: 0,
  draftReady: false,
  draftTimer: 0,
  draftDay: ""
};

const DRAFT_DB_NAME = "photo-report-draft";
const DRAFT_STORE_NAME = "drafts";
const DRAFT_KEY = "current";

function openDraftDb() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DRAFT_DB_NAME, 1);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(DRAFT_STORE_NAME)) {
        request.result.createObjectStore(DRAFT_STORE_NAME);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error("一時保存を開けませんでした。"));
  });
}

async function readDraft() {
  const db = await openDraftDb();
  return new Promise((resolve, reject) => {
    const request = db.transaction(DRAFT_STORE_NAME, "readonly").objectStore(DRAFT_STORE_NAME).get(DRAFT_KEY);
    request.onsuccess = () => resolve(request.result || null);
    request.onerror = () => reject(request.error);
  }).finally(() => db.close());
}

async function writeDraft(value) {
  const db = await openDraftDb();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(DRAFT_STORE_NAME, "readwrite");
    transaction.objectStore(DRAFT_STORE_NAME).put(value, DRAFT_KEY);
    transaction.oncomplete = resolve;
    transaction.onerror = () => reject(transaction.error);
  }).finally(() => db.close());
}

async function deleteDraft() {
  window.clearTimeout(state.draftTimer);
  const db = await openDraftDb();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(DRAFT_STORE_NAME, "readwrite");
    transaction.objectStore(DRAFT_STORE_NAME).delete(DRAFT_KEY);
    transaction.oncomplete = resolve;
    transaction.onerror = () => reject(transaction.error);
  }).finally(() => db.close());
}

function draftPayload() {
  return {
    savedDay: localDateInputValue(),
    savedAt: Date.now(),
    fields: {
      storeName: elements.storeName.value,
      visitDate: elements.visitDate.value,
      inspectorName: elements.inspectorName.value,
      summaryNote: elements.summaryNote.value
    },
    items: state.items.map((item) => ({ id: item.id, url: item.url || "", comment: item.comment || "" }))
  };
}

function scheduleDraftSave() {
  if (!state.draftReady) return;
  window.clearTimeout(state.draftTimer);
  state.draftTimer = window.setTimeout(() => {
    writeDraft(draftPayload()).catch((error) => console.warn("一時保存に失敗しました。", error));
  }, 350);
}

async function restoreTodayDraft() {
  const today = localDateInputValue();
  state.draftDay = today;
  try {
    const draft = await readDraft();
    if (draft && draft.savedDay !== today) {
      await deleteDraft();
      return false;
    }
    if (!draft) return false;
    elements.storeName.value = draft.fields && draft.fields.storeName || "";
    elements.visitDate.value = draft.fields && draft.fields.visitDate || today;
    elements.inspectorName.value = draft.fields && draft.fields.inspectorName || "";
    elements.summaryNote.value = draft.fields && draft.fields.summaryNote || "";
    state.items = Array.isArray(draft.items) ? draft.items.map((item) => ({
      id: item.id || createId(), file: null, url: item.url || "", comment: item.comment || ""
    })) : [];
    return true;
  } catch (error) {
    console.warn("一時保存を復元できませんでした。", error);
    return false;
  }
}

async function removeExpiredDraftAtDayChange() {
  const today = localDateInputValue();
  if (state.draftDay === today) return;
  state.draftDay = today;
  await deleteDraft().catch(() => {});
  state.items = [];
  elements.storeName.value = "";
  elements.visitDate.value = today;
  elements.inspectorName.value = "";
  elements.summaryNote.value = "";
  resetPdfOutput();
  renderPhotos();
  setStatus("日付が変わったため、前日の一時保存を削除しました。");
}

const A4 = {
  pdfWidth: 595.28,
  pdfHeight: 841.89,
  canvasWidth: 1240,
  canvasHeight: 1754
};

function localDateInputValue(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function createId() {
  if (window.crypto && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function setStatus(message) {
  elements.statusLine.textContent = message;
}

function sanitizeFilePart(value, fallback) {
  const cleaned = value.trim().replace(/[\\/:*?"<>|]/g, "").slice(0, 24);
  return cleaned || fallback;
}

function buildPdfFileName() {
  const store = sanitizeFilePart(elements.storeName.value, "店舗未入力");
  const date = elements.visitDate.value || localDateInputValue();
  return `フォトレポ_${store}_${date}.pdf`;
}

function buildExcelFileName() {
  const store = sanitizeFilePart(elements.storeName.value, "店舗未入力");
  const date = elements.visitDate.value || localDateInputValue();
  return `フォトレポ_${store}_${date}.xls`;
}

function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .split(String.fromCharCode(60)).join("&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function createExcelBlob() {
  const rows = state.items.map((item, index) => {
    const image = item.url
      ? `\x3cimg src="${escapeHtml(item.url)}" style="max-width:420px;max-height:315px;display:block">`
      : "写真未添付";
    return `\x3ctr>\x3ctd>${index + 1}\x3c/td>\x3ctd>${image}\x3c/td>\x3ctd style="white-space:pre-wrap">${escapeHtml(item.comment)}\x3c/td>\x3c/tr>`;
  }).join("");
  const html = `\x3c!doctype html>\x3chtml>\x3chead>\x3cmeta charset="utf-8">\x3cstyle>
    body{font-family:Arial,'Yu Gothic',sans-serif}table{border-collapse:collapse;width:100%}
    th,td{border:1px solid #999;padding:8px;vertical-align:top}th{background:#e8f2ed}
    .info th{width:120px;text-align:left}.photos td:first-child{width:48px;text-align:center}
  \x3c/style>\x3c/head>\x3cbody>
    \x3ch1>フォトレポ\x3c/h1>
    \x3ctable class="info">
      \x3ctr>\x3cth>拠点名\x3c/th>\x3ctd>${escapeHtml(elements.storeName.value)}\x3c/td>\x3c/tr>
      \x3ctr>\x3cth>巡回日\x3c/th>\x3ctd>${escapeHtml(elements.visitDate.value)}\x3c/td>\x3c/tr>
      \x3ctr>\x3cth>担当者\x3c/th>\x3ctd>${escapeHtml(elements.inspectorName.value)}\x3c/td>\x3c/tr>
      \x3ctr>\x3cth>全体メモ\x3c/th>\x3ctd style="white-space:pre-wrap">${escapeHtml(elements.summaryNote.value)}\x3c/td>\x3c/tr>
    \x3c/table>\x3cbr>
    \x3ctable class="photos">\x3ctr>\x3cth>No.\x3c/th>\x3cth>写真\x3c/th>\x3cth>コメント\x3c/th>\x3c/tr>${rows}\x3c/table>
  \x3c/body>\x3c/html>`;
  return new Blob(["\ufeff", html], { type: "application/vnd.ms-excel;charset=utf-8" });
}

async function prepareAndShareExcel() {
  if (!state.items.length) {
    setStatus("写真欄を1つ以上追加してください。");
    return;
  }
  elements.excelButton.disabled = true;
  elements.excelButton.textContent = "作成中";
  try {
    const fileName = buildExcelFileName();
    const blob = createExcelBlob();
    const file = new File([blob], fileName, { type: blob.type });
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      await navigator.share({ files: [file], title: "フォトレポ", text: fileName });
      setStatus("Excelファイルを共有しました。");
    } else {
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = fileName;
      link.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 30000);
      setStatus("Excelファイルを作成しました。");
    }
  } catch (error) {
    const canceled = error && error.name === "AbortError";
    setStatus(canceled ? "共有をキャンセルしました。" : "Excelファイルを作成できませんでした。");
  } finally {
    elements.excelButton.disabled = false;
    elements.excelButton.textContent = "Excel作成・共有";
  }
}

function revokePdfUrl() {
  if (state.pdfUrl) {
    URL.revokeObjectURL(state.pdfUrl);
    state.pdfUrl = "";
  }
}

function resetPdfOutput() {
  revokePdfUrl();
  state.pdfBlob = null;
  state.pdfFileName = "";
  state.pdfPageCount = 0;
  state.pdfSize = 0;
  elements.downloadBox.classList.add("hidden");
  delete elements.downloadBox.dataset.pdfPages;
  delete elements.downloadBox.dataset.pdfSize;
  elements.downloadLink.removeAttribute("href");
}

function ensureCommentEditor() {
  if (elements.commentEditor) return;

  const editor = document.createElement("div");
  editor.id = "commentEditor";
  editor.className = "comment-editor hidden";
  editor.setAttribute("role", "dialog");
  editor.setAttribute("aria-modal", "true");
  editor.setAttribute("aria-labelledby", "commentEditorTitle");
  editor.innerHTML = `
    <div class="comment-editor-backdrop" id="commentEditorBackdrop"></div>
    <section class="comment-editor-panel" aria-label="写真コメント入力">
      <div class="comment-editor-header">
        <h2 id="commentEditorTitle">写真コメント</h2>
        <button class="icon-button" type="button" id="commentEditorClose" aria-label="閉じる">×</button>
      </div>
      <div class="comment-editor-body">
        <img class="comment-editor-image" id="commentEditorImage" alt="">
        <textarea id="commentEditorTextarea" rows="4" placeholder="指摘内容・改善ポイント"></textarea>
      </div>
      <div class="comment-editor-actions">
        <button class="primary-button" type="button" id="commentEditorSave">保存</button>
        <label class="photo-action-button next-photo-button">
          <span>保存して次も撮影</span>
          <input id="commentEditorCameraInput" class="action-file-input" type="file" accept="image/*" capture="environment">
        </label>
      </div>
    </section>
  `;
  document.body.append(editor);

  elements.commentEditor = editor;
  elements.commentEditorImage = document.getElementById("commentEditorImage");
  elements.commentEditorTextarea = document.getElementById("commentEditorTextarea");
  elements.commentEditorSave = document.getElementById("commentEditorSave");
  elements.commentEditorClose = document.getElementById("commentEditorClose");
  elements.commentEditorBackdrop = document.getElementById("commentEditorBackdrop");
  elements.commentEditorCameraInput = document.getElementById("commentEditorCameraInput");

  elements.commentEditorTextarea.addEventListener("input", () => {
    const item = state.items[state.activeCommentIndex];
    if (!item) return;
    item.comment = elements.commentEditorTextarea.value;
    const cardTextarea = elements.photoGrid.querySelector(`[data-index="${state.activeCommentIndex}"] textarea`);
    if (cardTextarea && cardTextarea.value !== item.comment) {
      cardTextarea.value = item.comment;
    }
    resetPdfOutput();
    scheduleDraftSave();
  });

  elements.commentEditorSave.addEventListener("click", closeCommentEditor);
  elements.commentEditorClose.addEventListener("click", closeCommentEditor);
  elements.commentEditorBackdrop.addEventListener("click", closeCommentEditor);
  elements.commentEditorCameraInput.addEventListener("click", saveCommentEditor);
  elements.commentEditorCameraInput.addEventListener("change", async (event) => {
    await addFiles(event.target.files);
    event.target.value = "";
  });
}

function saveCommentEditor() {
  const item = state.items[state.activeCommentIndex];
  if (!item || !elements.commentEditorTextarea) return;
  item.comment = elements.commentEditorTextarea.value;
  resetPdfOutput();
  scheduleDraftSave();
}

function closeCommentEditor() {
  saveCommentEditor();
  if (elements.commentEditor) {
    elements.commentEditor.classList.add("hidden");
  }
  state.activeCommentIndex = -1;
}

function openCommentEditor(index, shouldFocus = true) {
  const item = state.items[index];
  if (!item) return;
  ensureCommentEditor();
  state.activeCommentIndex = index;
  elements.commentEditorImage.src = item.url || "";
  elements.commentEditorImage.alt = item.url ? `${index + 1}枚目の指摘写真` : "";
  elements.commentEditorTextarea.value = item.comment || "";
  elements.commentEditor.classList.remove("hidden");
  if (shouldFocus) {
    window.setTimeout(() => elements.commentEditorTextarea.focus(), 80);
  }
}

function getPhotoItems() {
  return state.items.filter((item) => item.url);
}

function getPhotoCountText(photoItems) {
  if (state.items.length > photoItems.length) {
    return `${photoItems.length}枚 / ${state.items.length}欄`;
  }
  return `${photoItems.length}枚`;
}

function renderPhotos() {
  const photoItems = getPhotoItems();
  elements.photoCount.textContent = getPhotoCountText(photoItems);
  elements.emptyState.classList.toggle("hidden", state.items.length > 0);
  elements.photoGrid.innerHTML = "";

  state.items.forEach((item, index) => {
    const card = document.createElement("article");
    card.className = "photo-card";
    card.dataset.index = String(index);

    const header = document.createElement("div");
    header.className = "photo-card-header";

    const number = document.createElement("span");
    number.className = "photo-number";
    number.textContent = String(index + 1);

    const tools = document.createElement("div");
    tools.className = "card-tools";

    const upButton = document.createElement("button");
    upButton.type = "button";
    upButton.className = "icon-button";
    upButton.title = "上へ移動";
    upButton.setAttribute("aria-label", `${index + 1}枚目を上へ移動`);
    upButton.textContent = "↑";
    upButton.disabled = index === 0;
    upButton.addEventListener("click", () => moveItem(index, index - 1));

    const downButton = document.createElement("button");
    downButton.type = "button";
    downButton.className = "icon-button";
    downButton.title = "下へ移動";
    downButton.setAttribute("aria-label", `${index + 1}枚目を下へ移動`);
    downButton.textContent = "↓";
    downButton.disabled = index === state.items.length - 1;
    downButton.addEventListener("click", () => moveItem(index, index + 1));

    const deleteButton = document.createElement("button");
    deleteButton.type = "button";
    deleteButton.className = "icon-button";
    deleteButton.title = "削除";
    deleteButton.setAttribute("aria-label", `${index + 1}枚目を削除`);
    deleteButton.textContent = "×";
    deleteButton.addEventListener("click", () => deleteItem(index));

    tools.append(upButton, downButton, deleteButton);
    header.append(number, tools);

    const frame = document.createElement("div");
    frame.className = "photo-frame";
    if (item.url) {
      const image = document.createElement("img");
      image.alt = `${index + 1}枚目の指摘写真`;
      image.src = item.url;
      frame.append(image);
    } else {
      const placeholder = document.createElement("div");
      placeholder.className = "photo-placeholder";
      placeholder.textContent = "写真未添付";
      frame.append(placeholder);
    }

    const fileWrap = document.createElement("label");
    fileWrap.className = "card-file-picker";
    const fileLabel = document.createElement("span");
    fileLabel.textContent = item.url ? "写真を差し替え" : "写真を添付";
    const fileInput = document.createElement("input");
    fileInput.className = "file-input";
    fileInput.type = "file";
    fileInput.accept = "image/*";
    fileInput.addEventListener("change", async (event) => {
      await updateItemPhoto(index, event.target.files);
      event.target.value = "";
    });
    fileWrap.append(fileLabel, fileInput);

    const commentWrap = document.createElement("label");
    commentWrap.className = "comment-area";
    const textarea = document.createElement("textarea");
    textarea.setAttribute("aria-label", `${index + 1}枚目のコメント`);
    textarea.value = item.comment;
    textarea.placeholder = "指摘内容・改善ポイント";
    textarea.addEventListener("focus", () => {
      state.activeCommentIndex = index;
    });
    textarea.addEventListener("input", () => {
      item.comment = textarea.value;
      if (state.activeCommentIndex === index && elements.commentEditorTextarea) {
        elements.commentEditorTextarea.value = item.comment;
      }
      resetPdfOutput();
      scheduleDraftSave();
    });
    commentWrap.append(textarea);

    card.append(header, frame, fileWrap, commentWrap);
    elements.photoGrid.append(card);
  });
  scheduleDraftSave();
}

function moveItem(fromIndex, toIndex) {
  if (toIndex < 0 || toIndex >= state.items.length) return;
  const [item] = state.items.splice(fromIndex, 1);
  state.items.splice(toIndex, 0, item);
  resetPdfOutput();
  renderPhotos();
}

function deleteItem(index) {
  const [item] = state.items.splice(index, 1);
  if (item && item.url && item.url.startsWith("blob:")) {
    URL.revokeObjectURL(item.url);
  }
  resetPdfOutput();
  renderPhotos();
  setStatus(state.items.length ? "写真を削除しました。" : "");
}

function addBlankPhotoSlot() {
  state.items.push({
    id: createId(),
    file: null,
    url: "",
    comment: ""
  });
  resetPdfOutput();
  renderPhotos();
  setStatus("写真欄を追加しました。写真を添付し、下にコメントを書けます。");
}

function isLikelyImageFile(file) {
  if (!file) return false;
  if (file.type && file.type.startsWith("image/")) return true;
  if (/\.(jpe?g|png|gif|webp|heic|heif)$/i.test(file.name || "")) return true;
  return !file.type;
}

function inferImageMime(file) {
  if (file.type && file.type.startsWith("image/")) return file.type;
  const name = file.name || "";
  if (/\.png$/i.test(name)) return "image/png";
  if (/\.webp$/i.test(name)) return "image/webp";
  if (/\.gif$/i.test(name)) return "image/gif";
  if (/\.(heic|heif)$/i.test(name)) return "image/heic";
  return "image/jpeg";
}

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(new Error("写真を読み込めませんでした。"));
    reader.readAsDataURL(file);
  });
}

async function fileToImageUrl(file) {
  const dataUrl = await readFileAsDataUrl(file);
  if (dataUrl.startsWith("data:image/")) return dataUrl;
  if (dataUrl.startsWith("data:")) {
    return dataUrl.replace(/^data:[^;]*;/, `data:${inferImageMime(file)};`);
  }
  return dataUrl;
}

async function buildPhotoItemFromFile(file, comment = "") {
  return {
    id: createId(),
    file,
    url: await fileToImageUrl(file),
    comment
  };
}

async function addFiles(fileList) {
  const selected = Array.from(fileList || []);
  if (!selected.length) {
    setStatus("写真が選択されませんでした。");
    return;
  }

  setStatus(`${selected.length}枚を読み込んでいます。`);
  const files = selected.filter(isLikelyImageFile);
  const skipped = selected.length - files.length;

  if (!files.length) {
    setStatus("写真として読み込めるファイルがありませんでした。");
    return;
  }

  let added = 0;
  let lastAddedIndex = -1;
  for (const file of files) {
    try {
      state.items.push(await buildPhotoItemFromFile(file));
      lastAddedIndex = state.items.length - 1;
      added += 1;
    } catch (error) {
      console.error(error);
    }
  }

  resetPdfOutput();
  renderPhotos();
  const skippedText = skipped ? ` ${skipped}枚は写真として読み込めませんでした。` : "";
  setStatus(added ? `${added}枚の写真を追加しました。コメントを入力できます。${skippedText}` : "写真を読み込めませんでした。別の写真でお試しください。");
  if (lastAddedIndex >= 0) {
    openCommentEditor(lastAddedIndex);
  }
}

async function updateItemPhoto(index, fileList) {
  const selected = Array.from(fileList || []);
  if (!selected.length) {
    setStatus("写真が選択されませんでした。");
    return;
  }

  const file = selected.find(isLikelyImageFile);
  if (!file) {
    setStatus("写真として読み込めるファイルがありませんでした。");
    return;
  }

  setStatus("写真を読み込んでいます。");
  try {
    const item = state.items[index];
    if (!item) return;
    if (item.url && item.url.startsWith("blob:")) URL.revokeObjectURL(item.url);
    item.file = file;
    item.url = await fileToImageUrl(file);
    resetPdfOutput();
    renderPhotos();
    setStatus(`${index + 1}枚目に写真を添付しました。コメントを入力できます。`);
    openCommentEditor(index);
  } catch (error) {
    console.error(error);
    setStatus("写真を読み込めませんでした。別の写真でお試しください。");
  }
}

function clearAll() {
  if (!state.items.length && !state.pdfBlob) return;
  const ok = confirm("写真とコメントをすべて消します。よろしいですか？");
  if (!ok) return;

  state.items.forEach((item) => {
    if (item.url && item.url.startsWith("blob:")) URL.revokeObjectURL(item.url);
  });
  state.items = [];
  resetPdfOutput();
  renderPhotos();
  deleteDraft().catch(() => {});
  setStatus("");
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("画像を読み込めませんでした。"));
    image.src = src;
  });
}

function drawRoundedRect(ctx, x, y, width, height, radius) {
  if (typeof ctx.roundRect === "function") {
    ctx.beginPath();
    ctx.roundRect(x, y, width, height, radius);
    return;
  }

  const r = Math.min(radius, width / 2, height / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + width, y, x + width, y + height, r);
  ctx.arcTo(x + width, y + height, x, y + height, r);
  ctx.arcTo(x, y + height, x, y, r);
  ctx.arcTo(x, y, x + width, y, r);
  ctx.closePath();
}

function fillWrappedText(ctx, text, x, y, maxWidth, lineHeight, maxLines) {
  const source = String(text || "").replace(/\r\n/g, "\n").trim();
  if (!source) return;
  const chars = source;
  const paragraphs = chars.split("\n");
  const lines = [];

  for (const paragraph of paragraphs) {
    let current = "";
    for (const char of paragraph) {
      const next = current + char;
      if (ctx.measureText(next).width > maxWidth && current) {
        lines.push(current);
        current = char;
        if (lines.length >= maxLines) break;
      } else {
        current = next;
      }
    }
    if (lines.length >= maxLines) break;
    lines.push(current);
    if (lines.length >= maxLines) break;
  }

  lines.slice(0, maxLines).forEach((line, index) => {
    const suffix = index === maxLines - 1 && lines.length > maxLines ? "..." : "";
    ctx.fillText(`${line}${suffix}`, x, y + index * lineHeight);
  });
}

function drawFitImage(ctx, image, x, y, width, height) {
  const imageWidth = image.naturalWidth || image.width;
  const imageHeight = image.naturalHeight || image.height;
  const scale = Math.min(width / imageWidth, height / imageHeight);
  const drawWidth = imageWidth * scale;
  const drawHeight = imageHeight * scale;
  const drawX = x + (width - drawWidth) / 2;
  const drawY = y + (height - drawHeight) / 2;
  ctx.drawImage(image, drawX, drawY, drawWidth, drawHeight);
}

function drawInfoText(ctx, label, value, x, y, width) {
  ctx.fillStyle = "#68707a";
  ctx.font = '700 19px -apple-system, BlinkMacSystemFont, "Yu Gothic", sans-serif';
  ctx.fillText(label, x, y);
  ctx.fillStyle = "#202327";
  ctx.font = '700 23px -apple-system, BlinkMacSystemFont, "Yu Gothic", sans-serif';
  fillWrappedText(ctx, value || "未入力", x, y + 34, width, 28, 1);
}

async function composePageCanvas(pageItems, pageIndex, totalPages, totalPhotos) {
  const canvas = document.createElement("canvas");
  canvas.width = A4.canvasWidth;
  canvas.height = A4.canvasHeight;
  const ctx = canvas.getContext("2d");

  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const margin = 58;
  const headerHeight = 178;
  const footerHeight = 56;
  const gapX = 22;
  const gapY = 18;
  const cellWidth = (canvas.width - margin * 2 - gapX) / 2;
  const cellHeight = (canvas.height - headerHeight - footerHeight - gapY * 3) / 4;

  ctx.fillStyle = "#b3261e";
  ctx.fillRect(0, 0, 13, canvas.height);

  ctx.fillStyle = "#202327";
  ctx.font = '800 39px -apple-system, BlinkMacSystemFont, "Yu Gothic", sans-serif';
  ctx.fillText("フォトレポ", margin, 58);

  ctx.fillStyle = "#b3261e";
  ctx.font = '800 20px -apple-system, BlinkMacSystemFont, "Yu Gothic", sans-serif';
  ctx.fillText(`写真 ${totalPhotos}枚 / ${pageIndex + 1}-${totalPages}ページ`, margin, 92);

  const infoY = 124;
  drawInfoText(ctx, "店舗名", elements.storeName.value, margin, infoY, 315);
  drawInfoText(ctx, "巡回日", elements.visitDate.value, margin + 340, infoY, 180);
  drawInfoText(ctx, "担当者", elements.inspectorName.value, margin + 550, infoY, 190);

  ctx.strokeStyle = "#d9ded7";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(margin, headerHeight - 12);
  ctx.lineTo(canvas.width - margin, headerHeight - 12);
  ctx.stroke();

  const imagePromises = pageItems.map((item) => loadImage(item.url));
  const images = await Promise.all(imagePromises);

  for (let index = 0; index < pageItems.length; index += 1) {
    const item = pageItems[index];
    const image = images[index];
    const column = index % 2;
    const row = Math.floor(index / 2);
    const x = margin + column * (cellWidth + gapX);
    const y = headerHeight + row * (cellHeight + gapY);
    const imageX = x + 16;
    const imageY = y + 48;
    const imageWidth = cellWidth - 32;
    const imageHeight = cellHeight - 130;
    const globalNumber = pageIndex * 8 + index + 1;

    ctx.fillStyle = "#ffffff";
    drawRoundedRect(ctx, x, y, cellWidth, cellHeight, 10);
    ctx.fill();
    ctx.strokeStyle = "#cfd6ce";
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.fillStyle = "#b3261e";
    drawRoundedRect(ctx, x + 16, y + 14, 42, 28, 14);
    ctx.fill();
    ctx.fillStyle = "#ffffff";
    ctx.font = '800 19px -apple-system, BlinkMacSystemFont, "Yu Gothic", sans-serif';
    ctx.textAlign = "center";
    ctx.fillText(String(globalNumber), x + 37, y + 35);
    ctx.textAlign = "left";

    ctx.fillStyle = "#f1f3f4";
    drawRoundedRect(ctx, imageX, imageY, imageWidth, imageHeight, 6);
    ctx.fill();
    drawFitImage(ctx, image, imageX, imageY, imageWidth, imageHeight);

    const comment = String(item.comment || "").trim();
    if (comment) {
      ctx.fillStyle = "#202327";
      ctx.font = '500 20px -apple-system, BlinkMacSystemFont, "Yu Gothic", sans-serif';
      fillWrappedText(ctx, comment, imageX, imageY + imageHeight + 34, imageWidth, 25, 3);
    }
  }

  const note = elements.summaryNote.value.trim();
  if (note) {
    ctx.fillStyle = "#202327";
    ctx.font = '700 18px -apple-system, BlinkMacSystemFont, "Yu Gothic", sans-serif';
    ctx.fillText("全体メモ", margin, canvas.height - 38);
    ctx.font = '500 17px -apple-system, BlinkMacSystemFont, "Yu Gothic", sans-serif';
    fillWrappedText(ctx, note, margin + 82, canvas.height - 38, canvas.width - margin * 2 - 82, 21, 1);
  } else {
    ctx.fillStyle = "#68707a";
    ctx.font = '500 16px -apple-system, BlinkMacSystemFont, "Yu Gothic", sans-serif';
    ctx.fillText(`作成日時: ${new Date().toLocaleString("ja-JP")}`, margin, canvas.height - 34);
  }

  return canvas;
}

function canvasToJpegBytes(canvas) {
  return new Promise((resolve, reject) => {
    canvas.toBlob(async (blob) => {
      if (!blob) {
        reject(new Error("PDF用画像を作成できませんでした。"));
        return;
      }
      resolve(new Uint8Array(await blob.arrayBuffer()));
    }, "image/jpeg", 0.9);
  });
}

function chunkItems(items, size) {
  const chunks = [];
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }
  return chunks;
}

function buildPdfFromJpegs(jpegs) {
  const encoder = new TextEncoder();
  const chunks = [];
  const offsets = [];
  let byteLength = 0;

  function add(data) {
    const chunk = typeof data === "string" ? encoder.encode(data) : data;
    chunks.push(chunk);
    byteLength += chunk.length;
  }

  function addObject(number, body) {
    offsets[number] = byteLength;
    add(`${number} 0 obj\n${body}\nendobj\n`);
  }

  const pageObjects = jpegs.map((_, index) => 3 + index * 3);
  const objectCount = 2 + jpegs.length * 3;

  add("%PDF-1.4\n");
  addObject(1, "<< /Type /Catalog /Pages 2 0 R >>");
  addObject(2, `<< /Type /Pages /Kids [${pageObjects.map((number) => `${number} 0 R`).join(" ")}] /Count ${jpegs.length} >>`);

  jpegs.forEach((jpeg, index) => {
    const pageObject = 3 + index * 3;
    const contentObject = pageObject + 1;
    const imageObject = pageObject + 2;
    const imageName = `Im${index + 1}`;
    const content = `q\n${A4.pdfWidth} 0 0 ${A4.pdfHeight} 0 0 cm\n/${imageName} Do\nQ`;

    addObject(
      pageObject,
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${A4.pdfWidth} ${A4.pdfHeight}] /Resources << /XObject << /${imageName} ${imageObject} 0 R >> >> /Contents ${contentObject} 0 R >>`
    );
    addObject(contentObject, `<< /Length ${content.length} >>\nstream\n${content}\nendstream`);

    offsets[imageObject] = byteLength;
    add(`${imageObject} 0 obj\n<< /Type /XObject /Subtype /Image /Width ${A4.canvasWidth} /Height ${A4.canvasHeight} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${jpeg.length} >>\nstream\n`);
    add(jpeg);
    add("\nendstream\nendobj\n");
  });

  const xrefOffset = byteLength;
  add(`xref\n0 ${objectCount + 1}\n`);
  add("0000000000 65535 f \n");
  for (let index = 1; index <= objectCount; index += 1) {
    add(`${String(offsets[index]).padStart(10, "0")} 00000 n \n`);
  }
  add(`trailer\n<< /Size ${objectCount + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`);

  return new Blob(chunks, { type: "application/pdf" });
}

async function createPdfBlob() {
  const photoItems = getPhotoItems();
  const pages = chunkItems(photoItems, 8);
  const jpegs = [];
  state.pdfPageCount = pages.length;

  for (let index = 0; index < pages.length; index += 1) {
    setStatus(`PDFを作成しています。${index + 1}/${pages.length}ページ`);
    const canvas = await composePageCanvas(pages[index], index, pages.length, photoItems.length);
    jpegs.push(await canvasToJpegBytes(canvas));
  }

  return buildPdfFromJpegs(jpegs);
}

async function sharePdf(file) {
  const params = new URLSearchParams(window.location.search);
  if (params.has("noShare")) {
    return false;
  }

  if (navigator.canShare && navigator.canShare({ files: [file] })) {
    await navigator.share({
      files: [file],
      title: "フォトレポ",
      text: `${elements.storeName.value || "店舗未入力"} ${elements.visitDate.value || ""}`
    });
    return true;
  }
  return false;
}

async function prepareAndSharePdf() {
  if (!getPhotoItems().length) {
    setStatus("写真を1枚以上追加してください。");
    return;
  }

  elements.pdfButton.disabled = true;
  elements.pdfButton.textContent = "作成中";

  try {
    resetPdfOutput();
    state.pdfFileName = buildPdfFileName();
    state.pdfBlob = await createPdfBlob();
    state.pdfSize = state.pdfBlob.size;
    state.pdfUrl = URL.createObjectURL(state.pdfBlob);
    elements.downloadLink.href = state.pdfUrl;
    elements.downloadLink.download = state.pdfFileName;
    elements.downloadBox.dataset.pdfPages = String(state.pdfPageCount);
    elements.downloadBox.dataset.pdfSize = String(state.pdfSize);
    elements.downloadBox.classList.remove("hidden");

    const file = new File([state.pdfBlob], state.pdfFileName, { type: "application/pdf" });
    setStatus("PDFができました。共有シートを開きます。");

    try {
      const shared = await sharePdf(file);
      setStatus(shared ? `PDFを共有しました。${state.pdfPageCount}ページです。` : `PDFができました。${state.pdfPageCount}ページです。下のリンクから開いて保存できます。`);
    } catch (error) {
      const canceled = error && error.name === "AbortError";
      setStatus(canceled ? "共有をキャンセルしました。PDFは作成済みです。" : "共有できませんでした。PDFは下のリンクから開けます。");
    }
  } catch (error) {
    console.error(error);
    setStatus("PDF作成に失敗しました。写真枚数を減らして再度お試しください。");
  } finally {
    elements.pdfButton.disabled = false;
    elements.pdfButton.textContent = "PDF作成・共有";
  }
}

async function shareExistingPdf() {
  if (!state.pdfBlob) {
    await prepareAndSharePdf();
    return;
  }

  const file = new File([state.pdfBlob], state.pdfFileName || buildPdfFileName(), { type: "application/pdf" });
  try {
    const shared = await sharePdf(file);
    setStatus(shared ? "PDFを共有しました。" : "この端末では直接共有できません。PDFを開いて保存してください。");
  } catch (error) {
    const canceled = error && error.name === "AbortError";
    setStatus(canceled ? "共有をキャンセルしました。" : "共有できませんでした。PDFを開いて保存してください。");
  }
}

function bindEvents() {
  elements.cameraInput.addEventListener("change", (event) => {
    addFiles(event.target.files);
    event.target.value = "";
  });

  elements.fileButton.addEventListener("click", addBlankPhotoSlot);

  if (elements.fileInput) {
    elements.fileInput.addEventListener("change", (event) => {
      addFiles(event.target.files);
      event.target.value = "";
    });
  }

  [elements.storeName, elements.visitDate, elements.inspectorName, elements.summaryNote].forEach((field) => {
    field.addEventListener("input", () => {
      resetPdfOutput();
      scheduleDraftSave();
    });
  });

  elements.pdfButton.addEventListener("click", prepareAndSharePdf);
  elements.excelButton.addEventListener("click", prepareAndShareExcel);
  elements.shareAgainButton.addEventListener("click", shareExistingPdf);
  elements.clearButton.addEventListener("click", clearAll);
}

async function createDemoFiles(count) {
  const files = [];
  const fills = ["#f5efe5", "#e8f2ef", "#f2e8e8", "#edf0f4"];
  const accents = ["#b3261e", "#176b4d", "#a46400", "#334155"];

  for (let index = 0; index < count; index += 1) {
    const canvas = document.createElement("canvas");
    canvas.width = 800;
    canvas.height = 600;
    const ctx = canvas.getContext("2d");

    ctx.fillStyle = fills[index % fills.length];
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = accents[index % accents.length];
    ctx.fillRect(56, 56, 688, 360);
    ctx.fillStyle = "#ffffff";
    ctx.font = "700 92px sans-serif";
    ctx.fillText(`PHOTO ${index + 1}`, 120, 260);
    ctx.fillStyle = "#202327";
    ctx.font = "32px sans-serif";
    ctx.fillText("PHOTO REPORT sample", 120, 500);

    const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.86));
    files.push(new File([blob], `sample-${index + 1}.jpg`, { type: "image/jpeg" }));
  }

  return files;
}

async function populateDemoFromQuery() {
  const params = new URLSearchParams(window.location.search);
  if (!params.has("demo")) return;

  const requested = Number.parseInt(params.get("demo") || "9", 10);
  const count = Math.min(Math.max(Number.isFinite(requested) ? requested : 9, 1), 24);

  elements.storeName.value = "○○店";
  elements.inspectorName.value = "巡回担当";
  elements.summaryNote.value = "テスト用の全体メモです。";

  await addFiles(await createDemoFiles(count));
  state.items.forEach((item, index) => {
    item.comment = `${index + 1}枚目の指摘コメント。清掃、表示、期限、温度などの確認事項を記入。`;
  });
  resetPdfOutput();
  renderPhotos();
  setStatus(`${count}枚のデモ写真を追加しました。`);
}

async function initializeApp() {
  elements.visitDate.value = localDateInputValue();
  const restored = await restoreTodayDraft();
  bindEvents();
  state.draftReady = true;
  renderPhotos();
  if (restored) setStatus("この端末の本日の一時保存を復元しました。");
  await populateDemoFromQuery();
  window.setInterval(removeExpiredDraftAtDayChange, 60000);
}

initializeApp();

if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("./sw.js").catch(() => {});
}
