chrome.action.onClicked.addListener(function() {
  chrome.tabs.create({url: chrome.runtime.getURL('calendar.html')});
});

chrome.runtime.onInstalled.addListener(function(object) {
  if (object.reason === chrome.runtime.OnInstalledReason.INSTALL) {
    chrome.tabs.create({url: chrome.runtime.getURL('calendar.html')});
  }
});
