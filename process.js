/*
 处理模块
 */

var fs = require('fs');
var http = require('http');
var https = require('https');
var url = require('url');
var path = require('path');

var analyse = require('./analyse');

/**
 * [Url 功能模块]
 */
var Url = function() {

}

/**
 * 修正被访问分析的URL，返回合法完整的URL地址
 */
Url.prototype.fix = function(url1, url2) {
	if (!url1 || !url2) {
		return false;
	}

	var oUrl = url.parse(url1);
	if (!oUrl["protocol"] || !oUrl["host"] || !oUrl["pathname"]) {
		return false;
	}

	if (url2.substring(0, 2) === "//") {
		url2 = oUrl["protocol"] + url2;
	}

	var oUrl2 = url.parse(url2);
	if (oUrl2["host"]) {
		if (oUrl2["hash"]) {
			delete oUrl2["hash"];
		}
		return url.format(oUrl2);
	}

	var pathname = oUrl["pathname"];
	if (pathname.indexOf('/') > -1) {
		pathname = pathname.substring(0, pathname.lastIndexOf('/'));
	}

	if (url2.charAt(0) === '/') {
		pathname = '';
	}
	// console.log('pathname0 ', pathname, url2)
	url2 = path.normalize(url2);
	url2 = url2.replace(/\\g/, '/');
	while (url2.indexOf("../") > -1) {
		pathname = path.dirname(pathname);
		url2 = url2.substring(3);
	}
	// console.log('pathname1 ', pathname, url2)
	if (url2.indexOf('#') > -1) {
		url2 = url2.substring(0, url2.lastIndexOf('#'));
	} else if (url2.indexOf('?') > -1) {
		url2 = url2.substring(0, url2.lastIndexOf('?'));
	}

	var oTmp = {
		"protocol": oUrl["protocol"],
		"host": oUrl["host"],
		// "pathname": pathname + '/' + url2
		"pathname": '/' + url2
	}

	var urlformat = url.format(oTmp)
	if (urlformat.indexOf("//", urlformat.indexOf("//") + 2) > -1) {
		var tmp = urlformat.split("//");
		urlformat = '';
		for (var i = 0; i < tmp.length; i++) {
			if (0 == i) {
				urlformat += tmp[0] + "//";
			} else if (i == tmp.length - 1) {
				urlformat += tmp[i];
			} else {
				urlformat += tmp[i] + "/";
			}
		}
	}
	// console.log('fix url  ', pathname, url2)
	return urlformat;
}

/**
 * 判断是否合法的URL地址的一部分
 * 地址
 */
Url.prototype.isValidPart = function(urlPart) {
	if (!urlPart) {
		return false;
	}

	if (urlPart.indexOf('javascript') > -1) {
		return false;
	}

	if (urlPart.indexOf('mailto') > -1) {
		return false;
	}

	if (urlPart.indexOf('.png') > -1) {
		return false;
	}

	if (urlPart.indexOf('.jpg') > -1) {
		return false;
	}

	if (urlPart.indexOf('.gif') > -1) {
		return false;
	}

	if (urlPart.indexOf('.jhtml') > -1) {
		return false;
	}

	if (urlPart.charAt(0) === '#') {
		return false;
	}

	if (urlPart === '/') {
		return false;
	}

	if (urlPart.substring(0, 4) === 'data') {
		return false;
	}

	if (urlPart.indexOf('//') > -1) {
		var protocolt = urlPart.substring(0, urlPart.indexOf('//'));
		if ((protocolt != 'http:') && (protocolt != 'https:')) {
			return false;
		}
	}

	return true;
}

/**
 * 获取URL地址路径部分，不包括域名和querystring
 */
Url.prototype.getUrlPath = function(urlin) {
	if (!urlin) {
		return '';
	}

	var oUrl = url.parse(urlin);
	if (oUrl["pathname"] && (/\/$/).test(oUrl["pathname"])) {
		oUrl["pathname"] += "index.html";
	}

	if (oUrl["pathname"]) {
		return oUrl["pathname"].replace(/^\/+/, '');
	}

	return '';
}

