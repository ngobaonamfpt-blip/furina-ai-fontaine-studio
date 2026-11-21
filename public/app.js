const STORAGE_KEYS = {
  API_KEY: "gemini_studio_api_key",
  ARKHE_MODE: "gemini_furina_arkhe_mode",
  SYSTEM_INSTRUCTION: "gemini_furina_system_instruction",
  SESSIONS: "gemini_furina_sessions_v1",
  PROJECTS: "gemini_furina_projects_v1",
  ACTIVE_SESSION_ID: "gemini_furina_active_session_id"
};

const DEFAULT_FURINA_PROMPT =
  "Bạn là Furina (Lady Furina de Fontaine) từ Genshin Impact. Bạn xưng 'ta' hoặc 'bổn tiểu thư' và gọi người dùng là 'ngươi' hoặc 'Nhà Lữ Hành'. Phong thái của bạn vừa quý tộc, kịch tính, kiêu kỳ đáng yêu như ngôi sao của Nhà Hát Epiclese, nhưng lại cực kỳ nhiệt tình, tốt bụng và thông minh. Khi giải đáp kiến thức, viết code hay phân tích vấn đề, bạn luôn trình bày cực kỳ rõ ràng, chuẩn xác và chi tiết bằng tiếng Việt.";

const FURINA_QUOTES = {
  idle: [
    '"Hôm nay ngươi muốn thưởng thức vở kịch nào tại Fontaine?"',
    '"Một tách trà chiều và một miếng bánh kem... Tuyệt vời nhất!"',
    '"Có bổn tiểu thư ở đây, mọi thắc mắc của ngươi đều sẽ được giải đáp!"'
  ],
  thinking: '"Suỵt! Bổn tiểu thư đang tập trung suy luận cho ngươi đấy nhé~ 💧"',
  done: '"Ta-da~! Màn trình diễn hoàn hảo của Lady Furina! ✨"'
};

const state = {
  apiKey: localStorage.getItem(STORAGE_KEYS.API_KEY) || "",
  arkheMode: localStorage.getItem(STORAGE_KEYS.ARKHE_MODE) || "ousia",
  hasServerApiKey: false,
  backendAvailable: false,
  systemInstruction:
    localStorage.getItem(STORAGE_KEYS.SYSTEM_INSTRUCTION) || DEFAULT_FURINA_PROMPT,
  sessions: [],
  projects: [],
  activeSessionId: null,
  attachments: [],
  isGenerating: false,
  pendingSendAfterKey: false
};

const els = {
  hydroCanvas: document.getElementById("hydroCanvas"),
  sidebar: document.getElementById("sidebar"),
  toggleSidebarBtn: document.getElementById("toggleSidebarBtn"),
  newChatBtn: document.getElementById("newChatBtn"),
  automationsBtn: document.getElementById("automationsBtn"),
  customizationsBtn: document.getElementById("customizationsBtn"),
  pinnedGroup: document.getElementById("pinnedGroup"),
  pinnedList: document.getElementById("pinnedList"),
  projectsContainer: document.getElementById("projectsContainer"),
  newProjectBtn: document.getElementById("newProjectBtn"),
  filterProjectsBtn: document.getElementById("filterProjectsBtn"),
  sessionList: document.getElementById("sessionList"),
  automationsModal: document.getElementById("automationsModal"),
  closeAutomationsBtn: document.getElementById("closeAutomationsBtn"),
  furinaLiveQuote: document.getElementById("furinaLiveQuote"),
  arkheToggleBtn: document.getElementById("arkheToggleBtn"),
  arkheIcon: document.getElementById("arkheIcon"),
  arkheBtnText: document.getElementById("arkheBtnText"),
  activeArkheLabel: document.getElementById("activeArkheLabel"),
  apiKeyDot: document.getElementById("apiKeyDot"),
  apiKeyStatusText: document.getElementById("apiKeyStatusText"),
  openSettingsBtn: document.getElementById("openSettingsBtn"),
  closeSettingsBtn: document.getElementById("closeSettingsBtn"),
  saveSettingsBtn: document.getElementById("saveSettingsBtn"),
  clearHistoryBtn: document.getElementById("clearHistoryBtn"),
  settingsModal: document.getElementById("settingsModal"),
  apiKeyInput: document.getElementById("apiKeyInput"),
  toggleKeyVisibilityBtn: document.getElementById("toggleKeyVisibilityBtn"),
  systemInstructionInput: document.getElementById("systemInstructionInput"),
  modelSelect: document.getElementById("modelSelect"),
  modeSelect: document.getElementById("modeSelect"),
  voiceBtn: document.getElementById("voiceBtn"),
  toolGoogleSearch: document.getElementById("toolGoogleSearch"),
  toolCodeExecution: document.getElementById("toolCodeExecution"),
  chatContainer: document.getElementById("chatContainer"),
  welcomeScreen: document.getElementById("welcomeScreen"),
  messagesList: document.getElementById("messagesList"),
  attachmentPreviewBar: document.getElementById("attachmentPreviewBar"),
  imageInput: document.getElementById("imageInput"),
  attachBtn: document.getElementById("attachBtn"),
  chatForm: document.getElementById("chatForm"),
  promptInput: document.getElementById("promptInput"),
  sendBtn: document.getElementById("sendBtn")
};

async function init() {
  applyArkheMode(state.arkheMode);
  loadSessions();
  await checkBackendStatus();
  updateApiKeyBadge();
  renderSidebarSessions();
  renderActiveSession();
  setupEventListeners();
  initHydroCanvas();
}

