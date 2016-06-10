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

function logon(user, pass) {

    $.post('/login', { 'user': user, "password": pass }).done(function (role) {
        if (role == "admin") {
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

    var cookiearr = document.cookie;
    var idSplit = cookiearr.split("=");
    var id = idSplit[1];

    $.post('/delcookie', { 'id': id }).done(function (data) {
      if(data){
          window.location.replace('/');
      }  
    })

}

function restartSrv() {
    post("/restartSrv");
}

function downloadDb(line) {
    var dbnameTd = document.getElementsByName("db" + line);
    var dbname = dbnameTd[0].innerText;

    post('/downloadDb', { 'dbname': dbname })
}