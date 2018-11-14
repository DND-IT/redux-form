import traverse from 'traverse'
import _ from 'lodash'
import mergeDeep from './util/mergeDeep'

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

  const isDirty = (a, b) => !deepEqual(a, b)

  const isDirtyByUs = isDirty(value, initialValue)
  const isDirtyByThem = isDirty(initialValue, newInitialValue)
  const isPristineByUs = !isDirtyByUs
  const isPristineByThem = !isDirtyByThem
  const wasDeletedByUs =
    typeof value === 'undefined' && typeof newInitialValue !== 'undefined'
  const wasDeletedByThem =
    isDirtyByThem &&
    (typeof value !== 'undefined' && typeof newInitialValue === 'undefined')

  return {
    initialValue,
    value,
    newInitialValue,
    isDirtyByUs,
    isDirtyByThem,
    isPristineByUs,
    isPristineByThem,
    wasDeletedByUs,
    wasDeletedByThem
  }
}

const createOverwritePristineValuesDeep = ({ getIn, deepEqual, setIn }) => (
  values,
  initialValues,
  newInitialValues,
  atoms = [],
  arrayComparator = (a, b) => {
    if (typeof a.id !== 'undefined' && typeof b.id !== 'undefined') {
      return a.id === b.id
    }

    if (
      typeof a.identifier !== 'undefined' &&
      typeof b.identifier !== 'undefined'
    ) {
      return a.identifier === b.identifier
    }

    return _.isEqual(a, b)
  }
) => {
  let metaValues = {}
  const markedToBeCleanedUp = {}

  // const getValuesByPath = createGetValuesByPath({ getIn, deepEqual })(
  //   initialValues,
  //   values,
  //   newInitialValues
  // )

  const getValuesByPath = createGetValuesByPath({ getIn, deepEqual })

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
    newInitialValues
  ) {
    const stopHere = atoms.reduce(
      (a, b) => a || RegExp(b).test(this.path.join('.')),
      false
    )

    if (_.isPlainObject(this.node) && !stopHere) {
      return mergedValue
    }

    // console.log('this.path', this.path)
    console.log('this.path', this.path)
    console.log('this.node', this.node)
    console.log('values', values)
    // TODO: new path of traverse...
    const result = getValuesByPath(initialValues, values, newInitialValues)(
      this.path
    )

    if (Array.isArray(this.node) && !stopHere) {
      console.log('result', result)

      const _value = _.unionWith(
        result.value,
        result.newInitialValue,
        arrayComparator
      )
      const _valueX = _value
        .map(value => {
          const singleValue =
            result.newInitialValue &&
            result.newInitialValue.find(newValue =>
              arrayComparator(newValue, value)
            )

          const initialValue =
            result.initialValue &&
            result.initialValue.find(initialValue =>
              arrayComparator(initialValue, value)
            )

          const getValuesByPath = createGetValuesByPath({ getIn, deepEqual })(
            initialValue,
            value,
            singleValue
          )

          const _result = getValuesByPath()

          if (_result.wasDeletedByThem || _result.wasDeletedByUs) {
            console.log('_result', _result)
            return
          }

          if (value && singleValue && _.isPlainObject(value)) {
            const _mergedValue = mergeDeep(value, singleValue)
            console.log('repeat', _mergedValue)
            const x = traverse(_mergedValue).map(function(v) {
              return mergeDeepAndKeepDirty.call(
                this,
                v,
                initialValue,
                value,
                singleValue
              )
            })

            console.log('x', x)
            return x
          }

          console.log('value', value)

          return value
        })
        .filter(v => v)
      // console.log('this.node', this.node)
      console.log('_valueX', _valueX)

      if (_valueX.length === 0) {
        console.log('delete', this.path)
        this.delete()

        cleanUpParents(this.parent)
      } else {
        this.update(_valueX)
      }

      // if (
      //   _valueX[0] &&
      //   !_.isPlainObject(_valueX[0]) &&
      //   !Array.isArray(_valueX[0])
      // ) {
      //   this.block()
      // }

      return
      // return _valueX
    }

    if (result.isPristineByUs && !result.wasDeletedByThem) {
      this.update(result.newInitialValue || mergedValue)
    } else if (
      (result.isPristineByUs && result.wasDeletedByThem) ||
      result.wasDeletedByUs
    ) {
      this.delete()

      cleanUpParents(this.parent)
    } else if (result.isDirtyByUs) {
      this.update(result.value)
    }

    if (stopHere) {
      this.block()
    }
  }

  let newValues = traverse(mergeDeep(values, newInitialValues)).map(function(
    v
  ) {
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
