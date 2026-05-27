function applyFocusSettings() {
  chrome.storage.local.get(["hideFeed", "hideShorts"], (settings) => {
    let feedStyle = document.getElementById("focus-block-feed");

    if (settings.hideFeed !== false) {
      if (!feedStyle) {
        feedStyle = document.createElement("style");
        feedStyle.id = "focus-block-feed";
        feedStyle.textContent = `
          ytd-browse[page-subtype="home"] #contents,
          ytd-browse[page-subtype="home"] #primary {
            display: none !important;
          }
        `;
        document.documentElement.appendChild(feedStyle);
      }
    } else if (feedStyle) {
      feedStyle.remove();
    }

    let shortsStyle = document.getElementById("focus-block-shorts");

    if (settings.hideShorts !== false) {
      if (!shortsStyle) {
        shortsStyle = document.createElement("style");
        shortsStyle.id = "focus-block-shorts";
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

function injectFloatingTimer() {
  if (document.getElementById("yt-draggable-timer")) return;

  const timerDiv = document.createElement("div");
  timerDiv.id = "yt-draggable-timer";

  Object.assign(timerDiv.style, {
    position: "fixed",
    top: "80px",
    right: "20px",
    width: "180px",
    backgroundColor: "#1f1f1f",
    color: "#ffffff",
    border: "2px solid #ff0000",
    borderRadius: "8px",
    zIndex: "999998",
    fontFamily: "Arial, sans-serif",
    boxShadow: "0px 4px 12px rgba(0,0,0,0.6)",
    textAlign: "center",
    paddingBottom: "12px",
    userSelect: "none"
  });

  timerDiv.innerHTML = `
    <div id="yt-timer-drag-handle" style="padding: 6px; cursor: move; background-color: #2d2d2d; font-size: 11px; color: #bbb; border-top-left-radius: 6px; border-top-right-radius: 6px;">
      Drag Timer
    </div>

    <div id="yt-timer-counter" style="font-size: 28px; font-weight: bold; margin: 12px 0 8px; font-variant-numeric: tabular-nums;">
      25:00
    </div>

    <input
      id="yt-custom-minutes"
      type="number"
      min="1"
      max="240"
      value="25"
      title="Set custom minutes"
      style="width: 70px; padding: 5px; text-align: center; border-radius: 4px; border: 1px solid #555; background: #111; color: white; margin-bottom: 8px;"
    />

    <div style="font-size: 11px; color: #aaa; margin-bottom: 8px;">minutes</div>

    <button id="yt-timer-toggle-btn" style="background: #ff0000; color: white; border: none; padding: 6px 14px; border-radius: 4px; cursor: pointer; font-weight: bold;">
      Start
    </button>

    <button id="yt-timer-reset-btn" style="background: #333; color: white; border: none; padding: 6px 10px; border-radius: 4px; cursor: pointer; margin-left: 4px;">
      Reset
    </button>
  `;

  document.body.appendChild(timerDiv);

  const dragHandle = document.getElementById("yt-timer-drag-handle");
  const counterDisplay = document.getElementById("yt-timer-counter");
  const actionBtn = document.getElementById("yt-timer-toggle-btn");
  const resetBtn = document.getElementById("yt-timer-reset-btn");
  const minutesInput = document.getElementById("yt-custom-minutes");

  let isDragging = false;
  let currentX = 0;
  let currentY = 0;
  let initialX = 0;
  let initialY = 0;

  function formatDisplay(totalSeconds) {
    const mins = Math.floor(totalSeconds / 60).toString().padStart(2, "0");
    const secs = (totalSeconds % 60).toString().padStart(2, "0");
    counterDisplay.innerText = `${mins}:${secs}`;
  }

  chrome.storage.local.get(["dragX", "dragY", "customMinutes"], (data) => {
    if (data.dragX !== undefined && data.dragY !== undefined) {
      currentX = data.dragX;
      currentY = data.dragY;
      timerDiv.style.transform = `translate(${currentX}px, ${currentY}px)`;
    }

    if (data.customMinutes) {
      minutesInput.value = data.customMinutes;
      formatDisplay(data.customMinutes * 60);
    }
  });

  dragHandle.addEventListener("mousedown", (e) => {
    initialX = e.clientX - currentX;
    initialY = e.clientY - currentY;
    isDragging = true;
  });

  document.addEventListener("mousemove", (e) => {
    if (!isDragging) return;

    currentX = e.clientX - initialX;
    currentY = e.clientY - initialY;
    timerDiv.style.transform = `translate(${currentX}px, ${currentY}px)`;
  });

  document.addEventListener("mouseup", () => {
    if (isDragging) {
      isDragging = false;
      chrome.storage.local.set({ dragX: currentX, dragY: currentY });
    }
  });

  minutesInput.addEventListener("change", () => {
    let customMinutes = parseInt(minutesInput.value, 10);

    if (isNaN(customMinutes) || customMinutes < 1) customMinutes = 1;
    if (customMinutes > 240) customMinutes = 240;

    minutesInput.value = customMinutes;
    chrome.storage.local.set({ customMinutes });

    chrome.storage.local.get(["timerActive"], (res) => {
      if (!res.timerActive) {
        formatDisplay(customMinutes * 60);
      }
    });
  });

  actionBtn.addEventListener("click", () => {
    chrome.storage.local.get(["timerActive"], (res) => {
      if (res.timerActive) {
        chrome.runtime.sendMessage({ action: "stopTimer" });
      } else {
        const customMinutes = parseInt(minutesInput.value, 10) || 25;
        chrome.storage.local.set({ customMinutes });
        chrome.runtime.sendMessage({
          action: "startTimer",
          duration: customMinutes
        });
      }
    });
  });

  resetBtn.addEventListener("click", () => {
    const customMinutes = parseInt(minutesInput.value, 10) || 25;

    chrome.runtime.sendMessage({ action: "stopTimer" });
    chrome.storage.local.set({
      timerActive: false,
      timeLeft: customMinutes * 60,
      timerEndTime: null,
      customMinutes
    });

    formatDisplay(customMinutes * 60);
  });

  function syncUI() {
    chrome.storage.local.get(
      ["timerActive", "timeLeft", "customMinutes", "timerEndTime"],
      (res) => {
        if (res.customMinutes) {
          minutesInput.value = res.customMinutes;
        }

        if (res.timerActive && res.timerEndTime) {
          const secondsLeft = Math.max(
            0,
            Math.ceil((res.timerEndTime - Date.now()) / 1000)
          );
          formatDisplay(secondsLeft);
          chrome.storage.local.set({ timeLeft: secondsLeft });
        } else if (res.timeLeft !== undefined) {
          formatDisplay(res.timeLeft);
        } else if (res.customMinutes) {
          formatDisplay(res.customMinutes * 60);
        }

        if (res.timerActive) {
          actionBtn.innerText = "Stop";
          actionBtn.style.backgroundColor = "#555";
          minutesInput.disabled = true;
          minutesInput.style.opacity = "0.6";
        } else {
          actionBtn.innerText = "Start";
          actionBtn.style.backgroundColor = "#ff0000";
          minutesInput.disabled = false;
          minutesInput.style.opacity = "1";
        }
      }
    );
  }

  syncUI();
  setInterval(syncUI, 1000);
  chrome.storage.onChanged.addListener(syncUI);
}

applyFocusSettings();

if (document.body) {
  injectFloatingTimer();
} else {
  document.addEventListener("DOMContentLoaded", injectFloatingTimer);
}

chrome.storage.onChanged.addListener(() => {
  applyFocusSettings();
});
