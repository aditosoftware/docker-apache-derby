
# Description
This is a docker container with [apache derby db](https://db.apache.org/derby/)
The dbs are stored in /dbs folder. We have also created a WebGui, you can access this on port 5000

## Screenshot
![derby-gui](/screenshot/derby.PNG)

## Start with Active Directory Auth
    sudo docker run -d -p 5000:5000 -p 1527:1527 -e ADAUTH="true" -e ADNAME="example.local" -e BASEDN="dc=example,dc=local" -e SHOWUSER="ADUser" -e SHOWPASS="ADUserPass" -e ADMINGROUP="Schema-Admins,IT,etc" -e LOGINGROUP="ADTest,Domains-User" -v /nodejs/docker-apache-derby-copie/webgui/:/webgui -v /dbs:/dbs --name derby -t adito/apache-derby
    
Enable Active Directory Auth

    ADAUTH="true/false" or adauth="/0"
    
Active Directory name

    ADNAME="example.local"
    
Base DN

    BASEDN="dc=example,dc=local"
    
AD USer to show permission of login user (do not need admin permissions)

    SHOWUSER="ADUser"
    
Password for AD User

    SHOWPASS="ADUserPass"
    
Group with admin permissions, can delete/creat/upload/download dbs and restart server = all. You can have more then one group

    ADMINGROUP="Schema-Admins,IT"
    
Group with logon permission. This group can only download a database

    LOGINGROUP="Domain-User"
    

## Start without AD Auth

    sudo docker run -d -p 5000:5000 -p 1527:1527 -v /nodejs/docker-apache-derby-copie/webgui/:/webgui -v /dbs:/dbs --name derby -t adito/apache-derby
    
