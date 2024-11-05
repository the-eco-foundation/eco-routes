import { Hex, zeroAddress } from "viem"

export function isZeroAddress(address: Hex): boolean {
  return address === zeroAddress
}