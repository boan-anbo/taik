---
trigger: |
  当遇到以下情况时使用此 skill：
  - Expo iOS 构建问题
  - CocoaPods 安装失败 / pod install 卡住
  - xcodebuild 报错 / 构建失败
  - objectVersion / compatibilityVersion 不兼容
  - build.db locked / 并发构建冲突
  - 需要在真机或模拟器上跑 dev build
---

# iOS Build & Development Playbook

> 目标：解决 Expo + iOS 原生构建中的常见问题，避免踩坑。
>
> Scope：Expo dev client、CocoaPods、xcodebuild、Xcode 项目配置。

---

## 0) Quick Reference（快速查表）

| 问题 | 解决命令 |
|------|----------|
| 需要在设备上跑 dev build | `npx expo run:ios --device "设备名"` |
| CocoaPods objectVersion 不兼容 | 见 Section 2 |
| build.db locked | `pkill -f xcodebuild` + 删 DerivedData |
| 构建看起来卡住了 | `ps aux \| grep xcodebuild` 确认是否在编译 |

---

## 1) 别用 Expo Go，用 Dev Build

### 为什么？

- Expo Go 不支持自定义原生模块（如 custom keyboard extension）
- Expo Go 需要登录 Expo 账号，CI 环境麻烦
- Dev build 才是真正的"原生 app + JS bundle"

### 正确做法

```bash
# 在真机上跑（需要先连接设备）
npx expo run:ios --device "Taik-E2E-Test"

# 在模拟器上跑
npx expo run:ios --device "iPhone 16 Pro"

# 列出可用设备
xcrun simctl list devices available
```

### 常见错误

```
CommandError: Input is required, but 'npx expo' is in non-interactive mode.
Use the EXPO_TOKEN environment variable to authenticate in CI
```

**原因**：尝试用了 Expo Go（需要登录）

**解决**：改用 `npx expo run:ios` 而不是 `npx expo start`

---

## 2) CocoaPods objectVersion 不兼容

### 报错信息

```
[Xcodeproj] Unable to find compatibility version string for object version '70'
```

### 根因

Xcode 生成的 `.pbxproj` 文件格式版本（objectVersion = 70）比当前 CocoaPods 内置的 xcodeproj gem 更新。

### 检查位置

```bash
# 查看当前 objectVersion
head -10 ios/Taik.xcodeproj/project.pbxproj | grep objectVersion

# 查看 compatibilityVersion
grep compatibilityVersion ios/Taik.xcodeproj/project.pbxproj
```

### 解决方案（任选其一）

#### 方案 A：清理重装 Pods（推荐）

```bash
cd ios
rm -rf Pods Podfile.lock
pod install --repo-update
```

#### 方案 B：重新生成原生项目

```bash
# 在 apps/mobile 目录
npx expo prebuild --clean
cd ios && pod install --repo-update
```

#### 方案 C：手动修改 objectVersion（最后手段）

如果以上都不行，可以尝试：

1. 编辑 `ios/Taik.xcodeproj/project.pbxproj`
2. 把 `objectVersion = 70` 改成 `objectVersion = 77`（或其他 xcodeproj 支持的版本）
3. 同步修改 `compatibilityVersion`
4. 然后 `cd ios && pod install --repo-update`

---

## 3) build.db locked（并发 xcodebuild）

### 报错信息

```
database is locked
Possibly there are two concurrent builds running in the same filesystem location
```

### 根因

前一次 xcodebuild 没停（后台还在跑），又起了一次构建。

### 解决步骤

```bash
# 1. 杀掉所有 xcodebuild 进程
pkill -f xcodebuild

# 2. 删除对应的 DerivedData
rm -rf ~/Library/Developer/Xcode/DerivedData/Taik-*

# 3. 重新构建
npx expo run:ios --device "设备名"
```

### 预防

- 不要同时开多个终端跑 `expo run:ios`
- 如果中断了构建（Ctrl+C），等几秒让进程完全退出

---

