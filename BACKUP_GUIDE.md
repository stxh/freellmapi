# Hugging Face Dataset 备份指南

本功能实现了将 SQLite 数据库自动备份到 Hugging Face Dataset，并在 Space 启动时自动恢复。

## 功能特性

- **启动自动恢复**：Space 启动时自动从 Dataset 下载最新的备份
- **定期自动备份**：按设定间隔自动上传数据库备份
- **保留策略**：只保留最近的 3 个备份，自动清理旧备份
- **安全恢复**：恢复前自动备份本地现有数据库

## 环境变量

在 `.env` 文件或 Space 的 Secrets 中配置：

| 变量 | 必填 | 默认值 | 说明 |
|------|------|--------|------|
| `HF_TOKEN` | 是 | - | Hugging Face Access Token，需对 Dataset 有写入权限 |
| `HF_DATASET_ID` | 是 | - | Dataset 仓库 ID，如 `username/freellmapi-backups` |
| `BACKUP_ENABLED` | 否 | `false` | 是否启用备份功能 |
| `BACKUP_INTERVAL_MS` | 否 | `86400000` | 备份间隔（毫秒），默认 24 小时 |

## 前置准备

1. **创建 Dataset 仓库**
   - 在 Hugging Face 上创建一个新的 Dataset 仓库
   - 例如：`https://huggingface.co/datasets/username/freellmapi-backups`

2. **生成 Access Token**
   - 访问 [Hugging Face Settings > Tokens](https://huggingface.co/settings/tokens)
   - 创建一个有 `write` 权限的 Token

3. **配置 Space Secrets**
   - 在 Space 的 **Settings > Secrets** 中添加：
     - `HF_TOKEN` = 你的 Token
     - `HF_DATASET_ID` = `username/freellmapi-backups`
     - `BACKUP_ENABLED` = `true`

## 部署到 Hugging Face Space

本项目已配置 Dockerfile，使用 Bun 运行时。

### 使用 Docker SDK 部署

1. 在 Hugging Face 创建新 Space，选择 **Docker** SDK
2. 将代码推送到 Space 仓库
3. 在 Space Settings 中配置上述 Secrets
4. Space 启动后会自动从 Dataset 恢复最新备份

### 本地测试（Bun）

```bash
# 安装依赖
bun install

# 配置环境变量
cp .env.example .env
# 编辑 .env，填入 HF_TOKEN、HF_DATASET_ID、BACKUP_ENABLED=true

# 构建
bun run build

# 启动
bun server/dist/index.js
```

## 备份文件名格式

备份文件以时间戳命名，方便排序和识别：

```
backup_YYYYMMDD_HHMMSS.db
```

例如：`backup_20260628_143052.db`

## 清理策略

每次上传新备份后，系统会自动执行清理：
- 列出 Dataset 中所有 `backup_*.db` 文件
- 按文件名时间戳排序
- 保留最新的 3 个备份
- 删除其余旧备份

## 手动触发备份

如需在运行时手动触发备份，可导入 backup 模块：

```typescript
import { createBackup } from './services/backup.js';

// 手动触发一次备份
await createBackup();
```

## 注意事项

1. **首次启动**：如果 Dataset 中没有备份，系统会正常初始化一个新的 SQLite 数据库
2. **本地恢复保护**：恢复备份前，系统会将本地现有数据库复制一份为 `local_before_restore_<timestamp>.db`
3. **WAL 模式**：备份前会自动执行 `PRAGMA wal_checkpoint(FULL)`，确保 WAL 日志已合并到主数据库文件
4. **临时文件**：备份时会先创建临时副本，避免上传过程中数据库被写入
