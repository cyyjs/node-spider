var Spider = require("../");

var oOptions = {
	domain: 'xx.com', //抓取网站的域名
	firstUrl: 'https://www.xxx.com/xxx', //抓取的初始URL地址
	saveDir: "", //抓取内容保存目录
	debug: false, //是否开启调试模式
	matchStr: "xxx", //匹配字符串
	//whiteTypeList:["html","javascript"],		//爬取文件白名单
};
var o = new Spider(oOptions);
o.crawl(function(result) {//开始抓取
	console.log("finsh:",result);
});
