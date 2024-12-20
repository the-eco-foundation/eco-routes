import { compareSemverIntegerStrings } from '../utils'

describe('Utils Tests', () => {
  beforeAll(() => {
    console.log = jest.fn()
    console.error = jest.fn()
  })
  describe('on compareSemverIntegerStrings', () => {
    it('should return 1 if num1 is larger', () => {
      expect(compareSemverIntegerStrings('1', '0')).toEqual(1)
      expect(compareSemverIntegerStrings('2', '12')).toEqual(1)
      expect(compareSemverIntegerStrings('12', '11')).toEqual(1)
    })

    it('should return -1 if num1 is smaller', () => {
      expect(compareSemverIntegerStrings('2', '21')).toEqual(-1)
      expect(compareSemverIntegerStrings('23', '24')).toEqual(-1)
      expect(compareSemverIntegerStrings('1', '12')).toEqual(-1)
    })

    it('should return 0 if num1 is equal', () => {
      expect(compareSemverIntegerStrings('2', '2')).toEqual(0)
      expect(compareSemverIntegerStrings('23', '23')).toEqual(0)
      expect(compareSemverIntegerStrings('12', '12')).toEqual(0)
    })
  })
})
