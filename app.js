const STORAGE_KEY = "jlpt-n1-imported-mistakes";

const state = {
  filter: "all",
  query: "",
  pendingImports: []
};

const cardGrid = document.querySelector("#cardGrid");
const resultCount = document.querySelector("#resultCount");
const reviewTable = document.querySelector("#reviewTable");
const searchInput = document.querySelector("#searchInput");
const segments = document.querySelectorAll(".segment");
const dialog = document.querySelector("#detailDialog");
const detailContent = document.querySelector("#detailContent");
const closeButton = document.querySelector(".close-button");
const copyTableButton = document.querySelector("#copyTable");
const screenshotInput = document.querySelector("#screenshotInput");
const dropZone = document.querySelector(".drop-zone");
const importType = document.querySelector("#importType");
const importPreview = document.querySelector("#importPreview");
const saveImportedButton = document.querySelector("#saveImported");
const clearImportedButton = document.querySelector("#clearImported");
const exportImportedButton = document.querySelector("#exportImported");
const preloader = document.querySelector("#preloader");
const loadPercent = document.querySelector("#loadPercent");
const loadBar = document.querySelector("#loadBar");

const readingMap = {
  市民生活課: "しみんせいかつか",
  管轄: "かんかつ",
  運用: "うんよう",
  当面: "とうめん",
  自前: "じまえ",
  抜き打ち: "ぬきうち",
  潜む: "ひそむ",
  試練: "しれん",
  割り当てる: "わりあてる",
  誇張: "こちょう",
  頑丈: "がんじょう",
  芳しい: "かんばしい",
  反抗期: "はんこうき",
  悉く: "ことごとく",
  検閲: "けんえつ",
  裁く: "さばく",
  脱却: "だっきゃく",
  胸中: "きょうちゅう",
  着手: "ちゃくしゅ",
  薄々: "うすうす",
  保留: "ほりゅう",
  程遠い: "ほどとおい",
  脳裏: "のうり",
  崇高: "すうこう",
  緩和: "かんわ",
  手芸: "しゅげい",
  筋道: "すじみち",
  養う: "やしなう",
  侮る: "あなどる",
  間柄: "あいだがら",
  足止め: "あしどめ",
  請け負う: "うけおう",
  進呈: "しんてい",
  踏襲: "とうしゅう",
  誓約書: "せいやくしょ",
  取り次ぐ: "とりつぐ",
  戒める: "いましめる",
  風潮: "ふうちょう",
  正当: "せいとう",
  資質: "ししつ",
  根底: "こんてい",
  返上: "へんじょう",
  工面: "くめん",
  仮説: "かせつ",
  覆す: "くつがえす",
  休日: "きゅうじつ",
  費用: "ひよう",
  必要: "ひつよう",
  新規: "しんき",
  待分析: "たいぶんせき",
  原題: "げんだい",
  文字: "もじ",
  語彙: "ごい",
  文法: "ぶんぽう",
  読解: "どっかい",
  聴解: "ちょうかい"
};

const readingEntries = Object.entries(readingMap).sort((a, b) => b[0].length - a[0].length);

function normalizeText(value) {
  return String(value || "").toLowerCase().trim();
}

function startPreloader() {
  if (!preloader || !loadPercent || !loadBar) {
    document.body.classList.remove("is-loading");
    document.body.classList.add("is-loaded");
    return;
  }

  let progress = 0;
  const startedAt = performance.now();
  const minimumDuration = 1500;

  function setProgress(value) {
    progress = Math.min(100, Math.max(progress, value));
    loadPercent.textContent = `${Math.round(progress)}%`;
    loadBar.style.width = `${progress}%`;
  }

  function tick() {
    const elapsed = performance.now() - startedAt;
    const easedTarget = Math.min(96, 100 * (1 - Math.exp(-elapsed / 520)));
    setProgress(easedTarget);

    if (elapsed < minimumDuration || progress < 96) {
      window.requestAnimationFrame(tick);
      return;
    }

    setProgress(100);
    window.setTimeout(() => {
      preloader.classList.add("is-complete");
      document.body.classList.add("is-frame-opening");
    }, 180);

    window.setTimeout(() => {
      document.body.classList.remove("is-loading", "is-frame-opening");
      document.body.classList.add("is-loaded");
    }, 1380);

    window.setTimeout(() => {
      preloader.classList.add("is-gone");
      preloader.setAttribute("aria-hidden", "true");
    }, 1980);
  }

  window.requestAnimationFrame(tick);
}

