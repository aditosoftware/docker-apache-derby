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
var adauthread = process.env.ADAUTH;


if (adauthread == "true" || adauthread == "1") {
    console.log("AD Auth");
    adauth = true;
    var adname = process.env.ADNAME;
    var baseDN = process.env.BASEDN;
    var showUser = process.env.SHOWUSER;
    var showPass = process.env.SHOWPASS;
    var adminGroupTemp = process.env.ADMINGROUP;
    var adminGroup = adminGroupTemp.split(",");
    var loginGroupArr = process.env.LOGINGROUP;
    var loginGroup = loginGroupArr.split(",");
} else {
    console.log("AD Auth not set: " + adauthread);
    adauth = false;
}


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

var dbspath = '/dbs'

function checkgroup(user, pass, callback) {

    if (adauth) {
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
    } else {
        return callback("admin");
    }
}

function checklogin(array, hash, callback) {

    if (adauth) {
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
    } else {
        return callback("admin");
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

    if (req.query.ngroup) {
        var ngroup = true;
    } else {
        var ngroup = false;
    }

    if (req.query.upload) {
        var upload = true;
    } else {
        var upload = false;
    }

    if (adauth) {
        checklogin(whitelist, req.cookies._id, function (stat, role) {
            if (stat) {
                res.redirect('/dbs');
            } else {
                res.render('login', {
                    ngroup: ngroup,
                    upload: upload
                })
            }
        })
    } else {
        res.redirect("/dbs");
    }

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
    if (adauth) {
        checklogin(whitelist, req.cookies._id, function (stat, role) {
            if (stat) {
                res.send(role);
            } else {
                res.render('login', {
                    ngroup: "true"
                })
            }
        })
    } else {
        res.send("admin");
    }

})


app.post('/delcookie', multer({ dest: '/delcookie' }).single('delcookie'), function (req, res) {
    var id = req.body.id
    res.clearCookie("_id");
    res.send(true);
})


app.post('/deletedb', function (req, res) {
    var dbname = req.body.dbname;
    var id = req.body.id;

    checklogin(whitelist, req.cookies._id, function (stat, role) {
        if (stat) {

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
            res.send("none");
        }
    })
})

app.post('/downloadDb', function (req, res) {
    var dbname = req.body.dbname;

    checklogin(whitelist, req.cookies._id, function (stat, role) {
        if (stat) {
            var startBackup = 'echo \"connect \'jdbc:derby://0.0.0.0:1527/' + dbname + ';\'; CALL SYSCS_UTIL.SYSCS_BACKUP_DATABASE(/dbbackup/' + dbname + '\');\" | /db-derby-10.12.1.1-bin/bin/ij'
            child = exec(startBackup, function (error, stdout, stderr) {
                if (error !== null) {
                    console.log('exec error: ' + error);
                } else {
                    var cmd = "cd " + dbspath + " && zip -r /dbbackup/" + dbname + ".zip " + dbname
                    child = exec(cmd, function (error, stdout, stderr) {
                        if (error !== null) {
                            console.log('exec error: ' + error);
                        } else {
                            res.download("/dbbackup/" + dbname + ".zip", dbname + ".zip", function (err) {
                                if (err) {
                                    console.log(err);
                                } else {
                                    var cmdDel = "rm -Rf /dbbackup/" + dbname + ".zip && rm -Rf /" + dbname + ".json"
                                    child = exec(cmdDel, function (error, stdout, stderr) {
                                        if (error !== null) {
                                            console.log('exec error: ' + error);
                                        } else {
                                            console.log("start download");
                                        }

                                    });
                                }
                            });
                        }
                    });
                }
            });
        } else {
            res.render('login', {
                ngroup: "true"
            })
        }
    })

})

app.post('/restartSrv', function (req, res) {

    if (adauth) {
        checklogin(whitelist, req.cookies._id, function (stat, role) {
            if (stat) {

                if (role !== "admin") {
                    res.send("none")
                } else {
                    var cmd = "/db-derby-10.12.1.1-bin/bin/stopNetworkServer && supervisorctl -c /etc/supervisor.conf start derbydb";
                    child = exec(cmd, function (error, stdout, stderr) {
                        if (error !== null) {
                            var response = {
                                "error": true,
                                "output": error.cmd + "\n" + stderr
                            }
                            res.send(response);
                        } else {
                            res.send("success");
                        }
                    });
                }
            } else {
                res.render('login', {
                    ngroup: "true"
                })
            }
        })
    } else {
        var cmd = "/db-derby-10.12.1.1-bin/bin/stopNetworkServer && supervisorctl -c /etc/supervisor.conf start derbydb";
        child = exec(cmd, function (error, stdout, stderr) {
            if (error !== null) {
                var response = {
                    "error": true,
                    "output": error.cmd + "\n" + stderr
                }
                res.send(response);
            } else {
                res.send("success");
            }
        });
    }


})

