# PRJN

PRJN 是一个轻量、运行在浏览器本地的复盘记录工具，围绕四个问题展开：

- **Predict**：我原本预期会发生什么？
- **Reality**：实际发生了什么？
- **Judgment**：我现在的判断是什么？
- **Next**：下一步要做什么？

它把预期、结果、判断更新和行动分开记录，让一次复盘保持简短且有用。

## 当前 MVP

PRJN 是一个面向个人使用的静态 React/Vite MVP，目前提供：

- 单条记录表单，可选备注。
- 六个分类：`product`、`tool`、`workflow`、`learning`、`life`、`growth`。
- 快速新增解析器，可识别 `Category`、`P`、`R`、`J`、`N`、`Note` 行，同时支持半角冒号 `:` 和全角冒号 `：`。
- 按创建时间倒序排列的本地历史记录。
- 编辑和删除已有记录。
- JSON 导出备份与 JSON 导入恢复；当导入记录的 ID 已存在时会更新对应记录。
- 桌面端可调整输入区与历史区的宽度；移动端保持上下排列。

当前 MVP 明确不包含：账号、云同步、服务端数据库、搜索、复杂筛选和 AI 自动总结。

## 数据与隐私边界

记录通过 Dexie 保存在当前浏览器的 IndexedDB 中。应用不会把记录发送到应用服务端，也不提供云同步。清理浏览器存储、更换浏览器或设备，或站点存储不可用时，本地数据可能丢失；重要记录请定期导出 JSON 备份。

应用是静态前端。样式表会引用 Google Fonts 加载界面字体，无法加载时会使用系统字体回退。本仓库没有配置应用 API 或分析服务。

导入的 JSON 会在浏览器中解析，并写入同一个本地数据库。如果导出文件包含个人复盘内容，请按敏感文件妥善保管。

## 本地运行

需要 Node.js 和 npm。

```bash
npm ci
npm run dev
```

默认开发地址为 [http://localhost:3000](http://localhost:3000)。

## 构建与验证

```bash
npm run lint
npm run build
```

生产构建产物会写入 `dist/`。

## GitHub Pages

仓库包含 `.github/workflows/deploy.yml`。它会在推送到 `main` 时构建静态站点，并把 `dist/` 产物部署到 GitHub Pages。Workflow 使用标准的 GitHub Pages 部署权限，不需要应用 secret。

Vite 的 base path 配置为 `/prjn/`，对应项目站点地址：

```text
https://<github-user>.github.io/prjn/
```

## 导出格式

导出文件结构如下：

```ts
{
  version: string;
  exportedAt: string;
  entries: PRJNEntry[];
}
```

每条记录包含 `id`、`category`、`predict`、`reality`、`judgment`、`next`、可选的 `note` 和 `createdAt`。

## 当前状态与限制

这是一个小型公开 MVP，不是托管生产服务。当前没有身份认证、服务端备份、数据迁移系统或跨设备同步。实现范围保持收敛，便于陌生用户检查和运行本地复盘流程。

当前仓库没有 `LICENSE` 文件。请不要默认代码或其中的资源已经获得可复用授权。
