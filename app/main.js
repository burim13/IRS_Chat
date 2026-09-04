import { initApiKeyGate, wireClearKeyButton } from './apiKey.js';
import { loadManifest, loadYearIndex } from './data.js';
import { renderYearSelect, renderDocTree, wirePreviewClose } from './sidebar.js';
import { answerQuestion } from './chat.js';

const MODEL_STORAGE_KEY = 'irsChat.model';
const YEAR_STORAGE_KEY = 'irsChat.year';

let state = {
  manifest: null,
  year: null,
  yearIndex: null,
};

initApiKeyGate({ onReady: boot });

async function boot() {
  wireClearKeyButton();
  wirePreviewClose();
  wireSettingsPanel();
  wireModelSelect();
  wireChatForm();

  const statusEl = document.getElementById('index-status');
  try {
    state.manifest = await loadManifest();
  } catch (err) {
    statusEl.textContent = `Could not load document manifest: ${err.message}`;
    return;
  }

  const savedYear = localStorage.getItem(YEAR_STORAGE_KEY);
  const initialYear = state.manifest.years.includes(savedYear)
    ? savedYear
    : [...state.manifest.years].sort().reverse()[0];

  renderYearSelect(state.manifest, initialYear, selectYear);
  await selectYear(initialYear);
}

async function selectYear(year) {
  state.year = year;
  state.yearIndex = null;
  localStorage.setItem(YEAR_STORAGE_KEY, year);
  renderDocTree(state.manifest, year);
  setChatEnabled(false, year ? `Loading documents for ${year}...` : 'No indexed years available.');

  const statusEl = document.getElementById('index-status');
  if (!year) {
    statusEl.textContent = 'No indexed years available.';
    return;
  }
  // The index is tens of MB (base64-encoded embeddings for every indexed
  // chunk) - fetching and JSON-parsing it takes real time on a normal
  // connection, so chat stays disabled until it's actually ready instead of
  // silently failing with "no documents indexed" if someone asks early.
  statusEl.textContent = `Loading search index for ${year} (this can take a little while - it's a large file)...`;
  try {
    state.yearIndex = await loadYearIndex(year);
    statusEl.textContent = `${state.yearIndex.chunks.length} indexed excerpts across ${state.yearIndex.docs.length} documents for ${year}.`;
    setChatEnabled(true);
  } catch (err) {
    statusEl.textContent = `Could not load index for ${year}: ${err.message}`;
    setChatEnabled(false, 'Failed to load the search index - see status message above.');
  }
}

function setChatEnabled(enabled, placeholder) {
  const input = document.getElementById('chat-input');
  const sendBtn = document.getElementById('send-btn');
  input.disabled = !enabled;
  sendBtn.disabled = !enabled;
  if (!enabled && placeholder) input.placeholder = placeholder;
  else if (enabled) input.placeholder = "Ask a question about the selected tax year's IRS documents...";
}

function wireSettingsPanel() {
  const btn = document.getElementById('settings-btn');
  const panel = document.getElementById('settings-panel');
  btn.addEventListener('click', () => {
    panel.hidden = !panel.hidden;
  });
}

function wireModelSelect() {
  const select = document.getElementById('model-select');
  const saved = localStorage.getItem(MODEL_STORAGE_KEY);
  if (saved) select.value = saved;
  select.addEventListener('change', () => {
    localStorage.setItem(MODEL_STORAGE_KEY, select.value);
  });
}

function getSelectedModel() {
  return document.getElementById('model-select').value || 'claude-sonnet-5';
}

function wireChatForm() {
  const form = document.getElementById('chat-form');
  const input = document.getElementById('chat-input');
  const sendBtn = document.getElementById('send-btn');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const question = input.value.trim();
    if (!question) return;
    // Belt-and-suspenders: the input is disabled until the index is ready
    // (see setChatEnabled), but guard here too in case this fires anyway.
    if (!state.yearIndex || !state.yearIndex.chunks.length) {
      addNoAnswer('The search index for this year is not ready yet - please wait for it to finish loading.');
      return;
    }

    addUserMessage(question);
    input.value = '';
    sendBtn.disabled = true;

    const thinkingEl = addThinking();
    try {
      const result = await answerQuestion({
        question,
        year: state.year,
        yearIndex: state.yearIndex,
        model: getSelectedModel(),
        onStatus: (msg) => {
          if (msg) thinkingEl.textContent = msg;
        },
      });
      thinkingEl.remove();
      renderAssistantAnswer(result);
    } catch (err) {
      thinkingEl.remove();
      addNoAnswer(`Something went wrong: ${err.message}`);
    } finally {
      sendBtn.disabled = false;
    }
  });
}

function messagesEl() {
  return document.getElementById('messages');
}

function scrollToBottom() {
  const el = messagesEl();
  el.scrollTop = el.scrollHeight;
}

function addUserMessage(text) {
  const div = document.createElement('div');
  div.className = 'msg msg-user';
  div.textContent = text;
  messagesEl().appendChild(div);
  scrollToBottom();
}

function addThinking() {
  const div = document.createElement('div');
  div.className = 'msg thinking';
  div.textContent = 'Thinking...';
  messagesEl().appendChild(div);
  scrollToBottom();
  return div;
}

function addNoAnswer(text) {
  const wrapper = document.createElement('div');
  wrapper.className = 'msg msg-assistant';
  wrapper.innerHTML = `<div class="no-answer">${escapeHtml(text)}</div>`;
  messagesEl().appendChild(wrapper);
  scrollToBottom();
}

function renderAssistantAnswer(result) {
  const wrapper = document.createElement('div');
  wrapper.className = 'msg msg-assistant';

  if (result.noAnswer) {
    wrapper.innerHTML = '<div class="no-answer">No relevant excerpt was found in the indexed documents for this year. This may not be covered by the currently indexed forms, instructions, or publications.</div>';
    messagesEl().appendChild(wrapper);
    scrollToBottom();
    return;
  }

  const exactSection = document.createElement('div');
  exactSection.className = 'answer-section';
  exactSection.innerHTML = '<h4>Exact language</h4>';
  for (const { chunk } of result.chunks) {
    const div = document.createElement('div');
    div.className = 'excerpt';
    div.innerHTML = `<blockquote>${escapeHtml(chunk.text)}</blockquote><cite>${escapeHtml(chunk.number)} — ${escapeHtml(chunk.title)}, ${escapeHtml(chunk.year)}, page ${chunk.page}</cite>`;
    exactSection.appendChild(div);
  }
  wrapper.appendChild(exactSection);

  const plainSection = document.createElement('div');
  plainSection.className = 'answer-section';
  plainSection.innerHTML = '<h4>In plain English</h4>';
  const plainBody = document.createElement('div');
  plainBody.className = 'plain-english';
  plainBody.textContent = result.plainEnglish;
  plainSection.appendChild(plainBody);
  wrapper.appendChild(plainSection);

  messagesEl().appendChild(wrapper);
  scrollToBottom();
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str ?? '';
  return div.innerHTML;
}
