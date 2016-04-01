var express = require("express");
var app = express();
var fs = require('fs');
var multer = require('multer');
var bodyParser = require('body-parser');
var path = require('path');
var exec = require('child_process').exec;


app.set('views', __dirname + '/views')
app.set('view engine', 'jade')
app.use(express.static(__dirname + '/public'))
app.use('/backup', express.static('/dbbackup'))
app.use('/upload', express.static('/upload'))
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));

var dbspath = '/dbs'
var passfile = "/" + "passfile.json";

app.listen(5000, function() {
    console.log("Live at Port 5000");
});

app.get('/', function(req, res) {

    if (req.query.upload) {
        var upload = true;
    } else {
        var upload = false;
    }

    if (req.query.error) {
        var error = true;
    } else {
        var error = false;
    }

    if (req.query.restart) {
        var restart = true;
    } else {
        var restart = false;
    }

    fs.readdir(dbspath, function(err, items) {
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
            error: error,
            length: items.length,
            restart: restart,
            upload: upload
        })
    })
})

app.get('/create', function(req, res) {
    res.render('create', {
        show: '/', createDb: '/create',
        content: "Das ist Create Seite"
    });
})

app.post('/restartSrv', function(req, res) {

    var cmd = "/db-derby-10.12.1.1-bin/bin/stopNetworkServer && supervisorctl -c /etc/supervisor.conf start derbydb";
    child = exec(cmd, function(error, stdout, stderr) {
        if (error !== null) {
            console.log('exec error: ' + error);
        } else {

            res.redirect('/?restart=true');
            res.status(200).end();
        }
    });

})

