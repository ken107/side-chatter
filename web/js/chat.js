
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
var smileyRoot = "https://assets.diepkhuc.com/smileys/";

var docReady = new Promise(function(fulfill) {
    document.addEventListener("DOMContentLoaded", fulfill);
})

setInterval(syncUrlAndTitle, 2000);
onStartup();



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
sb.addConnectListener(async function() {
    try {
        const {url, title} = await getActiveTab()
        const {myName} = await browser.storage.local.get(["myName"])
        const result = await request(["join-1.0"], {method: "join", myName, url, title})
        onJoined(result)
    }
    catch (err) {
        console.error(err)
    }
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
            return browser.storage.local.set({myName: newName});
        })
        .catch(console.error)
}

function getActiveTab() {
    return browser.tabs.query({currentWindow: true, active: true})
        .then(tabs => tabs[0])
}

function syncUrlAndTitle() {
    getActiveTab()
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
        if (smileyBrowser.style.display == "block") {
            smileyBrowser.style.display = "none";
        }
        else {
            smileyBrowser.style.display = "block";
            if (!smileyList.firstChild) showSmileyGroup(0, 0);
        }
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
    browser.storage.local.get(["fontSize"])
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
        browser.storage.local.set({fontSize: fontSize})
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

    var announcement = document.getElementById("announcement");
    browser.storage.local.get(["hideAnnouncement"])
        .then(function(settings) {
            if (!settings.hideAnnouncement) announcement.style.display = "flex";
        })
        .catch(console.error)

    var hideAnnouncementButton = document.getElementById("hide-announcement-button");
    hideAnnouncementButton.addEventListener("click", function() {
        announcement.style.display = "none";
        browser.storage.local.set({hideAnnouncement: true})
            .catch(console.error)
    })

    var reportBtn = document.getElementById("report-button")
    reportBtn.addEventListener("click", function() {
        window.open("https://lsdsoftware.com/contact.html?subject=SideChatter", "sidechatter-contactus")
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
            browser.tabs.update({url: entry.url})
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