app.post('/createdb', function (req, res) {

    var dbname = req.body.db;
    var dbuser = req.body.dbuser;
    var dbpass = req.body.dbpass;

    if (adauth) {
        checklogin(whitelist, req.cookies._id, function (stat, role) {
            if (stat) {
                console.log(role);
                if (role !== "admin") {
                    res.send("none")
                } else {
                    var cmd = 'echo \"connect \'jdbc:derby://0.0.0.0:1527/' + dbname + ";user=" + dbuser + ";password=" + dbpass + ";create=true\';\" | /db-derby-10.12.1.1-bin/bin/ij"
                    console.log(cmd);
                    child = exec(cmd, function (error, stdout, stderr) {
                        if (error !== null) {
                            var response = {
                                "error": true,
                                "output": error.cmd + "\n" + stderr
                            }
                            res.send(response);
                        } else {
                            fs.exists(dbspath + "/" + dbname, function (exists) {
                                if (exists) {
                                    var response = {
                                        "error": false,
                                        "output": "DB was created"
                                    }
                                    res.send(response);
                                } else {
                                    var response = {
                                        "error": true,
                                        "output": "DB was not created\nYou need restart server first"
                                    }
                                    res.send(response);
                                }
                            });
                        }
                    });
                }
            } else {
                res.render('login', {
                    ngroup: "true"
                })
            }
        })
    } else {
        var cmd = 'echo \"connect \'jdbc:derby://0.0.0.0:1527/' + dbname + ";user=" + dbuser + ";password=" + dbpass + ";create=true\';\" | /db-derby-10.12.1.1-bin/bin/ij"
        console.log(cmd);
        child = exec(cmd, function (error, stdout, stderr) {
            if (error !== null) {
                var response = {
                    "error": true,
                    "output": error.cmd + "\n" + stderr
                }
                res.send(response);
            } else {
                fs.exists(dbspath + "/" + dbname, function (exists) {
                    if (exists) {
                        var response = {
                            "error": false,
                            "output": "DB was created"
                        }
                        res.send(response);
                    } else {
                        var response = {
                            "error": true,
                            "output": "DB was not created\nYou need restart server first"
                        }
                        res.send(response);
                    }
                });
            }
        });
    }
})

app.post('/uploaddb', multer({ dest: '/upload/' }).single('upl'), function (req, res) {

    //console.log(req.file); //form files
	/* example output:
            { fieldname: 'upl',
              originalname: 'grumpy.png',
              encoding: '7bit',
              mimetype: 'image/png',
              destination: './uploads/',
              filename: '436ec561793aa4dc475a88e84776b1b9',
              path: 'uploads/436ec561793aa4dc475a88e84776b1b9',
              size: 277056 }
	 */

    if (adauth) {
        checklogin(whitelist, req.cookies._id, function (stat, role) {
            if (stat) {
                var pathToFile = req.file.path;
                var origname = req.file.origname;

                var passBody = req.body;

                var unZipDb = "unzip -l " + pathToFile + " | sed -n 4p | awk '{print $4;}'"
                child = exec(unZipDb, function (error, pPath, stderr) {
                    if (error !== null) {
                        console.log('exec error: ' + error);
                    } else {
                        var dbnameZip = stripTrailingSlash(pPath.trim());
                        var dbRenamed = stripTrailingSlash(pPath.trim()) + "_" + randomIntInc(1, 10000);
                        if (fs.existsSync(dbspath + "/" + dbnameZip)) {
                            console.log("db found.Rename");
                            var unzipcom = "unzip " + pathToFile + " -d /tmp";
                            child = exec(unzipcom, function (error, stdout, stderr) {
                                if (error !== null) {
                                    console.log('exec error: ' + error);
                                } else {
                                    var mvZip = "mv /tmp/" + dbnameZip + " " + dbspath + "/" + dbRenamed;
                                    console.log(mvZip);
                                    child = exec(mvZip, function (error, stdout, stderr) {
                                        if (error !== null) {
                                            console.log('exec error: ' + error);
                                        } else {
                                            passBody.dbname = dbRenamed;
                                            console.log("move db successfull")

                                            var rmUpload = "rm -Rf /upload/*"
                                            child = exec(rmUpload, function (error, stdout, stderr) {
                                                if (error !== null) {
                                                    console.log('exec error: ' + error);
                                                } else {
                                                    console.log("Remove all from upload - ok");
                                                    res.redirect('/?upload=true');
                                                    res.status(200).end();
                                                }

                                            });
                                        }

                                    });
                                }

                            });
                        } else {
                            console.log("db not found.Create");
                            passBody.dbname = dbRenamed;
                            var unzipcom = "unzip " + pathToFile + " -d " + dbspath;
                            child = exec(unzipcom, function (error, stdout, stderr) {
                                if (error !== null) {
                                    console.log('exec error: ' + error);
                                } else {
                                    res.redirect('/?upload=true');
                                    res.status(200).end();
                                }

                            });
                        }
                    }

                });
            } else {
                res.render('login', {
                    ngroup: "true"
                })
            }
        })
    }
});

app.post('/logoutbutton', function (req, res) {
    if (adauth) {
        checklogin(whitelist, req.cookies._id, function (stat, role) {
            var permis = {
                "user": true,
                "role": role
            }
            res.send(permis);
        })
    } else {
        var permis = {
            "user": false,
            "role": "none"
        }
        res.send(permis);
    }
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