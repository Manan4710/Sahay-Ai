// ---------- Elements ----------
const $ = (id) => document.getElementById(id);
const messagesEl = $("messages"), welcomeEl = $("welcome"), inputEl = $("input");
const sendBtn = $("sendBtn"), historyEl = $("history"), topTitle = $("topTitle");
const sidebar = $("sidebar"), scrim = $("scrim");

// ---------- State (saved in the browser's localStorage) ----------
const KEY = "sahay.chats";
let chats = [];
let activeId = null;
let busy = false;

function load() {
  try { chats = JSON.parse(localStorage.getItem(KEY)) || []; } catch { chats = []; }
}
function save() {
  try { localStorage.setItem(KEY, JSON.stringify(chats)); } catch {}
}
const active = () => chats.find((c) => c.id === activeId);

function newChat() {
  const chat = { id: String(Date.now()), title: "New chat", messages: [] };
  chats.unshift(chat);
  activeId = chat.id;
  save(); renderAll(); closeMenu(); inputEl.focus();
}

// ---------- Rendering ----------
function renderAll() { renderHistory(); renderMessages(); }

function renderHistory() {
  historyEl.innerHTML = "";
  chats.forEach((c) => {
    const row = document.createElement("div");
    row.className = "history-item" + (c.id === activeId ? " active" : "");
    row.tabIndex = 0;
    row.innerHTML = '<span class="t"></span><button class="del" aria-label="Delete chat">×</button>';
    row.querySelector(".t").textContent = c.title;
    row.addEventListener("click", () => { activeId = c.id; renderAll(); closeMenu(); });
    row.addEventListener("keydown", (e) => { if (e.key === "Enter") row.click(); });
    row.querySelector(".del").addEventListener("click", (e) => {
      e.stopPropagation();
      chats = chats.filter((x) => x.id !== c.id);
      if (activeId === c.id) activeId = chats[0]?.id || null;
      if (!chats.length) newChat(); else { save(); renderAll(); }
    });
    historyEl.appendChild(row);
  });
}

function renderMessages() {
  const chat = active();
  messagesEl.querySelectorAll(".msg").forEach((n) => n.remove());
  topTitle.textContent = chat ? chat.title : "New chat";
  const empty = !chat || chat.messages.length === 0;
  welcomeEl.style.display = empty ? "" : "none";
  if (!chat) return;
  chat.messages.forEach((m) => addMessage(m.role, m.content));
  scrollDown();
}

function addMessage(role, content) {
  const wrap = document.createElement("div");
  wrap.className = "msg " + (role === "user" ? "user" : "ai");
  if (role === "user") {
    const b = document.createElement("div");
    b.className = "bubble";
    b.textContent = content;           // textContent = safe, no HTML injection
    wrap.appendChild(b);
  } else {
    wrap.innerHTML = '<div class="avatar">स</div><div class="body"></div>';
    fillAnswer(wrap.querySelector(".body"), content);
  }
  messagesEl.appendChild(wrap);
  return wrap;
}

// Turn the AI's markdown text into clean HTML (headings, lists, code, tables)
function fillAnswer(el, text) {
  const html = DOMPurify.sanitize(marked.parse(text, { breaks: true }));
  el.innerHTML = html;

  el.querySelectorAll("pre").forEach((pre) => {
    const btn = document.createElement("button");
    btn.className = "copy-code"; btn.type = "button"; btn.textContent = "Copy";
    btn.addEventListener("click", () => copy(pre.querySelector("code")?.innerText || pre.innerText, btn));
    pre.appendChild(btn);
  });
  el.querySelectorAll("table").forEach((t) => {
    const w = document.createElement("div"); w.className = "table-wrap";
    t.replaceWith(w); w.appendChild(t);
  });
  el.querySelectorAll("a").forEach((a) => { a.target = "_blank"; a.rel = "noopener noreferrer"; });

  const cr = document.createElement("button");
  cr.className = "copy-reply"; cr.type = "button"; cr.textContent = "Copy answer";
  cr.addEventListener("click", () => copy(text, cr, "Copy answer"));
  el.appendChild(cr);
}

async function copy(text, btn, label = "Copy") {
  try { await navigator.clipboard.writeText(text); btn.textContent = "Copied"; }
  catch { btn.textContent = "Failed"; }
  setTimeout(() => (btn.textContent = label), 1500);
}

function scrollDown() { messagesEl.scrollTop = messagesEl.scrollHeight; }

// ---------- Sending ----------
async function send(text) {
  text = text.trim();
  if (!text || busy) return;
  if (!active()) newChat();
  const chat = active();

  chat.messages.push({ role: "user", content: text });
  if (chat.messages.length === 1) {
    chat.title = text.length > 36 ? text.slice(0, 36) + "…" : text;
  }
  save(); renderAll();
  inputEl.value = ""; autoGrow();
  await getReply(chat);
}

async function getReply(chat) {
  busy = true; sendBtn.disabled = true;

  const typing = document.createElement("div");
  typing.className = "msg ai";
  typing.innerHTML = '<div class="avatar">स</div><div class="body"><span class="typing"><i></i><i></i><i></i></span></div>';
  messagesEl.appendChild(typing); scrollDown();

  try {
    // Our own backend function (keeps the API key secret)
    const res = await fetch("/.netlify/functions/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages: chat.messages }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || "Something went wrong. Please try again.");

    chat.messages.push({ role: "assistant", content: data.reply });
    save(); typing.remove(); addMessage("assistant", data.reply);
  } catch (err) {
    typing.className = "msg ai error";
    typing.querySelector(".body").innerHTML = "";
    const p = document.createElement("div");
    p.textContent = err.message;
    const retry = document.createElement("button");
    retry.className = "retry"; retry.type = "button"; retry.textContent = "Try again";
    retry.addEventListener("click", () => { typing.remove(); getReply(chat); });
    typing.querySelector(".body").append(p, retry);
  } finally {
    busy = false; sendBtn.disabled = false; scrollDown(); inputEl.focus();
  }
}

// ---------- Input behaviour ----------
function autoGrow() {
  inputEl.style.height = "auto";
  inputEl.style.height = Math.min(inputEl.scrollHeight, 180) + "px";
}
inputEl.addEventListener("input", autoGrow);
inputEl.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(inputEl.value); }
});
$("composer").addEventListener("submit", (e) => { e.preventDefault(); send(inputEl.value); });
document.querySelectorAll(".chip").forEach((c) => c.addEventListener("click", () => send(c.textContent)));
$("newChat").addEventListener("click", newChat);

// ---------- Mobile menu + theme ----------
function closeMenu() { sidebar.classList.remove("open"); scrim.classList.remove("show"); }
$("menuBtn").addEventListener("click", () => { sidebar.classList.add("open"); scrim.classList.add("show"); });
scrim.addEventListener("click", closeMenu);

function setTheme(t) {
  document.documentElement.dataset.theme = t;
  try { localStorage.setItem("sahay.theme", t); } catch {}
}
$("themeBtn").addEventListener("click", () => {
  setTheme(document.documentElement.dataset.theme === "dark" ? "light" : "dark");
});
try {
  setTheme(localStorage.getItem("sahay.theme") ||
    (matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"));
} catch { setTheme("light"); }

// ---------- Start ----------
load();
if (!chats.length) newChat(); else { activeId = chats[0].id; renderAll(); }
