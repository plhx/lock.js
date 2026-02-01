/**
 * @file lock.test.js
 * @copyright 2026 PlasticHeart
 */

!(async root => {
    const { Lock, LockError, LockTimedoutError } = window

    /**
     * @type T
     * @param {T} a
     * @param {T} b
     * @returns {boolean}
     */
    function equals(a, b) {
        if (a === b) {
            return true
        } else if (typeof a == 'number' && typeof b == 'number') {
            return Number.isNaN(a) && Number.isNaN(b) || a == b
        } else if (typeof a == 'bigint' && typeof b == 'bigint') {
            return a == b
        } else if (typeof a?.equals == 'function') {
            return a.equals(b)
        } else if (typeof a?.compare == 'function') {
            return a.compare(b) == 0
        }
        return false
    }

    /**
     * @param {Array} other
     * @returns {boolean}
     */
    Array.prototype.equals = function (other) {
        for (let i = 0; i < Math.max(this.length, other.length); i++) {
            if (!equals(this[i], other[i])) {
                return false
            }
        }
        return true
    }

    /**
     * @param {any} value
     * @returns {boolean}
     */
    function isAwaitable(value) {
        return typeof value?.then == 'function'
    }

    /**
     * @type T
     * @param {T | Promise<T>} value
     * @returns {Promise<T>}
     */
    async function awaitOr(value) {
        if (isAwaitable(value)) {
            return await value
        }
        return value
    }

    /**
     * @param {string} testName
     * @param {function()} action
     */
    async function test(testName, action) {
        try {
            const result = action()
            if (isAwaitable(result)) {
                await result
            }
            console.debug(`[UnitTest] ${testName}: OK`)
        } catch (e) {
            console.warn(`[UnitTest] ${testName}: ${e}`)
            throw e
        }
    }

    /**
     * @type T
     * @param {T} a
     * @param {T} b
     */
    function assertEq(a, b) {
        const result = equals(a, b)
        if (!result) {
            console.assert(result, `assertion failed: ${a} != ${b}`)
            throw new Error(`assertion failed: ${a} != ${b}`)
        }
    }

    /**
     * @type T
     * @param {function(): (T | Promise<T>)} action
     * @param {Object} options
     * @param {Error} options.error
     */
    async function assertExc(action, { error } = {}) {
        try {
            const result = await awaitOr(action())
            console.assert(false, `assertion failed: no error was thrown`)
            throw new Error(`assertion failed: no error was thrown`)
        } catch (e) {
            if (error && !(e instanceof error)) {
                console.assert(false, `assertion failed: expected error of type \`${error.name}\`, but caught \`${e.constructor.name}\` instead`)
                throw new Error(`assertion failed: expected error of type \`${error.name}\`, but caught \`${e.constructor.name}\` instead`)
            }
        }
    }

    await test('Lock::runExclusive() - 001', async () => {
        const values = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]
        const result = []
        const lock = new Lock()
        for (const value of values) {
            await lock.runExclusive(async () => {
                await new Promise(resolve => setTimeout(resolve, Math.random() * 10))
                result.push(value)
            })
        }
        assertEq(values, result)
    })

    await test('Lock::runExclusive() - 002', async () => {
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
        assertEq(values, result)
    })

    await test('Lock::runExclusive() - 003', async () => {
        const lock = new Lock()
        const result = await lock.runExclusive(async () => {
            await new Promise(resolve => setTimeout(resolve, 100))
            return 42
        })
        assertEq(result, 42)
    })

    await test('Lock::runExclusive() - 004', async () => {
        const lock = new Lock()
        const result = await lock.runExclusive(
            async () => {
                await new Promise(resolve => setTimeout(resolve, 1000))
                return 42
            },
            { timeout: 100 }
        )
        assertEq(result, 42)
    })

    await test('Lock::runExclusive() - 005', async () => {
        const lock = new Lock()
        lock.runExclusive(async () => await new Promise(resolve => setTimeout(resolve, 500)))
        await assertExc(
            async () => await lock.runExclusive(
                async () => await new Promise(resolve => setTimeout(resolve, 500)),
                { blocking: false }
            ),
            { error: LockError }
        )
    })

    await test('Lock::runExclusive() - 006', async () => {
        const lock = new Lock()
        lock.runExclusive(async () => await new Promise(resolve => setTimeout(resolve, 500)))
        const result = await lock.runExclusive(async () => {
            await new Promise(resolve => setTimeout(resolve, 500))
            return 42
        })
        assertEq(result, 42)
    })

    await test('Lock::runExclusive() - 007', async () => {
        const lock = new Lock()
        lock.runExclusive(async () => await new Promise(resolve => setTimeout(resolve, 500)))
        await assertExc(async () => {
            await lock.runExclusive(
                async () => await new Promise(resolve => setTimeout(resolve, 500)),
                { timeout: 100 }
            ),
            { error: LockTimedoutError }
        })
    })
})(this)
