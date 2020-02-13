INSERT INTO `site_user` (`uuid`, `username`, `password`, `salt`, `email`, `isActive`, `lastLogin`, `failedLogins`, `languageCode`, `id`, `createdAt`, `updatedAt`)
VALUES
    ('<%=uuid%>','<%=username%>','<%=password%>','<%=salt%>','<%=email%>',1,NULL,0,'en',1,NULL,NULL);
