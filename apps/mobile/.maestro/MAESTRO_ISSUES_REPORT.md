# Maestro E2E Testing Issue Report

## 目标

用 Maestro 自动化 iOS Settings 中的键盘扩展设置流程：
1. 添加 TaikKeyboard 到系统键盘列表
2. 启用 "Allow Full Access" 开关
3. 流程需要 idempotent（可重复运行）

## 当前状态

- **添加键盘**：✅ 成功
- **检测键盘是否存在**：✅ 成功（用 `"TaikKeyboard — Taik"` 完整文本）
- **点击 Allow Full Access 开关**：✅ 已解决（语义化 `rightOf` + 重试）

## 核心问题

~~无法可靠地点击 iOS Settings 中的开关（UISwitch）~~ ✅ 已找到稳定方案（见下方）

### UI Hierarchy 分析

页面上有 3 个元素都有 `accessibilityText: "Allow Full Access"`：

```
[0] 整行容器: bounds [16,118][386,162], value="0"
[1] 文本标签: bounds [80,130][211,150], value=""
[2] 开关控件: bounds [315,124][366,155], value="0", checked="false"
```

### 已尝试的方法

| 方法 | 代码 | 结果 |
|------|------|------|
| 简单文本匹配 | `tapOn: "Allow Full Access"` | ❌ 点到文本标签，开关不触发 |
| 用 index | `tapOn: text: "Allow Full Access", index: 0/1/2` | ❌ 无效 |
| 用坐标 | `tapOn: point: "340,140"` | ⚠️ 单独测试成功，完整流程失败 |
| 用 checked 属性 | `tapOn: text: "Allow Full Access", checked: false` | ❌ 无效 |
| 百分比坐标 | `tapOn: point: "85%,16%"` | ❌ 未完整测试 |
| ✅ 语义化 selector（推荐） | `tapOn: rightOf: { text: "Allow Full Access" }, checked: false` | ✅ 已验证（`keyboard-setup.yaml` 在 iOS 18.6 上通过） |

### 推荐解决方案（语义化 + 幂等）

目标：**只在开关为 OFF 时启用 Full Access**，避免重复运行把开关误关掉。

核心思路：不要用坐标，而是点击“Allow Full Access”文本**右侧的元素**（就是 UISwitch），并在确认弹窗未出现时手动重试一次来对抗偶发点击不生效。

示例（已落地到 `.maestro/flows/subflows/enable-full-access.yaml`）：

```yaml
- assertVisible: "Allow Full Access"

- runFlow:
    when:
      visible:
        rightOf:
          text: "Allow Full Access"
        checked: false
    commands:
      - tapOn:
          rightOf:
            text: "Allow Full Access"
          checked: false
      - runFlow:
          when:
            notVisible: "Allow"
          commands:
            - tapOn:
                rightOf:
                  text: "Allow Full Access"
                checked: false
      - assertVisible: "Allow"
      - tapOn: "Allow"

- assertVisible:
    rightOf:
      text: "Allow Full Access"
    checked: true
```

### 诡异现象

- 通过 Maestro Studio 手动执行 `tapOn: point: "340,140"` 成功触发开关
- 通过 `maestro test debug-tap-switch.yaml` 单独运行也成功
- 但放入完整流程（keyboard-setup.yaml）中就失败
- 日志显示 `Tap on point (340,140) ... COMPLETED`，但随后 `Tap on "Allow" FAILED`（说明开关并未真的从 OFF → ON，所以确认弹窗没出现）

### 设备信息

```
Device: iPhone 16 Pro - iOS 18.6
widthPixels=1206, heightPixels=2622
widthPoints=402, heightPoints=874
```

## 文件位置

- 主流程: `.maestro/flows/keyboard-setup.yaml`
- 添加键盘: `.maestro/flows/subflows/add-keyboard.yaml`
- 启用 Full Access: `.maestro/flows/subflows/enable-full-access.yaml`
- 重置脚本: `.maestro/scripts/reset-keyboard.sh`
- 调试流程: `.maestro/flows/debug-*.yaml`

## 给外部团队 / To External Team

### ✅ Fix Summary（我们做了什么）

- 从坐标点击（`tapOn: point`）切换为**语义化 selector**：点击 `"Allow Full Access"` 文本右侧的 UISwitch，并用 `checked: false/true` 做前后状态断言（幂等）。
- 对 iOS Settings 的 flaky 点击做了**一次受控重试**：如果点击后未出现 `"Allow"` 确认弹窗，则再 tap 一次（避免无限重试）。
- 验证方式：`~/.maestro/bin/maestro test .maestro/flows/keyboard-setup.yaml` ✅（iPhone 16 Pro / iOS 18.6 / Maestro 2.0.10）。

### 🔎 Questions For Review（请你们 review / 给建议）

1. `rightOf + checked` 是否是 iOS Settings UISwitch 的推荐做法？有没有更稳的 selector / command pattern？
2. Maestro 2.0.10 的 YAML 是否支持官方的 “retry if no change / wait until visible” 类参数？（我们目前用 `runFlow + notVisible` 手动重试一次）
3. iOS 18+ 的 Settings 是否有已知的 UIAutomation flaky / 弹窗延迟/元素同名问题？有什么经验可以复用？

## Skill Revision / Workflow Upgrade（解决“瞎猜”和沟通不畅）

我们把这次经验沉淀成一份可复用的“技能/手册”，用于之后所有类似问题的排查与协作：

- Playbook（Repo Root）：`.claude/skills/maestro-e2e-debugging/SKILL.md`
- 核心流程：复现 → 缩小 → Studio/Hierarchy 观察 → selector 设计 → 断言验证 → flake 控制 → 证据包（Issue Pack）→ 异步协作

建议后续所有 Maestro E2E flaky/selector 问题，先按 Playbook 走完 A~H，再发给外部团队 review（避免“看得见但靠猜”）。

## 可能有用的资源

- Maestro Studio: `maestro studio` (http://localhost:9999)
- Maestro 选择器文档: https://docs.maestro.dev/api-reference/selectors
- Maestro tapOn 文档: https://docs.maestro.dev/api-reference/commands/tapon

## 环境

```bash
# 运行测试
~/.maestro/bin/maestro test .maestro/flows/keyboard-setup.yaml

# 重置键盘状态
./.maestro/scripts/reset-keyboard.sh

# 启动 Maestro Studio
~/.maestro/bin/maestro studio

# 查看 UI hierarchy
~/.maestro/bin/maestro hierarchy
```
