---
trigger: |
  当遇到以下情况时使用此 skill：
  - Maestro E2E 测试失败
  - 元素选择器 (selector) 问题
  - iOS Settings / 系统界面自动化
  - tapOn 点击不生效
  - 同名元素 (multiple matches) 问题
  - flaky test / 不稳定测试
---

# Maestro E2E Debugging & Collaboration Playbook (v2)

> 目标：把「瞎猜」变成「可复现、可定位、可沟通、可修复」的闭环。
>
> Scope：Maestro E2E（尤其是 iOS Settings / 系统界面）元素定位、时序问题、flaky 点击等。

---

## 0) Quick Start（最快闭环）

1. **先复现**：跑一次失败的 flow，拿到 debug output path（默认在 `~/.maestro/tests/<timestamp>`）。
2. **再缩小**：把失败点抽成 `debug-*.yaml`，保证 < 20 steps、单点复现。
3. **看真相**：`maestro studio` / `maestro hierarchy` 观察层级与可用 selector。
4. **改成语义 selector**：优先 `id/label/traits/relative`，避免 `index/point`。
5. **用断言证明修复**：assert「前置状态」+「后置状态」，不要只看日志 “COMPLETED”。
6. **把证据包发出去**：最小 flow + hierarchy 片段 + maestro.log + 环境信息。

---

## 1) 工具与命令（建议统一用这些）

### 1.1 运行与输出

```bash
~/.maestro/bin/maestro test <flow.yaml>
```

- Debug 输出默认落在：`~/.maestro/tests/<timestamp>/`
  - `maestro.log`：最重要（能看到它认为点了哪个 element、实际 tap 坐标、是否出现弹窗等）
  - 可能会有 `ai-report-*.html` / `commands-*.json`（若开启相关功能）

### 1.1.1 我怎么知道 Maestro “实际点了哪里”？

看 `maestro.log` 里这两类关键信息：
- **它匹配到的元素**：通常会有 `Tapping on element: UiElement(...)`（包含 bounds / accessibilityText）
- **它最终点的坐标**：通常会有 `Tapping at (x, y)`（screenshot based tap）

快速检索（把 `<timestamp>` 换成最新目录名）：

```bash
rg -n "Tapping on element:|Tapping at \\(" ~/.maestro/tests/<timestamp>/maestro.log
```

### 1.2 交互式调试（强烈推荐）

```bash
~/.maestro/bin/maestro studio
```

用途：
- 逐条执行命令，确认「点击是否真的改变 UI」
- 观察同名元素（同一个 text 对应多个节点）到底哪个才是可点击控件
- 现场验证 selector（比在 YAML 里瞎改快很多）

### 1.3 导出 UI Hierarchy（用来做 selector 设计）

```bash
~/.maestro/bin/maestro hierarchy
```

建议：
- 先把 app/页面停在出问题的 screen，再执行 `maestro hierarchy`。
- 把输出贴进 issue（或保存到文件），至少保留与目标控件相关的 20~50 行。

---

## 2) 标准工作流（禁止“猜”）

### Step A — 复现（Reproduce）

Checklist：
- [ ] 设备：机型 / iOS 版本（如 iPhone 16 Pro / iOS 18.6）
- [ ] Maestro 版本（如 2.0.10）、Xcode 版本
- [ ] 运行命令与失败的 flow 路径
- [ ] Debug 输出目录（`~/.maestro/tests/<timestamp>`）

### Step B — 缩小（Reduce）

目标：**最小可复现**，避免整条大流程干扰（时序/状态污染）。

做法：
- 从失败 flow 复制出一个 `debug-<topic>.yaml`
- 只保留：
  - 能到达目标页面的最短导航
  - 失败的那一个操作（tap / assert / input）
  - 1~2 个关键断言（前/后状态）

### Step C — 观察（Inspect）

用 Studio / hierarchy 把「看得到在哪里」转成「能写出 selector」：
- 先找 **真正可点击** 的 node（有时 label 与控件是分开的）
- 记录：
  - `accessibilityText` / `resource-id` / `traits`
  - 目标控件与 label 的相对位置（rightOf/leftOf/above/below）

### Step D — 选择 selector（Prefer semantics）

优先级（从高到低）：
1. `id` / `resource-id`（最稳）
2. `text` + `traits`（例如按钮/开关）
3. **相对定位**：`rightOf/leftOf/below/above`（解决同名元素/行容器）
4. `index`（最后手段，iOS Settings 很容易变）
5. `point`（最后手段，跨设备/滚动/动态布局都会炸）

### Step E — 用断言证明（Assert before/after）

原则：**每个关键交互都要有“结果断言”**。例如：
- 开关：断言 `checked` 从 false → true
- 弹窗：断言按钮出现后再点击（不要盲点）

### Step F — Flaky 控制（Wait/Retry）

你想要的是“看到状态改变”，不是“tap 命令跑完”。

建议模式：
- 每次导航后 `waitForAnimationToEnd`（合适 timeout）
- 对 flaky tap：
  - 先 tap
  - 再断言 side-effect（弹窗出现 / 状态改变）
  - 如果没出现，用 `runFlow` 做一次受控重试（不要无限重试）

