var express = require("express");
var app = express();
var fs = require('fs');
var multer = require('multer');
var bodyParser = require('body-parser');
var path = require('path');
var exec = require('child_process').exec;
var crypto = require('crypto');
var ActiveDirectory = require('activedirectory');
var cookieParser = require('cookie-parser')

var whitelist = [];

var adname = process.env.adname;
var baseDN = process.env.baseDN;
var showUser = process.env.showUser;
var showPass = process.env.showPass;
var adminGroupTemp = process.env.AdminGroup;
var adminGroup = adminGroupTemp.split(",");
var loginGroupArr = process.env.LoginGroup;
var loginGroup = loginGroupArr.split(",");

//"icinga2@aditosoftware.local"
//"I2ci5naga2a2015"


var ad = new ActiveDirectory({
    url: 'ldap://aditosoftware.local',
    baseDN: baseDN,
    username: showUser + "@" + adname,
    password: showPass
});

app.set('views', __dirname + '/views')
app.set('view engine', 'jade')
app.use(express.static(__dirname + '/public'))
app.use('/backup', express.static('/dbbackup'))
app.use('/upload', express.static('/upload'))
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());

var dbspath = '.'

function checkgroup(user, pass, callback) {

    var username = user + "@" + adname;

    ad.authenticate(username, pass, function (err, auth) {
        if (err) {
            console.log('ERROR: ' + JSON.stringify(err));
            return callback("none");
        }

        if (auth) {
            console.log('Authenticated!');
            ad.getGroupMembershipForUser(username, function (err, groups) {
                if (err) {
                    console.log('ERROR: ' + JSON.stringify(err));
                    return;
                }
                if (!groups) {
                    console.log('User: ' + username + ' not found.');
                } else {
                    //console.log(groups[0].dn.length);

                    for (var i = 0; i < groups.length; i++) {
                        var dnSplit = groups[i].dn;
                        var groupSplit = dnSplit.split(",");
                        var groupName = groupSplit[0].replace("CN=", "");
                        //console.log(groupName);

                        for (var y = 0; y < adminGroup.length; y++) {
                            if (groupName == adminGroup[y]) {
                                return callback("admin");
                                break;
                            }
                        }
                        for (var x = 0; x < loginGroup.length; x++) {
                            if (groupName == loginGroup[x]) {
                                return callback("user");
                                break;
                            }
                        }
                    }
                }
            });

        }
        else {
            return callback("none");
        }
    });
}

function checklogin(array, hash, callback) {

    if (hash !== null && hash !== undefined && array.length > 0) {

        for (var i = 0; i < array.length; i++) {

            if (array[i].hash === hash) {
                return callback(true, array[i].access);
            }
        }
        return callback(false);

    } else {
        return callback(false);
    }
}

function inObject(arr, search, callback) {
    var len = arr.length;
    while (len--) {
        if (arr[len].hash === search)
            return callback(len);
    }
    return callback("-1");
}

app.listen(5000, function () {
    console.log("Live at Port 5000");
});

app.get('/dbs', function (req, res) {

    checklogin(whitelist, req.cookies._id, function (stat, role) {
        if (stat) {
            fs.readdir(dbspath, function (err, items) {
                var dirs = [];
                var created = [];
                var regex = /derby.log/gi;
                for (var i = 0; i < items.length; i++) {
                    if (!items[i].match(regex)) {
                        created.push(fs.statSync(dbspath + "/" + items[i]).mtime);
                        dirs.push(items[i]);
                    }
                }
                res.render('index', {
                    dbs: dirs,
                    date: created,
                    createDb: '/create',
                    length: items.length
                })
            })
        } else {
            res.redirect('/');
        }
    })
})

app.get('/', function (req, res) {

    //console.log('Cookies: ', req.cookies)

    if (req.query.ngroup) {
        var ngroup = true;
    } else {
        var ngroup = false;
    }

    checklogin(whitelist, req.cookies._id, function (stat, role) {
        console.log(stat);
        if (stat) {
            res.redirect('/dbs');
        } else {
            res.render('login', {
                ngroup: ngroup
            })
        }
    })
})

app.get('/create', function (req, res) {

    checklogin(whitelist, req.cookies._id, function (stat, role) {
        if (stat) {
            res.render('create', {
                show: '/', createDb: '/create',
                content: "Das ist Create Seite"
            });
        } else {
            res.render('login', {
                ngroup: "true"
            })
        }
    })
})

app.get('/log', function (req, res) {

    checklogin(whitelist, req.cookies._id, function (stat, role) {
        if (stat) {

            fs.readFile(dbspath + '/derby.log', 'utf8', function (err, data) {
                var arr = [];
                if (err) {
                    arr.push("Cannot open log file");
                    res.render('log', {
                        data: arr
                    })
                    console.log(err);
                } else {
                    arr = data.split("\n");
                    res.render('log', {
                        data: arr
                    })
                }
            });

        } else {
            res.render('login', {
                ngroup: "true"
            })
        }
    })
});

app.post('/delresponse', multer({ dest: '/delresponse' }).single('delresponse'), function (req, res) {

    checklogin(whitelist, req.cookies._id, function (stat, role) {
        if (stat) {
            res.send(role);
        } else {
            res.render('login', {
                ngroup: "true"
            })
        }
    })
})


app.post('/delcookie', multer({ dest: '/delcookie' }).single('delcookie'), function (req, res) {
    var id = req.body.id
    res.clearCookie("_id");
    res.send(true);
})


app.post('/deletedb', function (req, res) {
    var dbname = req.body.dbname;
    var id = req.body.id;

    console.log(id);

    checklogin(whitelist, req.cookies._id, function (stat, role) {
        if (stat) {
            console.log("found");
        } else {
            res.render('login', {
                ngroup: "true"
            })
        }
    })

    var cmd = "rm -Rf " + dbspath + "/" + dbname;
    console.log(cmd);
    child = exec(cmd, function (error, stdout, stderr) {
        if (error !== null) {
            console.log('exec error: ' + error);
        } else {
            res.redirect('/');
        }

    });
})

app.post('/login', multer({ dest: '/login' }).single('login'), function (req, res) {

    var user = req.body.user;
    var pass = req.body.password;

    checkgroup(user, pass, function (user) {

        if (user !== "none") {
            var md5hash = crypto.createHash('md5').update(user + pass).digest('hex');
            res.clearCookie("_id");
            res.cookie("_id", md5hash, { maxAge: 600000 });

            inObject(whitelist, md5hash, function (len) {
                if (len >= 0 && len <= whitelist.length) {
                    whitelist[len] = {
                        "hash": md5hash,
                        "access": user
                    }
                    console.log(whitelist);
                    res.send(user); 
                } else {
                    whitelist.push({
                        hash: md5hash,
                        access: user
                    });
                    console.log(whitelist);
                    res.send(user);
                }
            })
        } else {
            console.log(user);
            //res.redirect('/?ngroup="true"');
            res.send("none");
        }
    })
})

function randomIntInc(low, high) {
    return Math.floor(Math.random() * (high - low + 1) + low);
}

function stripTrailingSlash(str) {
    if (str.substr(-1) === '/') {
        return str.substr(0, str.length - 1);
    }
    return str;
}