/**
 * 文件操作
 */
var File = function(obj) {
	var obj = obj || {};
	this.saveDir = obj["saveDir"] ? obj["saveDir"] : "";
}

/**
 *
 * string filename 文件名
 * mixed content 内容
 * string charset 内容编码
 * Function cb 异步回调函数
 * boolean bAppend 
 *
 */
File.prototype.save = function(filename, content, charset, cb, bAppend) {

	if (!content || !filename) {
		return false;
	}

	var filename = this.fixFileName(filename);
	if (typeof cb !== "function") {
		var cb = function(err) {
			if (err) {
				console.log("内容保存失败 FILE: ", filename);
			}
		}
	}

	var sSaveDir = path.dirname(filename);
	var self = this;
	var cbFs = function() {
		var buffer = new Buffer(content, charset ? charset : "utf8");
		fs.open(filename, bAppend ? 'a' : 'w', function(err, fd) {
			if (err) {
				cb(err);
				return;
			}
			var cb2 = function(err) {
				cb(err);
				fs.close(fd);
			}
			fs.write(fd, buffer, 0, buffer.length, 0, cb2);
		});
	}

	fs.exists(sSaveDir, function(exists) {
		if (!exists) {
			self.mkdir(sSaveDir, 0777, function() {
				cbFs();
			});
		} else {
			cbFs();
		}
	});
}

/**
 * 修正文件路径
 */
File.prototype.fixFileName = function(filename) {
	if (path.isAbsolute(filename)) {
		return filename;
	}

	if (this.saveDir) {
		this.saveDir = this.saveDir.replace(/[\\/]$/, path.sep);
	}

	return this.saveDir + path.sep + filename;
}

/**
 * 递归创建目录
 *string 目录路径
 *mode 权限设置
 *function 回调函数
 *string 父目录路径
 */
File.prototype.mkdir = function(sPath, mode, fn, prefix) {
	sPath = sPath.replace(/\\+/g, '/');
	var aPath = sPath.split('/');
	var prefix = prefix || '';
	var sPath = prefix + aPath.shift();
	var self = this;
	var cb = function() {
		fs.mkdir(sPath, mode, function(err) {
			if ((!err) || ([47, -4075]).indexOf(err["error"]) > -1) {
				if (aPath.length > 0) {
					self.mkdir(aPath.join('/'), mode, fn, sPath.replace(/\/$/, '') + '/');
				} else {
					fn();
				}
			} else {
				console.log(err);
				console.log('创建目录: ' + sPath + '失败');
			}
		});
	}

	fs.exists(sPath, function(exists) {
		if (!exists) {
			cb();
		} else if (aPath.length > 0) {
			self.mkdir(aPath.join('/'), mode, fn, sPath.replace(/\/$/, '') + '/');
		} else {
			fn();
		}
	});
}

/**
 * 递归删除目录
 */
File.prototype.rmdir = function(pathin, fn) {
	var self = this;
	fs.readdir(pathin, function(err, files) {
		if (err) {
			if (err.errno == -4052) { //不是目录
				fs.unlink(pathin, function(err) {
					if (!err) {
						fn(pathin);
					}
				});
			}
		} else if (files.length === 0) {
			fs.rmdir(pathin, function(err) {
				if (!err) {
					fn(pathin);
				}
			});
		} else {
			for (var i = 0; i < files.length; i++) {
				self.rmdir(pathin + '/' + files[i], fn);
			}
		}
	});
}

/**
 * 日期对象
 */
var oDate = {
	time: function() { //返回时间戳 毫秒
		return (new Date()).getTime();
	},
	date: function(fmt) { //返回对应格式日期
		var oDate = new Date();
		var year = oDate.getFullYear();
		var fixZero = function(num) {
			return num < 10 ? ('0' + num) : num;
		};
		var oTmp = {
			Y: year,
			y: (year + '').substring(2, 4),
			m: fixZero(oDate.getMonth() + 1),
			d: fixZero(oDate.getDate()),
			H: fixZero(oDate.getHours()),
			i: fixZero(oDate.getMinutes()),
			s: fixZero(oDate.getSeconds()),
		};
		for (var p in oTmp) {
			if (oTmp.hasOwnProperty(p)) {
				fmt = fmt.replace(p, oTmp[p]);
			}
		}
		return fmt;
	},
}

