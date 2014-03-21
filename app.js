
/**
 * Module dependencies.
 */

var express = require('express');
var routes = require('./routes');
var http = require('http');
var path = require('path');
var MongoStore = require('connect-mongo')(express);
var settings = require('./settings');
var flash = require('connect-flash');

var app = express();
// all environments
app.set('port', process.env.PORT || 3000);
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');
app.use(flash());
app.use(express.favicon());
app.use(express.logger('dev'));
/**
app.use(express.bodyParser());相当于
app.use(express.json());
app.use(express.urlencoded());
app.use(express.multipart());
*/
app.use(express.bodyParser({ keepExtensions: true, uploadDir: './public/images/uploadImage' }));
app.use(express.methodOverride());
/**
 express.cookieParser() 是 Cookie 解析的中间件。express.session() 则提供会话支持，secret 用来防止篡改 cookie，key 的值为 cookie 的名字，通过设置 cookie 的 maxAge 值设定 cookie 的生存期，这里我们设置 cookie 的生存期为 30 天，设置它的store参数为 MongoStore实例，把会话信息存储到数据库中，以避免丢失。在后面的小节中，我们可以通过 req.session 获取当前用户的会话对象，获取用户的相关信息。
*/
app.use(express.cookieParser());
app.use(express.session({
  secret: settings.cookieSecret,
  key: settings.db,//cookie name
  cookie: {maxAge: 1000 * 60 * 60 * 24 * 30},//30 days
  store: new MongoStore({
    db: settings.db
  })
}));
// app.use(app.router);
//app.use(express.router(routes));
app.use(express.static(path.join(__dirname, 'public')));

// development only
if ('development' == app.get('env')) {
  app.use(express.errorHandler());
}

routes(app);

http.createServer(app).listen(app.get('port'), function(){
  console.log('Express server listening on port ' + app.get('port'));
});
