var brapi = (typeof chrome != 'undefined') ? chrome : (typeof browser != 'undefined' ? browser : {});

var autoOpenPerms = {
    origins: ["http://*/", "https://*/"]
}

document.addEventListener("DOMContentLoaded", onInit);



/* UTILS */

function requestPermissions(perms) {
    return new Promise(function(fulfill) {
        brapi.permissions.request(perms, fulfill);
    })
}

function hasPermissions(perms) {
    return new Promise(function(fulfill) {
        brapi.permissions.contains(perms, fulfill);
    })
}

function removePermissions(perms) {
    return new Promise(function(fulfill) {
        brapi.permissions.remove(perms, fulfill);
    })
}
  


/* HANDLERS */

function onInit() {
    var form = document.getElementById("options-form");
    form.autoOpen.addEventListener("change", function() {
        if (form.autoOpen.checked) {
            requestPermissions(autoOpenPerms)
                .then(function(granted) {
                    form.autoOpen.checked = granted;
                })
                .catch(console.error)
        }
        else {
            removePermissions(autoOpenPerms)
                .catch(console.error)
        }
    })
    hasPermissions(autoOpenPerms)
        .then(function(yes) {
            form.autoOpen.checked = yes;
        })
}