## 4) 构建"卡住"了？先确认是否真的在编

### 检查方法

```bash
# 查看是否有 xcodebuild 在跑
ps aux | grep "xcodebuild -workspace"

# 查看 CPU 使用（如果在编译，CPU 应该很高）
top -l 1 | grep xcodebuild
```

### 正常现象

React Native 的原生编译确实很慢（首次可能 5-10 分钟），日志类似：

```
› Compiling react-native Pods/React-RCTAnimation » RCTDecayAnimation.mm
› Compiling react-native Pods/React-RCTNetwork » RCTNetworking.mm
› Packaging taik-mobile Pods/ReactCodegen » libReactCodegen.a
```

### 真的卡住了

如果 `ps` 显示 xcodebuild 在跑，但 CPU 很低且日志长时间没更新：

1. 检查磁盘空间 `df -h`
2. 检查是否有模态弹窗（如 Keychain 访问请求）
3. 尝试 Section 3 的清理步骤

---

## 5) react-native-screens codegen 错误

### 报错信息

```
'react/renderer/components/rnscreens/States.h' file not found
```

### 解决

```bash
npx expo prebuild --clean
cd ios && pod install --repo-update
npx expo run:ios --device "设备名"
```

---

## 6) 构建日志在哪？

### Expo 日志

```bash
# 构建时会打印日志路径，通常类似：
/tmp/expo-ios.log
/tmp/expo-run-ios.*.log
```

### Xcode 构建日志

```bash
# DerivedData 里的构建日志
ls ~/Library/Developer/Xcode/DerivedData/Taik-*/Logs/Build/
```

### 查看实时日志

```bash
# 如果用 run_in_background 跑构建
tail -f /tmp/expo-ios.log
```

---

## 7) 教训清单（Lessons Learned）

### 2024-12-16: Expo Go 登录问题

**症状**：
- `npx expo start` 后尝试在设备上打开，提示需要登录
- `CommandError: Input is required, but 'npx expo' is in non-interactive mode`

**根因**：
- 误用了 Expo Go 流程，而我们的 app 有自定义原生模块（keyboard extension）

**解决方案**：
- 不要用 `expo start` + Expo Go
- 改用 `npx expo run:ios --device "设备名"` 构建 dev client

### 2024-12-16: CocoaPods objectVersion 70 不兼容

**症状**：
- `pod install` 报错 `Unable to find compatibility version string for object version '70'`

**根因**：
- Xcode 16 生成的项目文件格式版本比 CocoaPods 内置的 xcodeproj gem 新

**解决方案**：
- 清理 Pods：`rm -rf Pods Podfile.lock && pod install --repo-update`
- 或重新 prebuild：`npx expo prebuild --clean`

### 2024-12-16: 构建看起来卡住

**症状**：
- 运行 `expo run:ios` 后长时间没有新输出
- 不确定是卡住还是在正常编译

**解决方案**：
- 用 `ps aux | grep xcodebuild` 确认进程是否在跑
- React Native 首次编译确实很慢（5-10 分钟正常）
- 如果进程在但 CPU 很低，才考虑是真的卡住

---

## 8) Anti-patterns（禁止事项）

### ❌ 用 Expo Go 跑自定义原生模块

- **问题**：Expo Go 是预编译的，不包含你的原生代码
- **替代**：`npx expo run:ios` 构建 dev client

### ❌ 同时开多个构建

- **问题**：build.db locked，互相卡死
- **替代**：确保只有一个构建在跑

### ❌ 构建慢就 Ctrl+C 反复重试

- **问题**：每次重新开始都要重新编译，更慢
- **替代**：耐心等待，用 `ps` 确认是否在编译

### ❌ 不看日志就说"卡住了"

- **问题**：可能只是编译慢
- **替代**：`ps aux | grep xcodebuild` + `tail -f` 日志

### ❌ 忽略版本警告

- **问题**：版本不匹配可能导致奇怪的运行时错误
- **替代**：按提示更新依赖，或至少记录下来
