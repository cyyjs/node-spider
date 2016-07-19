/**
 * 网页分析，主要分析html
 * 
 */
var fs = require('fs');

const config_rules = ["注册", "register", "订单", "购物车"];

function Analyse() {
	this.analyse_queue = [];
	this.result_queue = [];

	this.rules = config_rules;
	this.savePath = '';
}

Analyse.prototype.configRules = function(rules, path) {
	for (var i = 0; i < rules.length; i++) {
		this.rules.push(rules[i]);
	}
	this.savePath = path;
}

Analyse.prototype.Input = function(name, html) {
	var name = name.substring(name.lastIndexOf('/') + 1);
	var metedata = {
		name: name,
		htmlstr: html
	}

	this.analyse_queue.push(metedata);
}

Analyse.prototype.task = function() {
	var _this = this;

	fs.exists(_this.savePath, function(exists) {
		if (!exists) {
			fs.mkdir(_this.savePath, function(err) {
				if (!err) {
					fs.mkdir(_this.savePath + '/filter/', function(err) {
						console.log('create filter dir ', err);
					});
				}
			})
		} else {
			fs.mkdir(_this.savePath + '/filter/', function(err) {
				console.log('create filter dir ', err);
			});
		}
	});

	var inter = setInterval(function() {
		if (_this.analyse_queue.length > 0) {
			_this.analyse(_this.analyse_queue.pop())
		}
	}, 500);
}

Analyse.prototype.analyse = function(meteda) {
	var regkwords = [];

	this.rules.forEach((item) => {
		regkwords.push({
			t: new RegExp(item, 'gmi'),
			f: new RegExp("<a.*>" + "(^[\\u4e00-\\u9fa5]$)*(" + item + ")+.*", 'gmi')
		});
	});

	var regtags = [
		/<input.*>/gmi,
	]

	var regflag = false;
	for (var i = 0; i < regkwords.length; i++) {
		if (regkwords[i].t.test(meteda.htmlstr) && (meteda.name.indexOf(".html") > -1)) {
			if (!(regkwords[i].f.test(meteda.htmlstr))) {
				regflag = true;
			}
		}
	}

	var regflag1 = false;
	for (var i = 0; i < regtags.length; i++) {
		if (regtags[i].test(meteda.htmlstr)) {
			regflag1 = true;
		}
	}

	if (regflag && regflag1) {
		var filepath = this.savePath + '/filter/' + meteda.name;
		// console.log('analys file path:', filepath);

		fs.writeFile(filepath, meteda.htmlstr, function(err) {
			console.log('save filter file', filepath, err);
		});
	}
}


module.exports = Analyse;