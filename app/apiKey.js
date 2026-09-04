// Local-only Claude API key storage. Never sent anywhere except directly
// to api.anthropic.com from the browser (see chat.js).

const STORAGE_KEY = 'irsChat.apiKey';

export function getApiKey() {
  return localStorage.getItem(STORAGE_KEY) || '';
}

export function setApiKey(key) {
  localStorage.setItem(STORAGE_KEY, key.trim());
}

export function clearApiKey() {
  localStorage.removeItem(STORAGE_KEY);
}

export function initApiKeyGate({ onReady }) {
  const overlay = document.getElementById('key-overlay');
  const form = document.getElementById('key-form');
  const input = document.getElementById('key-input');
  const errorEl = document.getElementById('key-error');

  function showApp() {
    overlay.hidden = true;
    document.getElementById('app').hidden = false;
    onReady();
  }

  if (getApiKey()) {
    showApp();
    return;
  }

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const key = input.value.trim();
    if (!key.startsWith('sk-ant-')) {
      errorEl.textContent = 'That doesn\'t look like a valid Claude API key (should start with "sk-ant-").';
      errorEl.hidden = false;
      return;
    }
    errorEl.hidden = true;
    setApiKey(key);
    showApp();
  });
}

export function wireClearKeyButton() {
  document.getElementById('clear-key-btn').addEventListener('click', () => {
    if (!confirm('Clear the saved Claude API key from this browser? You will need to re-enter it to keep chatting.')) return;
    clearApiKey();
    location.reload();
  });
}
