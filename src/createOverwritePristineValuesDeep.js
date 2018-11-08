import traverse from 'traverse'
import _ from 'lodash'
import mergeDeep from './util/mergeDeep'

const createOverwritePristineValuesDeep = ({ getIn, deepEqual, setIn }) => (
  values,
  initialValues,
  newInitialValues,
  atoms = [],
  arrayComparator = (a, b) => {
    if (typeof a.id !== 'undefined' && typeof b.id !== 'undefined') {
      return a.id === b.id
    }

    return _.isEqual(a, b)
  }
) => {
  const isDirty = (value, initialValue) => !deepEqual(value, initialValue)
  let metaValues = {}
  const toBeCleanedUpPaths = []
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

    const initialValue = getIn(initialValues, this.path)
    const value = getIn(values, this.path)
    const newInitialValue = getIn(newInitialValues, this.path)

    const isDirtyOurs = isDirty(value, initialValue)
    const isPristineOurs = !isDirtyOurs
    const wasDeleted =
      typeof value !== 'undefined' && typeof newInitialValue === 'undefined'

    if (isPristineOurs && !wasDeleted) {
      // console.log('isPristineOurs && !wasDeleted')
      this.update(newInitialValue || mergedValue)
    } else if (isPristineOurs && wasDeleted) {
      // console.log('isPristineOurs && wasDeleted')
      this.delete()

      if (
        Array.isArray(this.parent.node) &&
        _.isEmpty(_.compact(this.parent.node))
      ) {
        this.parent.delete()
      } else if (_.isEmpty(this.parent.node)) {
        this.parent.delete()
      } else {
        // https://github.com/substack/js-traverse/issues/48#issuecomment-142607200
        // this.remove()
        if (Array.isArray(this.parent.node)) {
          this.after(function() {
            toBeCleanedUpPaths.push(this.parent.path)
          })
        }
      }
    } else if (isDirtyOurs) {
      if (Array.isArray(value) && Array.isArray(newInitialValue)) {
        // TODO: Clarify that there should never be an array which should have two times the exact same value in it
        const _value = _.unionWith(value, newInitialValue, arrayComparator)

        this.update(_value)
      } else {
        this.update(value)

        if (Array.isArray(this.parent.node)) {
          toBeCleanedUpPaths.push(this.parent.path)
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

  toBeCleanedUpPaths.forEach(path => {
    const cleanedValue = _.compact(getIn(newValues, path))
    newValues = setIn(newValues, path, cleanedValue)
  })

  // return newValues
  return { newValues, metaValues }
}

export default createOverwritePristineValuesDeep
