/**
 * @file lock.vitest.test.js
 * @copyright 2026 PlasticHeart
 */

import { describe, test, expect } from 'vitest'
import { Lock, LockError, LockTimedoutError } from '../src/lock.js'

describe('Lock::runExclusive()', () => {
    test('001 - 直列実行時に順序が保たれる', async () => {
        const values = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]
        const result = []
        const lock = new Lock()
        for (const value of values) {
            await lock.runExclusive(async () => {
                await new Promise(resolve => setTimeout(resolve, Math.random() * 10))
                result.push(value)
            })
        }
        expect(result).toEqual(values)
    })

    test('002 - 並列キュー実行時に順序が保たれる', async () => {
        const values = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]
        const result = []
        const promises = []
        const lock = new Lock()
        for (const value of values) {
            const promise = lock.runExclusive(async () => {
                await new Promise(resolve => setTimeout(resolve, Math.random() * 10))
                result.push(value)
            })
            promises.push(promise)
        }
        await Promise.allSettled(promises)
        expect(result).toEqual(values)
    })

    test('003 - 戻り値が正しく返される', async () => {
        const lock = new Lock()
        const result = await lock.runExclusive(async () => {
            await new Promise(resolve => setTimeout(resolve, 100))
            return 42
        })
        expect(result).toBe(42)
    })

    test('004 - timeout内に完了する場合は正常に値が返される', async () => {
        const lock = new Lock()
        const result = await lock.runExclusive(
            async () => {
                await new Promise(resolve => setTimeout(resolve, 50))
                return 42
            },
            { timeout: 1000 }
        )
        expect(result).toBe(42)
    })

    test('005 - blocking = false でロック中の場合 LockError がスローされる', async () => {
        const lock = new Lock()
        lock.runExclusive(async () => await new Promise(resolve => setTimeout(resolve, 500)))
        await expect(
            lock.runExclusive(
                async () => await new Promise(resolve => setTimeout(resolve, 500)),
                { blocking: false }
            )
        ).rejects.toBeInstanceOf(LockError)
    })

    test('006 - 前のタスク完了後に次のタスクが正常に実行される', async () => {
        const lock = new Lock()
        lock.runExclusive(async () => await new Promise(resolve => setTimeout(resolve, 100)))
        const result = await lock.runExclusive(async () => {
            await new Promise(resolve => setTimeout(resolve, 100))
            return 42
        })
        expect(result).toBe(42)
    })

    test('007 - timeout 超過時に LockTimedoutError がスローされる', async () => {
        const lock = new Lock()
        lock.runExclusive(async () => await new Promise(resolve => setTimeout(resolve, 500)))
        await expect(
            lock.runExclusive(
                async () => await new Promise(resolve => setTimeout(resolve, 500)),
                { timeout: 100 }
            )
        ).rejects.toBeInstanceOf(LockTimedoutError)
    })
})
