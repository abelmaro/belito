function getAndCleanJobTextFromPage() {
  const el = document.querySelector('#job-details');

  if (!el || typeof el.innerText !== 'string') {
    return "";
  }

  let text = el.innerText;

  if (!text.trim()) {
    return "";
  }

  text = text.replace(/[ \t]+/g, ' ');
  text = text.split('\n')
             .map(line => line.trim())
             .filter(line => line.length > 0)
             .join('\n');
  text = text.replace(/\n{3,}/g, '\n\n');
  text = text.trim();

  return text;
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'getJobDescription') {
    const MAX_WAIT_MS = 3000;
    const INTERVAL_MS = 100;
    let elapsedTime = 0;
    let responseSent = false;

    const attemptInterval = setInterval(() => {
      if (responseSent) {
        clearInterval(attemptInterval);
        return;
      }

      try {
        const jobText = getAndCleanJobTextFromPage();

        if (jobText.length > 50) {
          clearInterval(attemptInterval);
          responseSent = true;
          sendResponse({ jobText: jobText });
        } else {
          elapsedTime += INTERVAL_MS;
          if (elapsedTime >= MAX_WAIT_MS) {
            clearInterval(attemptInterval);
            responseSent = true;
            sendResponse({ jobText: "" });
          }
        }
      } catch (error) {
        clearInterval(attemptInterval);
        responseSent = true;
        sendResponse({ jobText: "", error: error.message });
      }
    }, INTERVAL_MS);

    return true;
  }
});