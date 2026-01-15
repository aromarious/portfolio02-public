/**
 * UI Component Test Setup
 * JSDOM環境でのReactコンポーネントテスト用セットアップ
 */

import '@testing-library/jest-dom'

// JSDOM環境では既にdocument, windowが利用可能
// globals: trueによりexpect等はグローバルで利用可能
