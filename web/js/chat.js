var brapi = (typeof chrome != 'undefined') ? chrome : (typeof browser != 'undefined' ? browser : {});

var queryString = {};
if (location.search)
    location.search.substr(1).split('&').forEach(function(token) {
        var pair = token.split('=');
        queryString[decodeURIComponent(pair[0])] = pair.length > 1 ? decodeURIComponent(pair[1]) : true;
    })

var myUrl = new URL(queryString.url);

document.addEventListener("DOMContentLoaded", onDocumentReady);



/* UTILS */

function getSettings(names) {
    return new Promise(function(fulfill) {
        brapi.storage.local.get(names, fulfill);
    })
}

function updateSettings(items) {
    return new Promise(function(fulfill) {
        brapi.storage.local.set(items, fulfill);
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
    getSettings(["myName"])
        .then(function(settings) {
            return request(["join-1.0"], {method: "join", url: queryString.url, myName: settings.myName})
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
            return updateSettings({myName: newName});
        })
        .catch(console.error)
}



/* HANDLERS */

function onDocumentReady() {
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
}

function onJoined(data) {
    var myName = document.getElementById("my-name");
    myName.innerText = data.myName;
    var chatLog = document.getElementById("chat-log");
    chatLog.innerHTML = "";
    data.chatLog.forEach(appendChatEntry);
}

function onChatMessage(data) {
    appendChatEntry(data.message);
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

    var url = new URL(entry.user.url);
    if (url.pathname != myUrl.pathname) {
        var roomPath = document.createElement("SPAN");
        roomPath.className = "room-path";
        roomPath.innerText = url.pathname;
        chatterInfo.appendChild(roomPath);
    }

    var chatMessage = document.createElement("DIV");
    chatMessage.className = "chat-message";
    chatMessage.innerText = entry.message;
    chatEntry.appendChild(chatMessage);
}
