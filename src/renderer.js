const MAX_ENTRIES = 15;
const container = document.getElementById('allowlist-container');
const warning = document.getElementById('cap-warning');

// Setup UI
addInput();

function addInput() {
  const inputs = container.querySelectorAll('.allowlist-input');
  if (inputs.length >= MAX_ENTRIES) return;

  const input = document.createElement('input');
  input.type = 'text';
  input.className = 'allowlist-input';
  input.placeholder = inputs.length === 0 ? 'e.g. docs.python.org' : '';
  input.addEventListener('input', handleInput);
  container.appendChild(input);
}

function handleInput(e) {
  const inputs = Array.from(container.querySelectorAll('.allowlist-input'));
  const isLastInput = inputs.indexOf(e.target) === inputs.length - 1;
  const hasValue = e.target.value.trim() !== '';

  if (isLastInput && hasValue) {
    if (inputs.length < MAX_ENTRIES) {
      addInput();
    } else {
      warning.classList.remove('hidden');
    }
  }
}

// Start Session
document.getElementById('start-btn').addEventListener('click', () => {
  const inputs = Array.from(container.querySelectorAll('.allowlist-input'));
  const allowlist = inputs.map(input => input.value.trim()).filter(val => val !== '');
  const durationStr = document.getElementById('duration-input').value.trim();
  const duration = durationStr ? parseInt(durationStr, 10) : null;

  if (allowlist.length === 0) return;

  window.electronAPI.startSession({ allowlist, duration });

  // Transition UI to Sidebar Shell
  document.getElementById('startup-container').classList.add('hidden');
  document.getElementById('session-shell').classList.remove('hidden');
  
  renderSidebar(allowlist);
});

// Template Actions
function populateFromTemplate(result) {
  container.innerHTML = '';
  warning.classList.add('hidden');
  
  result.allowlist.forEach(entry => {
    if (container.querySelectorAll('.allowlist-input').length >= MAX_ENTRIES) return;
    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'allowlist-input';
    input.value = entry;
    input.addEventListener('input', handleInput);
    container.appendChild(input);
  });
  
  if (container.querySelectorAll('.allowlist-input').length < MAX_ENTRIES) {
    addInput();
  } else {
    warning.classList.remove('hidden');
  }

  if (result.duration) {
    document.getElementById('duration-input').value = result.duration;
  }
}

document.getElementById('import-template-btn').addEventListener('click', async () => {
  const result = await window.electronAPI.importTemplate();
  if (result) populateFromTemplate(result);
});

// Drag and Drop Templates
const startupContainer = document.getElementById('startup-container');
startupContainer.addEventListener('dragover', (e) => {
  e.preventDefault();
  e.dataTransfer.dropEffect = 'copy';
});
startupContainer.addEventListener('drop', async (e) => {
  e.preventDefault();
  if (e.dataTransfer.files.length > 0) {
    const file = e.dataTransfer.files[0];
    if (file.name.endsWith('.txt') || file.name.endsWith('.md')) {
      const result = await window.electronAPI.parseTemplateFile(file.path);
      if (result) populateFromTemplate(result);
    }
  }
});

document.getElementById('save-template-btn').addEventListener('click', async () => {
  const inputs = Array.from(container.querySelectorAll('.allowlist-input'));
  const allowlist = inputs.map(input => input.value.trim()).filter(val => val !== '');
  const durationStr = document.getElementById('duration-input').value.trim();
  const duration = durationStr ? parseInt(durationStr, 10) : null;
  
  if (allowlist.length === 0) return;
  
  await window.electronAPI.saveTemplate({ allowlist, duration });
});

// Sidebar Logic
let sidebarPosition = 'left';
const listEl = document.getElementById('sidebar-list');

function renderSidebar(allowlist) {
  allowlist.forEach((entry, index) => {
    const li = document.createElement('li');
    li.textContent = entry;
    if (index === 0) li.classList.add('active');
    
    li.addEventListener('click', (e) => {
      if (e.shiftKey) {
        li.classList.add('split-active');
        window.electronAPI.splitView(index);
      } else {
        document.querySelectorAll('#sidebar-list li').forEach(el => {
          el.classList.remove('active');
          el.classList.remove('split-active');
        });
        li.classList.add('active');
        window.electronAPI.switchView(index);
      }
    });
    
    listEl.appendChild(li);
  });
}

document.getElementById('toggle-sidebar-btn').addEventListener('click', () => {
  sidebarPosition = sidebarPosition === 'left' ? 'right' : 'left';
  if (sidebarPosition === 'right') {
    document.body.classList.add('sidebar-right');
  } else {
    document.body.classList.remove('sidebar-right');
  }
  window.electronAPI.toggleSidebar(sidebarPosition);
});

window.electronAPI.onRedirectBlocked((url) => {
  const notifArea = document.getElementById('sidebar-notifications');
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.innerText = `Redirect Blocked:\n${url}`;
  notifArea.appendChild(toast);
  setTimeout(() => toast.remove(), 4000);
});

// Timer Banner
const banner = document.getElementById('time-up-banner');
window.electronAPI.onSessionTimeUp(() => {
  banner.classList.remove('hidden');
});
document.getElementById('dismiss-banner-btn').addEventListener('click', () => {
  banner.classList.add('hidden');
});

// Summary Overlay
const summaryOverlay = document.getElementById('summary-overlay');
const summaryStats = document.getElementById('summary-stats');

window.electronAPI.onShowSummary((stats) => {
  summaryStats.textContent = '';
  const line1 = document.createElement('span');
  line1.textContent = 'You stayed focused for ';
  const dur = document.createElement('strong');
  dur.textContent = `${stats.duration} minutes`;
  line1.appendChild(dur);
  line1.appendChild(document.createTextNode('.'));
  const line2 = document.createElement('br');
  const line3 = document.createElement('span');
  line3.textContent = 'Pericarp blocked ';
  const blocked = document.createElement('strong');
  blocked.textContent = `${stats.blocked} distracting clicks`;
  line3.appendChild(blocked);
  line3.appendChild(document.createTextNode(' and '));
  const redirects = document.createElement('strong');
  redirects.textContent = `${stats.redirects} off-site redirects`;
  line3.appendChild(redirects);
  line3.appendChild(document.createTextNode('.'));
  summaryStats.appendChild(line1);
  summaryStats.appendChild(line2);
  summaryStats.appendChild(line3);
  summaryOverlay.classList.remove('hidden');
});

document.getElementById('export-close-btn').addEventListener('click', () => {
  window.electronAPI.exportAndClose();
});

document.getElementById('force-close-btn').addEventListener('click', () => {
  window.electronAPI.forceClose();
});
