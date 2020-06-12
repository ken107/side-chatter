
var queryString = {};
if (location.search)
    location.search.substr(1).split('&').forEach(function(token) {
        var pair = token.split('=');
        queryString[decodeURIComponent(pair[0])] = pair.length > 1 ? decodeURIComponent(pair[1]) : true;
    })

var hostPage = {
    url: queryString.url,
    title: queryString.title,
}

var smileyCollections = [
    {name: "orange", count: 94, desc: "Orange"},
    {name: "animals", count: 64, desc: "Animals"},
    {name: "cute", count: 29, desc: "Cute"},
    {name: "trundle", count: 36, desc: "Ugly"},
    {name: "shiny", count: 142, desc: "Shiny"},
    {name: "mad", count: 93, desc: "Mad"},
    {name: "avatar", count: 876, desc: "Small"},
    {name: "anime", count: 971, desc: "Korean"},
]
var smileysPerPage = 20;
var smileyRoot = "https://support2.lsdsoftware.com/diepkhuc-content/smileys/";

var docReady = new Promise(function(fulfill) {
    document.addEventListener("DOMContentLoaded", fulfill);
})

if (/^http/.test(location.protocol) && location.hostname != "localhost") {
    //if is web-hosted version and not test-mode
    //installServiceWorker();

    //tell extension to use the local version for some duration of time
    rpcRequest({method: "updateSettings", items: {useLocalUntil: Date.now() + 3600*1000}}).catch(console.error)
}

setInterval(syncUrlAndTitle, 3000);
onStartup();



/* UTILS */

function installServiceWorker() {
    if ('serviceWorker' in navigator) {
    window.addEventListener('load', function() {
        navigator.serviceWorker.register('sw.js')
            .then(function(registration) {
                // Registration was successful
                console.log('ServiceWorker registration successful with scope: ', registration.scope);
            })
            .catch(function(err) {
                // registration failed :(
                console.log('ServiceWorker registration failed: ', err);
            })
    })
    }
}

function rpcRequest(data) {
    data.id = Math.random();
    window.parent.postMessage(data, hostPage.url);
    return new Promise(function(fulfill, reject) {
        var listener = function(ev) {
            if (ev.data.id == data.id) {
                if (ev.data.error) reject(new Error(ev.data.error));
                else fulfill(ev.data.value);
                window.removeEventListener("message", listener, false);
            }
        };
        window.addEventListener("message", listener, false);
    })
}



/* SERVICE */

var sb = new ServiceBroker("wss://service.lsdsoftware.com", {
    error: console.error,
    trace: console.log
})
sb.setHandler("side-chatter-client", function(req) {
    var data = JSON.parse(req.payload);
    switch (data.method) {
        case "chatMessage": return onChatMessage(data);
        default: console.error("Unhandled", data.method);
    }
})
sb.addConnectListener(function() {
    rpcRequest({method: "getSettings", names: ["myName"]})
        .then(function(settings) {
            return request(["join-1.0"], {method: "join", myName: settings.myName, url: hostPage.url, title: hostPage.title})
        })
        .then(onJoined)
        .catch(console.error)
})
function request(capabilities, data) {
    return sb.request({name: "side-chatter", capabilities: capabilities}, {payload: JSON.stringify(data)})
        .then(function(res) {
            return res.payload && JSON.parse(res.payload);
        })
}




/* ACTIONS */

function sendChat(message) {
    request(["message-1.0"], {method: "message", message: message})
        .catch(console.error)
}

function changeName(newName) {
    request(["changeName-1.0"], {method: "changeName", newName: newName})
        .then(function() {
            document.getElementById("my-name").innerText = newName;
            return rpcRequest({method: "updateSettings", items: {myName: newName}});
        })
        .catch(console.error)
}

function syncUrlAndTitle() {
    rpcRequest({method: "getUrlAndTitle"})
        .then(function(data) {
            if (data.url != hostPage.url && data.title != hostPage.title) {
                hostPage.url = data.url;
                hostPage.title = data.title;
                request(["rejoin-1.0"], {method: "rejoin", url: hostPage.url, title: hostPage.title})
                    .then(onJoined)
                    .catch(console.error)
            }
        })
        .catch(console.error)
}



/* HANDLERS */

