import {
  base,
  baseSepolia,
  mantle,
  mantleSepoliaTestnet,
  optimism,
  optimismSepolia,
  polygon,
} from 'viem/chains'
import { storageProverSupported } from '../utils'

describe('Utils Tests', () => {
  describe('on storageProverSupported', () => {
    it('should support all the chains it supports', () => {
      expect(storageProverSupported(base.id, 'Prover')).toBeTruthy()
      expect(storageProverSupported(baseSepolia.id, 'Prover')).toBeTruthy()
      expect(storageProverSupported(optimism.id, 'Prover')).toBeTruthy()
      expect(storageProverSupported(optimismSepolia.id, 'Prover')).toBeTruthy()
      expect(storageProverSupported(mantle.id, 'Prover')).toBeTruthy()
      expect(
        storageProverSupported(mantleSepoliaTestnet.id, 'Prover'),
      ).toBeTruthy()
    })

    it('should not support storage provers on unsupported chains', () => {
      expect(storageProverSupported(polygon.id, 'Prover')).toBeFalsy()
    })

    it('should support non-storage-provers on unsupported chains', () => {
      expect(storageProverSupported(polygon.id, 'Inbox')).toBeTruthy()
    })
  })
})
