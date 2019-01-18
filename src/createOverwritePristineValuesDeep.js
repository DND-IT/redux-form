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

  const nextValue = isDirtyByUs ? value : newInitialValue

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
    const thatPath = this.path

    const buildNewArrayComplex = (result, compare) => {
      const allPossibleItems = _.uniqWith(
        [...(result.value || []), ...(result.newInitialValue || [])],
        compare
      )

      const itemResults = allPossibleItems.map(item => {
        const byId = _item => compare(_item, item)
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

      const newArray = itemResults.reduce((acc, res) => {
        if (!res.shouldBeDeleted) {
          const nextValue = isObjectType(res)
            ? traverse(
                mergeDeep(res.value, res.newInitialValue, compare)
              ).forEach(function(v) {
                return mergeDeepAndKeepDirty.call(
                  this,
                  v,
                  res.initialValue,
                  res.value,
                  res.newInitialValue,
                  // index is missing in fullpath....
                  // doesn't matter which index?
                  [...(fullPath || thatPath), 0, ...this.path]
                )
              })
            : res.nextValue

          if (!nextValue) {
            return acc
          }

          return [...acc, nextValue]
        }

        return acc
      }, [])

      const sortByArray = result.newInitialValue || []

      // console.log('sortByArray', sortByArray)
      // console.log('newArray', newArray)

      return newArray.slice().sort((a, b) => {
        if (sortByArray.indexOf(a) !== -1 && sortByArray.indexOf(b) !== -1) {
          return sortByArray.indexOf(a) - sortByArray.indexOf(b)
        }

        if (sortByArray.indexOf(a) === -1 && sortByArray.indexOf(b) === -1) {
          return 0
        }

        if (sortByArray.indexOf(a) === -1) {
          return 1
        }

        return -1
      })
    }

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
    if (stopHere) {
      this.block()

      if (result.isDirtyByUs) {
        return result.value
      }

      return result.newInitialValue
    }

    if (Array.isArray(mergedValue)) {
      this.block()
    }

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
      this.update(buildNewArrayComplex(result, arrayComparator))
      return
    }

    if (isObjectType(result)) {
      const x = traverse(
        mergeDeep(result.value, result.newInitialValue, arrayComparator)
      ).forEach(function(v) {
        return mergeDeepAndKeepDirty.call(
          this,
          v,
          result.initialValue,
          result.value,
          result.newInitialValue,
          [...(fullPath || thatPath), ...this.path]
        )
      })

      return x
    }
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