function escapeHtml(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function annotateText(value) {
  let safe = escapeHtml(value);
  readingEntries.forEach(([word, reading]) => {
    const escapedWord = escapeHtml(word);
    safe = safe.replaceAll(escapedWord, `<ruby>${escapedWord}<rt>${reading}</rt></ruby>`);
  });
  return safe;
}

function loadImportedMistakes() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
  } catch {
    return [];
  }
}

function saveImportedMistakes(items) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

function getAllMistakes() {
  return [...mistakes, ...loadImportedMistakes()];
}

function getFilteredMistakes() {
  const query = normalizeText(state.query);

  return getAllMistakes().filter((item) => {
    const matchesFilter = state.filter === "all" || item.type === state.filter;
    const searchable = normalizeText([
      item.id,
      item.type,
      item.prompt,
      item.focus,
      item.trap,
      item.analysis,
      item.source,
      item.tags.join(" ")
    ].join(" "));
    return matchesFilter && (!query || searchable.includes(query));
  });
}

function createCard(item) {
  const card = document.createElement("button");
  card.className = `mistake-card${item.imported ? " imported-card" : ""}`;
  card.type = "button";
  card.innerHTML = `
    <div class="card-top">
      <div class="meta">
        <span class="type-pill">${escapeHtml(item.type)}</span>
        <span>${escapeHtml(item.id)}</span>
      </div>
      <h3>${annotateText(item.focus)}</h3>
      <p class="prompt">${annotateText(item.prompt)}</p>
      <div class="hover-reveal">
        <p><strong>易错点：</strong>${annotateText(item.trap)}</p>
        <p><strong>提示：</strong>${annotateText(item.memoryTip)}</p>
      </div>
    </div>
    <div class="card-bottom">
      <div class="tag-row">
        ${item.tags.map((tag) => `<span class="tag">${escapeHtml(tag)}</span>`).join("")}
      </div>
      <div class="status">${escapeHtml(item.reviewStatus)}</div>
    </div>
  `;
  card.addEventListener("click", () => openDetail(item));
  return card;
}

function renderCards() {
  const all = getAllMistakes();
  const filtered = getFilteredMistakes();
  cardGrid.innerHTML = "";
  resultCount.textContent = `${filtered.length} / ${all.length} 题`;

  if (!filtered.length) {
    const empty = document.createElement("div");
    empty.className = "empty";
    empty.textContent = "没有找到匹配的错题。";
    cardGrid.append(empty);
    return;
  }

  filtered.forEach((item) => cardGrid.append(createCard(item)));
}

function renderTable() {
  reviewTable.innerHTML = getAllMistakes().map((item) => `
    <tr>
      <td>${escapeHtml(item.id)}</td>
      <td>${escapeHtml(item.type)}</td>
      <td>${annotateText(item.focus)}</td>
      <td>${annotateText(item.trap)}</td>
      <td>${escapeHtml(item.reviewStatus)}</td>
    </tr>
  `).join("");
}

