/**
 * @file lock.js
 * @copyright 2026 PlasticHeart
 */

!(root => {
    /**
     * @param {any} value
     * @returns {boolean}
     */
    function isAwaitable(value) {
        return typeof value?.then == 'function'
    }

    /**
     * @param {any} value
     * @returns {boolean}
     */
    function isFunction(value) {
        return typeof value == 'function'
    }

    /**
     * @template T
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
     * @extends {Error}
     */
    class LockError extends Error {

    }

    /**
     * @extends {LockError}
     */
    class LockTimedoutError extends LockError {

    }

    class Lock {
        #queue

        constructor() {
            this.#queue = []
        }

        /**
         * @returns {boolean}
         */
        get locked() {
            return this.#queue.length > 0
        }

        /**
         * @param {Object} [options]
         * @param {boolean} [options.blocking]
         * @param {number} [options.timeout]
         * @returns {Promise<function(): void>}
         */
        acquire({ blocking = true, timeout } = {}) {
            return new Promise((resolve, reject) => {
                if (!blocking && this.locked) {
                    reject(new LockError())
                    return
                }
                const lock = { resolve, timer: null }
                if (blocking && Number.isSafeInteger(timeout)) {
                    lock.timer = setTimeout(() => {
                        this.#queue = this.#queue.filter(x => x != lock)
                        reject(new LockTimedoutError())
                    }, timeout)
                }
                this.#queue.push(lock)
                this.release()
            })
        }

        /**
         * @returns {void}
         */
        release() {
            const first = this.#queue[0]
            if (first) {
                clearTimeout(first.timer)
                first.resolve(() => {
                    this.#queue.shift()
                    this.release()
                })
            }
        }

        /**
         * @template T
         * @param {function(): (T | Promise<T>)} callback
         * @param {Object} [options]
         * @param {boolean} [options.blocking]
         * @param {number} [options.timeout]
         * @returns {Promise<T>}
         */
        async runExclusive(callback, { blocking = true, timeout } = {}) {
            const release = await this.acquire({ blocking, timeout })
            try {
                if (isFunction(callback)) {
                    return await awaitOr(callback())
                } else {
                    throw new Error('callback is not callable object')
                }
            } finally {
                release()
            }
        }
    }

    Object.assign(root, { Lock, LockError, LockTimedoutError })
})(this)
