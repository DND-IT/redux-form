import plain from '../structure/plain'

import createOverwritePristineValuesDeep from '../createOverwritePristineValuesDeep'

describe('overwritePristineValuesDeep', () => {
  const overwritePristineValuesDeep = createOverwritePristineValuesDeep(plain)

  it('should update pristine values with new values', () => {
    const initialValues = {
      name: 'name',
      title: 'title',
      x: 'x',
      relatedContent: {
        0: ['1']
      },
      object: {
        a: 'a',
        b: 'b',
        c: 'c',
        object2: {
          a2: 'a2',
          b2: 'b2'
        }
      }
    }

    const newInitialValues = {
      name: 'name-new',
      title: 'title-new',
      new: 'new',
      relatedContent: {
        0: ['1'],
        new: ['new', 'new2', 'new3']
      },
      object: {
        a: 'a-new',
        b: 'b-new',
        object2: {
          a2: 'a2-new',
          b2: 'b2-new'
        },
        objectNew: {
          a3: 'a3',
          b3: 'b3'
        }
      }
    }

    const values = {
      name: 'name-dirty',
      title: 'title',
      x: 'x',
      relatedContent: {
        0: ['1', 'dirty']
      },
      object: {
        a: 'a-dirty',
        b: 'b',
        c: 'c',
        d: 'd',
        object2: {
          a2: 'a2-dirty',
          b2: 'b2'
        }
      }
    }

    const result = overwritePristineValuesDeep(
      values,
      initialValues,
      newInitialValues
    )

    const newValues = result.newValues

    expect(newValues.title).toEqual('title-new')
    expect(newValues.object.b).toEqual('b-new')
    expect(newValues.object.object2.b2).toEqual('b2-new')

    expect(newValues.name).toEqual('name-dirty')
    expect(newValues.object.a).toEqual('a-dirty')
    expect(newValues.object.object2.a2).toEqual('a2-dirty')

    expect(newValues.x).toBeUndefined()
    expect(newValues.object.c).toBeUndefined()
    expect(newValues.object.d).toEqual('d')
    expect(newValues.new).toEqual('new')
    expect(newValues.object.objectNew).toEqual({
      a3: 'a3',
      b3: 'b3'
    })
    expect(newValues.relatedContent).toEqual({
      0: ['1', 'dirty'],
      new: ['new', 'new2', 'new3']
    })

    expect(newValues).toMatchSnapshot()
  })

  it('should NOT remove a tenant variant if', () => {
    const initialValues = {
      relatedContent: {
        0: ['1'],
        1: ['2']
      }
    }

    const newInitialValues = {
      relatedContent: {
        0: ['1', 'dirty']
      }
    }

    const values = {
      relatedContent: {
        0: ['1'],
        1: ['2'],
        2: ['dirty', 'dirty1']
      }
    }

    const result = overwritePristineValuesDeep(
      values,
      initialValues,
      newInitialValues
    )

    expect(result.newValues.relatedContent).toEqual({
      0: ['1', 'dirty'],
      2: ['dirty', 'dirty1']
    })
  })

  it('should NOT remove a tenant variant if object', () => {
    const initialValues = {
      relatedContent: {
        0: { a: 'a', b: 'b' },
        1: { c: 'c', d: 'd' }
      }
    }

    const newInitialValues = {
      relatedContent: {
        0: { a: 'a2', b: 'b' }
      }
    }

    const values = {
      relatedContent: {
        0: { a: 'a', b: 'b' },
        1: { c: 'c', d: 'd' },
        2: { x: 'x', f: 'f' }
      }
    }

    const result = overwritePristineValuesDeep(
      values,
      initialValues,
      newInitialValues
    )

    expect(result.newValues.relatedContent).toEqual({
      0: { a: 'a2', b: 'b' },
      2: { x: 'x', f: 'f' }
    })
  })

  it('should NOT add a tenant variant if', () => {
    const initialValues = {
      relatedContent: {
        0: ['1'],
        1: ['2']
      }
    }

    const newInitialValues = {
      relatedContent: {
        0: ['1'],
        1: ['2']
      }
    }

    const values = {
      relatedContent: {
        0: ['1', 'dirty']
      }
    }

    const result = overwritePristineValuesDeep(
      values,
      initialValues,
      newInitialValues
    )

    expect(result.newValues.relatedContent).toEqual({
      0: ['1', 'dirty']
    })
  })

  it('should do this', () => {
    const values = {
      myField: [{ name: 'One' }, { name: 'Two' }]
    }
    const initialValues = {
      myField: [{ name: 'One' }, { name: 'Two' }]
    }

    const newInitialValues = {
      myField: [{ name: 'One' }, { name: 'Two' }, { name: 'Three' }]
    }

    const result = overwritePristineValuesDeep(
      values,
      initialValues,
      newInitialValues
    )

    expect(result.newValues).toEqual({
      myField: [{ name: 'One' }, { name: 'Two' }, { name: 'Three' }]
    })
  })

  it('should do this and that', () => {
    const values = {
      myField: [{ name: 'One' }, { name: 'Two' }, { name: 'X' }]
    }
    const initialValues = {
      myField: [{ name: 'One' }, { name: 'Two' }]
    }

    const newInitialValues = {
      myField: [{ name: 'One' }, { name: 'Two' }, { name: 'Three' }]
    }

    const result = overwritePristineValuesDeep(
      values,
      initialValues,
      newInitialValues
    )

    expect(result.newValues).toEqual({
      myField: [
        { name: 'One' },
        { name: 'Two' },
        { name: 'X' },
        { name: 'Three' }
      ]
    })
  })

  it('should handle nested arrays', () => {
    const values = {
      myField: [
        { name: 'One', a: ['one'] },
        { name: 'Two', a: ['two'] },
        { name: 'X', a: ['x'] }
      ]
    }
    const initialValues = {
      myField: [{ name: 'One', a: ['one'] }, { name: 'Two', a: ['two'] }]
    }

    const newInitialValues = {
      myField: [
        { name: 'One', a: ['one'] },
        { name: 'Two', a: ['two'] },
        { name: 'Three', a: ['three'] }
      ]
    }

    const atoms = ['myField.(.)']

    const result = overwritePristineValuesDeep(
      values,
      initialValues,
      newInitialValues,
      atoms
    )

    expect(result.newValues).toEqual({
      myField: [
        { name: 'One', a: ['one'] },
        { name: 'Two', a: ['two'] },
        { name: 'X', a: ['x'] },
        { name: 'Three', a: ['three'] }
      ]
    })
  })

  it('should handle nested arrays part 2', () => {
    const values = {
      myField: [1, 2, 3, 4]
    }
    const initialValues = {
      myField: [1, 2, 3]
    }

    const newInitialValues = {
      myField: [1, 3]
    }

    // const atoms = ['myField']
    const atoms = []

    const result = overwritePristineValuesDeep(
      values,
      initialValues,
      newInitialValues,
      atoms
    )

    expect(result.newValues).toEqual({
      myField: [1, 3, 4]
    })
  })

  it('should handle nested arrays part 3', () => {
    const values = {
      myField: [1]
    }
    const initialValues = {
      myField: [1, 2, 3]
    }

    const newInitialValues = {
      myField: [1, 2, 3]
    }

    // const atoms = ['myField']
    const atoms = []

    const result = overwritePristineValuesDeep(
      values,
      initialValues,
      newInitialValues,
      atoms
    )

    expect(result.newValues).toEqual({
      myField: [1]
    })
  })

  it('should handle nested arrays part 4', () => {
    const values = {
      myField: []
    }
    const initialValues = {
      myField: [1, 2, 3]
    }

    const newInitialValues = {
      myField: [1, 2, 3]
    }

    // const atoms = ['myField']
    const atoms = []

    const result = overwritePristineValuesDeep(
      values,
      initialValues,
      newInitialValues,
      atoms
    )

    expect(result.newValues).toEqual({
      myField: []
    })
  })

  it('should bail out on atoms', () => {
    const initialValues = {
      something: {
        slateField: {
          stuff: {
            a: 'a',
            b: 'b'
          },
          moreStuff: ['a']
        },
        somethingNested: {
          stuff: {
            a: 'a',
            b: 'b'
          },
          moreStuff: ['a']
        }
      }
    }

    const newInitialValues = {
      something: {
        slateField: {
          stuff: {
            a: 'aNew',
            b: 'bNew'
          },
          moreStuff: ['a', 'new']
        },
        somethingNested: {
          stuff: {
            a: 'aNew',
            b: 'bNew'
          },
          moreStuff: ['a', 'new']
        }
      }
    }

    const values = {
      something: {
        slateField: {
          stuff: {
            a: 'a2',
            b: 'b'
          },
          moreStuff: ['a', 'a2']
        },
        somethingNested: {
          stuff: {
            a: 'a2',
            b: 'b'
          },
          moreStuff: ['a', 'a2']
        }
      }
    }

    const atoms = [/something\.slateField/]

    const result = overwritePristineValuesDeep(
      values,
      initialValues,
      newInitialValues,
      atoms
    )

    expect(result.newValues).toEqual({
      something: {
        slateField: {
          stuff: {
            a: 'a2',
            b: 'b'
          },
          moreStuff: ['a', 'a2']
        },
        somethingNested: {
          stuff: {
            a: 'a2',
            b: 'bNew'
          },
          moreStuff: ['a', 'a2', 'new']
        }
      }
    })
  })

  it('should bail out on atoms with placeholder paths', () => {
    const initialValues = {
      something: {
        abc: [
          {
            id: 1,
            slateField: {
              stuff: {
                a: 'a',
                b: 'b'
              },
              moreStuff: ['a']
            },
            somethingNested: {
              stuff: {
                a: 'a',
                b: 'b'
              },
              moreStuff: ['a']
            }
          }
        ]
      }
    }

    const newInitialValues = {
      something: {
        abc: [
          {
            id: 1,
            slateField: {
              stuff: {
                a: 'aNew',
                b: 'bNew'
              },
              moreStuff: ['a', 'new']
            },
            somethingNested: {
              stuff: {
                a: 'aNew',
                b: 'bNew'
              },
              moreStuff: ['a', 'new']
            }
          }
        ]
      }
    }

    const values = {
      something: {
        abc: [
          {
            id: 1,
            slateField: {
              stuff: {
                a: 'a2',
                b: 'b'
              },
              moreStuff: ['a', 'a2']
            },
            somethingNested: {
              stuff: {
                a: 'a2',
                b: 'b'
              },
              moreStuff: ['a', 'a2']
            }
          }
        ]
      }
    }

    const atoms = [/^something\.([^.]*)\.[^.]*.slateField$/]

    const result = overwritePristineValuesDeep(
      values,
      initialValues,
      newInitialValues,
      atoms
    )

    expect(result.newValues).toEqual({
      something: {
        abc: [
          {
            id: 1,
            slateField: {
              stuff: {
                a: 'a2',
                b: 'b'
              },
              moreStuff: ['a', 'a2']
            },
            somethingNested: {
              stuff: {
                a: 'a2',
                b: 'bNew'
              },
              moreStuff: ['a', 'a2', 'new']
            }
          }
        ]
      }
    })
  })
  // it('should NOT update dirty values with new values', () => {})

  // it('should update deeply nested pristine values with new values', () => {})

  // it('should add new values', () => {})

  // it('should remove old values if pristine', () => {})
})
