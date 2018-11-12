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
  let metaValues = {}
  const markedToBeCleanedUp = {}

  const getValuesByPath = createGetValuesByPath({ getIn, deepEqual })(
    initialValues,
    values,
    newInitialValues
  )

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

  let newValues = traverse(mergeDeep(values, newInitialValues)).map(function(
    mergedValue
  ) {
    // console.log('this.path', this.path)
    const stopHere = atoms.reduce(
      (a, b) => a || RegExp(b).test(this.path.join('.')),
      false
    )

    if (this.notLeaf && !Array.isArray(mergedValue)) {
      if (!stopHere) {
        return mergedValue
      }
    }

    const {
      value,
      newInitialValue,
      isDirtyByUs,
      isDirtyByThem,
      isPristineByUs,
      wasDeletedByUs,
      wasDeletedByThem
    } = getValuesByPath(this.path)

    if (isPristineByUs && !wasDeletedByThem) {
      // console.log('isPristineByUs && !wasDeletedByThem')
      this.update(newInitialValue || mergedValue)
    } else if (isPristineByUs && wasDeletedByThem) {
      // console.log('isPristineByUs && wasDeletedByThem')
      this.delete()

      cleanUpParents(this.parent)
    } else if (isDirtyByUs) {
      // console.log('isDirtyByUs', isDirtyByUs)
      if (Array.isArray(value) && Array.isArray(newInitialValue)) {
        // TODO: Assumption that there should never be an array which should have two times the same item in it
        const _value = _.unionWith(value, newInitialValue, arrayComparator)

        this.update(_value)
      } else {
        if (wasDeletedByUs) {
          this.delete()

          cleanUpParents(this.parent)
        } else {
          this.update(value)
        }
      }
    }

    if (stopHere) {
      this.block()
    }

    // WIP: Handling of conflicts
    // Show modal depending on this state update, then trigger change event and resolve the conflicts
    if (isDirtyByUs && isDirtyByThem) {
      metaValues[this.path] = {
        myValue: value,
        newValue: newInitialValue,
        resolved: false
      }
    }
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