/**
 * 未抓取的URL队列
 * 
 */
var aNewUrlQueue = [];

/**
 * 已抓取的URL队列
 */
var aGotUrlQueue = [];

/**
 * 统计
 */
var oCnt = {
	total: 0, //抓取总数
	succ: 0, //抓取成功数
	fSucc: 0 //文件保存成功数
}

//可能有问题的路径长度，超过打印监控日志
var sPathMaxSize = 120;

/**
 * Spider
 */
var Spider = function(obj) {
	var obj = obj || {};
	//所在域名
	this.domain = obj.domain || '';
	//抓取开始的第一个URL
	this.firstUrl = obj.firstUrl || '';
	//唯一标识
	this.id = this.constructor.incr();
	//内容落地页保存路径
	this.saveDir = obj.saveDir || '';
	//是否开启调试
	this.debug = obj.debug || false;
	//第一个URL地址入未抓取队列
	if (this.firstUrl) {
		aNewUrlQueue.push(this.firstUrl);
	}
	//辅助对象
	this.oUrl = new Url();
	this.oFile = new File({
		saveDir: this.saveDir
	});

	this.analyse = new analyse();
	this.analyse.configRules([], this.saveDir);
	this.analyse.task();
}

/**
 *爬虫ID
 */
Spider.id = 1;
Spider.incr = function() {
	return this.id++;
}

/**
 * 开始抓取
 */
Spider.prototype.crawl = function() {
	console.log("quene length: ", aNewUrlQueue.length)
	if (aNewUrlQueue.length > 0) {
		var urlone = aNewUrlQueue.pop();
		console.log('parse url ', urlone)
		this.sendReq(urlone);
		oCnt.total++;
		aGotUrlQueue.push(urlone);
	} else {
		// if (this.debug) {
		console.log('抓取结束');
		console.log(oCnt);
		// }
	}
	return true;
}

/**
 * 发起http请求
 * 
 */
Spider.prototype.sendReq = function(urlone) {
	if (!urlone) {
		return false;
	}

	var req = '';
	// console.log("send url: ", urlone);
	if (urlone.indexOf('https') > -1) {
		req = https.request(urlone);
	} else {
		req = http.request(urlone);
	}

	var self = this;
	req.on('response', function(res) {
		var aType = self.getResourceType(res.headers["content-type"]);
		var data = '';
		if (aType[2] !== "binary") {

		} else {
			res.setEncoding("binary");
		}

		res.on('data', function(chunk) {
			data += chunk;
		});
		res.on('end', function() {
			self.debug && console.log("抓取URL: ", urlone, "成功");
			self.handlerSuccess(data, aType, urlone);
			data = null;
		});
		res.on('error', function() {
			self.handlerFailure(urlone);
			self.debug && console.log("服务器响应失败URL: ", urlone, "失败");
		});
	}).on('error', function(err) {
		self.handlerFailure();
		self.debug && console.log("抓取URL: ", urlone, "失败");
	}).on('finish', function() {
		self.debug && console.log("开始抓取URL: ", urlone);
	});

	req.end();
}

/**
 * 提取HTML内容里面的url
 */