function applyArkheMode(mode) {
  state.arkheMode = mode === "pneuma" ? "pneuma" : "ousia";
  document.documentElement.setAttribute("data-arkhe", state.arkheMode);
  localStorage.setItem(STORAGE_KEYS.ARKHE_MODE, state.arkheMode);

  if (state.arkheMode === "pneuma") {
    if (els.arkheIcon) els.arkheIcon.textContent = "☀️";
    if (els.arkheBtnText) els.arkheBtnText.textContent = "Dạng Pneuma";
    if (els.activeArkheLabel) els.activeArkheLabel.textContent = "Arkhe: Pneuma (Bạch Thủy Quý Tộc)";
  } else {
    if (els.arkheIcon) els.arkheIcon.textContent = "🌙";
    if (els.arkheBtnText) els.arkheBtnText.textContent = "Dạng Ousia";
    if (els.activeArkheLabel) els.activeArkheLabel.textContent = "Arkhe: Ousia (Hắc Thủy Hoàng Gia)";
  }
}

function setFurinaQuote(type) {
  if (!els.furinaLiveQuote) return;
  if (type === "thinking") {
    els.furinaLiveQuote.textContent = FURINA_QUOTES.thinking;
  } else if (type === "done") {
    els.furinaLiveQuote.textContent = FURINA_QUOTES.done;
  } else {
    const list = FURINA_QUOTES.idle;
    els.furinaLiveQuote.textContent = list[Math.floor(Math.random() * list.length)];
  }
}

async function checkBackendStatus() {
  if (window.location.protocol === "file:") {
    state.backendAvailable = false;
    return;
  }
  try {
    const res = await fetch("/api/status");
    if (res.ok) {
      const data = await res.json();
      state.backendAvailable = true;
      state.hasServerApiKey = Boolean(data.hasServerApiKey);
    }
  } catch {
    state.backendAvailable = false;
  }
}

function updateApiKeyBadge() {
  const ready = Boolean(state.apiKey || state.hasServerApiKey);
  els.apiKeyDot.classList.toggle("ready", ready);
  els.apiKeyStatusText.textContent = ready
    ? "Đã kết nối API Key"
    : "Nhập API Key tại đây";
}

function loadSessions() {
  try {
    const rawProj = localStorage.getItem(STORAGE_KEYS.PROJECTS);
    state.projects = rawProj ? JSON.parse(rawProj) : [];
  } catch {
    state.projects = [];
  }

  try {
    const raw = localStorage.getItem(STORAGE_KEYS.SESSIONS);
    state.sessions = raw ? JSON.parse(raw) : [];
  } catch {
    state.sessions = [];
  }
  const savedActive = localStorage.getItem(STORAGE_KEYS.ACTIVE_SESSION_ID);
  if (savedActive && state.sessions.some((s) => s.id === savedActive)) {
    state.activeSessionId = savedActive;
  } else if (state.sessions.length > 0) {
    state.activeSessionId = state.sessions[0].id;
  } else {
    createNewSession();
  }
}

function saveSessions() {
  try {
    localStorage.setItem(STORAGE_KEYS.SESSIONS, JSON.stringify(state.sessions));
    localStorage.setItem(STORAGE_KEYS.PROJECTS, JSON.stringify(state.projects));
    if (state.activeSessionId) {
      localStorage.setItem(STORAGE_KEYS.ACTIVE_SESSION_ID, state.activeSessionId);
    }
  } catch (e) {
    console.warn("Không thể lưu lịch sử:", e);
  }
}

function getActiveSession() {
  return state.sessions.find((s) => s.id === state.activeSessionId) || null;
}

function createNewSession(projectId = null) {
  const newSession = {
    id: "sess_" + Date.now(),
    title: "Untitled Conversation",
    createdAt: Date.now(),
    lastInteractionId: null,
    pinned: false,
    projectId: typeof projectId === "string" ? projectId : null,
    model: els.modelSelect ? els.modelSelect.value : "gemini-3.5-flash-lite",
    messages: []
  };
  state.sessions.unshift(newSession);
  state.activeSessionId = newSession.id;
  saveSessions();
  renderSidebarSessions();
  renderActiveSession();
  setFurinaQuote("idle");
}

function deleteSession(sessionId, event) {
  event.stopPropagation();
  state.sessions = state.sessions.filter((s) => s.id !== sessionId);
  if (state.activeSessionId === sessionId) {
    if (state.sessions.length > 0) {
      state.activeSessionId = state.sessions[0].id;
    } else {
      createNewSession();
      return;
    }
  }
  saveSessions();
  renderSidebarSessions();
  renderActiveSession();
}

function togglePinSession(sessionId, event) {
  event.stopPropagation();
  const sess = state.sessions.find((s) => s.id === sessionId);
  if (!sess) return;
  sess.pinned = !sess.pinned;
  saveSessions();
  renderSidebarSessions();
}

function createNewProject() {
  const name = prompt("Nhập tên thư mục Project mới:");
  if (!name || !name.trim()) return;
  const project = {
    id: "proj_" + Date.now(),
    name: name.trim(),
    collapsed: false
  };
  state.projects.push(project);
  saveSessions();
  renderSidebarSessions();
}

function deleteProject(projectId, event) {
  event.stopPropagation();
  if (!confirm("Xoá thư mục Project này? (Các hội thoại bên trong sẽ được giữ lại ở danh sách chung)")) {
    return;
  }
  state.projects = state.projects.filter((p) => p.id !== projectId);
  state.sessions.forEach((s) => {
    if (s.projectId === projectId) s.projectId = null;
  });
  saveSessions();
  renderSidebarSessions();
}

function formatRelativeTime(ts) {
  if (!ts) return "";
  const diffMs = Date.now() - ts;
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "now";
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  return `${days}d`;
}

