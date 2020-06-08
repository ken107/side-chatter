
(function() {
    if (document.getElementById("side-chatter")) return;

    var main = document.createElement("DIV");
    main.id = "side-chatter";
    main.style.position = "fixed";
    main.style.top =
    main.style.right =
    main.style.bottom = "0px";
    main.style.width = "25%";
    main.style.borderRadius = "6px";
    main.style.padding = "12px 12px 12px 0";
    main.style.boxSizing = "border-box";
    main.style.backgroundColor = "#800";
    main.style.zIndex = "9999";
    main.style.display = "flex";
    document.body.appendChild(main);

    var resizer = new function() {
		var startWidth, startX;
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
			var currentWidth = startWidth - (ev.clientX - startX);
			main.style.width = currentWidth + "px";
			ev.preventDefault();
            ev.stopPropagation();
		}
		function stop(ev) {
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
    resizerKnob.style.width = "12px";
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
    closeBtn.style.right = "12px";
    closeBtn.style.cursor = "pointer";
    main.appendChild(closeBtn);
})()