function openDetail(item) {
  detailContent.innerHTML = `
    <div class="detail-body">
      <p class="eyebrow">${escapeHtml(item.type)} · ${escapeHtml(item.id)}</p>
      <h2>${annotateText(item.focus)}</h2>
      <p class="prompt">${escapeHtml(item.source)}</p>
      ${item.image ? `<img class="question-image" src="${escapeHtml(item.image)}" alt="${escapeHtml(item.id)} 原题截图" />` : ""}

      <div class="detail-grid">
        <div class="detail-item">
          <span class="detail-label">你的答案</span>
          <span class="answer-wrong">${annotateText(item.userAnswer)}</span>
        </div>
        <div class="detail-item">
          <span class="detail-label">正确答案</span>
          <span class="answer-right">${annotateText(item.correctAnswer)}</span>
        </div>
        <div class="detail-item">
          <span class="detail-label">题目重点</span>
          <span>${annotateText(item.prompt)}</span>
        </div>
        <div class="detail-item">
          <span class="detail-label">易错点</span>
          <span>${annotateText(item.trap)}</span>
        </div>
      </div>

      <div class="detail-item">
        <span class="detail-label">具体分析</span>
        <p>${annotateText(item.analysis)}</p>
      </div>

      <div class="detail-item">
        <span class="detail-label">复盘提示</span>
        <p>${annotateText(item.memoryTip)}</p>
      </div>

      <div class="tag-row">
        ${item.tags.map((tag) => `<span class="tag">${escapeHtml(tag)}</span>`).join("")}
      </div>
    </div>
  `;
  dialog.showModal();
}

function fallbackCopy(text) {
  const textArea = document.createElement("textarea");
  textArea.value = text;
  textArea.setAttribute("readonly", "");
  textArea.style.position = "fixed";
  textArea.style.inset = "0 auto auto 0";
  textArea.style.opacity = "0";
  document.body.append(textArea);
  textArea.select();
  document.execCommand("copy");
  textArea.remove();
}

function copyText(text, button, doneText) {
  const copyAction = navigator.clipboard
    ? navigator.clipboard.writeText(text)
    : Promise.reject(new Error("Clipboard API unavailable"));

  copyAction.catch(() => fallbackCopy(text)).then(() => {
    const original = button.textContent;
    button.textContent = doneText;
    window.setTimeout(() => {
      button.textContent = original;
    }, 1200);
  });
}

function copyReviewTable() {
  const header = ["题号", "题型", "考点", "错因", "复盘状态"];
  const rows = getAllMistakes().map((item) => [
    item.id,
    item.type,
    item.focus,
    item.trap,
    item.reviewStatus
  ]);
  const text = [header, ...rows].map((row) => row.join("\t")).join("\n");
  copyText(text, copyTableButton, "已复制");
}

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function renderImportPreview() {
  if (!state.pendingImports.length) {
    importPreview.innerHTML = `<div class="empty compact-empty">还没有选择截图。</div>`;
    return;
  }

  importPreview.innerHTML = state.pendingImports.map((item, index) => `
    <article class="import-tile">
      <img src="${escapeHtml(item.image)}" alt="${escapeHtml(item.source)} 预览" />
      <div>
        <strong>${escapeHtml(item.source)}</strong>
        <span>${escapeHtml(item.type)} · 待分析</span>
      </div>
      <button type="button" data-remove-import="${index}" aria-label="移除 ${escapeHtml(item.source)}">×</button>
    </article>
  `).join("");
}

async function addScreenshotFiles(files) {
  const imageFiles = Array.from(files || []).filter((file) => file.type.startsWith("image/"));
  const type = importType.value;
  const existingCount = getAllMistakes().length;
  const imported = await Promise.all(imageFiles.map(async (file, index) => ({
    id: `IMP-${String(existingCount + state.pendingImports.length + index + 1).padStart(3, "0")}`,
    type,
    source: file.name,
    image: await fileToDataUrl(file),
    prompt: "新規原題截图，等待补充题干。",
    userAnswer: "待补充",
    correctAnswer: "待补充",
    focus: "新規待分析",
    trap: "截图已导入，等待整理易错点。",
    analysis: "这道题已经通过截图加入复盘系统。后续可以根据原图补充题干、正确答案、错因和记忆提示。",
    memoryTip: "先对照原图确认题干和答案，再补充考点。",
    reviewStatus: "待分析",
    tags: ["新規", "截图", "待分析"],
    imported: true
  })));

  state.pendingImports.push(...imported);
  renderImportPreview();
}

