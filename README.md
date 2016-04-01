# Description
This is a docker container with [apache derby db](https://db.apache.org/derby/)
The dbs are stored in /dbs folder. We have also created a WebGui, you can access this on port 5000

## Screenshot
![derby-gui](/screenshot/derby.PNG)

## Start
    sudo docker run -d -p 1527:1527 -p 5000:5000 -v dbs:/dbs --name derby -t adito/apache-derby