### Step G — 验证（Verify）

- 至少跑 3 次（同一台 simulator）
- 如果目标是跨设备稳定，再跑 1 台不同尺寸（可选）

### Step H — 证据包与沟通（Issue Pack）

把“反馈通道”变成可异步协作：

必须包含：
- 最小复现 flow：`debug-*.yaml`
- `maestro hierarchy` 关键片段
- `~/.maestro/tests/<timestamp>/maestro.log`（或至少关键片段 + 路径）
- 环境信息（Maestro/Xcode/iOS/Device）
- 期望 vs 实际（Expected vs Actual）

推荐附加：
- Studio 截图/录屏（能看出点到了哪里、是否弹窗）
- 你尝试过的 selector/方案（避免重复劳动）

#### Issue Pack 模板（可直接复制发给外部团队）

```text
Title:

Environment:
  - Maestro:
  - Xcode:
  - Device / iOS:

Repro:
  - Command:
  - Failing flow:
  - Minimal repro flow (debug-*.yaml):

Expected vs Actual:

Artifacts:
  - Debug output dir: ~/.maestro/tests/<timestamp>/
  - maestro.log (attach or paste key snippet)
  - maestro hierarchy snippet (paste)
  - (optional) studio screenshot/recording

What we tried:

Hypothesis / next action:
```

---

## 2.1 同名元素（multiple matches）怎么处理？

典型场景：一个 `text` 同时出现在「整行容器」「label」「控件」上。

优先用**相对定位**把目标锁死：
- `rightOf`：点 label 右边的 switch / value / button
- `below` / `above`：点某个标题下方的第一个项
- `leftOf`：点某个值左边的 label（或反过来）

原则：**先用 hierarchy 确认相对关系**，再写 selector。

---

## 3) iOS Settings 常见坑与推荐模式

### 3.1 UISwitch（如 “Allow Full Access”）

症状：
- 同一个 text 出现在多个节点（行容器 / label / switch）
- `tapOn: "Allow Full Access"` 往往只会点到 label，不会触发 switch
- 坐标 tap 在大 flow 中容易因为页面未稳定/滚动偏移而失效

推荐解法（语义化 + 幂等）：
- 点击 label **右侧** 的元素（就是 switch）
- 只在 `checked: false` 时执行（避免重复运行把开关关掉）
- 断言弹窗出现，再点 “Allow”
- 最后断言 `checked: true`

示例：

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
      - waitForAnimationToEnd:
          timeout: 2000
      # 若未出现确认弹窗，重试一次
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

---

## 4) 维护与演进（把经验沉淀成"技能"）

每次解决一个 flaky/selector 问题：
- [ ] 把"模式"写进本文件（新增一小节即可）
- [ ] 在对应的 issue/report 里链接到此处
- [ ] 保留一个最小复现 flow（未来回归/教育新同学用）

---

## 5) Anti-patterns（禁止事项）

### ❌ 坐标点击 `point: "x,y"`

- **问题**：跨设备/屏幕尺寸会失效，滚动/动态布局会炸
- **替代**：用语义化选择器 (`rightOf`, `id`, `text`)

### ❌ 盲目使用 `index`

- **问题**：iOS Settings 布局变化会导致 index 失效
- **替代**：用 `rightOf/leftOf/below/above` 相对定位

### ❌ 反复猜测选择器

- **问题**：浪费时间，不可复现，无法沟通
- **替代**：先用 `maestro studio` / `maestro hierarchy` 观察真实层级

### ❌ 只看日志 "COMPLETED"

- **问题**：tap 命令完成不等于 UI 真的变化
- **替代**：每个关键交互都加 assert 验证前后状态

### ❌ 在完整流程中调试

- **问题**：时序/状态污染难以定位根因
- **替代**：先创建最小复现流程 `debug-*.yaml`

### ❌ 无限重试

- **问题**：掩盖真实问题，测试永远不会失败但也不可靠
- **替代**：最多受控重试一次，失败就 fail fast

---

## 6) 教训清单（Lessons Learned）

### 2024-12-16: iOS Settings UISwitch 点击问题

**症状**：
- `tapOn: "Allow Full Access"` 点到了文本标签，开关不触发
- `tapOn: point: "340,140"` 单独测试成功，完整流程失败
- 日志显示 "COMPLETED" 但开关实际未切换

**根因**：
- iOS Settings 中 UISwitch 的 accessibility tree 结构：整行容器、文本标签、开关控件共享同一个 `accessibilityText`
- 坐标点击在不同执行上下文中不稳定（页面加载时机、滚动位置）

**解决方案**：
- 使用 `rightOf: { text: "..." }` 定位开关（文本右侧的元素）
- 用 `checked: false/true` 做幂等判断
- 对 flaky 点击加受控重试（不要无限重试）

**代码示例**：见 Section 3.1

**参考**：`apps/mobile/.maestro/MAESTRO_ISSUES_REPORT.md`
