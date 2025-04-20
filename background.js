// Set up the daily reset alarm at 12:00 a.m.
chrome.runtime.onInstalled.addListener(() => {
  setMidnightAlarm();
});

chrome.runtime.onStartup.addListener(() => {
  setMidnightAlarm();
});

// Handle alarms for resetting state
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === "dailyReset") {

    chrome.storage.local.get("state", (data) => {
      if (data.state && data.state.weeklyTasks && data.state.moods) {
        chrome.storage.local.set({ state: {moods : data.state.moods, weeklyTasks: data.state.weeklyTasks}}, () => {
          console.log("State reset at 12:00 a.m.");
        });
      } else {
        chrome.storage.local.set({ state: null }, () => {
          console.log("State reset at 12:00 a.m.");
        });
      }
      setMidnightAlarm(); // Reset the alarm for the next day
    });
  }
});

// Function to set an alarm for 12:00 a.m.
function setMidnightAlarm() {
  const now = new Date();
  const midnight = new Date();
  midnight.setHours(24, 0, 0, 0);

  const timeUntilMidnight = (midnight - now) / (1000 * 60);
  chrome.alarms.create("dailyReset", { delayInMinutes: timeUntilMidnight });
}

// Handle messages from newTab.js for generating subtasks
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "generateSubtasks") {
    // Call GPT wrapper
    fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer API_TOKEN", // tbu
      },
      body: JSON.stringify({
        prompt: `Break down the task "${message.task}" into 5 subtasks.`,
        max_tokens: 100,
      }),
    })
      .then((response) => response.json())
      .then((data) => {
        const subtasks = data.choices[0].text
          .trim()
          .split("\n")
          .filter(Boolean);
        chrome.runtime.sendMessage({ action: "updateSubtasks", subtasks });
      })
      .catch((error) => {
        console.error("Error generating subtasks:", error);
      });
    return true; // Keep the message channel open for async response
  }
});
