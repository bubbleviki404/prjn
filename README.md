# PRJN Daily Review MVP

PRJN 是一个轻量复盘分析框架。它用 4 个问题帮助使用者快速留下经验、更新判断，并把复盘转成下一步行动。

> 用 4 个问题，留住经验，更新判断，指导下一步。

这个仓库是基于 PRJN 框架生成的日常记录网站 MVP。当前版本定位为个人自用 demo，重点是轻、快、清楚、能立刻记录，不包含登录、云同步、搜索、AI 总结等复杂功能。

## PRJN 框架

每一条 PRJN 记录由 4 个部分组成：

- **P / Predict**：我原本以为会怎样
- **R / Reality**：实际发生了什么
- **J / Judgment**：我现在的判断是什么
- **N / Next**：下一步怎么做

PRJN 的核心不是写长总结，而是把「原本预期」「真实结果」「判断更新」「下一步行动」分开记录。这样可以避免事后合理化，也更容易看见自己判断模型的变化。

标准格式：

```text
P｜我原本以为...
R｜实际发生...
J｜我现在判断...
N｜下一步...
```

## 网站功能

当前 MVP 提供：

- 单页 PRJN 记录表单
- 分类字段：product、tool、workflow、learning、life、growth
- P / R / J / N 四个必填输入区
- 可选备注 note，默认折叠
- 本地历史记录列表，按创建时间倒序排列
- 删除单条记录
- JSON 数据导出

当前 MVP 不提供：

- 登录注册
- 多设备云同步
- 服务端数据库
- 搜索和复杂筛选
- JSON 导入
- AI 自动总结

## 如何使用

1. 选择一条记录的分类。
2. 填写 P / R / J / N 四个输入区。
3. 如有必要，展开备注并补充背景。
4. 点击「保存复盘」。
5. 在右侧历史列表回看记录。
6. 点击「数据导出」可以把所有记录导出为 JSON 文件备份。

数据默认保存在当前浏览器的 IndexedDB 中。换浏览器、清理浏览器数据或更换设备后，本地数据不会自动同步；请定期使用 JSON 导出备份。

## 本地运行

需要先安装 Node.js。

```bash
npm install
npm run dev
```

默认开发地址：

```text
http://localhost:3000
```

## 构建

```bash
npm run build
```

构建产物会生成在 `dist/` 目录中。

## GitHub Pages 部署说明

这个项目是 Vite + React 静态前端，适合部署到 GitHub Pages。

如果部署到 GitHub 用户站点，例如：

```text
https://your-name.github.io/
```

通常不需要额外设置 Vite `base`。

如果部署到 GitHub 项目站点，例如：

```text
https://your-name.github.io/prjn/
```

需要在 `vite.config.ts` 中设置：

```ts
base: '/prjn/',
```

其中 `prjn` 应替换为实际 GitHub 仓库名。

## 数据格式

导出的 JSON 文件包含：

```ts
{
  version: string;
  exportedAt: string;
  entries: PRJNEntry[];
}
```

单条记录结构：

```ts
{
  id: string;
  category: 'product' | 'tool' | 'workflow' | 'learning' | 'life' | 'growth';
  predict: string;
  reality: string;
  judgment: string;
  next: string;
  note?: string;
  createdAt: number;
}
```

## 后续迭代方向

可能的后续版本可以考虑：

- JSON 导入
- 搜索与筛选
- 标签系统
- Markdown 导出
- 多设备同步
- 账号系统
- AI 辅助总结
- 移动端 App 或 PWA

当前阶段建议继续保持 MVP 的轻量性，先用真实日常记录验证 PRJN 框架是否足够顺手。