app.get('/log', function(req, res) {
    fs.readFile(dbspath + '/derby.log', 'utf8', function(err, data) {
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
});

app.post('/createdb', function(req, res) {
    var db = req.body.dbname;
    var user = req.body.dbuser;
    var pass = req.body.dbpass;

    var passObj = passfileHandle(req.body, 'add');

    //generate
    //echo "connect 'jdbc:derby://0.0.0.0:1527/dbtest;user=test;password=test;create=true';" | /db-derby-10.12.1.1-bin/bin/ij
    var cmd = 'echo \"connect \'jdbc:derby://0.0.0.0:1527/' + db + ";user=" + user + ";password=" + pass + ";create=true\';\" | /db-derby-10.12.1.1-bin/bin/ij"
    console.log(cmd);
    child = exec(cmd, function(error, stdout, stderr) {
        if (error !== null) {
            console.log('exec error: ' + error);
            console.log(stdout);
        } else {

            fs.exists(dbspath + "/" + db, function(exists) {
                if (exists) {
                    res.redirect('/');
                    res.status(200).end();
                } else {
                    console.log("DB don't exist\nRestart server");
                    res.redirect('/?error=true');
                }
            });

            console.log(stdout);

        }
    });
});

app.post('/deletedb', function(req, res) {
    var dbname = req.body.dbname;
    var cmd = "rm -Rf " + dbspath + "/" + dbname;
    console.log(cmd);
    child = exec(cmd, function(error, stdout, stderr) {
        if (error !== null) {
            console.log('exec error: ' + error);
        } else {
            var passObj = passfileHandle(req.body, 'del');
            res.redirect('/');
        }

    });
})

app.post('/downloadDb', function(req, res) {
    var dbname = req.body.dbname;

    var passfileObj = JSON.parse(fs.readFileSync(passfile, 'utf8'));
    var passinfo = passfileObj[dbname];
    //create command to make backup
    //echo "connect 'jdbc:derby://0.0.0.0:1527/adito;'; CALL SYSCS_UTIL.SYSCS_BACKUP_DATABASE('/dbbackup/adito');" | /db-derby-10.12.1.1-bin/bin/ij

    var startBackup = 'echo \"connect \'jdbc:derby://0.0.0.0:1527/' + dbname + ';\'; CALL SYSCS_UTIL.SYSCS_BACKUP_DATABASE(/dbbackup/' + dbname + '\');\" | /db-derby-10.12.1.1-bin/bin/ij'
    child = exec(startBackup, function(error, stdout, stderr) {
        if (error !== null) {
            console.log('exec error: ' + error);
        } else {
            var cmd = "cd " + dbspath + " && zip -r /dbbackup/" + dbname + ".zip " + dbname
            child = exec(cmd, function(error, stdout, stderr) {
                if (error !== null) {
                    console.log('exec error: ' + error);
                } else {
                    res.download("/dbbackup/" + dbname + ".zip", dbname + ".zip", function(err) {
                        if (err) {
                            console.log(err);
                        } else {
                            var cmdDel = "rm -Rf /dbbackup/" + dbname + ".zip && rm -Rf /" + dbname + ".json"
                            child = exec(cmdDel, function(error, stdout, stderr) {
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

})

app.post('/upload', multer({ dest: '/upload/' }).single('upl'), function(req, res) {

    /*console.log(req.file); //form files
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
    var pathToFile = req.file.path;
    var origname = req.file.origname;

    var passBody = req.body;

    var unZipDb = "unzip -l " + pathToFile + " | sed -n 4p | awk '{print $4;}'"
    child = exec(unZipDb, function(error, pPath, stderr) {
        if (error !== null) {
            console.log('exec error: ' + error);
        } else {
            var dbnameZip = stripTrailingSlash(pPath.trim());
            var dbRenamed = stripTrailingSlash(pPath.trim()) + "_" + randomIntInc(1, 10000);
            if (fs.existsSync(dbspath + "/" + dbnameZip)) {
                console.log("db found.Rename");
                var unzipcom = "unzip " + pathToFile + " -d /tmp";
                child = exec(unzipcom, function(error, stdout, stderr) {
                    if (error !== null) {
                        console.log('exec error: ' + error);
                    } else {
                        var mvZip = "mv /tmp/" + dbnameZip + " " + dbspath + "/" + dbRenamed;
                        console.log(mvZip);
                        child = exec(mvZip, function(error, stdout, stderr) {
                            if (error !== null) {
                                console.log('exec error: ' + error);
                            } else {
                                passBody.dbname = dbRenamed;
                                var passObj = passfileHandle(passBody, 'add');
                                console.log("move db successfull")

                                var rmUpload = "rm -Rf /upload/*"
                                child = exec(rmUpload, function(error, stdout, stderr) {
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
                child = exec(unzipcom, function(error, stdout, stderr) {
                    if (error !== null) {
                        console.log('exec error: ' + error);
                    } else {
                        var passObj = passfileHandle(passBody, 'add');
                        res.redirect('/?upload=true');
                        res.status(200).end();
                    }

                });
            }
        }

    });


    /*      if (fs.existsSync(dbspath + "/" + origname)) {
            var ranNum = randomIntInc(1,10000);
            var dbNameNew = origname + "_" + ranNum
            
        }
            
            
    
    /*  var unzipcom = "unzip " + pathToFile + " -d " + dbspath;
        child = exec(unzipcom, function(error, stdout, stderr) {
            if (error !== null) {
                console.log('exec error: ' + error);
            } else {
                var passObj = passfileHandle(req.body, 'add');
                res.redirect('/?upload=true');
                res.status(200).end();
            }
    
        });*/
});

function randomIntInc(low, high) {
    return Math.floor(Math.random() * (high - low + 1) + low);
}

function stripTrailingSlash(str) {
    if (str.substr(-1) === '/') {
        return str.substr(0, str.length - 1);
    }
    return str;
}

function passfileHandle(bodyObj, command) {
    var passfileObj = {};
    var obj = bodyObj;

    if (fs.existsSync(passfile)) {
        console.log("passfile found(" + passfile + ")");
        var passfileObj = JSON.parse(fs.readFileSync(passfile, 'utf8'));
        if (command == 'add') {
            passfileObj[obj.dbname] = obj;
        }
        if (command == 'del') {
            delete passfileObj[obj.dbname];
        }
        fs.writeFile(passfile, JSON.stringify(passfileObj), function(err) {
            if (err) {
                console.log(err);
            } else {
                console.log("JSON saved to " + passfile);
            }
        });

    } else {
        fs.writeFile(passfile, '', function(err) {
            if (err) {
                console.log(err);
            } else {
                if (command == 'add') {
                    passfileObj[obj.dbname] = obj;
                }
                if (command == 'del') {
                    delete passfileObj[obj.dbname];
                }
                fs.writeFile(passfile, JSON.stringify(passfileObj), function(err) {
                    if (err) {
                        console.log(err);
                    } else {
                        console.log("JSON saved to " + passfile);
                    }
                });

            }
        });
    }
}