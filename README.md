# node-spider
-----
### USE
``` js
var Spider = require("nodejs-spider");

var oOptions = {
    domain: 'xx.com', //抓取网站的域名
    firstUrl: 'https://www.xxx.com/xxx', //抓取的初始URL地址
    saveDir: "", //抓取内容保存目录 ,默认不保存文件
    debug: false, //是否开启调试模式
    matchStr: "xxxx", //匹配字符串
    whiteTypeList:["html","javascript"],        //爬取文件白名单,默认全部
};
var o = new Spider(oOptions);
o.crawl(function(result) {//开始抓取
    console.log("finsh:",result);
    /*
     返回结果   
     { 
      time: 21738, //耗时m
      total: 93,    //总抓取数
      succ: 93,     //成功抓取数
      fSucc: 1      //抓取匹配数
    }*/
});

```
