var mongodb = require('./db');

function Comment(name, day, title, comment){
	this.name = name;
	this.day = day;
	this.title = title;
	this.comment = comment;
}

module.export = Comment;

//存储一条留言信息
Comment.prototype.save = function(callback) {
	var name = this.name,
		day = this.day,
		title = this.title,
		comment = this.comment;
	//打开数据库
	mongodb.open(function (err, db){
		if (err) {
			return callback(err);
		};
		//读取posts集合
		db.collection('posts', function(err, collection){
			if (err) {
				mongodb.close();
				return callback(err);
			};
			//通过用户名，时间，文章标题查找文档，将该文档留言添加到改文档的comment数组里
			collection.update({
				"name": name,
				"time.day": day,
				"title": title
			}, {$push: {"comments": comment}}, function(err){
				mongodb.close();
				if (err) {
					return callback(err);
				};
				callback(null);
			});
		});
	});
};