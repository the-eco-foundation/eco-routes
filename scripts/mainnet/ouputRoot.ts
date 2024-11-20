import { AbiCoder, keccak256 } from 'ethers'

async function main() {
  // define the variables used for each state of the intent lifecycle
  try {
    console.log('hi')
    const abiCoder = AbiCoder.defaultAbiCoder()
    const outputRoot = keccak256(
      abiCoder.encode(
        ['uint256', 'bytes32', 'bytes32', 'bytes32'],
        [
          0n, // provingVersion
          '0x4abd731f7e8872df83733d2893661f4214e4de81d09074b13a288c43be2b8aee', // worldStateRoot
          '0x9d5dfa4db690e4a45d161448770706a7b8ae8ce6d8741c6e594e24e2e9064ecf', // messagePasserStateRoot
          '0xd01a8de96c07b0f92f3eb2ef15506eac10786f054dff87dc7b7b24a4463f1eda', // latestBlockHash
        ],
      ),
    )
    console.log('outputRoot', outputRoot)
  } catch (e) {
    console.log(e)
  }
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
