chrome.runtime.onMessage.addListener((request, sendResponse) => {
  if (request.action === 'getJobDescription') {
    const MAX_WAIT_MS = 3000;
    const INTERVAL = 100;

    let elapsed = 0;

    const interval = setInterval(() => {
      const el = document.querySelector('#job-details');
      if (el && el.innerText.trim().length > 50) {
        clearInterval(interval);
        sendResponse({ jobText: el.innerText.trim() });
      }

      elapsed += INTERVAL;
      if (elapsed >= MAX_WAIT_MS) {
        clearInterval(interval);
        sendResponse({ jobText: '' });
      }
    }, INTERVAL);

    return true;
  }
});