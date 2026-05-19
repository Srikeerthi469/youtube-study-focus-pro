document.addEventListener('DOMContentLoaded', () => {
  const hideFeed = document.getElementById('hideFeed');
  const hideShorts = document.getElementById('hideShorts');
  const timerDisplay = document.getElementById('timerDisplay');
  const startBtn = document.getElementById('startBtn');
  const resetBtn = document.getElementById('resetBtn');
  const minutesInput = document.getElementById('minutesInput');

  const focusTimeEl = document.getElementById("focusTime");

  let countdownInterval;

  // -----------------------------
  // INIT STORAGE
  // -----------------------------
  chrome.storage.local.get(
    ['hideFeed', 'hideShorts', 'timeLeft', 'timerActive', 'customMinutes', 'dailyStats'],
    (result) => {

      if (result.hideFeed !== undefined) hideFeed.checked = result.hideFeed;
      if (result.hideShorts !== undefined) hideShorts.checked = result.hideShorts;
      if (result.customMinutes !== undefined) minutesInput.value = result.customMinutes;

      let defaultSeconds = (parseInt(minutesInput.value) || 25) * 60;
      let time = result.timeLeft !== undefined ? result.timeLeft : defaultSeconds;

      updateDisplay(time);

      if (result.timerActive) {
        minutesInput.disabled = true;
        startUIRunner();
      }

      updateStatsUI(result.dailyStats);
    }
  );

  // -----------------------------
  // SAVE TOGGLE SETTINGS
  // -----------------------------
  hideFeed.addEventListener('change', () =>
    chrome.storage.local.set({ hideFeed: hideFeed.checked })
  );

  hideShorts.addEventListener('change', () =>
    chrome.storage.local.set({ hideShorts: hideShorts.checked })
  );

  // -----------------------------
  // TIMER INPUT
  // -----------------------------
  minutesInput.addEventListener('change', () => {
    let mins = Math.max(1, parseInt(minutesInput.value) || 25);
    minutesInput.value = mins;

    chrome.storage.local.set({
      customMinutes: mins,
      timeLeft: mins * 60
    });

    updateDisplay(mins * 60);
  });

  // -----------------------------
  // START / PAUSE TIMER
  // -----------------------------
  startBtn.addEventListener('click', () => {
    chrome.storage.local.get(['timerActive', 'timeLeft'], (res) => {

      let defaultSeconds = (parseInt(minutesInput.value) || 25) * 60;

      if (!res.timerActive) {
        let currentLeft = res.timeLeft !== undefined ? res.timeLeft : defaultSeconds;
        if (currentLeft <= 0) currentLeft = defaultSeconds;

        minutesInput.disabled = true;

        chrome.storage.local.set({ timerActive: true, timeLeft: currentLeft });

        startUIRunner();

      } else {
        pauseTimer();
      }
    });
  });

  // -----------------------------
  // RESET TIMER
  // -----------------------------
  resetBtn.addEventListener('click', () => {
    pauseTimer();

    let defaultSeconds = (parseInt(minutesInput.value) || 25) * 60;

    chrome.storage.local.set({
      timerActive: false,
      timeLeft: defaultSeconds
    });

    updateDisplay(defaultSeconds);
  });

  // -----------------------------
  // TIMER RUNNER
  // -----------------------------
  function startUIRunner() {
    startBtn.innerText = "Pause";
    clearInterval(countdownInterval);

    countdownInterval = setInterval(() => {

      chrome.storage.local.get(['timeLeft', 'timerActive', 'dailyStats'], (res) => {

        if (!res.timerActive || res.timeLeft <= 0) {
          clearInterval(countdownInterval);
          startBtn.innerText = "Start";
          minutesInput.disabled = false;

          if (res.timeLeft <= 0) {
            let defaultSeconds = (parseInt(minutesInput.value) || 25) * 60;
            updateDisplay(defaultSeconds);
          }

          return;
        }

        let newTime = res.timeLeft - 1;

        chrome.storage.local.set({ timeLeft: newTime });

        updateDisplay(newTime);

        // -------------------------
        // 🔥 DAILY FOCUS TRACKING
        // -------------------------
        updateDailyStats();

      });

    }, 1000);
  }

  // -----------------------------
  // PAUSE LOGIC
  // -----------------------------
  function pauseTimer() {
    minutesInput.disabled = false;
    chrome.storage.local.set({ timerActive: false });

    clearInterval(countdownInterval);

    startBtn.innerText = "Start";
  }

  // -----------------------------
  // DISPLAY TIMER
  // -----------------------------
  function updateDisplay(secs) {
    let mins = Math.floor(secs / 60);
    let remSecs = secs % 60;

    timerDisplay.innerText =
      `${mins.toString().padStart(2, '0')}:${remSecs.toString().padStart(2, '0')}`;
  }

  // -----------------------------
  // 📊 DAILY STATS SYSTEM
  // -----------------------------
  function updateDailyStats() {
    chrome.storage.local.get(['dailyStats'], (res) => {

      let today = new Date().toDateString();

      let stats = res.dailyStats || {
        date: today,
        focusSeconds: 0
      };

      if (stats.date !== today) {
        stats = {
          date: today,
          focusSeconds: 0
        };
      }

      stats.focusSeconds += 1;

      chrome.storage.local.set({ dailyStats: stats });

      updateStatsUI(stats);
    });
  }

  function updateStatsUI(stats) {
    if (!stats) {
      focusTimeEl.innerText = "Focus: 0m";
      return;
    }

    let mins = Math.floor((stats.focusSeconds || 0) / 60);

    focusTimeEl.innerText = `Focus: ${mins} min`;
  }

});


