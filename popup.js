// ============================================================
// popup.js — Extension Popup Logic
// Handles: toggle settings, timer UI, stats dashboard display
// ============================================================

document.addEventListener('DOMContentLoaded', () => {

  // ----------------------------------------------------------
  // DOM REFERENCES
  // ----------------------------------------------------------
  const hideFeed      = document.getElementById('hideFeed');
  const hideShorts    = document.getElementById('hideShorts');
  const timerDisplay  = document.getElementById('timerDisplay');
  const startBtn      = document.getElementById('startBtn');
  const resetBtn      = document.getElementById('resetBtn');
  const minutesInput  = document.getElementById('minutesInput');

  // Stats dashboard elements (new)
  const statToday     = document.getElementById('statToday');
  const statWeek      = document.getElementById('statWeek');
  const statLongest   = document.getElementById('statLongest');

  let countdownInterval;

  // ----------------------------------------------------------
  // INIT: Load all saved state from storage on popup open
  // ----------------------------------------------------------
  chrome.storage.local.get(
    ['hideFeed', 'hideShorts', 'timeLeft', 'timerActive', 'customMinutes',
     'dailyStats', 'weeklyStats', 'longestSession'],
    (result) => {

      // Restore toggle checkboxes
      if (result.hideFeed !== undefined)   hideFeed.checked  = result.hideFeed;
      if (result.hideShorts !== undefined) hideShorts.checked = result.hideShorts;

      // Restore timer input
      if (result.customMinutes !== undefined) minutesInput.value = result.customMinutes;

      // Restore timer display
      const defaultSeconds = (parseInt(minutesInput.value) || 25) * 60;
      const time = (result.timeLeft !== undefined) ? result.timeLeft : defaultSeconds;
      updateTimerDisplay(time);

      // If timer was already running, resume the countdown UI
      if (result.timerActive) {
        minutesInput.disabled = true;
        startCountdownUI();
      }

      // Render the stats dashboard with whatever is stored
      renderStats(result.dailyStats, result.weeklyStats, result.longestSession);
    }
  );

  // ----------------------------------------------------------
  // TOGGLE LISTENERS — persist hide/show preferences
  // ----------------------------------------------------------
  hideFeed.addEventListener('change', () =>
    chrome.storage.local.set({ hideFeed: hideFeed.checked })
  );

  hideShorts.addEventListener('change', () =>
    chrome.storage.local.set({ hideShorts: hideShorts.checked })
  );

  // ----------------------------------------------------------
  // MINUTES INPUT — update stored value and display when changed
  // ----------------------------------------------------------
  minutesInput.addEventListener('change', () => {
    let mins = Math.max(1, parseInt(minutesInput.value) || 25);
    minutesInput.value = mins;

    chrome.storage.local.set({
      customMinutes: mins,
      timeLeft: mins * 60
    });

    updateTimerDisplay(mins * 60);
  });

  // ----------------------------------------------------------
  // START / PAUSE BUTTON
  // ----------------------------------------------------------
  startBtn.addEventListener('click', () => {
    chrome.storage.local.get(['timerActive', 'timeLeft'], (res) => {

      if (!res.timerActive) {
        // ---- START ----------------------------------------
        const defaultSeconds = (parseInt(minutesInput.value) || 25) * 60;
        let currentLeft = (res.timeLeft !== undefined) ? res.timeLeft : defaultSeconds;
        if (currentLeft <= 0) currentLeft = defaultSeconds;

        minutesInput.disabled = true;

        // Tell the background service worker to create the alarm
        chrome.runtime.sendMessage({
          action: "startTimer",
          duration: Math.ceil(currentLeft / 60)
        });

        chrome.storage.local.set({ timerActive: true, timeLeft: currentLeft });

        startCountdownUI();

      } else {
        // ---- PAUSE ----------------------------------------
        pauseTimer();
      }
    });
  });

  // ----------------------------------------------------------
  // RESET BUTTON
  // ----------------------------------------------------------
  resetBtn.addEventListener('click', () => {
    // Stop the alarm in the service worker
    chrome.runtime.sendMessage({ action: "stopTimer" });

    pauseTimer();

    const defaultSeconds = (parseInt(minutesInput.value) || 25) * 60;
    chrome.storage.local.set({ timerActive: false, timeLeft: defaultSeconds });
    updateTimerDisplay(defaultSeconds);
  });

  // ----------------------------------------------------------
  // COUNTDOWN UI — ticks every second while popup is open
  // Note: The real authoritative timer lives in background.js
  // This is purely for visual feedback in the popup.
  // ----------------------------------------------------------
  function startCountdownUI() {
    startBtn.innerText = "Pause";
    clearInterval(countdownInterval);

    countdownInterval = setInterval(() => {
      chrome.storage.local.get(
        ['timeLeft', 'timerActive', 'timerEndTime', 'dailyStats', 'weeklyStats', 'longestSession'],
        (res) => {

          // Stop ticking if timer was paused or completed
          if (!res.timerActive || res.timeLeft <= 0) {
            clearInterval(countdownInterval);
            startBtn.innerText = "Start";
            minutesInput.disabled = false;

            if (res.timeLeft <= 0) {
              const defaultSeconds = (parseInt(minutesInput.value) || 25) * 60;
              updateTimerDisplay(defaultSeconds);
            }

            // Refresh stats display in case session just completed
            renderStats(res.dailyStats, res.weeklyStats, res.longestSession);
            return;
          }

          // Use timerEndTime for accurate countdown (handles tab sleep, etc.)
          let secondsLeft;
          if (res.timerEndTime) {
            secondsLeft = Math.max(0, Math.ceil((res.timerEndTime - Date.now()) / 1000));
          } else {
            secondsLeft = res.timeLeft - 1;
          }

          // Persist updated time so content.js floating timer stays in sync
          chrome.storage.local.set({ timeLeft: secondsLeft });
          updateTimerDisplay(secondsLeft);

          // ---- Live daily stat increment while timer is active ----
          // This gives real-time feedback in the popup.
          // The authoritative record (on completion) is handled by background.js.
          incrementDailyStatUI(res.dailyStats);
        }
      );
    }, 1000);
  }

  // ----------------------------------------------------------
  // PAUSE LOGIC
  // ----------------------------------------------------------
  function pauseTimer() {
    minutesInput.disabled = false;
    chrome.storage.local.set({ timerActive: false });
    clearInterval(countdownInterval);
    startBtn.innerText = "Start";
  }

  // ----------------------------------------------------------
  // TIMER DISPLAY
  // ----------------------------------------------------------
  function updateTimerDisplay(secs) {
    const mins    = Math.floor(secs / 60).toString().padStart(2, '0');
    const remSecs = (secs % 60).toString().padStart(2, '0');
    timerDisplay.innerText = `${mins}:${remSecs}`;
  }

  // ----------------------------------------------------------
  // STATS RENDERING
  // Converts raw seconds into human-readable "Xh Ym" or "Zm" strings
  // ----------------------------------------------------------

  /**
   * Format seconds into a readable string.
   * Under 60 min → "45m"
   * 60 min+      → "1h 30m"
   */
  function formatDuration(totalSeconds) {
    const mins  = Math.floor(totalSeconds / 60);
    const hours = Math.floor(mins / 60);
    const remMins = mins % 60;

    if (hours > 0) {
      return remMins > 0 ? `${hours}h ${remMins}m` : `${hours}h`;
    }
    return `${mins}m`;
  }

  /**
   * Get the Monday of the current week as ISO string "YYYY-MM-DD"
   * Mirrors the same logic in background.js
   */
  function getWeekStart() {
    const now  = new Date();
    const day  = now.getDay();
    const diff = (day === 0 ? -6 : 1 - day);
    const monday = new Date(now);
    monday.setDate(now.getDate() + diff);
    monday.setHours(0, 0, 0, 0);
    return monday.toISOString().split("T")[0];
  }

  /**
   * Render the three stat cards using data from storage.
   * Handles null/undefined gracefully (shows "0m" as default).
   */
  function renderStats(dailyStats, weeklyStats, longestSession) {
    const today    = new Date().toDateString();
    const thisWeek = getWeekStart();

    // Today's focus (reset if date changed)
    const dailySecs = (dailyStats && dailyStats.date === today)
      ? (dailyStats.focusSeconds || 0)
      : 0;

    // This week's focus (reset if new week)
    const weeklySecs = (weeklyStats && weeklyStats.weekStart === thisWeek)
      ? (weeklyStats.focusSeconds || 0)
      : 0;

    // All-time longest session
    const longestSecs = longestSession || 0;

    statToday.innerText   = formatDuration(dailySecs);
    statWeek.innerText    = formatDuration(weeklySecs);
    statLongest.innerText = formatDuration(longestSecs);
  }

  /**
   * Increment the dailyStats counter by 1 second while timer is actively
   * running in the popup. This is the "live" counter — the definitive
   * increment for completed sessions happens in background.js.
   */
  function incrementDailyStatUI(existingDailyStats) {
    const today = new Date().toDateString();

    let daily = existingDailyStats || { date: today, focusSeconds: 0 };
    if (daily.date !== today) {
      daily = { date: today, focusSeconds: 0 };
    }
    daily.focusSeconds += 1;

    chrome.storage.local.set({ dailyStats: daily }, () => {
      // Re-read all stats and refresh the UI
      chrome.storage.local.get(['weeklyStats', 'longestSession'], (res) => {
        renderStats(daily, res.weeklyStats, res.longestSession);
      });
    });
  }

});


