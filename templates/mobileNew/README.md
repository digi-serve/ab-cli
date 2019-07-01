# <%= appName %>
An AppBuilder generated mobile app.

### getting started from git:
```sh
$ git clone [yourOrg]/<%= appName %>
$ cd <%= appName %>
$ yarn update
$ yarn build
$ cd www
$ node webserver.js
```

Then in a web browser, open ```http://localhost:9889/```


### when developing on your local machine using the browser:
Open a terminal for compiling any local changes:
```sh
$ cd <%= appName %>
$ yarn watch  ( or: $ npm run watch )
```

Then open another terminal for serving the webpage to your browser:
```sh
$ cd <%= appName %>
$ yarn devserver ( or: $ npm run devserver )
```

Then in your development browser, open ```http://localhost:9889/```