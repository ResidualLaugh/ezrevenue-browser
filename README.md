# 艺爪付费浏览器插件会员集成教程

[艺爪付费(EZRevenue)](https://www.ezboti.com/revenue/) 是为开发者提供的会员付费解决方案，可轻松集成到浏览器扩展中实现会员功能。本文介绍如何浏览器插件中集成艺爪付费会员功能。

## 准备工作

### 获取项目凭证

前往[艺爪付费控制台](https://revenue.ezboti.com/)创建项目，获取:
- `projectId` 项目ID
- `projectSecret` 项目密钥

### 配置付费界面

[参考教程配置权益、商品、支付渠道和会员界面](https://www.ezboti.com/docs/revenue/start/)

## 代码集成说明

请参考AI代码提示词 [prompt.md](./prompt.md) 中的说明。

首先将 [ezrevenue-sdk](./ezrevenue-sdk) 代码复制到插件项目中，然后把提示词直接复制粘贴给AI代码编辑器，即可全自动实现代码集成，完全不用自己写代码。

通过以上步骤，即可成功在浏览器插件中集成艺爪付费会员系统。

## 案例参考 - 图片下载器插件

本项目的 [ezimage-downloader](./ezimage-downloader/) 目录是一个完整集成案例。

## 更多文档

- [艺爪付费官方文档](https://www.ezboti.com/docs/revenue/)

## 技术支持

[联系方式](https://www.ezboti.com/docs/revenue/contact/)
