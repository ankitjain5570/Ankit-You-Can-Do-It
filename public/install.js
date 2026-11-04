const button = document.getElementById('install');
const instructions = document.getElementById('install-instructions');
const dismiss = document.getElementById('dismiss-install');
const standalone = matchMedia('(display-mode: standalone)').matches || navigator.standalone;
const ios = /iPhone|iPad|iPod/.test(navigator.userAgent) ||
  (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
const android = /Android/.test(navigator.userAgent);
let installEvent;

if (!standalone) {
  button.hidden = !(ios || android);
  window.addEventListener('beforeinstallprompt', event => {
    event.preventDefault();
    installEvent = event;
    button.hidden = false;
  });
  window.addEventListener('appinstalled', () => {
    installEvent = undefined;
    button.hidden = true;
    instructions.hidden = true;
  });
}

button.addEventListener('click', async () => {
  if (installEvent) {
    const prompt = installEvent;
    installEvent = undefined;
    button.disabled = true;
    try {
      await prompt.prompt();
      const { outcome } = await prompt.userChoice;
      button.hidden = outcome === 'accepted';
    } catch {
      showInstructions();
    } finally {
      button.disabled = false;
    }
  } else {
    showInstructions();
  }
});

function showInstructions() {
  document.getElementById('install-help').textContent = ios
    ? 'In Safari, open Share, choose Add to Home Screen, then tap Add.'
    : 'Open Chrome’s ⋮ menu, choose Add to Home screen or Install app, then follow the prompt.';
  instructions.hidden = false;
  dismiss.focus();
}
dismiss.addEventListener('click', () => {
  instructions.hidden = true;
  button.focus();
});

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/sw.js').catch(error => console.warn('Ankit Fit install setup failed', error));
}
