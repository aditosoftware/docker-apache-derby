
# Description
This is a docker container with [apache derby db](https://db.apache.org/derby/)
The dbs are stored in /dbs folder. We have also created a WebGui, you can access this on port 5000

## Screenshot
![derby-gui](/screenshot/derby.PNG)

## Start with Active Directory Auth
    sudo docker run -d -p 5000:5000 -p 1527:1527 -e adauth="true" -e adname="example.local" -e baseDN="dc=example,dc=local" -e showUser="ADUser" -e showPass="ADUserPass" -e adminGroup="Schema-Admins,IT,etc" -e loginGroup="ADTest,Domains-User" -v /nodejs/docker-apache-derby-copie/webgui/:/webgui -v /dbs:/dbs --name derby -t adito/apache-derby
    
Enable Active Directory Auth

    adauth="true/false" or adauth="/0"
    
Active Directory name

    adname="example.local"
    
Base DN

    baseDN="dc=example,dc=local"
    
AD USer to show permission of login user (do not need admin permissions)

    showUser="ADUser"
    
Password for AD User

    showPass="ADUserPass"
    
Group with admin permissions, can delete/creat/upload/download dbs and restart server = all. You can have more then one group

    adminGroup="Schema-Admins,IT"
    
Group with logon permission. This group can only download a database

    loginGroup="Domain-User"
    

## Start without AD Auth

    sudo docker run -d -p 5000:5000 -p 1527:1527 -v /nodejs/docker-apache-derby-copie/webgui/:/webgui -v /dbs:/dbs --name derby -t adito/apache-derby
    
