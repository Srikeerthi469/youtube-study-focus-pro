
function applyFocusSettings() {
  chrome.storage.local.get(['hideFeed', 'hideShorts'], (settings) => {
    
    // 1. YouTube Home Feed Blocker Logic
    let feedStyle = document.getElementById('focus-block-feed');
    if (settings.hideFeed !== false) {
      if (!feedStyle) {
        feedStyle = document.createElement('style');
        feedStyle.id = 'focus-block-feed';
        feedStyle.textContent = `
          ytd-browse[page-subtype="home"] #contents, 
          ytd-browse[page-subtype="home"] #primary { display: none !important; }
        `;
        document.documentElement.appendChild(feedStyle);
      }
    } else if (feedStyle) {
      feedStyle.remove();
    }

    // 2. Ultra-Aggressive Shorts Button Blocker Logic
    let shortsStyle = document.getElementById('focus-block-shorts');
    if (settings.hideShorts !== false) {
      if (!shortsStyle) {
        shortsStyle = document.createElement('style');
        shortsStyle.id = 'focus-block-shorts';
        shortsStyle.textContent = `
          ytd-guide-entry-renderer a[href*="/shorts"],
          ytd-mini-guide-entry-renderer[aria-label*="Shorts"],
          ytd-guide-entry-renderer[is-shorts],
          tp-yt-paper-item a[href*="/shorts"],
          [title*="Shorts"], 
          [aria-label*="Shorts"],
          ytd-reel-shelf-renderer,
          ytd-rich-shelf-renderer[is-shorts] { 
            display: none !important; 
          }
        `;
        document.documentElement.appendChild(shortsStyle);
      }
    } else if (shortsStyle) {
      shortsStyle.remove();
    }

  });
}

// Run immediately
applyFocusSettings();

// Listen for changes
chrome.storage.onChanged.addListener(() => {
  applyFocusSettings();
});


/* =====================================================
   ⏱ NEW FEATURE: TIMER-BASED STUDY MODE GATE
   ===================================================== */

function applyTimerGate() {
  chrome.storage.local.get(['timerActive'], (res) => {

    const isActive = res.timerActive;

    let gate = document.getElementById('focus-timer-gate');

    if (!isActive) {
      if (!gate) {
        gate = document.createElement('div');
        gate.id = 'focus-timer-gate';

        gate.style.position = 'fixed';
        gate.style.top = '0';
        gate.style.left = '0';
        gate.style.width = '100%';
        gate.style.height = '100%';
        gate.style.background = '#000';
        gate.style.color = '#fff';
        gate.style.zIndex = '999999';
        gate.style.display = 'flex';
        gate.style.alignItems = 'center';
        gate.style.justifyContent = 'center';
        gate.style.fontSize = '20px';
        gate.style.flexDirection = 'column';

        gate.innerHTML = `
          <div>🚫 Study Mode Active</div>
          <div style="font-size:14px; margin-top:10px;">
            Start timer to unlock YouTube
          </div>
        `;

        document.body.appendChild(gate);
      }
    } else {
      if (gate) {
        gate.remove();
      }
    }

  });
}

// Run timer gate every 2 seconds
setInterval(applyTimerGate, 2000);
