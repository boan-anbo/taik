---
trigger: |
  当遇到以下情况时使用此 skill：
  - Tauri v2 开发问题
  - Tauri 权限/capabilities 配置
  - Frontend console.log 在哪里看
  - Tauri IPC 错误调试
  - Vite + Tauri 热更新问题
  - Tauri 构建或打包问题
---

# Tauri v2 Development Playbook

> 目标：解决 Tauri v2 桌面应用开发中的常见问题。
>
> Scope：Tauri v2、Vite、权限配置、日志调试、热更新。

---

## 0) Quick Reference（快速查表）

| 问题 | 解决方案 |
|------|----------|
| 启动 Tauri 开发 | `npm run tauri dev` |
| 查看前端 logs | 读取后台任务输出文件 |
| 权限报错 `xxx not allowed` | 修改 `capabilities/default.json` |
| Vite 缓存问题 | 删除 `node_modules/.vite` |
| 端口被占用 | `lsof -i :5173 \| awk '{print $2}' \| xargs kill -9` |

---

## 1) 启动 Tauri 开发环境

### 正确做法

```bash
cd apps/desktop
npm run tauri dev
```

### 后台运行（Claude Code 推荐）

```bash
cd apps/desktop && npm run tauri dev 2>&1
# 使用 run_in_background: true
```

这样所有日志都会输出到 `/tmp/claude/tasks/{task_id}.output`。

---

## 2) 查看 Frontend Console Logs

### 关键点

Tauri 会把前端的 `console.log`、`console.error` 等转发到终端，格式为：

```
[FRONTEND:INFO] your log message
[FRONTEND:ERROR] your error message
[FRONTEND:WARN] your warning
```

### Claude Code 如何查看

当 Tauri 在后台运行时：

```bash
# 查看所有前端日志
cat /tmp/claude/tasks/{task_id}.output | grep "FRONTEND:"

# 只看错误
cat /tmp/claude/tasks/{task_id}.output | grep "FRONTEND:ERROR"

# 实时监控
tail -f /tmp/claude/tasks/{task_id}.output | grep "FRONTEND:"
```

### 用户如何查看

1. **终端**：直接看 `npm run tauri dev` 的输出
2. **DevTools**：在 Tauri 窗口右键 > Inspect（或 `Cmd+Option+I`）

---

## 3) Tauri 权限配置 (Capabilities)

### 配置文件位置

```
apps/desktop/src-tauri/capabilities/default.json
```

### 常见权限错误

```
fs.read_file not allowed. Permissions associated with this command: ...
```

### 解决方案

编辑 `capabilities/default.json`，添加需要的权限：

```json
{
  "permissions": [
    "fs:default",
    "fs:allow-read-file",
    "fs:read-all",
    "fs:allow-write",
    "dialog:allow-open",
    "dialog:allow-save",
    // ... 其他权限
  ]
}
```

### 常用权限列表

| 功能 | 权限 |
|------|------|
| 读取任意文件 | `fs:read-all` |
| 读取单个文件 | `fs:allow-read-file` |
| 写入文件 | `fs:allow-write` |
| 文件对话框 | `dialog:allow-open`, `dialog:allow-save` |
| 剪贴板 | `clipboard-manager:allow-write-text` |
| 全局快捷键 | `global-shortcut:default` |
| 存储 | `store:default` |

### 注意事项

- 修改 capabilities 后需要**重启 Tauri**（会触发 Rust 重新编译）
- 权限遵循最小原则，只添加需要的

---

## 4) Vite 缓存问题

### 症状

- 代码改了但没生效
- 旧的 bug 还在
- 依赖包更新后行为不变

### 解决方案

```bash
# 清除 Vite 缓存
rm -rf node_modules/.vite
rm -rf apps/desktop/node_modules/.vite

# 重启 Tauri
npm run tauri dev
```

### 对于依赖包（如 @taik/speech-engine）

如果修改了 monorepo 中的依赖包：

1. 重新构建包：`cd packages/xxx && npm run build`
2. 清除 Vite 缓存
3. 重启 Tauri

---

## 5) 端口冲突

### 报错信息

```
Error: Port 5173 is already in use
```

### 解决方案

```bash
# 找出并杀掉占用端口的进程
lsof -i :5173 | grep -v PID | awk '{print $2}' | sort -u | xargs kill -9
```

---

## 6) 热更新 (HMR) 问题

### Frontend 代码改动

- Vite HMR 自动处理，通常即时生效
- 如果不生效，检查 DevTools Console 是否有 HMR 错误

### Rust 代码改动

- Tauri 自动监听 `src-tauri/` 目录
- 改动后会自动重新编译（看终端输出）

### 依赖包改动

- 需要重新 build 依赖包
- 可能需要清除 Vite 缓存
- 可能需要重启 Tauri

---

## 7) 调试技巧

### 添加调试日志

```typescript
// 在前端代码中
console.log('[ComponentName] debug info:', data);
console.error('[ComponentName] error:', error);
```

### 在 Claude Code 中查看

```bash
# 过滤特定组件的日志
cat /tmp/claude/tasks/{task_id}.output | grep "ComponentName"

# 查看最近的日志
cat /tmp/claude/tasks/{task_id}.output | tail -50
```

### 网络请求调试

1. 打开 DevTools > Network 标签
2. 或在代码中添加日志：

```typescript
const response = await fetch(url);
console.log('[API] Response:', await response.clone().json());
```

---

## 8) 教训清单（Lessons Learned）

### 2024-12-17: fs.read_file 权限问题

**症状**：
- 上传文件时报错 "Failed to process file"
- Console 显示 `fs.read_file not allowed`

**根因**：
- Tauri v2 默认不允许读取任意文件
- 需要在 capabilities 中显式授权

**解决方案**：
- 在 `capabilities/default.json` 添加 `fs:read-all` 或 `fs:allow-read-file`
- 重启 Tauri 使权限生效

### 2024-12-17: 日志不显示问题

**症状**：
- DevTools Console 看不到错误日志
- 不知道错误发生在哪里

**根因**：
- Tauri IPC 错误返回的是 string 而不是 Error 对象
- DevTools 可能过滤了某些日志

**解决方案**：
- 查看 Tauri 终端输出（`[FRONTEND:ERROR]` 前缀）
- 在 Claude Code 中读取后台任务输出文件
- 在 catch 块中添加详细的 `console.error` 日志

---

## 9) Anti-patterns（禁止事项）

### ❌ 不检查 capabilities 就说 API 有问题

- **问题**：很多 "API 错误" 实际是权限配置问题
- **替代**：先检查终端日志是否有 `not allowed` 错误

### ❌ 修改依赖包后不重新 build

- **问题**：Vite 用的是 dist/ 目录，源码改了没用
- **替代**：`cd packages/xxx && npm run build`

### ❌ 不清缓存就说代码没生效

- **问题**：Vite 可能缓存了旧版本
- **替代**：`rm -rf node_modules/.vite`

### ❌ 只看 DevTools 不看终端

- **问题**：很多 Tauri 层的错误只在终端显示
- **替代**：同时关注终端输出和 DevTools
