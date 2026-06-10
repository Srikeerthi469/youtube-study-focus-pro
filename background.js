// ============================================================
// background.js — Service Worker
// Handles: alarm-based timer completion + stats recording
// ============================================================

// ------------------------------------------------------------
// HELPER: Get the Monday of the current week as an ISO string
// e.g. "2026-06-08"
// ------------------------------------------------------------
function getWeekStart() {
  const now = new Date();
  const day = now.getDay(); // 0=Sun, 1=Mon, ...
  const diff = (day === 0 ? -6 : 1 - day); // Shift so week starts on Monday
  const monday = new Date(now);
  monday.setDate(now.getDate() + diff);
  monday.setHours(0, 0, 0, 0);
  return monday.toISOString().split("T")[0]; // "YYYY-MM-DD"
}

// ------------------------------------------------------------
// HELPER: Record stats when a session completes naturally
// Called only from the alarm handler (reliable completion signal)
// sessionSeconds: how long the completed session was
// ------------------------------------------------------------
function recordCompletedSession(sessionSeconds) {
  chrome.storage.local.get(["dailyStats", "weeklyStats", "longestSession"], (res) => {

    const today = new Date().toDateString();         // e.g. "Wed Jun 10 2026"
    const thisWeek = getWeekStart();                 // e.g. "2026-06-08"

    // ---- Daily Stats ----------------------------------------
    // Reset if it's a new day
    let daily = res.dailyStats || { date: today, focusSeconds: 0 };
    if (daily.date !== today) {
      daily = { date: today, focusSeconds: 0 };
    }
    daily.focusSeconds += sessionSeconds;

    // ---- Weekly Stats ---------------------------------------
    // Reset if it's a new week (past Monday)
    let weekly = res.weeklyStats || { weekStart: thisWeek, focusSeconds: 0 };
    if (weekly.weekStart !== thisWeek) {
      weekly = { weekStart: thisWeek, focusSeconds: 0 };
    }
    weekly.focusSeconds += sessionSeconds;

    // ---- Longest Session ------------------------------------
    // Compare this session against the stored all-time longest
    const prevLongest = res.longestSession || 0;
    const newLongest = Math.max(prevLongest, sessionSeconds);

    // ---- Persist all stats ----------------------------------
    chrome.storage.local.set({
      dailyStats: daily,
      weeklyStats: weekly,
      longestSession: newLongest
    });
  });
}

// ============================================================
// ALARM HANDLER — Fires when Pomodoro timer completes naturally
// ============================================================
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === "pomodoroTimer") {

    chrome.storage.local.get(["timerActive", "customMinutes"], (res) => {
      if (res.timerActive) {

        // Mark timer as done
        chrome.storage.local.set({
          timerActive: false,
          timeLeft: 0,
          timerEndTime: null,
          timerCompleted: true
        });

        // Record stats for this completed session
        // customMinutes is the duration that was set when the timer started
        const sessionSeconds = (Number(res.customMinutes) || 25) * 60;
        recordCompletedSession(sessionSeconds);

        // Show browser notification
        chrome.notifications.create({
          type: "basic",
          iconUrl: "icon.png",
          title: "Study Session Done!",
          message: "Time for a quick break! Great job focusing.",
          priority: 2
        });
      }
    });
  }
});

// ============================================================
// MESSAGE HANDLER — Receives start/stop commands from popup & content
// ============================================================
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {

  // ----------------------------------------------------------
  // START TIMER
  // ----------------------------------------------------------
  if (request.action === "startTimer") {
    const minutes = Number(request.duration) || 25;
    const totalSeconds = minutes * 60;
    const timerEndTime = Date.now() + totalSeconds * 1000;

    chrome.storage.local.set({
      timerActive: true,
      timeLeft: totalSeconds,
      timerEndTime,
      customMinutes: minutes,
      timerCompleted: false
    }, () => {
      chrome.alarms.clear("pomodoroTimer", () => {
        chrome.alarms.create("pomodoroTimer", {
          delayInMinutes: minutes
        });
      });
    });
  }

  // ----------------------------------------------------------
  // STOP TIMER (manual stop — does NOT record stats)
  // Only natural alarm completions count as a finished session
  // ----------------------------------------------------------
  if (request.action === "stopTimer") {
    chrome.storage.local.set({
      timerActive: false,
      timeLeft: 0,
      timerEndTime: null,
      timerCompleted: false
    }, () => {
      chrome.alarms.clear("pomodoroTimer");
    });
  }
});
