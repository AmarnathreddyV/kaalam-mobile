# KAALAM Expo SDK 58 upgrade

The mobile app package versions now target:

- Expo SDK: `~58.0.0`
- React Native: `0.88.1`
- React: `19.3.0`
- expo-status-bar: `~58.0.4`
- react-native-safe-area-context: `~5.9.1`
- Node.js: `>=22.13.0`

## Install and validate

Run from the project root:

```bash
node --version
npm install
npx expo install --fix
npx expo-doctor
npx expo start -c
```

Use Node.js 22.13 or newer. If Expo reports a package version mismatch, follow `npx expo install --fix` rather than manually forcing dependency versions.

## Native builds

If you later generate native `android/` or `ios/` folders with Expo prebuild, regenerate them according to the SDK 58 migration guidance. Create a fresh development build after upgrading; do not reuse a development client built for an older SDK.

SDK 58 is built around React Native 0.88 and includes breaking changes from RN 0.87/0.88. This starter currently uses basic React Native APIs and does not use the removed APIs listed in the Expo SDK 58 changelog.

Official references:
- https://expo.dev/changelog/sdk-58
- https://docs.expo.dev/workflow/upgrading-expo-sdk-walkthrough/