Spider.prototype.parseUrl = function(html) {
	if (!html) {
		return [];
	}

	var a = [];
	var aRegex = [
		/<a.*?href=['"]([^"']*)['"][^>]*>/gmi,
		/<script.*?src=['"]([^"']*)['"][^>]*>/gmi,
		/<link.*?href=['"]([^"']*)['"][^>]*>/gmi,
		/<img.*?src=['"]([^"']*)['"][^>]*>/gmi,
		/url\s*\([\\'"]*([^\(\)]+)[\\'"]*\)/gmi, //CSS背景
	];

	html = html.replace(/[\n\r\t]/gm, '');
	for (var i = 0; i < aRegex.length; i++) {
		do {
			var aRet = aRegex[i].exec(html);
			if (aRet) {
				this.debug && this.oFile.save("_log/aParseUrl.log", aRet.join("\n") + "\n\n", "utf8", function() {}, true);
				a.push(aRet[1].trim().replace(/^\/+/, '')); //删除/是否会产生问题
			}
		} while (aRet);
	}

	return a;
}

/**
 * 判断请求资源类型
 */
Spider.prototype.getResourceType = function(type) {
	if (!type) {
		return '';
	}

	var aType = type.split('/');
	aType.forEach(function(s, i, a) {
		a[i] = s.toLowerCase();
	});
	if (aType[1] && (aType[1].indexOf(';') > -1)) {
		var aTmp = aType[1].split(';');
		aType[1] = aTmp[0];
		for (var i = 0; i < aTmp.length; i++) {
			if (aTmp[i] && (aTmp[i].indexOf("charset") > -1)) {
				aTmp2 = aTmp[i].split('=');
				aType[2] = aTmp2[1] ? aTmp2[1].replace(/^\s+|\s+$/, '').replace('-', '').toLowerCase() : '';
			}
		}
	}

	if ((['image']).indexOf(aType[0]) > -1) {
		aType[2] = "binary";
	}

	return aType;
}

/**
 * z抓取成功的handler
 */
Spider.prototype.handlerSuccess = function(str, aType, urlone) {
	if ((aType[0] === "text") && ((["css", "html"]).indexOf(aType[1]) > -1)) { //提取URL地址
		aUrls = (urlone.indexOf(this.domain) > -1) ? this.parseUrl(str) : []; //非站内只抓取一次

		for (var i = 0; i < aUrls.length; i++) {
			// console.log("aUrls ", aUrls[i])

			if (!this.oUrl.isValidPart(aUrls[i])) {
				this.debug && this.oFile.save("_log/aInvalidRawUrl.log", urlone + "----" + aUrls[i] + "\n", "utf8", function() {}, true);
				continue;
			}
			var sUrl = this.oUrl.fix(urlone, aUrls[i]);

			if (sUrl.indexOf(this.domain) === -1) { //只抓取站点内的 这里判断会过滤掉静态资源
				continue;
			}
			if (aNewUrlQueue.indexOf(sUrl) > -1) {
				continue;
			}
			if (aGotUrlQueue.indexOf(sUrl) > -1) {
				continue;
			}
			aNewUrlQueue.push(sUrl);
		}
	}
	this.analyse.Input(urlone, str);
	//内容存文件
	var sPath = this.oUrl.getUrlPath(urlone);
	var self = this;
	var oTmp = url.parse(urlone);
	if (oTmp["hostname"]) { //路径包含域名 防止文件保存时因文件名相同被覆盖
		sPath = sPath.replace(/^\/+/, '');
		sPath = oTmp["hostname"] + path.sep + sPath;
	}
	if (sPath) {
		if (this.debug) {
			this.oFile.save("_log/urlFileSave.log", urlone + "--------" + sPath + "\n", "utf8", function() {}, true);
		}
		if (sPath.length > sPathMaxSize) { //可能有问题的路径 打监控日志
			this.oFile.save("_log/sPathMaxSizeOverLoad.log", urlone + "--------" + sPath + "\n", "utf8", function() {}, true);
			return;
		}
		if (aType[2] != "binary") { //只支持UTF8编码
			aType[2] = "utf8";
		}
		this.oFile.save(sPath, str, aType[2] ? aType[2] : "utf8", function(err) {
			if (err) {
				self.debug && console.log("Path:" + sPath + "存文件失败", err);
			} else {
				oCnt.fSucc++;
			}
		});
	}
	oCnt.succ++;
	this.crawl(); //继续抓取
}

/**
 * 失败处理
 */
Spider.prototype.handlerFailure = function(urlone) {
	this.crawl();
};


module.exports = Spider;