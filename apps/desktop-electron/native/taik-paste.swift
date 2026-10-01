import Cocoa
import Carbon.HIToolbox
import Foundation
import ApplicationServices

func frontmostBundleId() -> String? {
  return NSWorkspace.shared.frontmostApplication?.bundleIdentifier
}

func waitForFrontmost(bundleId: String, timeoutMs: Int = 600, stepMs: Int = 40) -> Bool {
  let deadline = Date().addingTimeInterval(Double(timeoutMs) / 1000.0)
  while Date() < deadline {
    if frontmostBundleId() == bundleId { return true }
    usleep(useconds_t(stepMs * 1000))
  }
  return frontmostBundleId() == bundleId
}

@discardableResult
func activateApp(bundleId: String) -> Bool {
  if let app = NSRunningApplication.runningApplications(withBundleIdentifier: bundleId).first {
    let ok = app.activate(options: [.activateAllWindows])
    _ = waitForFrontmost(bundleId: bundleId)
    return ok
  }
  if let url = NSWorkspace.shared.urlForApplication(withBundleIdentifier: bundleId) {
    let config = NSWorkspace.OpenConfiguration()
    config.activates = true
    NSWorkspace.shared.openApplication(at: url, configuration: config, completionHandler: nil)
    _ = waitForFrontmost(bundleId: bundleId)
    return true
  }
  return false
}

func postPasteShortcut() {
  let source = CGEventSource(stateID: .hidSystemState)
  let cmdDown = CGEvent(keyboardEventSource: source, virtualKey: CGKeyCode(kVK_Command), keyDown: true)
  let vDown = CGEvent(keyboardEventSource: source, virtualKey: CGKeyCode(kVK_ANSI_V), keyDown: true)
  let vUp = CGEvent(keyboardEventSource: source, virtualKey: CGKeyCode(kVK_ANSI_V), keyDown: false)
  let cmdUp = CGEvent(keyboardEventSource: source, virtualKey: CGKeyCode(kVK_Command), keyDown: false)

  vDown?.flags = .maskCommand
  vUp?.flags = .maskCommand

  cmdDown?.post(tap: .cghidEventTap)
  usleep(20000)
  vDown?.post(tap: .cghidEventTap)
  usleep(20000)
  vUp?.post(tap: .cghidEventTap)
  usleep(20000)
  cmdUp?.post(tap: .cghidEventTap)
}

func secureInputPid() -> String {
  let task = Process()
  task.executableURL = URL(fileURLWithPath: "/usr/sbin/ioreg")
  task.arguments = ["-l", "-w", "0"]
  let pipe = Pipe()
  task.standardOutput = pipe
  do {
    try task.run()
  } catch {
    return ""
  }
  let data = pipe.fileHandleForReading.readDataToEndOfFile()
  guard let output = String(data: data, encoding: .utf8) else { return "" }
  if let range = output.range(of: "kCGSSessionSecureInputPID") {
    let tail = output[range.upperBound...]
    if let eq = tail.firstIndex(of: "=") {
      let after = tail[tail.index(after: eq)...]
      if let end = after.firstIndex(where: { $0 == "\n" }) {
        return after[..<end].trimmingCharacters(in: .whitespacesAndNewlines)
      }
      return after.trimmingCharacters(in: .whitespacesAndNewlines)
    }
  }
  return ""
}

func axInsertText(_ text: String) -> Bool {
  let system = AXUIElementCreateSystemWide()
  var focusedRef: CFTypeRef?
  let focusedErr = AXUIElementCopyAttributeValue(system, kAXFocusedUIElementAttribute as CFString, &focusedRef)
  if focusedErr != .success { return false }
  guard let focusedElement = focusedRef else { return false }

  let element = focusedElement as! AXUIElement

  let setSelectedErr = AXUIElementSetAttributeValue(
    element,
    kAXSelectedTextAttribute as CFString,
    text as CFTypeRef
  )
  if setSelectedErr == .success { return true }

  var valueRef: CFTypeRef?
  var rangeRef: CFTypeRef?
  let valueErr = AXUIElementCopyAttributeValue(element, kAXValueAttribute as CFString, &valueRef)
  let rangeErr = AXUIElementCopyAttributeValue(
    element,
    kAXSelectedTextRangeAttribute as CFString,
    &rangeRef
  )
  if valueErr != .success || rangeErr != .success { return false }
  guard let value = valueRef as? String else { return false }
  guard let rangeRef else { return false }
  let rangeValue = rangeRef as! AXValue
  if AXValueGetType(rangeValue) != .cfRange { return false }

  var cfRange = CFRange()
  if !AXValueGetValue(rangeValue, .cfRange, &cfRange) { return false }

  let nsValue = value as NSString
  let replaceRange = NSRange(location: cfRange.location, length: cfRange.length)
  let newValue = nsValue.replacingCharacters(in: replaceRange, with: text)
  let setValueErr = AXUIElementSetAttributeValue(
    element,
    kAXValueAttribute as CFString,
    newValue as CFTypeRef
  )
  if setValueErr != .success { return false }

  var newRange = CFRange(location: cfRange.location + (text as NSString).length, length: 0)
  if let newRangeValue = AXValueCreate(.cfRange, &newRange) {
    _ = AXUIElementSetAttributeValue(
      element,
      kAXSelectedTextRangeAttribute as CFString,
      newRangeValue
    )
  }

  return true
}

let args = CommandLine.arguments
if args.contains("--frontmost") {
  print(frontmostBundleId() ?? "")
  exit(0)
}

if args.contains("--secure-input") {
  print(secureInputPid())
  exit(0)
}

if let idx = args.firstIndex(of: "--activate"), idx + 1 < args.count {
  let bundleId = args[idx + 1]
  exit(activateApp(bundleId: bundleId) ? 0 : 1)
}

if let idx = args.firstIndex(of: "--ax-insert"), idx + 1 < args.count {
  let text = args[idx + 1]
  let ok = axInsertText(text)
  print(ok ? "1" : "0")
  exit(0)
}

if args.contains("--paste") || args.count <= 1 {
  postPasteShortcut()
  exit(0)
}