function onStartup() {
docReady.then(function() {
    var composeForm = document.getElementById("compose-form");
    composeForm.addEventListener("submit", function(ev) {
        sendChat(composeForm.message.value);
        composeForm.message.value = "";
        ev.preventDefault();
        ev.stopPropagation();
    })
    composeForm.message.addEventListener("keypress", function(ev) {
        if (ev.which == 13 && !ev.shiftKey) {
            sendChat(composeForm.message.value);
            composeForm.message.value = "";
            ev.preventDefault();
            ev.stopPropagation();
        }
    })

    var smileyBrowser = document.getElementById("smiley-browser");
    smileyBrowser.getElementsByClassName("close-button")[0].addEventListener("click", function() {
        smileyBrowser.style.display = "none";
    })

    var smileyButton = document.getElementById("smiley-button");
    smileyButton.addEventListener("click", function() {
        smileyBrowser.style.display = "block";
        if (!smileyList.firstChild) showSmileyGroup(0, 0);
    })

    var editNameForm = document.getElementById("edit-name-form");
    editNameForm.addEventListener("submit", function(ev) {
        changeName(editNameForm.theName.value);
        editNameForm.style.display = "none";
        myName.style.display = "block";
        ev.preventDefault();
        ev.stopPropagation();
    })

    var myName = document.getElementById("my-name");
    myName.addEventListener("click", function() {
        editNameForm.style.display = "block";
        myName.style.display = "none";
    })

    var fontSize = 1;
    var chatLog = document.getElementById("chat-log");
    rpcRequest({method: "getSettings", names: ["fontSize"]})
        .then(function(settings) {
            if (settings.fontSize) {
                fontSize = settings.fontSize;
                chatLog.style.fontSize = fontSize + "em";
            }
        })
        .catch(console.error)

    var fontSizeButton = document.getElementById("fontsize-button");
    fontSizeButton.addEventListener("click", function() {
        fontSize += .125;
        if (fontSize > 1.26) fontSize = .75;
        chatLog.style.fontSize = fontSize + "em";
        rpcRequest({method: "updateSettings", items: {fontSize: fontSize}})
            .catch(console.error)
    })

    var smileyGroupSelect = document.getElementById("smiley-group");
    smileyCollections.forEach(function(collection, collectionIndex) {
        var optGroup = document.createElement("OPTGROUP");
        optGroup.setAttribute("label", collection.desc);
        smileyGroupSelect.appendChild(optGroup);
        var numPages = Math.ceil(collection.count / smileysPerPage);
        for (var pageIndex=0; pageIndex<numPages; pageIndex++) {
            var opt = document.createElement("OPTION");
            opt.value = collectionIndex + "-" + pageIndex;
            opt.innerText = "Page " + (pageIndex+1);
            optGroup.appendChild(opt);
        }
    })
    smileyGroupSelect.addEventListener("change", function() {
        var tokens = smileyGroupSelect.value.split("-");
        showSmileyGroup(Number(tokens[0]), Number(tokens[1]));
    })

    var smileyList = document.getElementById("smiley-list");
    smileyList.addEventListener("click", function(ev) {
        if (ev.target.tagName == "IMG") {
            var smileyId = ev.target.getAttribute("data-smiley-id");
            composeForm.message.value += "[s:" + smileyId + "]";
        }
    })

    var optionsLink = document.getElementById("options-link");
    optionsLink.addEventListener("click", function() {
        rpcRequest({method: "openOptionsPage"})
            .catch(console.error)
    })

    var closeButton = document.getElementById("close-button");
    closeButton.addEventListener("click", function() {
        rpcRequest({method: "closeChat"})
            .catch(console.error)
    })

    var announcement = document.getElementById("announcement");
    rpcRequest({method: "getSettings", names: ["hideAnnouncement"]})
        .then(function(settings) {
            if (!settings.hideAnnouncement) announcement.style.display = "flex";
        })
        .catch(console.error)

    var hideAnnouncementButton = document.getElementById("hide-announcement-button");
    hideAnnouncementButton.addEventListener("click", function() {
        announcement.style.display = "none";
        rpcRequest({method: "updateSettings", items: {hideAnnouncement: true}})
            .catch(console.error)
    })
})
}

function onJoined(data) {
docReady.then(function() {
    var myName = document.getElementById("my-name");
    myName.innerText = data.myName;
    var chatLog = document.getElementById("chat-log");
    chatLog.innerHTML = "";
    data.chatLog.forEach(appendChatEntry);
    chatLog.scrollTop = chatLog.scrollHeight;
})
}

function onChatMessage(data) {
docReady.then(function() {
    appendChatEntry(data.message);
    var chatLog = document.getElementById("chat-log");
    chatLog.scrollTop = chatLog.scrollHeight;
})
}


function appendChatEntry(entry) {
    var chatLog = document.getElementById("chat-log");

    var chatEntry = document.createElement("DIV");
    chatEntry.className = "chat-entry";
    chatLog.appendChild(chatEntry);

    var chatterInfo = document.createElement("DIV");
    chatterInfo.className = "chatter-info";
    chatEntry.appendChild(chatterInfo);

    var userName = document.createElement("SPAN");
    userName.className = "user-name";
    userName.innerText = entry.user.name;
    chatterInfo.appendChild(userName);

    if (entry.url != hostPage.url) {
        var roomPath = document.createElement("SPAN");
        roomPath.className = "room-path";
        roomPath.innerText = entry.title || entry.url;
        roomPath.setAttribute("title", entry.url);
        roomPath.addEventListener("click", function() {
            rpcRequest({method: "redirectTo", url: entry.url})
                .catch(console.error)
        })
        chatterInfo.appendChild(roomPath);
    }

    var chatMessage = document.createElement("DIV");
    chatMessage.className = "chat-message";
    entry.message.split(/\[s:(.*?)\]/)
        .forEach(function(token, index) {
            if (index %2 == 1) {
                var img = document.createElement("IMG");
                img.src = smileyRoot + token;
                chatMessage.appendChild(img);
            }
            else if (token) {
                var span = document.createElement("SPAN");
                span.innerText = token;
                chatMessage.appendChild(span);
            }
        })
    chatEntry.appendChild(chatMessage);
}

function showSmileyGroup(collectionIndex, pageIndex) {
    var smileyList = document.getElementById("smiley-list");
    smileyList.innerHTML = "";
    var collection = smileyCollections[collectionIndex];
    for (var i=pageIndex*smileysPerPage; i<Math.min((pageIndex+1)*smileysPerPage, collection.count); i++) {
        var smileyId = collection.name + "/" + (i+1) + ".gif";
        var img = document.createElement("IMG");
        img.src = smileyRoot + smileyId;
        img.setAttribute("data-smiley-id", smileyId);
        smileyList.appendChild(img);
    }
}
