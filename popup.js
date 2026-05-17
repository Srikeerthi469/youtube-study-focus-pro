document.addEventListener('DOMContentLoaded', () => {
  const hideFeed = document.getElementById('hideFeed');
  const hideShorts = document.getElementById('hideShorts');
  const timerDisplay = document.getElementById('timerDisplay');
  const startBtn = document.getElementById('startBtn');
  const resetBtn = document.getElementById('resetBtn');
  const minutesInput = document.getElementById('minutesInput');

  let countdownInterval;

  // Load saved configurations
  chrome.storage.local.get(['hideFeed', 'hideShorts', 'timeLeft', 'timerActive', 'customMinutes'], (result) => {
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
  });

  // Toggle Events
  hideFeed.addEventListener('change', () => chrome.storage.local.set({ hideFeed: hideFeed.checked }));
  hideShorts.addEventListener('change', () => chrome.storage.local.set({ hideShorts: hideShorts.checked }));

  // Input change event
  minutesInput.addEventListener('change', () => {
    let mins = Math.max(1, parseInt(minutesInput.value) || 25);
    minutesInput.value = mins;
    chrome.storage.local.set({ customMinutes: mins, timeLeft: mins * 60 });
    updateDisplay(mins * 60);
  });

  // Timer Click Triggers
  startBtn.addEventListener('click', () => {
    chrome.storage.local.get(['timerActive', 'timeLeft'], (res) => {
      let defaultSeconds = (parseInt(minutesInput.value) || 25) * 60;
      
      if (!res.timerActive) {
        let currentLeft = res.timeLeft !== undefined ? res.timeLeft : defaultSeconds;
        if (currentLeft <= 0) currentLeft = defaultSeconds;

        minutesInput.disabled = true;
        chrome.storage.local.set({ timerActive: true, timeLeft: currentLeft });
        chrome.alarms.create("pomodoroTimer", { delayInMinutes: currentLeft / 60 });
        startUIRunner();
      } else {
        // Pause Action
        minutesInput.disabled = false;
        chrome.storage.local.set({ timerActive: false });
        chrome.alarms.clear("pomodoroTimer");
        clearInterval(countdownInterval);
        startBtn.innerText = "Start";
      }
    });
  });

  resetBtn.addEventListener('click', () => {
    chrome.alarms.clear("pomodoroTimer");
    clearInterval(countdownInterval);
    minutesInput.disabled = false;
    let defaultSeconds = (parseInt(minutesInput.value) || 25) * 60;
    chrome.storage.local.set({ timerActive: false, timeLeft: defaultSeconds });
    updateDisplay(defaultSeconds);
    startBtn.innerText = "Start";
  });

  function startUIRunner() {
    startBtn.innerText = "Pause";
    clearInterval(countdownInterval);
    countdownInterval = setInterval(() => {
      chrome.storage.local.get(['timeLeft', 'timerActive'], (res) => {
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
      });
    }, 1000);
  }

  function updateDisplay(secs) {
    let mins = Math.floor(secs / 60);
    let remSecs = secs % 60;
    timerDisplay.innerText = `${mins.toString().padStart(2, '0')}:${remSecs.toString().padStart(2, '0')}`;
  }
});


