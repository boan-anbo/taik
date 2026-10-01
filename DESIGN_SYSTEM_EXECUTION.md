# Taik Design System + Storybook 执行文档（交接给实现团队）

本文档面向“要把 Taik 的 Design System / UI 复用 / Storybook 工作流完整落地”的实现团队。你不需要 RN/iOS 背景，按步骤执行即可。

---

## 0. 当前 Repo 现状（已经做好的部分）

### 0.1 RN（on-device）Storybook 已接入

- 入口开关：`apps/mobile/App.tsx`（`STORYBOOK_ENABLED=true` 时加载 `apps/mobile/.rnstorybook`）
- Metro 支持：`apps/mobile/metro.config.js` 已用 `@storybook/react-native/metro/withStorybook` 包装（Story 自动发现依赖）
- Reanimated：`apps/mobile/babel.config.js` 已加入 `react-native-reanimated/plugin`
- 启动脚本：`apps/mobile/package.json` 已提供 `storybook`
- RN stories 目录：`apps/mobile/.rnstorybook/stories/`
  - `MicButton.stories.tsx`
  - `TranscriptView.stories.tsx`
  - `RecordingScreenView.stories.tsx`

### 0.2 已有“ScreenView（纯视图）”模式

为 Storybook 迭代而做的“容器/视图拆分”：

- 容器（带副作用、hooks、真实 API）：`apps/mobile/src/screens/RecordingScreen.tsx`
- 纯视图（仅 props、无副作用，适合 Storybook）：`apps/mobile/src/screens/RecordingScreenView.tsx`

### 0.3 设计 Tokens 已落地为一个共享包

- `packages/ui-tokens`：提供 `tokens`（color/space/radius/typography 等）
- Mobile 端已用 tokens 替换了一部分硬编码（示范用法）：
  - `apps/mobile/src/components/MicButton.tsx`
  - `apps/mobile/src/components/TranscriptView.tsx`
  - `apps/mobile/src/screens/RecordingScreenView.tsx`

---

## 1. 目标与非目标

### 1.1 目标（要达成）

1) **统一单位与视觉语言（unit design）**
   - 颜色、间距、圆角、字号、字重等都来自 tokens
   - 不再在业务组件里散落魔法数字（magic numbers）

2) **跨端复用策略清晰**
   - Web + Extension + Tauri 走 React DOM
   - iOS + Android 走 React Native
   - 共享：tokens + domain + headless 逻辑 + 组件 props contract

3) **Storybook 成为主要 UI 迭代入口**
   - RN（on-device）用于验证设备特性（safe area、键盘、手势、字体、性能）
   - DOM（browser）Storybook（后续要补）用于最快迭代大部分 UI

### 1.2 非目标（这次不要求）

- 不要求设计团队现在就定稿完整视觉规范（你们只需要把机制搭好）
- 不要求“所有 UI 完全跨端复用一份渲染实现”（DOM 与 RN primitive 不同，像素级共享不是默认策略）

---

## 2. 关键原则（必须遵守）

### 2.1 Token-first（先 tokens，再组件）

- 任何 UI 相关的常量（颜色/间距/圆角/字号/阴影/动效时长）优先放进 `packages/ui-tokens`
- 业务组件里不写 `'#007AFF'`、`20`、`12` 这类随处散落的常量

### 2.2 容器/视图拆分（Storybook 友好）

- **容器**：接入 hooks、网络、存储、权限、导航、side effects
- **视图**：只收 props，纯渲染；在 Storybook 里只渲染视图

建议命名：
- `XxxScreen.tsx`（container）
- `XxxScreenView.tsx`（pure view）

### 2.3 Two Renderers（DOM 与 RN 各自实现）

你们最终会维护两套 UI 实现：
- `ui-web`（React DOM + CSS variables）
- `ui-rn`（React Native + StyleSheet）

但它们应共享：
- tokens
- props contract（类型/接口）
- headless 逻辑（如状态机、校验、交互规则）

---

## 3. 工作流：如何运行 Storybook

### 3.1 RN Storybook（已可用）

在新终端中运行：

1) 启动 Metro（Storybook 模式）：
   - `cd /Users/boan/script/taik`
   - `npm -w taik-mobile run storybook`

2) 安装/运行 dev client（如首次或原生变更后）：
   - `cd /Users/boan/script/taik/apps/mobile`
   - `npx expo run:ios --device "Taik-E2E-Test"`

