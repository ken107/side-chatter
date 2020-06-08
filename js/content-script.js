
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
    main.style.padding = "12px";
    main.style.backgroundColor = "#800";
    main.style.zIndex = "9999";
    main.style.display = "flex";
    document.body.appendChild(main);

    var frame = document.createElement("IFRAME");
    frame.src = chrome.runtime.getURL("web/chat.html") + "?url=" + encodeURIComponent(location.href);
    frame.style.flex = "1";
    frame.style.borderStyle = "none";
    main.appendChild(frame);
})()
