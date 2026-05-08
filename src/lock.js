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

    class LockError extends Error {

    }

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
         * @param {Object} options
         * @param {boolean} options.blocking
         * @param {number} options.timeout
         * @returns {Promise<function(): any>}
         */
        acquire({ blocking = true, timeout } = {}) {
            return new Promise((resolve, reject) => {
                if (!blocking && this.locked) {
                    throw new LockError()
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
            first?.resolve(() => {
                clearTimeout(first.timer)
                this.#queue.shift()
                this.release()
            })
        }

        /**
         * @param {function(): (any | Promise<any>)} callback
         * @param {Object} options
         * @param {boolean} options.blocking
         * @param {number?} options.timeout
         * @returns {any}
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
