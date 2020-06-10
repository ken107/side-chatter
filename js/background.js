var brapi = (typeof chrome != 'undefined') ? chrome : (typeof browser != 'undefined' ? browser : {});

brapi.browserAction.onClicked.addListener(onActivate);
brapi.runtime.onMessage.addListener(onMessage);


/* UTILS */

function executeScript(details) {
    return new Promise(function(fulfill, reject) {
        brapi.tabs.executeScript(details, function(result) {
            if (brapi.runtime.lastError) reject(new Error(brapi.runtime.lastError.message));
            else fulfill(result);
        })
    })
}



/* HANDLERS */

function onActivate() {
    executeScript({file: "js/content-script.js"})
        .catch(console.error)
}

function onMessage(data) {
    if (data.method == "redirectTo") {
        brapi.tabs.update({url: data.url}, function(tab) {
            var listener = function(tabId, changeInfo) {
                if (tabId == tab.id && changeInfo.status == 'complete') {
                    brapi.tabs.onUpdated.removeListener(listener);
                    onActivate();
                }
            };
            brapi.tabs.onUpdated.addListener(listener);
        })
    }
    else if (data.method == "openOptionsPage") {
        brapi.runtime.openOptionsPage();
    }
}
