/**
 * Expo Config Plugin: Keyboard Extension
 *
 * This plugin adds the TaikKeyboard extension target to the Xcode project.
 * It must be run after expo prebuild.
 *
 * Usage: Add to app.json plugins array:
 * ["./plugins/withKeyboardExtension.js"]
 */

const { withXcodeProject, withInfoPlist } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

// Configuration
const KEYBOARD_EXTENSION_NAME = 'TaikKeyboard';
const KEYBOARD_BUNDLE_ID = 'app.carrel.taik.keyboard';
const APP_GROUP = 'group.app.carrel.taik';
const DEPLOYMENT_TARGET = '15.1';

/**
 * Main plugin function
 */
function withKeyboardExtension(config) {
  // First, modify the main app Info.plist if needed
  config = withInfoPlist(config, (config) => {
    return config;
  });

  // Then, modify the Xcode project
  config = withXcodeProject(config, async (config) => {
    const xcodeProject = config.modResults;
    const projectRoot = config.modRequest.projectRoot;
    const iosPath = path.join(projectRoot, 'ios');
    const keyboardPath = path.join(iosPath, KEYBOARD_EXTENSION_NAME);

    // Check if keyboard extension folder exists
    if (!fs.existsSync(keyboardPath)) {
      console.warn(`⚠️ Keyboard extension folder not found at ${keyboardPath}`);
      console.warn('   Copy TaikKeyboard from the iOS prototype first.');
      return config;
    }

    // Get the main app target
    const mainTarget = xcodeProject.getFirstTarget();
    const mainTargetUuid = mainTarget.uuid;

    // Check if extension target already exists
    const existingTargets = xcodeProject.pbxNativeTargetSection();
    const hasKeyboardTarget = Object.values(existingTargets).some(
      (target) => target.name === KEYBOARD_EXTENSION_NAME
    );

    if (hasKeyboardTarget) {
      console.log('✅ Keyboard extension target already exists');
      return config;
    }

    console.log('📱 Adding keyboard extension target...');

    // Create extension target
    const extensionTarget = xcodeProject.addTarget(
      KEYBOARD_EXTENSION_NAME,
      'app_extension',
      KEYBOARD_EXTENSION_NAME,
      KEYBOARD_BUNDLE_ID
    );

    // Add files to the extension target
    const keyboardFiles = [
      'KeyboardViewController.swift',
      'SharedStorage.swift',
      'Constants.swift',
      'DeckButton.swift',
      'Views/KeyboardView.swift',
      'Views/DeckGridView.swift',
      'Views/DeckButtonView.swift',
      'Views/StripView.swift',
    ];

    // Create a group for the keyboard extension
    const keyboardGroup = xcodeProject.addPbxGroup(
      keyboardFiles,
      KEYBOARD_EXTENSION_NAME,
      KEYBOARD_EXTENSION_NAME
    );

    // Add files to build phase
    for (const file of keyboardFiles) {
      const filePath = path.join(KEYBOARD_EXTENSION_NAME, file);
      xcodeProject.addSourceFile(
        filePath,
        { target: extensionTarget.uuid },
        keyboardGroup.uuid
      );
    }

    // Add Info.plist
    xcodeProject.addFile(
      `${KEYBOARD_EXTENSION_NAME}/Info.plist`,
      keyboardGroup.uuid
    );

    // Add entitlements
    xcodeProject.addFile(
      `${KEYBOARD_EXTENSION_NAME}/TaikKeyboard.entitlements`,
      keyboardGroup.uuid
    );

    // Set build settings for the extension
    const configurations = xcodeProject.pbxXCBuildConfigurationSection();
    Object.entries(configurations).forEach(([key, config]) => {
      if (typeof config === 'object' && config.buildSettings) {
        const name = config.name;
        if (config.buildSettings.PRODUCT_NAME === KEYBOARD_EXTENSION_NAME) {
          config.buildSettings.CODE_SIGN_ENTITLEMENTS = `${KEYBOARD_EXTENSION_NAME}/TaikKeyboard.entitlements`;
          config.buildSettings.INFOPLIST_FILE = `${KEYBOARD_EXTENSION_NAME}/Info.plist`;
          config.buildSettings.IPHONEOS_DEPLOYMENT_TARGET = DEPLOYMENT_TARGET;
          config.buildSettings.SWIFT_VERSION = '5.0';
          config.buildSettings.TARGETED_DEVICE_FAMILY = '"1,2"';
          config.buildSettings.PRODUCT_BUNDLE_IDENTIFIER = KEYBOARD_BUNDLE_ID;
        }
      }
    });

    // Add extension as a dependency of main app
    xcodeProject.addTargetDependency(mainTargetUuid, [extensionTarget.uuid]);

    // Add extension to embed frameworks build phase
    xcodeProject.addBuildPhase(
      [`${KEYBOARD_EXTENSION_NAME}.appex`],
      'PBXCopyFilesBuildPhase',
      'Embed App Extensions',
      mainTargetUuid,
      'app_extension'
    );

    console.log('✅ Keyboard extension target added');

    return config;
  });

  return config;
}

module.exports = withKeyboardExtension;
