# 印尼旅行手册 · 2026

网址：https://liamschat.github.io/indonesia-trip-2026/

## iPhone 出发前准备

Safari联网打开，等“离线缓存就绪” → 分享 → 添加到主屏幕。打开主屏幕图标再联网加载一次，确认行程完整。Safari与主屏幕可能使用不同存储，已有数据先导出，再在主屏幕导入。

开飞行模式，关闭并重新打开图标确认可用。离线功能需要首次联网缓存；系统可能回收网站存储，不可代替每日备份。不要无痕使用，不要清除网站数据。地图链接需联网，不缓存Google地图。

## 每日记录

打开本机编辑模式 → 修改行程/记一笔 → 保存到本机。四人均摊的份额各填1；不参与填0；自定义可填2/1/1/0。称呼可改，成员ID始终是p1–p4。

朋友间还钱在“记录已转账结算”填写，不再计为消费。正净额应收，负净额应付；CNY/IDR/USD分别结算，不暗用汇率。

每天展开“备份、发布与离线使用” → 导出完整备份 → 保存到iPhone“文件”或iCloud Drive。CSV用于查看，恢复使用JSON。保存失败时先导出，暂勿关闭页面。

## 借电脑更新线上（不改HTML）

1. 将手机最新 `indonesia-backup-日期.json` 传到电脑。
2. 电脑打开网站 → 检查线上更新 → 编辑模式 → 合并导入手机JSON。导入前自动下载电脑当前备份，请保存。
3. 检查成员和账目 → 导出发布文件，得到 `published.json`。
4. 登录GitHub，进入 https://github.com/Liamschat/indonesia-trip-2026/tree/main/data → Add file → Upload files → 上传替换 **data目录** 的 `published.json` → Commit changes到main。此文件公开，先移除隐私。
5. 等Pages部署后，朋友及你的手机点“检查线上更新”。较新的本机记录保留。

本机修改不会自动上传GitHub。线上快照＋本机修改合并显示，朋友默认只读。编辑开关是防误触，不是账号权限；没有远程写接口。建议只指定你维护主账本，避免多头录入。

## 给手机 ChatGPT 的更新要求

上传最近完整备份，并发送：

> 请基于备份和今天记录生成schemaVersion=2完整JSON。保留成员ID、既有记录ID和删除标记；修改原记录复用ID并将updatedAt设为当前真实ISO时间。新记录用新UUID。同一消费不能重复建账。只录明确真实消费，不录预算报价，不补猜金额付款人。members固定p1–p4，expenses的shares为正权重，不参与的成员不写入。日期YYYY-MM-DD；events的time用HH:mm或空字符串，timezone用Asia/Makassar或Asia/Jakarta，status用pending/confirmed/paid。请给JSON文件，勿含护照电话等隐私。

先在手机导入核对，再备份/发布。可参考 `data/update-template.json` 空模板。导入不删除文件缺少的记录；删除须原ID＋`deleted:true`＋更新的updatedAt。同ID按时间较新者保留，相同时间保留接收设备原值；冲突应人工编辑正确值再保存。不同ID无法判断重复，需复用ID。

## 数据保护与恢复

- 原 `indonesia-trip-expenses-v1` 从不删除。新版首次迁移，原付款人和分摊人数保留，旧账标记待核对；逐笔编辑确认后才计入AA。旧 `{version:1,expenses:[...]}` 备份也能导入。
- v2本机数据：`indonesia-trip-local-v2`；线上快照：`indonesia-trip-published-v2`。刷新与代码升级不清空数据。
- 每次更改前保存 `indonesia-trip-before-change-v2`；导入前保存 `indonesia-trip-before-import-v2`。仅为此浏览器应急副本，不代替文件备份。恢复前导出当前数据，联系协助，勿盲目清空存储。
- 导入整体校验，失败不修改；不静默过滤坏账。删除标记保留以防旧文件把记录带回。
- 网站代码可回退Git提交；数据恢复需原ID＋更晚updatedAt，旧备份不会覆盖较新记录。

## 维护

无需安装依赖或构建，GitHub Pages沿用main/root。`index.html/style.css`保留原设计，`app.js`负责视图存储，`core.js`负责校验合并与整数分摊，`data/published.json`为公开数据，初始消费为空。

运行 `node tests.cjs` 验证数据逻辑。`sw.js`缓存本站文件，数据网络优先、代码缓存优先；发布代码需更改CACHE版本。关闭所有网站窗口再打开以启用新版，本地数据保留。iPhone主屏幕的真实离线行为仍须按上述步骤在本人手机确认。

旅行状态来自用户说明，未逐张核验凭证，也不代表火山/瀑布/下崖实时开放。2026-11-14。
