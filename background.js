chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === "pomodoroTimer") {
    chrome.storage.local.get(["timerActive"], (res) => {
      if (res.timerActive) {
        chrome.storage.local.set({
          timerActive: false,
          timeLeft: 0,
          timerEndTime: null
        });

        chrome.notifications.create({
          type: "basic",
          title: "Study Session Done!",
          message: "Time for a quick break! Great job focusing.",
          priority: 2
        });
      }
    });
  }
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "startTimer") {
    const minutes = Number(request.duration) || 25;
    const totalSeconds = minutes * 60;
    const timerEndTime = Date.now() + totalSeconds * 1000;

    chrome.storage.local.set({
      timerActive: true,
      timeLeft: totalSeconds,
      timerEndTime,
      customMinutes: minutes
    }, () => {
      chrome.alarms.clear("pomodoroTimer", () => {
        chrome.alarms.create("pomodoroTimer", {
          delayInMinutes: minutes
        });
      });
    });
  }

  if (request.action === "stopTimer") {
    chrome.storage.local.set({
      timerActive: false,
      timeLeft: 0,
      timerEndTime: null
    }, () => {
      chrome.alarms.clear("pomodoroTimer");
    });
  }
});
