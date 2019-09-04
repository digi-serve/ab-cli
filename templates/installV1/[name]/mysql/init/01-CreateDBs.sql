# create databases
CREATE DATABASE IF NOT EXISTS `test_docker` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE DATABASE IF NOT EXISTS `appbuilder` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

# create root user and grant rights
# CREATE USER 'root'@'localhost' IDENTIFIED BY 'local';
GRANT ALL ON *.* TO 'root'@'%';
