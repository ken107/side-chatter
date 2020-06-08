
var queryString = {};
if (location.search)
    location.search.substr(1).split('&').forEach(function(token) {
        var pair = token.split('=');
        queryString[decodeURIComponent(pair[0])] = pair.length > 1 ? decodeURIComponent(pair[1]) : true;
    })

var myUrl = new URL(queryString.url);

document.addEventListener("DOMContentLoaded", onDocumentReady);




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
    request(["join-1.0"], {method: "join", url: queryString.url})
        .then(onJoined)
        .catch(console.error)
})
function request(capabilities, data) {
    return sb.request({name: "side-chatter", capabilities: capabilities}, {payload: JSON.stringify(data)})
        .then(function(res) {
            return res.payload && JSON.parse(res.payload);
        })
}



/* HANDLERS */

function onDocumentReady() {
    var composeForm = document.getElementById("compose-form");
    composeForm.addEventListener("submit", function(ev) {
        submitForm();
        ev.preventDefault();
        ev.stopPropagation();
    })
    composeForm.message.addEventListener("keypress", function(ev) {
        if (ev.which == 13 && !ev.shiftKey) {
            submitForm();
            ev.preventDefault();
            ev.stopPropagation();
        }
    })
    function submitForm() {
        sendChat(composeForm.message.value);
        composeForm.message.value = "";
    }
}

function onJoined(data) {
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




/* ACTIONS */

function sendChat(message) {
    request(["message-1.0"], {method: "message", message: message})
        .catch(console.error)
}
