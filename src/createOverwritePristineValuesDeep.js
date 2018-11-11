import traverse from 'traverse'
import _ from 'lodash'
import mergeDeep from './util/mergeDeep'

const createGetValuesByPath = ({ getIn, deepEqual }) => (
  initialValues,
  values,
  newInitialValues
) => path => {
  const initialValue = getIn(initialValues, path)
  const value = getIn(values, path)
  const newInitialValue = getIn(newInitialValues, path)

  const isDirty = (a, b) => !deepEqual(a, b)

  const isDirtyByUs = isDirty(value, initialValue)
  const isDirtyByThem = isDirty(initialValue, newInitialValue)
  const isPristineByUs = !isDirtyByUs
  const isPristineByThem = !isDirtyByThem
  const wasDeletedByUs =
    typeof value === 'undefined' && typeof newInitialValue !== 'undefined'
  const wasDeletedByThem =
    typeof value !== 'undefined' && typeof newInitialValue === 'undefined'

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
  const getValuesByPath = createGetValuesByPath({ getIn, deepEqual })(
    initialValues,
    values,
    newInitialValues
  )

  const isDirty = (value, initialValue) => !deepEqual(value, initialValue)
  let metaValues = {}
  const toBeCleanedUpPaths = []
  const cleanMap = {}
  let newValues = traverse(mergeDeep(values, newInitialValues)).map(function(
    mergedValue
  ) {
    // console.log('this.path', this.path)
    const stopHere = atoms.reduce(
      (a, b) => a || RegExp(b).test(this.path.join('.')),
      false
    )

    if (this.notLeaf && !Array.isArray(mergedValue)) {
      if (stopHere) {
      } else {
        return mergedValue
      }
    }

    const {
      initialValue,
      value,
      newInitialValue,
      isDirtyByUs,
      isDirtyByThem,
      isPristineByUs,
      isPristineByThem,
      wasDeletedByUs,
      wasDeletedByThem
    } = getValuesByPath(this.path)

    // const parent = getValuesByPath(this.parent.path)

    if (isPristineByUs && !wasDeletedByThem) {
      // console.log('isPristineByUs && !wasDeletedByThem')
      this.update(newInitialValue || mergedValue)
    } else if (isPristineByUs && wasDeletedByThem) {
      // console.log('isPristineByUs && wasDeletedByThem')
      this.delete()

      if (
        Array.isArray(this.parent.node) &&
        _.isEmpty(_.compact(this.parent.node))
      ) {
        this.parent.delete()
      } else if (_.isEmpty(this.parent.node)) {
        this.parent.delete()
        if (Array.isArray(this.parent.parent.node)) {
          // Make it recusrive
          cleanMap[this.parent.parent.path] = getValuesByPath(
            this.parent.parent.path
          ).wasDeletedByUs
        }
      } else {
        // https://github.com/substack/js-traverse/issues/48#issuecomment-142607200
        // this.remove()
        if (Array.isArray(this.parent.node)) {
          this.after(function() {
            cleanMap[this.parent.path] = getValuesByPath(
              this.parent.path
            ).wasDeletedByUs
          })
        }
      }
    } else if (isDirtyByUs) {
      // console.log('isDirtyByUs', isDirtyByUs)
      if (Array.isArray(value) && Array.isArray(newInitialValue)) {
        // TODO: Clarify that there should never be an array which should have two times the exact same value in it
        const _value = _.unionWith(value, newInitialValue, arrayComparator)

        this.update(_value)
      } else {
        if (wasDeletedByUs) {
          this.delete()
        } else {
          this.update(value)
        }

        if (Array.isArray(this.parent.node)) {
          cleanMap[this.parent.path] = getValuesByPath(
            this.parent.path
          ).wasDeletedByUs
        } else if (_.isEmpty(this.parent.node)) {
          this.parent.delete()
          if (Array.isArray(this.parent.parent.node)) {
            // Make it recusrive
            cleanMap[this.parent.parent.path] = getValuesByPath(
              this.parent.parent.path
            ).wasDeletedByUs
          }
          // else if (_.isEmpty(this.parent.parent.node)) {
          //   this.parent.parent.delete()
          // }
        }
        // Show modal depending on this state update, then trigger change event and resolve the conflicts
        metaValues[this.path] = {
          myValue: value,
          newValue: newInitialValue,
          // needed?;
          resolved: false
        }
      }
    }

    if (stopHere) {
      this.block()
    }
    // Else if newInitialValue but dirty, then dispatch action with content information
    // So the user can accept this change
  })

  _.forEach(cleanMap, (wasDeletedByUs, pathString) => {
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
