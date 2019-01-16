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

  it('should merge two step arrays correctly', () => {
    const values = {
      placement: {
        0: {
          categories: [2, 5, 6]
        }
      }
    }

    const initialValues = {
      placement: {
        0: {
          categories: [2, 5]
        }
      }
    }

    const newInitialValues = undefined

    const result = overwritePristineValuesDeep(
      values,
      initialValues,
      newInitialValues
    )

    expect(result.newValues).toEqual({
      placement: {
        0: {
          categories: [6]
        }
      }
    })

    const values2 = result.newValues // 6

    const initialValues2 = newInitialValues // undefined

    const newInitialValues2 = initialValues // 2, 5

    const result2 = overwritePristineValuesDeep(
      values2,
      initialValues2,
      newInitialValues2
    )

    expect(result2.newValues).toEqual({
      placement: {
        0: {
          // categories: [2, 5, 6]
          // categories: [2, 5, 5]
          categories: [6]
        }
      }
    })
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

  it('should use new array if values are pristine', () => {
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

  it('should merge arrays identified by deepEqual comparison of items', () => {
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

  it('should not merge objects together if they are an atom', () => {
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

  it('should add and remove items from array at the same time', () => {
    const values = {
      myField: [1, 2, 3, 4]
    }
    const initialValues = {
      myField: [1, 2, 3]
    }

    const newInitialValues = {
      myField: [1, 3]
    }

    const result = overwritePristineValuesDeep(
      values,
      initialValues,
      newInitialValues
    )

    expect(result.newValues).toEqual({
      myField: [1, 3, 4]
    })
  })

  it('should remove simple items from array', () => {
    const values = {
      myField: [1]
    }
    const initialValues = {
      myField: [1, 2, 3]
    }

    const newInitialValues = {
      myField: [1, 2, 3]
    }

    const result = overwritePristineValuesDeep(
      values,
      initialValues,
      newInitialValues
    )

    expect(result.newValues).toEqual({
      myField: [1]
    })
  })

  it('should remove all items from the array without removing the array itself', () => {
    const values = {
      myField: []
    }
    const initialValues = {
      myField: [1, 2, 3]
    }

    const newInitialValues = {
      myField: [1, 2, 3]
    }

    const result = overwritePristineValuesDeep(
      values,
      initialValues,
      newInitialValues
    )

    expect(result.newValues).toEqual({
      myField: []
    })
  })

  it('should update and remove another object from array at the same time', () => {
    const values = {
      myField: [
        {
          id: 1,
          a: '1dirty',
          b: '1dirty'
        },
        {
          id: 2,
          a: '2',
          b: '2'
        },
        {
          id: 3,
          a: '3',
          b: '3'
        }
      ]
    }
    const initialValues = {
      myField: [
        {
          id: 1,
          a: '1',
          b: '1'
        },
        {
          id: 2,
          a: '2',
          b: '2'
        },
        {
          id: 3,
          a: '3',
          b: '3'
        }
      ]
    }

    const newInitialValues = {
      myField: [
        {
          id: 1,
          a: '1',
          b: '1'
        },
        {
          id: 3,
          a: '3',
          b: '3'
        }
      ]
    }

    const result = overwritePristineValuesDeep(
      values,
      initialValues,
      newInitialValues
    )

    expect(result.newValues).toEqual({
      myField: [
        {
          id: 1,
          a: '1dirty',
          b: '1dirty'
        },
        {
          id: 3,
          a: '3',
          b: '3'
        }
      ]
    })
  })

  it('should update and remove another object from array in a more complex case', () => {
    const values = {
      infobox: {
        0: [
          {
            identifier: 1,
            title: '1x',
            content: {
              a: '1x',
              b: '1'
            }
          },
          {
            identifier: 2,
            title: '2',
            content: {
              a: '2',
              b: '2'
            }
          },
          {
            identifier: 3,
            title: '3',
            content: {
              a: '3',
              b: '3'
            }
          }
        ]
      }
    }
    const initialValues = {
      infobox: {
        0: [
          {
            identifier: 1,
            title: '1',
            content: {
              a: '1',
              b: '1'
            }
          },
          {
            identifier: 2,
            title: '2',
            content: {
              a: '2',
              b: '2'
            }
          },
          {
            identifier: 3,
            title: '3',
            content: {
              a: '3',
              b: '3'
            }
          }
        ]
      }
    }

    const newInitialValues = {
      infobox: {
        0: [
          {
            identifier: 1,
            title: '1',
            content: {
              a: '1',
              b: '1'
            }
          },
          {
            identifier: 3,
            title: '3',
            content: {
              a: '3',
              b: '3'
            }
          }
        ]
      }
    }

    const atoms = [/^infobox\.([^.]*)\.[^.]*.content$/]

    const result = overwritePristineValuesDeep(
      values,
      initialValues,
      newInitialValues,
      atoms
    )

    expect(result.newValues).toEqual({
      infobox: {
        0: [
          {
            identifier: 1,
            title: '1x',
            content: {
              a: '1x',
              b: '1'
            }
          },
          {
            identifier: 3,
            title: '3',
            content: {
              a: '3',
              b: '3'
            }
          }
        ]
      }
    })
  })

  it('should update and remove another object from array in a different case', () => {
    const values = {
      infobox: {
        0: [
          {
            identifier: 1,
            title: '1',
            content: {
              a: '1',
              b: '1'
            }
          }
        ]
      }
    }
    const initialValues = {
      infobox: {
        0: [
          {
            identifier: 1,
            title: '1',
            content: {
              a: '1',
              b: '1'
            }
          },
          {
            identifier: 2,
            title: '2',
            content: {
              a: '2',
              b: '2'
            }
          }
        ]
      }
    }

    const newInitialValues = {
      infobox: {
        0: [
          {
            identifier: 1,
            title: '1x',
            content: {
              a: '1x',
              b: '1'
            }
          },
          {
            identifier: 2,
            title: '2',
            content: {
              a: '2',
              b: '2'
            }
          }
        ]
      }
    }

    const atoms = [/^infobox\.([^.]*)\.[^.]*$/]

    const result = overwritePristineValuesDeep(
      values,
      initialValues,
      newInitialValues,
      atoms
    )

    expect(result.newValues).toEqual({
      infobox: {
        0: [
          {
            identifier: 1,
            title: '1x',
            content: {
              a: '1x',
              b: '1'
            }
          }
        ]
      }
    })
  })

  it('should update and remove another object from array in a different case 2', () => {
    const values = {
      infobox: {
        0: [
          {
            identifier: 1,
            title: '1',
            content: {
              a: '1',
              b: '1'
            }
          }
        ]
      }
    }
    const initialValues = {
      infobox: {
        0: [
          {
            identifier: 1,
            title: '1',
            content: {
              a: '1',
              b: '1'
            }
          },
          {
            identifier: 2,
            title: '2',
            content: {
              a: '2',
              b: '2'
            }
          }
        ]
      }
    }

    const newInitialValues = {
      infobox: {
        0: [
          {
            identifier: 1,
            title: '1x',
            content: {
              a: '1x',
              b: '1'
            }
          },
          {
            identifier: 2,
            title: '2',
            content: {
              a: '2',
              b: '2'
            }
          }
        ]
      }
    }

    const atoms = [/^infobox\.([^.]*)\.[^.].content$/]

    const result = overwritePristineValuesDeep(
      values,
      initialValues,
      newInitialValues,
      atoms
    )

    expect(result.newValues).toEqual({
      infobox: {
        0: [
          {
            identifier: 1,
            title: '1x',
            content: {
              a: '1x',
              b: '1'
            }
          }
        ]
      }
    })
  })

  it('should update and reorder at the same time', () => {
    const values = {
      infobox: {
        0: [
          {
            id: 2,
            title: '2',
            content: {
              a: '2',
              b: '2'
            }
          },
          {
            id: 1,
            title: '1',
            content: {
              a: '1',
              b: '1'
            }
          }
        ]
      }
    }
    const initialValues = {
      infobox: {
        0: [
          {
            id: 1,
            title: '1',
            content: {
              a: '1',
              b: '1'
            }
          },
          {
            id: 2,
            title: '2',
            content: {
              a: '2',
              b: '2'
            }
          }
        ]
      }
    }

    const newInitialValues = {
      infobox: {
        0: [
          {
            id: 1,
            title: '1x',
            content: {
              a: '1x',
              b: '1'
            }
          },
          {
            id: 2,
            title: '2',
            content: {
              a: '2',
              b: '2'
            }
          }
        ]
      }
    }

    const atoms = [/^infobox\.([^.]*)\.[^.].content$/]

    const result = overwritePristineValuesDeep(
      values,
      initialValues,
      newInitialValues,
      atoms
    )

    expect(result.newValues).toEqual({
      infobox: {
        0: [
          {
            id: 2,
            title: '2',
            content: {
              a: '2',
              b: '2'
            }
          },
          {
            id: 1,
            title: '1x',
            content: {
              a: '1x',
              b: '1'
            }
          }
        ]
      }
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
})
