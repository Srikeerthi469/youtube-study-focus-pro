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
          /* Left navigation layout tags matching Shorts paths */
          ytd-guide-entry-renderer a[href*="/shorts"],
          ytd-mini-guide-entry-renderer[aria-label*="Shorts"],
          ytd-guide-entry-renderer[is-shorts],
          tp-yt-paper-item a[href*="/shorts"],
          
          /* Dynamic Attribute target names filtering */
          [title*="Shorts"], 
          [aria-label*="Shorts"],
          
          /* In-feed structural reels shelves modules completely off */
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

// Run functions immediately on system state load
applyFocusSettings();

// Listen for updates from real-time dynamic configurations switches
chrome.storage.onChanged.addListener(() => {
  applyFocusSettings();
});