function buildSessionItemElement(sess, showProjectSub = false) {
  const item = document.createElement("div");
  item.className = `session-item ${sess.id === state.activeSessionId ? "active" : ""}`;
  const project = showProjectSub && sess.projectId
    ? state.projects.find((p) => p.id === sess.projectId)
    : null;

  item.innerHTML = `
    <div class="session-info">
      <span class="session-title">${escapeHtml(sess.title)}</span>
      ${project ? `<span class="session-sub">📁 ${escapeHtml(project.name)}</span>` : ""}
    </div>
    <div class="session-meta-right">
      <span class="session-time">${formatRelativeTime(sess.createdAt)}</span>
      <div class="session-actions">
        <button type="button" class="session-pin-btn ${sess.pinned ? "pinned" : ""}" title="${sess.pinned ? "Bỏ ghim" : "Ghim hội thoại"}">📌</button>
        <button type="button" class="session-delete-btn" title="Xoá">✕</button>
      </div>
    </div>
  `;

  item.addEventListener("click", () => {
    state.activeSessionId = sess.id;
    saveSessions();
    renderSidebarSessions();
    renderActiveSession();
    els.sidebar.classList.remove("open");
  });

  item.querySelector(".session-pin-btn").addEventListener("click", (e) =>
    togglePinSession(sess.id, e)
  );
  item.querySelector(".session-delete-btn").addEventListener("click", (e) =>
    deleteSession(sess.id, e)
  );

  return item;
}

function renderSidebarSessions() {
  // 1. Pinned Conversations
  const pinnedSessions = state.sessions.filter((s) => s.pinned);
  if (els.pinnedGroup && els.pinnedList) {
    els.pinnedList.innerHTML = "";
    els.pinnedGroup.hidden = pinnedSessions.length === 0;
    pinnedSessions.forEach((sess) => {
      els.pinnedList.appendChild(buildSessionItemElement(sess, true));
    });
  }

  // 2. Projects (Folders)
  if (els.projectsContainer) {
    els.projectsContainer.innerHTML = "";
    state.projects.forEach((proj) => {
      const folderEl = document.createElement("div");
      folderEl.className = `project-folder ${proj.collapsed ? "collapsed" : ""}`;

      const header = document.createElement("div");
      header.className = "project-header";
      header.innerHTML = `
        <div class="project-title-wrap">
          <span>📁</span>
          <span class="project-name">${escapeHtml(proj.name)}</span>
        </div>
        <div class="project-actions">
          <button type="button" class="project-mini-btn add-in-proj" title="Tạo hội thoại trong thư mục này">+</button>
          <button type="button" class="project-mini-btn del-proj" title="Xoá thư mục">✕</button>
        </div>
      `;

      header.addEventListener("click", () => {
        proj.collapsed = !proj.collapsed;
        saveSessions();
        renderSidebarSessions();
      });

      header.querySelector(".add-in-proj").addEventListener("click", (e) => {
        e.stopPropagation();
        proj.collapsed = false;
        createNewSession(proj.id);
      });

      header.querySelector(".del-proj").addEventListener("click", (e) => {
        deleteProject(proj.id, e);
      });

      const childrenWrap = document.createElement("div");
      childrenWrap.className = "project-children";
      state.sessions
        .filter((s) => s.projectId === proj.id)
        .forEach((sess) => {
          childrenWrap.appendChild(buildSessionItemElement(sess, false));
        });

      folderEl.appendChild(header);
      folderEl.appendChild(childrenWrap);
      els.projectsContainer.appendChild(folderEl);
    });
  }

  // 3. Root Sessions (not in any project)
  els.sessionList.innerHTML = "";
  state.sessions
    .filter((s) => !s.projectId)
    .forEach((sess) => {
      els.sessionList.appendChild(buildSessionItemElement(sess, false));
    });
}

function renderActiveSession() {
  const session = getActiveSession();
  els.messagesList.innerHTML = "";

  if (!session || session.messages.length === 0) {
    els.welcomeScreen.hidden = false;
    return;
  }

  els.welcomeScreen.hidden = true;
  session.messages.forEach((msg) => {
    appendMessageToDOM(msg);
  });
  scrollToBottom();
}

