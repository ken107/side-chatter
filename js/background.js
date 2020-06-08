
chrome.browserAction.onClicked.addListener(onActivate);


function onActivate() {
    executeScript({file: "js/content-script.js"})
        .catch(console.error)
}
