import { DataHexString } from "ethers/lib.commonjs/utils/data"
import { ethers } from "hardhat"

export async function encodeTransfer(
  to: string,
  value: number,
): Promise<DataHexString> {
  // Contract ABIs
  const erc20ABI = ['function transfer(address to, uint256 value)']
  const abiInterface = new ethers.Interface(erc20ABI)
  const callData = abiInterface.encodeFunctionData('transfer', [to, value])
  return callData
}