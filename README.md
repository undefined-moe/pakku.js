[![Chrome Web Store - Version](https://img.shields.io/chrome-web-store/v/jklfcpboamajpiikgkbjcnnnnooefbhh.svg?style=flat-square)](https://chromewebstore.google.com/detail/pakku%EF%BC%9A%E5%93%94%E5%93%A9%E5%93%94%E5%93%A9%E5%BC%B9%E5%B9%95%E8%BF%87%E6%BB%A4%E5%99%A8/jklfcpboamajpiikgkbjcnnnnooefbhh)
[![Chrome Web Store - Rating](https://img.shields.io/chrome-web-store/rating/jklfcpboamajpiikgkbjcnnnnooefbhh.svg?style=flat-square)](https://chromewebstore.google.com/detail/pakku%EF%BC%9A%E5%93%94%E5%93%A9%E5%93%94%E5%93%A9%E5%BC%B9%E5%B9%95%E8%BF%87%E6%BB%A4%E5%99%A8/jklfcpboamajpiikgkbjcnnnnooefbhh)
/
[![Edge Add-on - Version](https://img.shields.io/badge/dynamic/json?label=edge%20add-on&prefix=v&query=%24.version&url=https%3A%2F%2Fmicrosoftedge.microsoft.com%2Faddons%2Fgetproductdetailsbycrxid%2Flnfcfeidnipnphibahlkdhalpkpmccoc&style=flat-square)](https://microsoftedge.microsoft.com/addons/detail/pakku%EF%BC%9A%E5%93%94%E5%93%A9%E5%93%94%E5%93%A9%E5%BC%B9%E5%B9%95%E8%BF%87%E6%BB%A4%E5%99%A8/lnfcfeidnipnphibahlkdhalpkpmccoc)
[![Edge Add-on - Rating](https://img.shields.io/badge/dynamic/json?label=rating&suffix=/5&color=&query=%24.averageRating&url=https%3A%2F%2Fmicrosoftedge.microsoft.com%2Faddons%2Fgetproductdetailsbycrxid%2Flnfcfeidnipnphibahlkdhalpkpmccoc&style=flat-square&color=4c1)](https://microsoftedge.microsoft.com/addons/detail/pakku%EF%BC%9A%E5%93%94%E5%93%A9%E5%93%94%E5%93%A9%E5%BC%B9%E5%B9%95%E8%BF%87%E6%BB%A4%E5%99%A8/lnfcfeidnipnphibahlkdhalpkpmccoc)
/
[![Mozilla Add-on - Version](https://img.shields.io/amo/v/pakkujs.svg?style=flat-square)](https://addons.mozilla.org/zh-CN/firefox/addon/pakkujs?src=external-shield)
[![Mozilla Add-on - Rating](https://img.shields.io/amo/rating/pakkujs.svg?style=flat-square)](https://addons.mozilla.org/zh-CN/firefox/addon/pakkujs?src=external-shield)

#### [→ 点我安装 ←](https://s.xmcp.ltd/pakkujs/?src=readme_1) （支持 Chrome、Edge、Firefox）

![logo](https://cloud.githubusercontent.com/assets/6646473/17503651/20b41376-5e24-11e6-8829-6b8a0ccd47a9.png)
# pakku.js

自动合并B站视频中刷屏弹幕的浏览器插件，让您免受各种带节奏弹幕的刷屏之苦。

## Pakku Server

Use with [BilibiliPotPlayer](https://github.com/chen310/BilibiliPotPlayer)

考虑到过滤部分使用了 RegExp，为避免 ReDOS 攻击，请自建服务。

```
yarn start # server available at http://localhost:3100
# GET /subtitle?cid=123456789&aid=123456789&options=b64encodedOptionsJSON
```

↓ 《千绪的通学路》第5话

![](https://s.xmcp.ltd/pakkujs/comm/1.png)

↓  哔哩哔哩拜年祭 2018，可见“弹幕密度分析图”功能

![](https://s.xmcp.ltd/pakkujs/comm/2.png)

↓  【炮姐/AMV】我永远都会守护在你的身边！(av810872)，可见“自动调整弹幕大小”功能

![](https://s.xmcp.ltd/pakkujs/comm/3.png)

↓  《NEW GAME!》第8话，可见“弹幕信息显示框”功能

![](https://s.xmcp.ltd/pakkujs/comm/4.png)

↓  电磁炮真是太可爱了(av314)，可见统计信息显示

![](https://s.xmcp.ltd/pakkujs/comm/5.png)

### 用户脚本

可以通过 JavaScript 代码来修改弹幕内容，实现深度自定义 pakku 的功能或者临时调整弹幕样式。

详见 [用户脚本文档](userscript_docs/README.md)。

### 浏览器兼容性

目前版本兼容 Chrome 和 Edge 版本 ≥99，以及 Firefox 版本 ≥113。

未来的浏览器兼容性目标为 Chrome 和 Edge 最近 24 个版本，Firefox 最近 12 个版本。

### License

[GPLv3](LICENSE.txt)

#### [→ 点我安装 ←](https://s.xmcp.ltd/pakkujs/?src=readme_2) （支持 Chrome、Edge、Firefox）
