# lock.js

JavaScript / Node.js 向けの非同期ミューテックスロックライブラリです。  
Promise ベースの排他制御を簡単に実現できます。

## 特徴

- `acquire()` / `release()` による手動ロック管理
- `runExclusive()` によるコールバック形式の排他実行
  - `blocking　= false` オプションによるノンブロッキング取得
  - `timeout = <millis>` オプションによるタイムアウト付きロック取得
- `LockError` / `LockTimedoutError` による明確なエラー種別

## 使い方

### 基本的な排他実行 (`runExclusive`)

```js
const lock = new Lock()
const result = await lock.runExclusive(async () => {
    // この中は排他的に実行される
    await someAsyncOperation()
    return 42
})
```

### 手動取得・解放 (`acquire` / `release`)

```js
const lock = new Lock()
const release = await lock.acquire()
try {
    await someAsyncOperation()
} finally {
    release()
}
```

### ノンブロッキング取得

ロック中の場合、待機せずに即座に `LockError` をスローします。

```js
const lock = new Lock()
try {
    await lock.runExclusive(async () => {
        // ...
    }, { blocking: false })
} catch (e) {
    if (e instanceof LockError) {
        console.log('ロックを取得できませんでした')
    }
}
```

### タイムアウト付き取得

指定したミリ秒以内にロックを取得できない場合、`LockTimedoutError` をスローします。

```js
const lock = new Lock()
try {
    await lock.runExclusive(async () => {
        // ...
    }, { timeout: 1000 })
} catch (e) {
    if (e instanceof LockTimedoutError) {
        console.log('タイムアウトしました')
    }
}
```

## API

### `new Lock()`

ロックインスタンスを生成します。

### `lock.locked`

現在ロックが取得されているかどうかを示す `boolean` 値です。

### `lock.acquire([options])`

ロックを取得し、解放関数 `() => void` を返す `Promise` です。

| オプション | 型 | デフォルト | 説明 |
|---|---|---|---|
| `blocking` | `boolean` | `true` | `false` の場合、ロック中であれば即座に `LockError` をスローします |
| `timeout` | `number` | なし | ミリ秒単位のタイムアウト。超過した場合 `LockTimedoutError` をスローします |

### `lock.runExclusive(callback[, options])`

ロックを取得してから `callback` を実行し、完了後に自動的にロックを解放します。`callback` の戻り値を返す `Promise` です。オプションは `acquire()` と同じです。

### `LockError`

`blocking = false` 時にロックが取得できなかった場合にスローされるエラーです。

### `LockTimedoutError`

`timeout` 超過時にスローされるエラーです。`LockError` を継承しています。
