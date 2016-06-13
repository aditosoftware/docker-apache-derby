function post(path, params, method) {
    method = method || "post"; // Set method to post by default if not specified.

    // The rest of this code assumes you are not using a library.
    // It can be made less wordy if you use one.
    var form = document.createElement("form");
    form.setAttribute("method", method);
    form.setAttribute("action", path);

    for (var key in params) {
        if (params.hasOwnProperty(key)) {
            var hiddenField = document.createElement("input");
            hiddenField.setAttribute("type", "hidden");
            hiddenField.setAttribute("name", key);
            hiddenField.setAttribute("value", params[key]);

            form.appendChild(hiddenField);
        }
    }

    document.body.appendChild(form);
    form.submit();
}

function deleteDb(line) {

    var cookiearr = document.cookie;
    var idSplit = cookiearr.split("=");
    var id = idSplit[1];

    $.post('/delresponse', { 'id': id }).done(function (data) {
        if (data == "admin") {
            if (confirm('Do you really want to delete database?')) {
                var dbnameTd = document.getElementsByName("db" + line);
                var dbname = dbnameTd[0].innerText;
                console.log(dbname);

                post('/deletedb', { 'dbname': dbname, 'id': id })
            } else {
                window.location.href('/');
            }
        } else {
            alert("Only users of the admin group can delete a database");
        }
    })

}

function downloadDb(line) {
    var dbnameTd = document.getElementsByName("db" + line);
    var dbname = dbnameTd[0].innerText;

    console.log(dbname);

    post('/downloadDb', { 'dbname': dbname })
}

function logon(user, pass) {

    $.post('/login', { 'user': user, "password": pass }).done(function (role) {
        console.log(role);
        if (role == "admin" || role == "user") {
            window.location.replace("/dbs");
        } else {
            var para = document.createElement("p");
            var node = document.createTextNode("User is not a member of login or admin group");
            para.appendChild(node);

            var element = document.getElementById("loginform");
            element.appendChild(para);
            para.style.color = "red";
        }
    })

}

function logout() {

}

function restartSrv() {
    $.post('/restartSrv').done(function (data) {
        if (data === "none") {
            alert("Server cannot restart - insufficient permissions(only admin)");
        } else if (data.error == true) {
            alert("Cannot restart server " + data.output)
        } else {
            alert("Server restart successfull")
        }
    })
}

function createdb(dbname, user, pass) {
    $.post("/createdb", { "db": dbname, "dbuser": user, "dbpass": pass }).done(function (data) {
        console.log(data);
        if (data === "none") {
            alert("Server cannot restart - insufficient permissions(only admin)");
        } else if (data.error == true) {
            alert("Cannot create DB " + data.output);
        } else {
            alert("DB created successfull");
        }
    })
}

function createlogoutButton() {

}

document.addEventListener('DOMContentLoaded', function () {
    $.post("/logoutbutton").done(function (data) {

        //button(class="btn btn navbar-btn navbar-right", onclick='logout()') Logout
        if (data) {
            var head = document.getElementById("navbar-1");
            var btn = document.createElement("button")
            var text = document.createTextNode("Logout");
            btn.appendChild(text);
            btn.onclick = function () {
                var cookiearr = document.cookie;
                var idSplit = cookiearr.split("=");
                var id = idSplit[1];

                $.post('/delcookie', { 'id': id }).done(function (data) {
                    if (data) {
                        window.location.replace('/');
                    }
                })
            }
            btn.className += "btn navbar-btn navbar-right";
            head.appendChild(btn);
        }
    })
}, false);