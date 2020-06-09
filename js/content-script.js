var brapi = (typeof chrome != 'undefined') ? chrome : (typeof browser != 'undefined' ? browser : {});

getSettings(["sidebarWidth"]).then(onInit);



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

    var main = document.createElement("DIV");
    main.id = "side-chatter";
    main.style.position = "fixed";
    main.style.top =
    main.style.right =
    main.style.bottom = "0px";
    main.style.width = settings.sidebarWidth ? (settings.sidebarWidth + "px") : "25%";
    main.style.borderRadius = ".375rem";
    main.style.padding = ".75rem .75rem .75rem 0";
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
    resizerKnob.src = chrome.runtime.getURL("web/img/drag-horiz.png");
    resizerKnob.addEventListener("mousedown", resizer.start.bind(resizer));
    resizerKnob.style.width = ".75rem";
    resizerKnob.style.cursor = "ew-resize";
    resizerDiv.appendChild(resizerKnob);

    var frame = document.createElement("IFRAME");
    frame.src = chrome.runtime.getURL("web/chat.html") + "?url=" + encodeURIComponent(location.href);
    frame.style.flex = "1";
    frame.style.borderStyle = "none";
    main.appendChild(frame);

    var closeBtn = document.createElement("DIV");
    closeBtn.innerHTML = "&times;";
    closeBtn.addEventListener("click", function() {document.body.removeChild(main)});
    closeBtn.style.position = "absolute";
    closeBtn.style.top =
    closeBtn.style.right = ".75rem";
    closeBtn.style.fontSize = "1rem";
    closeBtn.style.color = "white";
    closeBtn.style.cursor = "pointer";
    main.appendChild(closeBtn);
}