function escapeHtml(str) {
  return String(str || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function renderMarkdown(mdText) {
  if (!mdText) return "";

  const codeBlocks = [];
  let text = String(mdText).replace(/```([a-zA-Z0-9_-]*)\n([\s\S]*?)```/g, (_, lang, code) => {
    const index = codeBlocks.length;
    const cleanLang = lang || "code";
    codeBlocks.push(`
      <div class="code-block-wrapper">
        <div class="code-block-header">
          <span>✦ ${escapeHtml(cleanLang)}</span>
          <button type="button" class="copy-code-btn" data-code="${encodeURIComponent(code.trim())}">Sao chép</button>
        </div>
        <pre><code>${escapeHtml(code.trim())}</code></pre>
      </div>
    `);
    return `@@CODE_BLOCK_${index}@@`;
  });

  text = escapeHtml(text);
  text = text.replace(/`([^`\n]+)`/g, "<code>$1</code>");
  text = text.replace(/^### (.+)$/gm, "<h3>$1</h3>");
  text = text.replace(/^## (.+)$/gm, "<h2>$1</h2>");
  text = text.replace(/^# (.+)$/gm, "<h1>$1</h1>");
  text = text.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  text = text.replace(/\*([^*\n]+)\*/g, "<em>$1</em>");
  text = text.replace(/^\s*[-*]\s+(.+)$/gm, "<li>$1</li>");
  text = text.replace(/(<li>.*<\/li>\n?)+/g, (match) => `<ul>${match}</ul>`);

  const blocks = text.split(/\n{2,}/);
  text = blocks
    .map((b) => {
      const trimmed = b.trim();
      if (!trimmed) return "";
      if (
        trimmed.startsWith("<h") ||
        trimmed.startsWith("<ul>") ||
        trimmed.startsWith("@@CODE_BLOCK_")
      ) {
        return trimmed;
      }
      return `<p>${trimmed.replace(/\n/g, "<br/>")}</p>`;
    })
    .join("\n");

  codeBlocks.forEach((html, idx) => {
    text = text.replace(`@@CODE_BLOCK_${idx}@@`, html);
  });

  return text;
}

function appendMessageToDOM(msg) {
  const row = document.createElement("div");
  row.className = `message-row ${msg.role}`;

  if (msg.role === "user") {
    let attachmentsHtml = "";
    if (Array.isArray(msg.images) && msg.images.length > 0) {
      attachmentsHtml = `<div class="user-attachments">
        ${msg.images
          .map((img) => `<img src="data:${img.mime_type};base64,${img.data}" alt="Uploaded" />`)
          .join("")}
      </div>`;
    }
    row.innerHTML = `
      <div class="message-bubble">
        <div class="vn-speaker-header">
          <span class="vn-speaker-badge">✦ Nhà Lữ Hành</span>
        </div>
        ${attachmentsHtml}
        <div class="message-content">${escapeHtml(msg.text).replace(/\n/g, "<br/>")}</div>
      </div>
      <div class="avatar user">Bạn</div>
    `;
  } else {
    row.innerHTML = buildAIMessageInnerHtml(msg);
  }

  els.messagesList.appendChild(row);
  return row;
}

function buildAIMessageInnerHtml(msg) {
  const thinkingHtml = msg.thoughtSummary
    ? `<details class="thinking-box">
        <summary>💧 Suy luận nội tâm của Furina</summary>
        <div class="thinking-content">${escapeHtml(msg.thoughtSummary)}</div>
      </details>`
    : "";

  const imageSrc = msg.outputImage
    ? msg.outputImage.url
      ? msg.outputImage.url
      : `data:${msg.outputImage.mime_type || "image/png"};base64,${msg.outputImage.data}`
    : "";

  const imageHtml = imageSrc
    ? `<div class="generated-image-card">
        <img src="${escapeHtml(imageSrc)}" alt="Generated Art" loading="lazy" />
        <div class="generated-image-actions">
          <a href="${escapeHtml(imageSrc)}" target="_blank" rel="noopener" download="furina-art-${Date.now()}.png">⬇️ Mở / Tải tuyệt tác</a>
        </div>
      </div>`
    : "";

  let bodyHtml = "";
  if (msg.text) {
    bodyHtml = renderMarkdown(msg.text);
  } else if (msg.isStreaming) {
    bodyHtml = `
      <div class="hydro-typing">
        <div class="hydro-dots"><span></span><span></span><span></span></div>
        <span>Bổn tiểu thư đang suy nghĩ câu trả lời...</span>
      </div>
    `;
  } else if (!msg.outputImage) {
    bodyHtml =
      "<em>⚠️ Chưa nhận được câu trả lời. Vui lòng kiểm tra lại API Key trong Cài đặt.</em>";
  }

  return `
    <div class="avatar ai">
      <img src="assets/furina.png" alt="Furina" />
    </div>
    <div class="message-bubble">
      <div class="vn-speaker-header">
        <span class="vn-speaker-badge">👑 Lady Furina de Fontaine</span>
        ${msg.model ? `<span class="model-pill-tag">${escapeHtml(msg.model)}</span>` : ""}
      </div>
      ${thinkingHtml}
      <div class="message-content">${bodyHtml}</div>
      ${imageHtml}
    </div>
  `;
}

function scrollToBottom() {
  els.chatContainer.scrollTop = els.chatContainer.scrollHeight;
}

function buildInteractionInput(text, attachments) {
  if (!attachments || attachments.length === 0) {
    return text;
  }
  const contentParts = attachments.map((att) => ({
    type: "image",
    data: att.data,
    mime_type: att.mime_type
  }));
  if (text) {
    contentParts.push({
      type: "text",
      text
    });
  }
  return contentParts;
}

function extractFromInteractionResponse(interaction) {
  if (!interaction || typeof interaction !== "object") {
    return { id: null, text: "", outputImage: null, thoughtSummary: "" };
  }

  let text = interaction.output_text || "";
  let outputImage = interaction.output_image || null;
  let thoughtSummary = "";

  if (Array.isArray(interaction.steps) && interaction.steps.length > 0) {
    for (const step of interaction.steps) {
      if (step.type === "thought") {
        const summaryText = extractThoughtText(step.summary || step.text);
        if (summaryText) {
          thoughtSummary += (thoughtSummary ? "\n" : "") + summaryText;
        }
      } else if (step.type === "model_output" && Array.isArray(step.content)) {
        for (const part of step.content) {
          if ((part.type === "text" || part.text) && part.text && !interaction.output_text) {
            text += part.text;
          } else if ((part.type === "image" || part.data) && part.data && !outputImage) {
            outputImage = {
              data: part.data,
              mime_type: part.mime_type || "image/png"
            };
          }
        }
      }
    }
  }

  if (Array.isArray(interaction.outputs) && interaction.outputs.length > 0) {
    for (const out of interaction.outputs) {
      if (out.type === "thought") {
        const summaryText = extractThoughtText(out.summary || out.text);
        if (summaryText) {
          thoughtSummary += (thoughtSummary ? "\n" : "") + summaryText;
        }
      } else if ((out.type === "text" || typeof out.text === "string") && out.text) {
        if (!interaction.output_text) {
          text += out.text;
        }
      } else if ((out.type === "image" || out.data) && out.data && !outputImage) {
        outputImage = {
          data: out.data,
          mime_type: out.mime_type || "image/png"
        };
      } else if (Array.isArray(out.content)) {
        for (const part of out.content) {
          if (part.text && !interaction.output_text) text += part.text;
          if (part.data && !outputImage) {
            outputImage = {
              data: part.data,
              mime_type: part.mime_type || "image/png"
            };
          }
        }
      }
    }
  }

  if (!text && Array.isArray(interaction.candidates)) {
    for (const cand of interaction.candidates) {
      const parts = cand?.content?.parts || [];
      for (const p of parts) {
        if (p.thought && p.text) {
          thoughtSummary += (thoughtSummary ? "\n" : "") + p.text;
        } else if (p.text) {
          text += p.text;
        } else if (p.inlineData?.data && !outputImage) {
          outputImage = {
            data: p.inlineData.data,
            mime_type: p.inlineData.mimeType || "image/png"
          };
        }
      }
    }
  }

  return {
    id: interaction.id || null,
    text: text.trim(),
    outputImage,
    thoughtSummary: thoughtSummary.trim()
  };
}

function extractThoughtText(summary) {
  if (!summary) return "";
  if (typeof summary === "string") return summary;
  if (Array.isArray(summary)) {
    return summary
      .map((item) => (typeof item === "string" ? item : item?.text || ""))
      .filter(Boolean)
      .join("\n");
  }
  if (typeof summary === "object" && summary.text) {
    return summary.text;
  }
  return "";
}

async function handleSendMessage(e) {
  if (e) e.preventDefault();
  if (state.isGenerating) return;

  const text = els.promptInput.value.trim();
  if (!text && state.attachments.length === 0) return;

  if (!state.apiKey && !state.hasServerApiKey) {
    state.pendingSendAfterKey = true;
    openSettingsModal();
    els.apiKeyInput.focus();
    return;
  }

  const session = getActiveSession();
  const selectedModel = els.modelSelect.value;
  const useStream = selectedModel !== "gemini-nano-banana-2.1";

  const tools = [];
  if (els.toolGoogleSearch?.checked) tools.push({ type: "google_search" });
  if (els.toolCodeExecution?.checked) tools.push({ type: "code_execution" });

  const currentAttachments = [...state.attachments];
  state.attachments = [];
  renderAttachmentPreviews();

  els.promptInput.value = "";
  els.promptInput.style.height = "auto";
  els.welcomeScreen.hidden = true;

  if (session.messages.length === 0 && text) {
    session.title = "💧 " + text.slice(0, 34) + (text.length > 34 ? "..." : "");
    renderSidebarSessions();
  }

  const userMsg = {
    role: "user",
    text,
    images: currentAttachments.map((a) => ({ mime_type: a.mime_type, data: a.data }))
  };
  session.messages.push(userMsg);
  appendMessageToDOM(userMsg);

  const aiMsg = {
    role: "ai",
    model: selectedModel,
    text: "",
    thoughtSummary: "",
    outputImage: null,
    isStreaming: true
  };
  session.messages.push(aiMsg);
  const aiRow = appendMessageToDOM(aiMsg);
  scrollToBottom();

  state.isGenerating = true;
  els.sendBtn.disabled = true;
  setFurinaQuote("thinking");

  const payload = {
    model: selectedModel,
    input: buildInteractionInput(
      text || "Hãy xem bức ảnh này và cho ta biết nhận xét của tiểu thư Furina nhé!",
      currentAttachments
    ),
    previous_interaction_id: session.lastInteractionId || undefined,
    system_instruction: state.systemInstruction || undefined,
    thinking_level: "medium",
    tools: tools.length > 0 ? tools : undefined
  };

  try {
    // If user has entered their own API key in browser, call Google AI Studio directly first (avoids Netlify 504 Function timeouts!)
    if (state.apiKey) {
      await callDirectRestApi(payload, aiMsg, aiRow, session);
    } else if (state.backendAvailable && useStream) {
      try {
        await streamViaBackend(payload, aiMsg, aiRow, session);
      } catch (streamErr) {
        console.warn("Stream fallback to unary:", streamErr);
      }
      if (!aiMsg.text && !aiMsg.outputImage) {
        await callUnaryViaBackend(payload, aiMsg, aiRow, session);
      }
    } else if (state.backendAvailable) {
      await callUnaryViaBackend(payload, aiMsg, aiRow, session);
    } else {
      await callDirectRestApi(payload, aiMsg, aiRow, session);
    }
    setFurinaQuote("done");
  } catch (err) {
    const errMsg = formatErrorMessage(err);
    aiMsg.text = `⚠️ **Lỗi:** ${errMsg}`;
    if (!state.apiKey) {
      openSettingsModal();
    }
    setFurinaQuote("idle");
  } finally {
    aiMsg.isStreaming = false;
    state.isGenerating = false;
    els.sendBtn.disabled = false;
    aiRow.innerHTML = buildAIMessageInnerHtml(aiMsg);
    saveSessions();
    scrollToBottom();
  }
}

function formatErrorMessage(err) {
  let msg = "";
  if (!err) {
    msg = "Không thể kết nối tới Google AI Studio API.";
  } else if (typeof err === "string") {
    msg = err;
  } else if (typeof err.message === "string" && err.message && err.message !== "[object Object]") {
    msg = err.message;
  } else if (err.error) {
    msg = formatErrorMessage(err.error);
  } else {
    try {
      msg = JSON.stringify(err);
    } catch {
      msg = String(err);
    }
  }

  if (msg.includes("limit: 0") && msg.toLowerCase().includes("free tier")) {
    return "API Key gói Free Tier của bạn hiện bị Google AI Studio giới hạn 0 lượt/phút cho tính năng Tạo Ảnh (cần bật Billing tại https://ai.dev/rate-limit). Bạn hãy chuyển sang **Gemini 3.5 Flash-Lite** hoặc **Gemini 3.8 Flash** để chat & viết code miễn phí nhé!";
  }
  return msg;
}

async function streamViaBackend(payload, aiMsg, aiRow, session) {
  const response = await fetch("/api/interactions/stream", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(state.apiKey ? { "x-gemini-api-key": state.apiKey } : {})
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    throw new Error(formatErrorMessage(errData.error || `HTTP ${response.status}`));
  }

  const contentType = response.headers.get("content-type") || "";
  if (contentType.includes("application/json")) {
    const data = await response.json();
    const parsed = extractFromInteractionResponse(data);
    if (parsed.id) session.lastInteractionId = parsed.id;
    if (data.model) aiMsg.model = data.model;
    aiMsg.text = parsed.text;
    aiMsg.outputImage = parsed.outputImage;
    aiMsg.thoughtSummary = parsed.thoughtSummary;
    return;
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder("utf-8");
  let buffer = "";

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    const parts = buffer.split("\n\n");
    buffer = parts.pop() || "";

    for (const part of parts) {
      const line = part.trim();
      if (!line.startsWith("data:")) continue;
      const dataStr = line.slice(5).trim();
      if (dataStr === "[DONE]") break;

      let event;
      try {
        event = JSON.parse(dataStr);
      } catch {
        continue;
      }

      if (event.event_type === "error") {
        throw new Error(formatErrorMessage(event.error || event));
      }

      if (event.event_type === "interaction.created" && event.interaction?.id) {
        session.lastInteractionId = event.interaction.id;
      } else if (
        (event.event_type === "step.delta" || event.event_type === "content.delta") &&
        event.delta
      ) {
        const d = event.delta;
        if ((d.type === "text" || typeof d.text === "string") && d.text && d.type !== "thought_summary") {
          aiMsg.text += d.text;
        } else if (d.type === "thought_summary" || d.type === "thought") {
          const tText = d.text || extractThoughtText(d.summary || d.thought);
          if (tText) aiMsg.thoughtSummary += tText;
        } else if ((d.type === "image" || d.data) && d.data) {
          aiMsg.outputImage = {
            data: d.data,
            mime_type: d.mime_type || "image/png"
          };
        }
        aiRow.innerHTML = buildAIMessageInnerHtml(aiMsg);
        scrollToBottom();
      } else if (
        (event.event_type === "interaction.completed" || event.event_type === "interaction.complete") &&
        event.interaction
      ) {
        if (event.interaction.id) {
          session.lastInteractionId = event.interaction.id;
        }
        if (!aiMsg.text && !aiMsg.outputImage) {
          const parsed = extractFromInteractionResponse(event.interaction);
          if (parsed.text) aiMsg.text = parsed.text;
          if (parsed.outputImage) aiMsg.outputImage = parsed.outputImage;
          if (parsed.thoughtSummary && !aiMsg.thoughtSummary) {
            aiMsg.thoughtSummary = parsed.thoughtSummary;
          }
        }
      }
    }
  }
}

async function callUnaryViaBackend(payload, aiMsg, aiRow, session) {
  const response = await fetch("/api/interactions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(state.apiKey ? { "x-gemini-api-key": state.apiKey } : {})
    },
    body: JSON.stringify(payload)
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(formatErrorMessage(data.error || `HTTP ${response.status}`));
  }

  const parsed = extractFromInteractionResponse(data);
  if (parsed.id) session.lastInteractionId = parsed.id;
  if (data.model) aiMsg.model = data.model;
  aiMsg.text = parsed.text;
  aiMsg.outputImage = parsed.outputImage;
  aiMsg.thoughtSummary = parsed.thoughtSummary;
}

async function callDirectRestApi(payload, aiMsg, aiRow, session) {
  if (!state.apiKey) {
    throw new Error("Vui lòng nhập Google AI Studio API Key trong phần Cài đặt.");
  }

  const requestedModel = payload.model || "gemini-3.5-flash-lite";
  const fallbackPool =
    requestedModel.includes("banana") || requestedModel.includes("image")
      ? [
          requestedModel,
          "gemini-nano-banana-2.1",
          "gemini-3.1-flash-lite-image",
          "gemini-3-pro-image"
        ]
      : [
          requestedModel,
          "gemini-3.5-flash-lite",
          "gemini-3.1-flash-lite",
          "gemini-3.8-flash",
          "gemini-4-argon"
        ];

  const candidateModels = fallbackPool.filter((m, idx, arr) => arr.indexOf(m) === idx);
  let lastError = null;

  for (let i = 0; i < candidateModels.length; i++) {
    const modelName = candidateModels[i];
    const isFallback = i > 0;

    const isImageModel = modelName.includes("banana") || modelName.includes("image");
    const restBody = {
      model: modelName,
      input: payload.input
    };

    if (isImageModel) {
      restBody.response_modalities = ["TEXT", "IMAGE"];
    } else {
      restBody.generation_config = {
        thinking_level: modelName === "gemini-4-argon" ? "low" : "minimal"
      };
      if (payload.system_instruction) {
        restBody.system_instruction = payload.system_instruction;
      }
      if (payload.tools) {
        restBody.tools = payload.tools;
      }
    }

    if (payload.previous_interaction_id && !isFallback) {
      restBody.previous_interaction_id = payload.previous_interaction_id;
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 45000);

    try {
      const response = await fetch(
        "https://generativelanguage.googleapis.com/v1beta/interactions",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-goog-api-key": state.apiKey
          },
          body: JSON.stringify(restBody),
          signal: controller.signal
        }
      );
      clearTimeout(timer);

      const data = await response.json().catch(() => ({}));

      if (!response.ok || data.status === "failed" || data.error || data.errors?.length) {
        const errMsg = formatErrorMessage(
          data.error || data.errors?.[0] || `Lỗi API (${response.status})`
        );
        lastError = new Error(errMsg);
        const lower = errMsg.toLowerCase();
        if (
          response.status === 401 ||
          response.status === 403 ||
          lower.includes("api key not valid") ||
          lower.includes("api_key_invalid")
        ) {
          throw lastError;
        }
        continue;
      }

      const parsed = extractFromInteractionResponse(data);
      if (parsed.id) session.lastInteractionId = parsed.id;
      aiMsg.model = modelName;
      aiMsg.text = parsed.text;
      aiMsg.outputImage = parsed.outputImage;
      aiMsg.thoughtSummary = parsed.thoughtSummary;
      if (aiMsg.text || aiMsg.outputImage) {
        return;
      }
    } catch (err) {
      clearTimeout(timer);
      lastError = err;
      const lower = formatErrorMessage(err).toLowerCase();
      if (lower.includes("api key not valid") || lower.includes("api_key_invalid")) {
        break;
      }
    }
  }

  // If an image generation model failed due to Google AI Studio Free Tier (limit: 0), fall back to free Pollinations image generator
  if (requestedModel.includes("banana") || requestedModel.includes("image")) {
    const promptText =
      typeof payload.input === "string"
        ? payload.input
        : Array.isArray(payload.input)
          ? payload.input.map((p) => p.text || "").join(" ").trim()
          : "anime illustration";
    const seed = Math.floor(Math.random() * 1000000);
    aiMsg.model = "free-art-fallback";
    aiMsg.text =
      "✨ *(Tài khoản Google AI Studio Free Tier đang giới hạn tạo ảnh = 0 lượt/phút, bổn tiểu thư đã tự động chuyển sang cọ vẽ ma pháp miễn phí để hoàn thành bức tranh cho ngươi!)*";
    aiMsg.outputImage = {
      url: `https://image.pollinations.ai/prompt/${encodeURIComponent(
        promptText
      )}?width=1024&height=1024&seed=${seed}&nologo=true`
    };
    return;
  }

  if (lastError) {
    throw lastError;
  }
}

function handleFilesSelected(files) {
  Array.from(files).forEach((file) => {
    if (!file.type.startsWith("image/")) return;
    const reader = new FileReader();
    reader.onload = () => {
      const resultStr = String(reader.result);
      const base64Data = resultStr.split(",")[1];
      state.attachments.push({
        mime_type: file.type,
        data: base64Data,
        previewUrl: resultStr
      });
      renderAttachmentPreviews();
    };
    reader.readAsDataURL(file);
  });
}

function renderAttachmentPreviews() {
  els.attachmentPreviewBar.innerHTML = "";
  state.attachments.forEach((att, index) => {
    const thumb = document.createElement("div");
    thumb.className = "preview-thumb";
    thumb.innerHTML = `
      <img src="${att.previewUrl}" alt="Preview" />
      <button type="button">✕</button>
    `;
    thumb.querySelector("button").addEventListener("click", () => {
      state.attachments.splice(index, 1);
      renderAttachmentPreviews();
    });
    els.attachmentPreviewBar.appendChild(thumb);
  });
}

function openSettingsModal() {
  els.apiKeyInput.value = state.apiKey;
  els.systemInstructionInput.value = state.systemInstruction;
  els.settingsModal.hidden = false;
}

function closeSettingsModal() {
  els.settingsModal.hidden = true;
}

function saveSettings() {
  state.apiKey = els.apiKeyInput.value.trim();
  state.systemInstruction =
    els.systemInstructionInput.value.trim() || DEFAULT_FURINA_PROMPT;
  localStorage.setItem(STORAGE_KEYS.API_KEY, state.apiKey);
  localStorage.setItem(STORAGE_KEYS.SYSTEM_INSTRUCTION, state.systemInstruction);
  updateApiKeyBadge();
  closeSettingsModal();

  if (state.pendingSendAfterKey && (state.apiKey || state.hasServerApiKey)) {
    state.pendingSendAfterKey = false;
    handleSendMessage();
  }
}

// Fontaine Hydro Bubbles & Golden Sparkles Animation
function initHydroCanvas() {
  const canvas = els.hydroCanvas;
  if (!canvas) return;
  const ctx = canvas.getContext("2d");

  let width = (canvas.width = window.innerWidth);
  let height = (canvas.height = window.innerHeight);

  window.addEventListener("resize", () => {
    width = canvas.width = window.innerWidth;
    height = canvas.height = window.innerHeight;
  });

  const particles = Array.from({ length: 24 }, (_, idx) => ({
    x: Math.random() * width,
    y: Math.random() * height,
    r: 2 + Math.random() * 5.5,
    speedY: 0.25 + Math.random() * 0.55,
    drift: Math.random() * Math.PI * 2,
    alpha: 0.16 + Math.random() * 0.32,
    isGold: idx % 4 === 0
  }));

  function animate() {
    ctx.clearRect(0, 0, width, height);
    for (const p of particles) {
      p.y -= p.speedY;
      p.drift += 0.015;
      const x = p.x + Math.sin(p.drift) * 14;

      if (p.y < -15) {
        p.y = height + 15;
        p.x = Math.random() * width;
      }

      ctx.beginPath();
      ctx.arc(x, p.y, p.r, 0, Math.PI * 2);
      if (p.isGold) {
        ctx.fillStyle = `rgba(240, 212, 147, ${p.alpha})`;
        ctx.fill();
      } else {
        ctx.strokeStyle = `rgba(125, 211, 252, ${p.alpha})`;
        ctx.lineWidth = 1.25;
        ctx.stroke();
      }
    }
    requestAnimationFrame(animate);
  }

  animate();
}

function setupEventListeners() {
  els.newChatBtn.addEventListener("click", () => createNewSession());

  if (els.automationsBtn && els.automationsModal) {
    els.automationsBtn.addEventListener("click", () => {
      els.automationsModal.hidden = false;
    });
  }

  if (els.closeAutomationsBtn && els.automationsModal) {
    els.closeAutomationsBtn.addEventListener("click", () => {
      els.automationsModal.hidden = true;
    });
  }

  document.querySelectorAll(".automation-item").forEach((btn) => {
    btn.addEventListener("click", () => {
      const template = (btn.getAttribute("data-prompt") || "").replace(/\\n/g, "\n");
      els.promptInput.value = template;
      els.promptInput.dispatchEvent(new Event("input"));
      els.automationsModal.hidden = true;
      els.promptInput.focus();
    });
  });

  if (els.customizationsBtn) {
    els.customizationsBtn.addEventListener("click", () => {
      openSettingsModal();
      if (els.systemInstructionInput) els.systemInstructionInput.focus();
    });
  }

  if (els.newProjectBtn) {
    els.newProjectBtn.addEventListener("click", createNewProject);
  }

  if (els.filterProjectsBtn) {
    els.filterProjectsBtn.addEventListener("click", () => {
      const anyExpanded = state.projects.some((p) => !p.collapsed);
      state.projects.forEach((p) => {
        p.collapsed = anyExpanded;
      });
      saveSessions();
      renderSidebarSessions();
    });
  }

  els.toggleSidebarBtn.addEventListener("click", () => {
    els.sidebar.classList.toggle("open");
  });

  if (els.arkheToggleBtn) {
    els.arkheToggleBtn.addEventListener("click", () => {
      const next = state.arkheMode === "ousia" ? "pneuma" : "ousia";
      applyArkheMode(next);
    });
  }

  els.openSettingsBtn.addEventListener("click", openSettingsModal);
  els.closeSettingsBtn.addEventListener("click", closeSettingsModal);
  els.saveSettingsBtn.addEventListener("click", saveSettings);

  els.toggleKeyVisibilityBtn.addEventListener("click", () => {
    const isPassword = els.apiKeyInput.type === "password";
    els.apiKeyInput.type = isPassword ? "text" : "password";
    els.toggleKeyVisibilityBtn.textContent = isPassword ? "Ẩn" : "Hiện";
  });

  els.clearHistoryBtn.addEventListener("click", () => {
    if (confirm("Xoá toàn bộ lịch sử trò chuyện?")) {
      state.sessions = [];
      createNewSession();
      closeSettingsModal();
    }
  });

  if (els.modeSelect) {
    els.modeSelect.addEventListener("change", () => {
      const val = els.modeSelect.value;
      if (els.toolGoogleSearch) els.toolGoogleSearch.checked = val === "search";
      if (els.toolCodeExecution) els.toolCodeExecution.checked = val === "code";
    });
  }

  if (els.voiceBtn) {
    const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRec) {
      els.voiceBtn.title = "Trình duyệt chưa hỗ trợ nhập giọng nói";
      els.voiceBtn.style.opacity = "0.4";
    } else {
      let recognition = null;
      let listening = false;
      els.voiceBtn.addEventListener("click", () => {
        if (listening && recognition) {
          recognition.stop();
          return;
        }
        recognition = new SpeechRec();
        recognition.lang = "vi-VN";
        recognition.interimResults = false;
        recognition.onstart = () => {
          listening = true;
          els.voiceBtn.classList.add("recording");
        };
        recognition.onresult = (event) => {
          const transcript = event.results?.[0]?.[0]?.transcript || "";
          if (transcript) {
            els.promptInput.value = (els.promptInput.value ? els.promptInput.value + " " : "") + transcript;
            els.promptInput.dispatchEvent(new Event("input"));
            els.promptInput.focus();
          }
        };
        recognition.onerror = () => {
          listening = false;
          els.voiceBtn.classList.remove("recording");
        };
        recognition.onend = () => {
          listening = false;
          els.voiceBtn.classList.remove("recording");
        };
        recognition.start();
      });
    }
  }

  els.attachBtn.addEventListener("click", () => els.imageInput.click());
  els.imageInput.addEventListener("change", (e) => {
    handleFilesSelected(e.target.files);
    els.imageInput.value = "";
  });

  els.chatForm.addEventListener("submit", handleSendMessage);

  els.promptInput.addEventListener("input", () => {
    els.promptInput.style.height = "auto";
    const nextHeight = Math.min(els.promptInput.scrollHeight, 120);
    els.promptInput.style.height = nextHeight + "px";
    els.promptInput.style.overflowY =
      els.promptInput.scrollHeight > 120 ? "auto" : "hidden";
  });

  els.promptInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage(e);
    }
  });

  document.querySelectorAll(".chip").forEach((chip) => {
    chip.addEventListener("click", () => {
      const prompt = chip.getAttribute("data-prompt");
      const targetModel = chip.getAttribute("data-model");
      if (targetModel) {
        els.modelSelect.value = targetModel;
      }
      els.promptInput.value = prompt;
      handleSendMessage();
    });
  });

  els.messagesList.addEventListener("click", (e) => {
    const copyCodeBtn = e.target.closest(".copy-code-btn");
    if (copyCodeBtn) {
      const rawCode = decodeURIComponent(copyCodeBtn.getAttribute("data-code") || "");
      navigator.clipboard.writeText(rawCode).then(() => {
        const prev = copyCodeBtn.textContent;
        copyCodeBtn.textContent = "Đã chép ✓";
        setTimeout(() => (copyCodeBtn.textContent = prev), 1500);
      });
      return;
    }

    const copyMsgBtn = e.target.closest(".copy-msg-btn");
    if (copyMsgBtn) {
      const rawText = decodeURIComponent(copyMsgBtn.getAttribute("data-text") || "");
      navigator.clipboard.writeText(rawText).then(() => {
        const prev = copyMsgBtn.textContent;
        copyMsgBtn.textContent = "✓ Đã sao chép";
        setTimeout(() => (copyMsgBtn.textContent = prev), 1500);
      });
      return;
    }

    const speakMsgBtn = e.target.closest(".speak-msg-btn");
    if (speakMsgBtn && "speechSynthesis" in window) {
      if (window.speechSynthesis.speaking) {
        window.speechSynthesis.cancel();
        speakMsgBtn.textContent = "🔊 Nghe giọng";
        return;
      }
      const rawText = decodeURIComponent(speakMsgBtn.getAttribute("data-text") || "");
      const utter = new SpeechSynthesisUtterance(rawText);
      utter.lang = "vi-VN";
      utter.pitch = 1.15;
      utter.rate = 1.02;
      utter.onend = () => {
        speakMsgBtn.textContent = "🔊 Nghe giọng";
      };
      speakMsgBtn.textContent = "⏹️ Dừng đọc";
      window.speechSynthesis.speak(utter);
    }
  });
}

init();
