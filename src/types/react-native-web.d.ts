/**
 * react-native-web ships no types. The plugin's own source imports from
 * 'react-native', which is aliased to src/mocks/react-native.ts, which
 * re-exports this — so without this declaration every RN component in the
 * harness types as an error rather than as `any`.
 */
declare module 'react-native-web';
