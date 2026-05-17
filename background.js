chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === "pomodoroTimer") {
    chrome.storage.local.get(["timerActive"], (res) => {
      if (res.timerActive) {
        chrome.storage.local.set({ timerActive: false, timeLeft: 0 });
        chrome.notifications.create({
          type: "basic",
          iconUrl: "icon.png", // If you have an icon, else text alert works
          title: "Study Session Done!",
          message: "Time for a quick break! Great job focusing.",
          priority: 2
        });
      }
    });
  }
});
