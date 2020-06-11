var brapi = (typeof chrome != 'undefined') ? chrome : (typeof browser != 'undefined' ? browser : {});

var appUrl;

getSettings(["sidebarWidth", "useLocalUntil"]).then(onInit);
window.addEventListener("message", onMessage, false);



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



/* HANDLERS */

function onInit(settings) {
    if (document.getElementById("side-chatter")) return;

    var base = (settings.useLocalUntil && settings.useLocalUntil > Date.now()) ? brapi.runtime.getURL("web/chat.html") : "https://sidechatter.lsdsoftware.com/chat.html";
    appUrl = base + "?url=" + encodeURIComponent(location.href) + "&title=" + encodeURIComponent(document.title);

    var main = document.createElement("DIV");
    main.id = "side-chatter";
    main.style.position = "fixed";
    main.style.top =
    main.style.right =
    main.style.bottom = "0px";
    main.style.width = settings.sidebarWidth ? (settings.sidebarWidth + "px") : "25%";
    main.style.fontSize = "16px";
    main.style.borderRadius = ".375em";
    main.style.padding = ".75em .75em .75em 0";
    main.style.boxSizing = "border-box";
    main.style.backgroundColor = "#800";
    main.style.zIndex = "9999";
    main.style.display = "flex";
    document.body.appendChild(main);

    var resizer = new function() {
		var startWidth, startX, currentWidth;
		this.start = function(ev) {
            frame.style.pointerEvents = "none";
			startWidth = main.offsetWidth;
			startX = ev.clientX;
            document.addEventListener("mousemove", move);
            document.addEventListener("mouseup", stop);
            ev.preventDefault();
            ev.stopPropagation();
		};
		function move(ev) {
			currentWidth = startWidth - (ev.clientX - startX);
			main.style.width = currentWidth + "px";
			ev.preventDefault();
            ev.stopPropagation();
		}
		function stop(ev) {
            updateSettings({sidebarWidth: currentWidth});
            document.removeEventListener("mousemove", move);
            document.removeEventListener("mouseup", stop);
            frame.style.pointerEvents = "";
			ev.preventDefault();
            ev.stopPropagation();
		}
	}

    var resizerDiv = document.createElement("DIV");
    resizerDiv.style.flex = "0 0 auto";
    resizerDiv.style.display = "flex";
    resizerDiv.style.flexFlow = "column";
    resizerDiv.style.justifyContent = "center";
    main.appendChild(resizerDiv);

    var resizerKnob = document.createElement("IMG");
    resizerKnob.src = brapi.runtime.getURL("web/img/drag-horiz.png");
    resizerKnob.addEventListener("mousedown", resizer.start.bind(resizer));
    resizerKnob.style.width = ".75em";
    resizerKnob.style.cursor = "ew-resize";
    resizerDiv.appendChild(resizerKnob);

    var frame = document.createElement("IFRAME");
    frame.src = appUrl;
    frame.style.flex = "1";
    frame.style.borderStyle = "none";
    frame.style.position = "static";
    main.appendChild(frame);
}

function onMessage(ev) {
    if (appUrl.substr(0, ev.origin.length) != ev.origin) return;
    var sendResponse = function(data) {
        if (!data) data = {};
        data.id = ev.data.id;
        ev.source.postMessage(data, ev.origin);
    };
    if (ev.data.method == "redirectTo") {
        brapi.runtime.sendMessage(ev.data);
        sendResponse();
    }
    else if (ev.data.method == "openOptionsPage") {
        brapi.runtime.sendMessage(ev.data);
        sendResponse();
    }
    else if (ev.data.method == "closeChat") {
        document.body.removeChild(document.getElementById("side-chatter"));
        window.removeEventListener("message", onMessage, false);
        //sendResponse();
    }
    else if (ev.data.method == "getSettings") {
        getSettings(ev.data.names)
            .then(function(items) {
                sendResponse({value: items});
            })
    }
    else if (ev.data.method == "updateSettings") {
        updateSettings(ev.data.items);
        sendResponse();
    }
    else if (ev.data.method == "getVersion") {
        sendResponse({value: brapi.runtime.getManifest().version});
    }
    else {
        sendResponse({error: "BAD_METHOD"});
    }
}
