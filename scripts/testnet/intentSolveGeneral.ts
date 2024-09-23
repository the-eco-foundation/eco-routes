import { encodeTransfer } from '../../utils/encode'
import {
  BigNumberish,
  BytesLike,
  toQuantity,
  // AbiCoder,
  Block,
  Contract,
  Provider,
  encodeRlp,
  getAddress,
  getBytes,
  hexlify,
  // keccak256,
  solidityPackedKeccak256,
  stripZerosLeft,
  toBeArray,
  toNumber,
  zeroPadValue,
  toBeHex,
} from 'ethers'
import {
  networkIds,
  networks,
  actors,
  routes,
} from '../../config/testnet/config'
import { s } from '../../config/testnet/setup'

export async function intentSolve(route) {
  console.log(
    'In createIntent: ',
    networkIds[route.source.chainId],
    ' to ',
    networkIds[route.destination.chainId],
  )
  // const proverContract = s[`${sourceChain}ProverContract`] as Contract
  // Source Chain Contracts and Provider
  // @ts-ignore
  const sourceProvider = s[`${route.source.providerName}`] as Provider
  // @ts-ignore
  const intentSourceContract = s[
    `${route.source.contracts.intentSourceContract.variableName}`
  ] as Contract
  // @ts-ignore
  // const proverContract = s[
  //   `${route.source.contracts.proverContract.variableName}`
  // ] as Contract
  // // Destination Chain Contracts and Provider
  // // @ts-ignore
  // const destinationProvider = s[`${route.destination.providerName}`]
  // @ts-ignore
  const inboxContract = s[
    `${route.destination.contracts.inboxContract.variableName}`
  ] as Contract
  // Intent Specific contracts
  // @ts-ignore
  const rewardTokenContract = s[
    `${route.intent.contracts.rewardToken.variableName}`
  ] as Contract
  // @ts-ignore
  const targetTokenContract = s[
    `${route.intent.contracts.targetToken.variableName}`
  ] as Contract
  // approve lockup
  // const rewardToken = s.baseSepoliaUSDCContractIntentCreator
  const approvalTx = await rewardTokenContract.approve(
    route.source.contracts.intentSourceContract.address,
    route.intent.rewardAmounts[0],
  )
  await approvalTx.wait()

  // get the block before creating the intent
  const latestBlock = await sourceProvider.getBlock('latest')
  const latestBlockNumberHex = toQuantity(latestBlock.number)
  // create intent
  const data: BytesLike[] = [
    await encodeTransfer(actors.recipient, route.intent.targetAmounts[0]),
  ]
  const expiryTime: BigNumberish =
    latestBlock?.timestamp + route.intent.duration
  let intentHash
  // console.log('About to create intent')
  // console.log('route.destination.chainId: ', route.destination.chainId)
  // console.log(
  //   'route.destination.contracts.inboxContract.address: ',
  //   route.destination.contracts.inboxContract.address,
  // )
  // console.log(
  //   'route.intent.contracts.targetToken.address[0]: ',
  //   [route.intent.contracts.targetToken.address][0],
  // )
  // console.log('data: ', data)
  // console.log(
  //   'route.intent.contracts.rewardToken.address[0]: ',
  //   [route.intent.contracts.rewardToken.address][0],
  // )
  // console.log('route.intent.rewardAmounts[0]: ', route.intent.rewardAmounts[0])
  // console.log('expiryTime: ', expiryTime)
  // console.log(
  //   'route.source.contracts.proverContract.address: ',
  //   route.source.contracts.proverContract.address,
  // )
  try {
    const intentTx = await intentSourceContract.createIntent(
      route.destination.chainId, // desination chainId
      route.destination.contracts.inboxContract.address, // destination inbox address
      [route.intent.contracts.targetToken.address], // target Tokens
      data, // calldata for destination chain
      [route.intent.contracts.rewardToken.address], // reward Tokens on source chain
      route.intent.rewardAmounts, // reward amounts on source chain
      expiryTime, // intent expiry time
      route.source.contracts.proverContract.address, // prover contract address on the sourceChain
    )
    await intentTx.wait()

    // Get the event from the latest Block checking transaction hash
    const intentHashEvents = await intentSourceContract.queryFilter(
      intentSourceContract.getEvent('IntentCreated'),
      latestBlockNumberHex,
    )
    for (const intentHashEvent of intentHashEvents) {
      if (intentHashEvent.transactionHash === intentTx.hash) {
        intentHash = intentHashEvent.topics[1]
        break
      }
    }
    console.log('Created Intent Hash: ', intentHash)
    console.log('Intent Creation tx: ', intentTx.hash)
  } catch (e) {
    if (e.data && intentSourceContract) {
      const decodedError = intentSourceContract.interface.parseError(e.data)
      console.log(`Transaction failed in createIntent : ${decodedError?.name}`)
      console.log('createIntent decodedError: ', decodedError)
    } else {
      console.log(`Error in createIntent:`, e)
    }
  }
  // console.log('In fulfillIntent')
  try {
    // get intent Information
    const thisIntent = await intentSourceContract.getIntent(intentHash)

    // transfer the intent tokens to the Inbox Contract
    const fundTx = await targetTokenContract.transfer(
      route.destination.contracts.inboxContract.address,
      route.intent.targetAmounts[0],
    )
    await fundTx.wait()

    // fulfill the intent

    const fulfillTx = await inboxContract.fulfill(
      route.source.chainId, // source chainId
      thisIntent.targets.toArray(), // target  token addresses
      thisIntent.data.toArray(), // calldata
      thisIntent.expiryTime, // expiry time
      thisIntent.nonce, // nonce
      actors.claimant, // claimant
      intentHash, // expected intent hash
    )
    await fulfillTx.wait()
    console.log('Fulfillment tx: ', fulfillTx.hash)
    return fulfillTx.hash
  } catch (e) {
    console.log(e)
  }
}

async function main() {
  console.log('In Main')
  for (const route of routes) {
    // console.log('Route: ', route)
    await intentSolve(route)
  }
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
