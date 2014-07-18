var mongodb = require('./db');
var markdown = require('markdown').markdown;

function Post(name, head, title, tags, post) {
  	this.name = name;
  	this.title = title;
  	this.tags = tags;
	this.post = post;
	this.head = head;
}

module.exports = Post;

//存储文章和相关信息
Post.prototype.save = function(callback) {
	var date = new Date();
	//存储各种事件格式，方便以后扩展
	var time = {
		date: date,
		year: date.getFullYear(),
		month: date.getFullYear() + '-' + (date.getMonth() + 1),
		day: date.getFullYear() + '-' + (date.getMonth() + 1) + '-' + date.getDate(),
		minute: date.getFullYear() + '-' + (date.getMonth() + 1) + '-' + date.getDate() + ' ' + date.getHours() + ':' + (date.getMinutes() < 10 ? '0' + date.getMinutes() : date.getMinutes())
	}
	//要存入数据库的文档
	var post = {
		name: this.name,
		head: this.head,
		time: time,
		title: this.title,
		post: this.post,
		tags: this.tags,
		comments: [],
		reprint_info: {},
		pv: 0
	};
	//打开数据库
	mongodb.open(function(err, db){
		if (err) {
			callback(err);
		};
		db.collection('posts', function(err, collection){
			if (err) {
				mongodb.close();
				return callback(err);
			};
			//将文档插入posts集合
			collection.insert(post, {
				safe: true
			}, function(err){
				mongodb.close();
				if (err) {
					return callback(err);
				};
				callback(null);
			});
		});
	})
};
//获取文章和相关信息
Post.getTen = function (name, page, callback) {
	//打开数据库
	mongodb.open(function(err, db){
		if (err) {
			return callback(err);
		};
		//读取posts集合
		db.collection('posts', function(err, collection){
			if (err) {
				mongodb.close();
				return callback(err);
			};
			var query = {};
			if (name) {
				query.name = name;
			};
			//使用count返回特定查询的文档书total
			collection.count(query, function(err, total){
				//根据query对象查询，跳过(page - 1) * 10个结果，返回之后的10个结果
				collection.find(query, {
					skip: (page - 1) * 10,
					limit: 10
				}).sort({
					time: -1
				}).toArray(function(err, docs){
					mongodb.close();
					if (err) {
						return callback(err);
					};
					docs.forEach(function(doc){
						doc.post = markdown.toHTML(doc.post);
					})
					callback(null, docs, total);
				});
			});
		})
	})
}
//获取一篇文章
Post.getOne = function(name, day, title, callback){
	mongodb.close();
	//打开数据库
	mongodb.open(function(err, db){
		if(err){
			return callback(err);
		}
		//读取posts集合
		db.collection('posts', function(err, collection){
			if(err){
				mongodb.close();
				return callback(err);
			}
			//根据用户名、发表日期及文章名进行查询
			collection.findOne({
				"name": name,
				"time.day": day,
				"title": title
			}, function(err, doc){
				if(err){
					mongodb.close();
					return callback(err);
				}
				//解析为markdown文档
				if (doc) {
					//每访问一次， pv增加1
					collection.update({
						"name": name,
						"time.day": day,
						"title": title
					}, {
						$inc: {"pv": 1}
					}, function (err){
						mongodb.close();
						if (err) {
							return callback(err);
						};
					});
					doc.post = markdown.toHTML(doc.post);
					doc.comments.forEach(function(comment){
						comment.content = markdown.toHTML(comment.content);
					});
				};
				//返回查询的一篇文章
				callback(null, doc);
			});
		});
	});
}
//返回原始发表的内容（markdown 格式）
Post.edit = function(name, day, title, callback) {
  	//打开数据库
  	mongodb.open(function (err, db) {
	    if (err) {
	      return callback(err);
	    }
	    //读取 posts 集合
    	db.collection('posts', function (err, collection) {
	      	if (err) {
		        mongodb.close();
		        return callback(err);
	      	}
	      	//根据用户名、发表日期及文章名进行查询
	      	collection.findOne({
		        "name": name,
		        "time.day": day,
		        "title": title
	      	}, function (err, doc) {
	        	mongodb.close();
		        if (err) {
		          	return callback(err);
		        }
	        	callback(null, doc);//返回查询的一篇文章（markdown 格式）
      		});
    	});
  	});
};
//更新文章相关信息
Post.update = function(name, day, title, post, callback){
	mongodb.close();
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
			//更新文章内容
			collection.update({
				"name": name,
				"time.day": day,
				"title": title,
			}, {
				$set: {post: post}
			}, function(err){
				if (err) {
					return callback(err);
				};
				callback(null);
			});
		})
	})
};
//删除文章
Post.remove = function(name, day, title, callback) {
  //打开数据库
  mongodb.open(function (err, db) {
    if (err) {
      return callback(err);
    }
    //读取 posts 集合
    db.collection('posts', function (err, collection) {
      if (err) {
        mongodb.close();
        return callback(err);
      }
      //查询要删除的文档
      collection.findOne({
        "name": name,
        "time.day": day,
        "title": title
      }, function (err, doc) {
        if (err) {
          mongodb.close();
          return callback(err);
        }
        //如果有 reprint_from，即该文章是转载来的，先保存下来 reprint_from
        var reprint_from = "";
        if (doc.reprint_info.reprint_from) {
          reprint_from = doc.reprint_info.reprint_from;
        }
        if (reprint_from != "") {
          //更新原文章所在文档的 reprint_to
          collection.update({
            "name": reprint_from.name,
            "time.day": reprint_from.day,
            "title": reprint_from.title
          }, {
            $pull: {
              "reprint_info.reprint_to": {
                "name": name,
                "day": day,
                "title": title
            }}
          }, function (err) {
            if (err) {
              mongodb.close();
              return callback(err);
            }
          });
        }

        //删除转载来的文章所在的文档
        collection.remove({
          "name": name,
          "time.day": day,
          "title": title
        }, {
          w: 1
        }, function (err) {
          mongodb.close();
          if (err) {
            return callback(err);
          }
          callback(null);
        });
      });
    });
  });
};
/*
Post.remove = function(name, day, title, callback){
	//打开数据库
	mongodb.open(function (err, db){
		if (err) {
			return callback(err);
		};
		//读取posts集合
		db.collection('posts', function (err, collection){
			collection.remove({
				"name": name,
				"time.day": day,
				"title": title
			}, {w:1}, function (err){
				if(err){
					return callback(err);
				}
				callback(null);
			});
		});
	});
}; */
//返回所有文章存档信息
Post.getArchive = function(callback){
	//打开数据库
	mongodb.open(function (err, db){
		if (err) {
	      	return callback(err);
	    }
	    //读取 posts 集合
	    db.collection('posts', function (err, collection){
	    	if (err) {
	    		mongodb.close();
	    		return callback(err);
	    	};
	    	collection.find({}, {
	    		"name": 1,
	    		"time": 1,
	    		"title": 1
	    	}).sort({
	    		"time": -1
	    	}).toArray(function(err, docs){
	    		mongodb.close();
	    		if (err) {
	    			return callback(err);
	    		};
	    		callback(null, docs);
	    	});
	    });
	})
}
//获取所有标签
Post.getTags = function(callback){
	//打开数据库
	mongodb.open(function (err, db){
		if (err) {
			return callback(err);
		};
		//读取posts集合
		db.collection('posts', function (err, collection){
			if (err) {
	    		mongodb.close();
	    		return callback(err);
	    	};
	    	collection.distinct("tags", function (err, docs){
	    		if (err) {
	    			return callback(err);
	    		};
	    		callback(null, docs);
	    	});
		});
	});
}
//通过tag查询文章
Post.getTag = function(tag, callback){
	//打开数据库
	mongodb.open(function (err, db){
		if (err) {
			return callback(err);
		};
		db.collection('posts', function (err, collection){
			if (err) {
	    		mongodb.close();
	    		return callback(err);
	    	};
	    	//查询所有tags数据
	    	collection.find({
	    		'tags': tag
	    	}, {
	    		"name": 1,
	    		"time": 1,
	    		"title": 1
	    	}).sort({
	    		time: -1
	    	}).toArray(function (err, docs){
	    		mongodb.close();
	    		if (err) {
	    			return callback(err);
	    		};
	    		callback(null, docs);
	    	});
		});
	});
}
//通过标题keyword查询
Post.search = function(keyword, callback){
	//打开数据库
	mongodb.open(function (err, db){
		if (err) {
			return callback(err);
		};
		//通过keyword查询
		db.collection('posts', function (err, collection){
			if (err) {
				mongodb.close();
				return callback(err);
			};
			var pattern = new RegExp("^.*" + keyword + ".*$", "i");
			collection.find({
				"title": pattern
			}, {
				"name": 1,
				"title": 1,
				"time": 1
			}).sort({
				time: -1
			}).toArray(function (err, docs){
				mongodb.close();
		        if (err) {
		         return callback(err);
		        }
		        callback(null, docs);
			});
		});
	});
}
//转载
Post.reprint = function(reprint_from, reprint_to, callback){
	//打开数据库
	mongodb.open(function (err, db){
		if (err) {
			return callback(err);
		};
		db.collection('posts', function (err, collection){
			if (err) {
				mongodb.close();
				return callback(err);
			};
			collection.findOne({
				"name": reprint_from.name,
				"time.day": reprint_from.day,
				"title": reprint_from.title
			}, function (err, doc){
				if (err) {
					mongodb.close();
					return callback(err);
				};

				var date = new Date();
		        var time = {
		            date: date,
		            year : date.getFullYear(),
		            month : date.getFullYear() + "-" + (date.getMonth() + 1),
		            day : date.getFullYear() + "-" + (date.getMonth() + 1) + "-" + date.getDate(),
		            minute : date.getFullYear() + "-" + (date.getMonth() + 1) + "-" + date.getDate() + " " + 
		            date.getHours() + ":" + (date.getMinutes() < 10 ? '0' + date.getMinutes() : date.getMinutes())
		        }

		        delete doc._id;
		        doc.name = reprint_to.name;
		        doc.head = reprint_to.head;
		        doc.time = time;
		        doc.title = (doc.title.search(/[转载]/) > -1) ? doc.title : "[转载]" + doc.title;
		        doc.comments = [];
		        doc.reprint_info = {"reprint_from": reprint_from};
		        doc.pv = 0;

		        //更新被转载的原文档的 reprint_info 内的 reprint_to
		        collection.update({
		          	"name": reprint_from.name,
		          	"time.day": reprint_from.day,
		          	"title": reprint_from.title
		        }, {
		          	$push: {
		            	"reprint_info.reprint_to": {
			              	"name": doc.name,
			              	"day": time.day,
			              	"title": doc.title
		              	}
		            }
		        }, function (err) {
		          	if (err) {
			            mongodb.close();
			            return callback(err);
		          	}
		        });

		        //将转载生成的副本修改后存入数据库，并返回存储后的文档
		        collection.insert(doc, {
		          	safe: true
		        }, function (err, post) {
		          	mongodb.close();
		          	if (err) {
		            	return callback(err);
		          	}
		          	callback(err, post[0]);
		        });

			});
		});
	});
}