async function handleScreenshotSelection(event) {
  await addScreenshotFiles(event.target.files);
}

function savePendingImports() {
  if (!state.pendingImports.length) return;
  const imported = loadImportedMistakes();
  saveImportedMistakes([...imported, ...state.pendingImports]);
  state.pendingImports = [];
  screenshotInput.value = "";
  renderImportPreview();
  renderCards();
  renderTable();
}

function clearImportedMistakes() {
  localStorage.removeItem(STORAGE_KEY);
  state.pendingImports = [];
  screenshotInput.value = "";
  renderImportPreview();
  renderCards();
  renderTable();
}

function exportImportedMistakes() {
  const data = JSON.stringify(loadImportedMistakes(), null, 2);
  copyText(data, exportImportedButton, "已复制");
}

function startAmbientCanvas() {
  const canvas = document.querySelector("#ambient");
  const context = canvas.getContext("2d");
  const particles = Array.from({ length: 44 }, (_, index) => ({
    x: Math.random(),
    y: Math.random(),
    radius: 1.2 + Math.random() * 2.4,
    speed: 0.00025 + Math.random() * 0.00045,
    phase: index * 0.9
  }));

  function resize() {
    const ratio = window.devicePixelRatio || 1;
    canvas.width = window.innerWidth * ratio;
    canvas.height = window.innerHeight * ratio;
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
  }

  function draw(time) {
    context.clearRect(0, 0, window.innerWidth, window.innerHeight);
    particles.forEach((particle) => {
      const x = particle.x * window.innerWidth + Math.sin(time * particle.speed + particle.phase) * 30;
      const y = particle.y * window.innerHeight + Math.cos(time * particle.speed + particle.phase) * 24;
      context.beginPath();
      context.arc(x, y, particle.radius, 0, Math.PI * 2);
      context.fillStyle = "rgba(0, 0, 0, 0.12)";
      context.fill();
    });
    window.requestAnimationFrame(draw);
  }

  resize();
  window.addEventListener("resize", resize);
  window.requestAnimationFrame(draw);
}

searchInput.addEventListener("input", (event) => {
  state.query = event.target.value;
  renderCards();
});

segments.forEach((segment) => {
  segment.addEventListener("click", () => {
    segments.forEach((button) => button.classList.remove("active"));
    segment.classList.add("active");
    state.filter = segment.dataset.filter;
    renderCards();
  });
});

importPreview.addEventListener("click", (event) => {
  const button = event.target.closest("[data-remove-import]");
  if (!button) return;
  state.pendingImports.splice(Number(button.dataset.removeImport), 1);
  renderImportPreview();
});

closeButton.addEventListener("click", () => dialog.close());
copyTableButton.addEventListener("click", copyReviewTable);
screenshotInput.addEventListener("change", handleScreenshotSelection);
dropZone.addEventListener("dragover", (event) => {
  event.preventDefault();
  dropZone.classList.add("dragging");
});
dropZone.addEventListener("dragleave", () => {
  dropZone.classList.remove("dragging");
});
dropZone.addEventListener("drop", async (event) => {
  event.preventDefault();
  dropZone.classList.remove("dragging");
  await addScreenshotFiles(event.dataTransfer.files);
});
saveImportedButton.addEventListener("click", savePendingImports);
clearImportedButton.addEventListener("click", clearImportedMistakes);
exportImportedButton.addEventListener("click", exportImportedMistakes);

startPreloader();
renderCards();
renderTable();
renderImportPreview();
startAmbientCanvas();
