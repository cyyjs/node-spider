var Spider = require("./process");
var fs = require('fs');

var oOptions = {
	domain: 'yrw.com', //抓取网站的域名
	firstUrl: 'https://www.yrw.com/landing/page/sixRites?trackid=GGJ_xkzx_PC002', //抓取的初始URL地址
	saveDir: "yrw", //抓取内容保存目录
	debug: false, //是否开启调试模式
};
var o = new Spider(oOptions);
o.crawl(); //开始抓取