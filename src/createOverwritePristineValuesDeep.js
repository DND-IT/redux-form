import traverse from 'traverse'
import _ from 'lodash'
import mergeDeep from './util/mergeDeep'

const createResult = (initialValue, value, newInitialValue, deepEqual) => {
  const isDirty = (a, b) => !deepEqual(a, b)

  const isDirtyByUs = isDirty(value, initialValue)
  const isDirtyByThem = isDirty(initialValue, newInitialValue)
  const isPristineByUs = !isDirtyByUs
  const isPristineByThem = !isDirtyByThem
  const wasDeletedByUs =
    isDirtyByUs &&
    (typeof value === 'undefined' && typeof newInitialValue !== 'undefined')
  const wasDeletedByThem =
    isDirtyByThem &&
    (typeof value !== 'undefined' && typeof newInitialValue === 'undefined')

  const shouldBeDeleted = (isPristineByUs && wasDeletedByThem) || wasDeletedByUs

  const nextValue = isPristineByUs ? newInitialValue : value

  return {
    initialValue,
    value,
    newInitialValue,
    isDirtyByUs,
    isDirtyByThem,
    isPristineByUs,
    isPristineByThem,
    wasDeletedByUs,
    wasDeletedByThem,
    shouldBeDeleted,
    nextValue
  }
}

const createGetValuesByPath = ({ getIn, deepEqual }) => (
  initialValues,
  values,
  newInitialValues
) => path => {
  const initialValue = path ? getIn(initialValues, path) : initialValues
  const value = path ? getIn(values, path) : values
  const newInitialValue = path
    ? getIn(newInitialValues, path)
    : newInitialValues

  return createResult(initialValue, value, newInitialValue, deepEqual)
}

const isNumberType = result => {
  return typeof result.nextValue === 'number'
}

const isStringType = result => {
  return typeof result.nextValue === 'string'
}

const isObjectType = result => {
  return _.isPlainObject(result.nextValue)
}

const isArrayType = result => {
  return Array.isArray(result.nextValue)
}

const determineItemType = result => {
  if (result.newInitialValue && result.value) {
    return (
      typeof result.newInitialValue.filter(v => v)[0] ||
      typeof result.value.filter(v => v)[0]
    )
  }

  if (result.newInitialValue) {
    return typeof result.newInitialValue.filter(v => v)[0]
  }

  if (result.value) {
    return typeof result.value.filter(v => v)[0]
  }
}

const arrayComparator = (a, b) => {
  if (_.isPlainObject(a) && _.isPlainObject(b)) {
    if (typeof a.id !== 'undefined' && typeof b.id !== 'undefined') {
      return a.id === b.id
    }

    if (
      typeof a.identifier !== 'undefined' &&
      typeof b.identifier !== 'undefined'
    ) {
      return a.identifier === b.identifier
    }
  }

  return _.isEqual(a, b)
}

const buildNewArraySimple = (result, compare) => {
  return _.uniqBy(
    [...(result.value || []), ...(result.newInitialValue || [])],
    compare
  )
}

// assumption: we handle items of arrays as atoms
const buildNewArrayComplex = (result, compare) => {
  const allPossibleItems = _.uniqWith(
    [...(result.newInitialValue || []), ...(result.value || [])],
    compare
  )

  const itemResults = allPossibleItems.map(item => {
    const byId = _item => arrayComparator(_item, item)
    const initialItemValue = result.initialValue
      ? result.initialValue.find(byId)
      : null
    const itemValue = result.value ? result.value.find(byId) : null
    const newInitialItemValue = result.newInitialValue
      ? result.newInitialValue.find(byId)
      : null

    return createResult(
      initialItemValue,
      itemValue,
      newInitialItemValue,
      _.isEqual
    )
  })

  return itemResults.reduce((acc, res) => {
    if (!res.shouldBeDeleted) {
      return [...acc, res.nextValue]
    }

    return acc
  }, [])
}
// const buildNewArrayComplex = (result, compare) => {
//   const allPossibleItems = _.uniqWith(
//     [...(result.newInitialValue || []), ...(result.value || [])],
//     compare
//   )

//   const itemResults = allPossibleItems.map(item => {
//     const byId = _item => arrayComparator(_item, item)
//     const initialItemValue = result.initialValue.find(byId)
//     const itemValue = result.value.find(byId)
//     const newInitialItemValue = result.newInitialValue.find(byId)

//     return createResult(
//       initialItemValue,
//       itemValue,
//       newInitialItemValue,
//       _.isEqual
//     )
//   })

//   return itemResults.reduce((acc, res) => {
//     if (!res.shouldBeDeleted) {
//       return [...acc, res.nextValue]
//     }

//     return acc
//   }, [])
// }

const mergeArrays = result => {
  const itemType = determineItemType(result)

  if (itemType === 'string' || itemType === 'number') {
    return buildNewArrayComplex(result, arrayComparator)
  }

  if (itemType === 'object') {
    return buildNewArrayComplex(result, arrayComparator)
  }

  return result.newInitialValue
}

