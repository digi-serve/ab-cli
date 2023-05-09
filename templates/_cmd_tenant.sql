

SET FOREIGN_KEY_CHECKS=0;

UPDATE SITE_USER
SET
  username="<%= username %>",
  password="<%= hashedPassword %>",
  salt="<%= salt %>",
  email="<%= email %>",
  uuid="<%= uuid %>"
WHERE
  uuid="060fa9f0-df67-42fe-bf52-34f7014beb65";
/*!40000 ALTER TABLE `SITE_USER` ENABLE KEYS */;


UPDATE AB_JOINMN_ROLE_USER_users
SET
  USER="<%= username %>"
WHERE
  USER="admin";


UPDATE SITE_SCOPE
SET
  createdBy="<%= username %>"
WHERE
  createdBy="admin";

SET FOREIGN_KEY_CHECKS=1;