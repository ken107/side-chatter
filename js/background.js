var brapi = (typeof chrome != 'undefined') ? chrome : (typeof browser != 'undefined' ? browser : {});

brapi.browserAction.onClicked.addListener(onActivate);


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