let limit = 0

const createOverwritePristineValuesDeep = ({ getIn, deepEqual, setIn }) => (
  values,
  initialValues,
  newInitialValues,
  atoms = [],
  arrayComparator = (a, b) => {
    if (_.isPlainObject(a) && _.isPlainObject(b)) {
      if (typeof a.id !== 'undefined' && typeof b.id !== 'undefined') {
        return a.id === b.id
      }

      if (
        typeof a.identifier !== 'undefined' &&
        typeof b.identifier !== 'undefined'
      ) {
        return a.identifier === b.identifier
      }
    }

    return _.isEqual(a, b)
  }
) => {
  let metaValues = {}
  const markedToBeCleanedUp = {}

  const getValuesByPath = createGetValuesByPath({ getIn, deepEqual })

  // const compareArrayItem = (initialItem, )

  const removeItemFromArray = parent => {
    // Workaround for this.remove()
    // https://github.com/substack/js-traverse/issues/48#issuecomment-142607200
    parent.after(() => {
      markedToBeCleanedUp[parent.path] = getValuesByPath(
        parent.path
      ).wasDeletedByUs
    })
  }

  const cleanUpParents = parent => {
    if (
      (Array.isArray(parent.node) && _.isEmpty(_.compact(parent.node))) ||
      _.isEmpty(parent.node)
    ) {
      if (parent.parent) {
        parent.delete()
        cleanUpParents(parent.parent)
      }
    } else {
      if (Array.isArray(parent.node)) {
        // console.log('removeItemFromArray', parent.node)
        removeItemFromArray(parent)
      }
    }
  }

  function mergeDeepAndKeepDirty(
    mergedValue,
    initialValues,
    values,
    newInitialValues,
    fullPath
  ) {
    // console.log('Round', limit)
    // if (limit > 4) {
    //   this.stop()
    //   return mergedValue
    // } else {
    //   limit++
    // }

    const thatPath = this.path

    if (this.isRoot) {
      return mergedValue
    }

    const stopHere = atoms.reduce(
      (a, b) =>
        a ||
        RegExp(b).test(fullPath ? fullPath.join('.') : this.path.join('.')),
      false
    )

    const result = getValuesByPath(initialValues, values, newInitialValues)(
      this.path.length > 0 ? this.path : undefined
    )
    console.log('stopHere', stopHere)
    console.log('fullPath', fullPath)
    console.log('this.path', this.path)
    if (stopHere) {
      // not sold on the correctness of this return value??
      return result.value
    }

    console.warn('continue')

    if (Array.isArray(mergedValue)) {
      // console.log('stopHere', stopHere)
      this.block()
    }

    // console.log('result', result)

    if (result.shouldBeDeleted) {
      this.delete()

      cleanUpParents(this.parent)

      return
    }

    if (isNumberType(result) || isStringType(result)) {
      this.update(result.nextValue)
      return
    }

    if (isArrayType(result)) {
      this.update(mergeArrays(result))
      console.log('isArrayType')
      return
    }

    if (isObjectType(result)) {
      const x = traverse(result.initialValues).forEach(function(v) {
        return mergeDeepAndKeepDirty.call(
          this,
          v,
          result.initialValue,
          result.value,
          result.newInitialValue,
          [...thatPath, ...this.path]
        )
      })

      return x
    }

    // if (
    //   result.isPristineByUs &&
    //   (typeof result.newInitialValue === 'string' ||
    //     typeof result.newInitialValue === 'number')
    // ) {
    //   return result.newInitialValue
    // }

    // if (
    //   (result.isPristineByThem || result.isDirtyByUs) &&
    //   (typeof result.value === 'string' || typeof result.value === 'number')
    // ) {
    //   return result.value
    // }

    // if (Array.isArray(result.newInitialValue)) {
    //   return result.newInitialValue
    // }

    // if (
    //   (result.isPristineByUs && typeof result.newInitialValue === 'object') ||
    //   (result.isPristineByThem && typeof result.value === 'object') ||
    //   (result.isDirtyByUs && typeof result.value === 'object')
    // ) {
    //   const x = traverse(result.newInitialValue).forEach(function(v) {
    //     console.log('this.path2', this.path)
    //     console.log('thatPath', thatPath)
    //     return mergeDeepAndKeepDirty.call(
    //       this,
    //       v,
    //       result.initialValue,
    //       result.value,
    //       result.newInitialValue,
    //       [...thatPath, ...this.path]
    //     )
    //   })
    //   console.log('x', x)

    //   // this.block()
    //   // return x

    //   return result.newInitialValue
    // }

    // console.log('this.path', this.path)
    // console.log('this.node', this.node)

    // let result = {}
    // let next = false

    // const nodeIsNotInArray = this.parent && !Array.isArray(this.parent.node)

    // if (nodeIsNotInArray || this.isRoot) {
    //   result = getValuesByPath(initialValues, values, newInitialValues)(
    //     this.path.length > 0 ? this.path : undefined
    //   )
    // } else {
    //   const betterGetInt = (value, path) => {
    //     if (path.length > 0) {
    //       return getIn(value, path)
    //     }

    //     return value
    //   }

    //   const initialItem = betterGetInt(initialValues, this.path)
    //   const item =
    //     betterGetInt(values, this.parent.path) &&
    //     betterGetInt(values, this.parent.path).find(item =>
    //       arrayComparator(initialItem, item)
    //     )
    //   const newItem =
    //     betterGetInt(newInitialValues, this.parent.path) &&
    //     betterGetInt(newInitialValues, this.parent.path).find(item =>
    //       arrayComparator(initialItem, item)
    //     )

    //   result = getValuesByPath(initialItem, item, newItem)()

    //   // console.log('resultX', result)
    //   // console.log('initialItem', initialItem)
    //   // console.log('item', item)
    //   // console.log('newItem', newItem)
    //   // console.log('values', values)
    //   // console.log('newInitialValues', newInitialValues)
    //   next = true
    // }

    // if (result.shouldBeDeleted) {
    //   console.log('shouldBeDeleted')
    //   this.delete()

    //   cleanUpParents(this.parent)
    //   return
    // } else if (next) {
    //   let _mergedValue = result.value

    //   if (
    //     result.value &&
    //     result.newInitialValue &&
    //     _.isPlainObject(result.value)
    //   ) {
    //     _mergedValue = mergeDeep(
    //       result.value,
    //       result.newInitialValue,
    //       arrayComparator
    //     )
    //   }

    //   const thatPath = this.path

    //   console.log('repeat')
    //   // console.log('repeat', result.initialValue)
    //   // console.log('repeat', result.value)
    //   // console.log('repeat', result.newInitialValue)
    //   const x = traverse(_mergedValue).forEach(function(v) {
    //     return mergeDeepAndKeepDirty.call(
    //       this,
    //       v,
    //       result.initialValue,
    //       result.value,
    //       result.newInitialValue,
    //       [...thatPath, ...this.path]
    //     )
    //   })

    //   this.block()
    //   return x
    // }

    // if (_.isPlainObject(this.node) && !stopHere) {
    //   return mergedValue
    // }

    // if (Array.isArray(this.node) && !stopHere && !this.isRoot) {
    //   const unionWith = _.unionWith(
    //     result.value,
    //     result.newInitialValue,
    //     arrayComparator
    //   )
    //   console.log('unionWith', unionWith)

    //   return mergedValue
    //   // const thatPath = this.path

    //   // const x = traverse(unionWith).map(function(v) {
    //   //   return mergeDeepAndKeepDirty.call(
    //   //     this,
    //   //     v,
    //   //     result.initialValue,
    //   //     result.value,
    //   //     result.newInitialValue,
    //   //     [...thatPath, ...this.path]
    //   //   )
    //   // })

    //   // this.block()
    //   // return x

    //   // console.log('this.node isArray', this.node)
    //   // if (returnEarly) {
    //   //   returnEarly = false
    //   //   return
    //   // }

    //   // returnEarly = true

    //   // const unionWith = _.unionWith(
    //   //   result.value,
    //   //   result.newInitialValue,
    //   //   arrayComparator
    //   // )
    //   // console.log('unionWith', unionWith)

    //   // // this.update(unionWith)
    //   // // return

    //   // const thatPath = this.path

    //   // const x = traverse(unionWith).map(function(v) {
    //   //   return mergeDeepAndKeepDirty.call(
    //   //     this,
    //   //     v,
    //   //     result.initialValue,
    //   //     result.value,
    //   //     result.newInitialValue,
    //   //     [...thatPath, ...this.path]
    //   //   )
    //   // })

    //   // this.block()
    //   // return x
    // }

    // if (result.isPristineByUs) {
    //   // this.update(result.newInitialValue || mergedValue)
    //   return result.newInitialValue || mergedValue
    // }

    // return result.value
  }

  let newValues = traverse(
    mergeDeep(values, newInitialValues, arrayComparator)
  ).forEach(function(v) {
    return mergeDeepAndKeepDirty.call(
      this,
      v,
      initialValues,
      values,
      newInitialValues
    )
  })

  _.forEach(markedToBeCleanedUp, (wasDeletedByUs, pathString) => {
    const path = pathString.split(',')

    const cleanedValue = _.compact(getIn(newValues, path))
    if (_.isEmpty(cleanedValue) && wasDeletedByUs) {
      newValues = setIn(newValues, path, undefined)
    } else {
      newValues = setIn(newValues, path, cleanedValue)
    }
  })

  return { newValues, metaValues }
}

export default createOverwritePristineValuesDeep
