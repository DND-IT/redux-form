/*!
 * merge-deep <https://github.com/jonschlinkert/merge-deep>
 *
 * Copyright (c) 2014-2015, Jon Schlinkert.
 * Licensed under the MIT License.
 *
 * Small adjustments made by Marcel Schulze 2018
 */

const _ = require('lodash')
const typeOf = require('kind-of')

const clone = _.cloneDeep

function mergeDeep(orig, objects, arrayComparator) {
  if (!isObject(orig) && !Array.isArray(orig)) {
    orig = {}
  }

  var target = clone(orig)
  var len = arguments.length
  var idx = 0

  while (++idx < len) {
    var val = arguments[idx]

    if (isObject(val) || Array.isArray(val)) {
      merge(target, val, arrayComparator)
    }
  }
  return target
}

function merge(target, obj, arrayComparator) {
  for (var key in obj) {
    if (key === '__proto__' || !hasOwn(obj, key)) {
      continue
    }

    var oldVal = obj[key]
    var newVal = target[key]

    if (isObject(newVal) && isObject(oldVal)) {
      target[key] = merge(newVal, oldVal)
    } else if (Array.isArray(newVal)) {
      target[key] = _.unionWith(newVal, oldVal, arrayComparator)
    } else {
      target[key] = clone(oldVal)
    }
  }
  return target
}

function hasOwn(obj, key) {
  return Object.prototype.hasOwnProperty.call(obj, key)
}

function isObject(val) {
  return typeOf(val) === 'object' || typeOf(val) === 'function'
}

export default mergeDeep
