
/*
 * GET home page.
 */

var crypto = require('crypto');
var fs = require('fs');
var User = require('../models/user.js');
var Post = require('../models/post.js');
module.exports = function(app) {
	app.get('/', function (req, res) {
        Post.getAll(null, function(err, posts){
            if (err) {
                posts = [];
            };
            //console.log(posts);
            res.render('index', {
                title: '主页',
                user: req.session.user,
                posts: posts,
                error: req.flash('error').toString(),
                success: req.flash('success').toString()
            });
        });
	});
    app.get('/reg', checkNotLogin);
	app.get('/reg', function (req, res) {
	    res.render('reg', {
            title: '注册',
            user: req.session.user,
            error: req.flash('error').toString(),
            success: req.flash('success').toString()
        });
    });
    app.post('/reg', checkNotLogin);
    app.post('/reg', function (req, res) {
        var name = req.body.name,
            password = req.body.password,
            password_re = req.body.password_repeat,
            email = req.body.email;
        //检验两次输入是否一致
        if(password != password_re){
            req.flash('error', '两次输入的密码不一致！');
            return res.redirect('/reg');
        }
        //生成密码的md5值
        var md5 = crypto.createHash('md5');
        var password = md5.update(req.body.password).digest('hex');
        var newUser = new User({
            name: name,
            password: password,
            email: email
        });
        //检查用户名是否已经存在
        User.get(newUser.name, function(err, user){
            if(user){
                console.log('用户已存在');
                req.flash('error', '用户已存在');
                return res.redirect('/reg');
            }
            //如果用户不存在， 则新增用户
            newUser.save(function(err, user){
                if (err) {
                    console.log(err);
                    req.flash('error', err);
                    return res.redirect('./reg');//注册失败返回主册页
                }
                req.session.user = user;//用户信息存入 session
                req.flash('success', '注册成功!');
                res.redirect('/');//注册成功后返回主页
            });
        })
    });
    app.get('/login', checkNotLogin);
    app.get('/login', function (req, res) {
        res.render('login', {
            title: '登录',
            user: req.session.user,
            success: req.flash('success').toString(),
            error: req.flash('error').toString()
        });
    });
    app.post('/login', checkNotLogin);
    app.post('/login', function (req, res) {
        //生成密码的md5值
        var md5 = crypto.createHash('md5'),
            password = md5.update(req.body.password).digest('hex');
        //检查用户是否存在
        User.get(req.body.name, function(err, user){
            if (!user) {
                req.flash('error', '用户不存在');
                return res.redirect('/login');
            };
            if (password != user.password) {
                req.flash('error', '密码错误');
                return res.redirect('/login');
            };
            req.session.user = user;
            req.flash('success', '登录成功');
            res.redirect('/');
        })
    });
    app.get('/post', checkLogin);
    app.get('/post', function (req, res) {
	    res.render('post', { 
            title: '发表',
            user: req.session.user,
            success: req.flash('success').toString(),
            error: req.flash('error').toString()
        });
    });
    app.post('/post', checkLogin);
    app.post('/post', function (req, res) {
        var currentUser = req.session.user,
            post = new Post(currentUser.name, req.body.title, req.body.post);
        post.save(function(err){
            if (err) {
                req.flash('error', err);
                return res.redirect('/');
            };
            req.flash('success');
            res.redirect('/');
        });
    });
    app.get('/logout', checkLogin);
	app.get('/logout', function (req, res) {
        req.session.user = null;
        req.flash('success', '登出成功');
        res.redirect('/');
 	});
    app.get('/upload', checkLogin);
    app.get('/upload', function(req, res){
        res.render('upload', { 
            title: '发表',
            user: req.session.user,
            success: req.flash('success').toString(),
            error: req.flash('error').toString()
        });
    });
    app.post('/upload', checkLogin);
    app.post('/upload', function(req, res){
        for(var i in req.files){
            if (req.files[i].size == 0) {
                //如果是空文件, 使用同步方式删除一个文件
                fs.unlinkSync(req.files[i].path);
                console.log('Successfully removed an empty file');
            }else{
                var target_path = './public/images/uploadImage/' + req.files[i].name;
                //使用同步方式重命名一个文件
                fs.renameSync(req.files[i].path, target_path);
                console.log('Successfully renamed a file!');
            }
            req.flash('success', '文件上传成功！');
            res.redirect('/upload');
        }
    });
    //检验是否登录
    function checkLogin(req, res, next){
        if (!req.session.user) {
            req.flash('error', '未登录');
            return res.redirect('/login');
        };
        next();
    }
    //检验是否未登录
    function checkNotLogin(req, res, next){
        console.log(req.session.user);
        if (req.session.user) {
            req.flash('error', '已登录');
            return res.redirect('back');
        };
        next();
    }
};