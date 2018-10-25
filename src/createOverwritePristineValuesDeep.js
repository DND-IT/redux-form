import traverse from 'traverse'
import _ from 'lodash'
import mergeDeep from './util/mergeDeep'

const createOverwritePristineValuesDeep = ({ getIn, deepEqual }) => (
  values,
  initialValues,
  newInitialValues
) => {
  const isDirty = (value, initialValue) => !deepEqual(value, initialValue)

  const newValues = traverse(mergeDeep(values, newInitialValues)).map(function(
    mergedValue
  ) {
    if (this.notLeaf && !Array.isArray(mergedValue)) {
      return mergedValue
    }

    const initialValue = getIn(initialValues, this.path)
    const value = getIn(values, this.path)
    const newInitialValue = getIn(newInitialValues, this.path)

    const isDirtyOurs = isDirty(value, initialValue)
    const isPristineOurs = !isDirtyOurs
    const wasDeleted =
      typeof value !== 'undefined' && typeof newInitialValue === 'undefined'

    if (isPristineOurs && !wasDeleted) {
      return this.update(mergedValue)
    } else if (isPristineOurs && wasDeleted) {
      this.delete()

      if (_.isEmpty(this.parent.node)) {
        return this.parent.delete()
      }
    } else if (isDirtyOurs) {
      return this.update(value)
    }

    // Else if newInitialValue but dirty, then dispatch action with content information
    // So the user can accept this change
  })

  return newValues
}

export default createOverwritePristineValuesDeep
