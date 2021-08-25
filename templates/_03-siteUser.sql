INSERT INTO `SITE_USER` (`uuid`, `created_at`, `updated_at`, `properties`, `failedLogins`, `lastLogin`, `isActive`, `sendEmailNotifications`, `image_id`, `username`, `password`, `salt`, `email`, `languageCode`)
VALUES
  ('<%=uuid%>',now(),now(),NULL,NULL,NULL,1,1,'','<%=username%>','<%=password%>','<%=salt%>','<%=email%>','en');