说明：
- Storybook 是“应用内 UI”，不是浏览器站点；你会在 Simulator 里看到 Storybook UI。
- 新增 stories 后，如果没被发现，先跑一次：
  - `cd apps/mobile && npm run storybook-generate`

### 3.2 DOM Storybook（待实现团队补）

目标：
- 在 `apps/web` 建立浏览器 Storybook（最快迭代）
- 能展示 `ui-web`（必需）
- 可选：通过 `react-native-web` 展示 `ui-rn` primitives（加速统一迭代）

---

## 4. 实施计划（建议按 Phase 做，不要一次铺太大）

### Phase 1（1–3 天）：把 RN 侧迭代体验打磨到“像 Web Storybook 一样顺手”

1) 将现有 screen 逐步拆出 `ScreenView`
   - 优先：录音/转写相关页面（`RecordingScreen`, `FileTranscriptionScreen`）
2) 为每个 `ScreenView` 增加 Storybook stories（覆盖关键状态）
   - Idle / Loading / Error / Completed / Empty / Overflow 等
3) 把 RN 组件中的颜色/间距/圆角迁移到 `tokens`
   - 先覆盖高频组件（Button、Text、Card、Input、ListRow…）

验收：
- 新同学只需开 Storybook 就能改 UI，不需要联网/权限/真机能力。

### Phase 2（3–7 天）：抽出 Design System 的“共享契约层”

新增包（建议）：
- `packages/ui-core`
  - 组件 props/types（contract），例如 `ButtonProps`, `TextProps`, `FieldProps`
  - headless hooks（例如：输入校验、异步状态、选择逻辑）
  - story 的共享 args/fixtures（可选）
- `packages/ui-rn`
  - RN 渲染实现（依赖 `ui-core` + `ui-tokens`）
- `packages/ui-web`
  - DOM 渲染实现（依赖 `ui-core` + `ui-tokens`）

验收：
- 同一个 `ButtonProps` 同时在 RN 和 DOM 端有实现，并能各自 Storybook 展示。

### Phase 3（1–2 周）：DOM Storybook + Web/Tauri/Extension 复用落地

1) 建 `apps/web` + Storybook（浏览器）
2) `ui-tokens` 导出一份 CSS variables（或生成）供 DOM 端消费
3) Tauri/Extension UI 尽量复用 `apps/web` 的 UI/路由/组件

验收：
- Web/Tauri/Extension 的 UI 迭代主要在浏览器 Storybook 完成；
- Mobile 的设备特性在 on-device Storybook 验证。

---

## 5. 约定（强制）

### 5.1 Tokens 使用约定

- 颜色：只用语义色（brand/text/surface/danger…），不在业务里用具体 hex
- 间距：只用 `tokens.space.*`（统一单位）
- 圆角：只用 `tokens.radius.*`
- 字体：只用 `tokens.fontSize.*` / `tokens.fontWeight.*` / `tokens.lineHeight.*`

### 5.2 Story 规范

- 组件 story：覆盖视觉与交互状态（hover/pressed 在 RN 用 Pressable 状态或单独 story 表达）
- ScreenView story：覆盖关键流程状态（loading/error/empty/success）
- stories 必须无副作用、可离线跑（不读真实存储/网络）

---

## 6. 常见坑（避免浪费时间）

1) **RN Storybook 不自动发现 stories**
   - 确认 `apps/mobile/metro.config.js` 使用了 `withStorybook`
   - 运行 `apps/mobile` 下的 `npm run storybook-generate`

2) **Expo Go vs dev client**
   - 本 repo 不用 Expo Go（原生模块不可用）
   - 所有调试/Storybook 都应在 dev client 环境下跑

3) **iOS build 卡 `build.db locked`**
   - 有残留 `xcodebuild`；kill 掉并删除 `~/Library/Developer/Xcode/DerivedData/Taik-*`

---

## 7. 最终交付清单（给 PM/Tech Lead 的可验收项）

- [ ] RN Storybook：每个核心 Screen 都有对应 `ScreenView` + stories
- [ ] tokens 覆盖：新写的 UI 不再出现硬编码颜色/间距/圆角
- [ ] `ui-core`：定义核心组件 contract（Button/Text/Input/Card/ListRow/Toast/Modal…）
- [ ] `ui-rn`：实现至少 5 个基础组件并在 RN Storybook 展示
- [ ] `ui-web`：实现同一批组件并在 DOM Storybook 展示（Phase 3）
- [ ] 文档：新增组件/新增 story/新增 token 的流程写清楚

