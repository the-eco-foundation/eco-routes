import { encodeTransfer } from '../../utils/encode'
import { BigNumberish, BytesLike, toQuantity } from 'ethers'
import {
  networkIds,
  networks,
  actors,
  intent,
} from '../../config/testnet/config'
import { s } from '../../config/testnet/setup'

export async function baseSepoliaEcoTestNetIntentSolve() {
  console.log('In createIntent BaseSepoliaEcoTestNet')
  // approve lockup
  const rewardToken = s.baseSepoliaUSDCContractIntentCreator
  const approvalTx = await rewardToken.approve(
    networks.baseSepolia.intentSourceAddress,
    intent.rewardAmounts[0],
  )
  await approvalTx.wait()

  // get the block before creating the intent
  const latestBlock = await s.baseSepoliaProvider.getBlock('latest')
  const latestBlockNumberHex = toQuantity(latestBlock.number)
  // create intent
  const data: BytesLike[] = [
    await encodeTransfer(actors.recipient, intent.targetAmounts[0]),
  ]
  const expiryTime: BigNumberish = latestBlock?.timestamp + intent.duration
  let intentHash
  try {
    const intentTx =
      await s.baseSepoliaIntentSourceContractIntentCreator.createIntent(
        networkIds.ecoTestNet, // desination chainId
        networks.ecoTestNet.inboxAddress, // destination inbox address
        [networks.ecoTestNet.usdcAddress], // target Tokens
        data, // calldata for destination chain
        [networks.baseSepolia.usdcAddress], // reward Tokens on source chain
        intent.rewardAmounts, // reward amounts on source chain
        expiryTime, // intent expiry time
        networks.baseSepolia.proverContractAddress, // prover contract address on the sourceChain
      )
    await intentTx.wait()

    // Get the event from the latest Block checking transaction hash
    const intentHashEvents =
      await s.baseSepoliaIntentSourceContractIntentCreator.queryFilter(
        s.baseSepoliaIntentSourceContractIntentCreator.getEvent(
          'IntentCreated',
        ),
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
    if (e.data && s.baseSepoliaIntentSourceContractIntentCreator) {
      const decodedError =
        s.baseSepoliaIntentSourceContractIntentCreator.interface.parseError(
          e.data,
        )
      console.log(`Transaction failed in createIntent : ${decodedError?.name}`)
      console.log('createIntent decodedError: ', decodedError)
    } else {
      console.log(`Error in createIntent:`, e)
    }
  }
  // console.log('In fulfillIntent')
  try {
    // get intent Information
    const thisIntent =

    // transfer the intent tokens to the Inbox Contract
    const targetToken = s.ecoTestNetUSDCContractSolver
    const fundTx = await targetToken.transfer(
      networks.ecoTestNet.inboxAddress,
      intent.targetAmounts[0],
    )
    await fundTx.wait()

    // fulfill the intent

    const fulfillTx = await s.ecoTestNetInboxContractSolver.fulfillStorage(
      networkIds.baseSepolia, // source chainId
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

export async function ecoTestNetBaseSepoliaIntentSolve() {
  console.log('In createIntent EcoTestNetBaseSepolia')
  // approve lockup
  const rewardToken = s.ecoTestNetUSDCContractIntentCreator
  const approvalTx = await rewardToken.approve(
    networks.ecoTestNet.intentSourceAddress,
    intent.rewardAmounts[0],
  )
  await approvalTx.wait()

  // get the block before creating the intent
  const latestBlock = await s.ecoTestNetProvider.getBlock('latest')
  const latestBlockNumberHex = toQuantity(latestBlock.number)
  // create intent
  const data: BytesLike[] = [
    await encodeTransfer(actors.recipient, intent.targetAmounts[0]),
  ]
  const expiryTime: BigNumberish = latestBlock?.timestamp + intent.duration
  let intentHash
  try {
    const intentTx =
      await s.ecoTestNetIntentSourceContractIntentCreator.createIntent(
        networkIds.baseSepolia, // desination chainId
        networks.baseSepolia.inboxAddress, // destination inbox address
        [networks.baseSepolia.usdcAddress], // target Tokens
        data, // calldata for destination chain
        [networks.ecoTestNet.usdcAddress], // reward Tokens on source chain
        intent.rewardAmounts, // reward amounts on source chain
        expiryTime, // intent expiry time
        networks.ecoTestNet.proverContractAddress, // prover contract address on the sourceChain
      )
    await intentTx.wait()

    // Get the event from the latest Block checking transaction hash
    const intentHashEvents =
      await s.ecoTestNetIntentSourceContractIntentCreator.queryFilter(
        s.ecoTestNetIntentSourceContractIntentCreator.getEvent('IntentCreated'),
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
    if (e.data && s.ecoTestNetIntentSourceContractIntentCreator) {
      const decodedError =
        s.ecoTestNetIntentSourceContractIntentCreator.interface.parseError(
          e.data,
        )
      console.log(`Transaction failed in createIntent : ${decodedError?.name}`)
      console.log('createIntent decodedError: ', decodedError)
    } else {
      console.log(`Error in createIntent:`, e)
    }
  }
  // console.log('In fulfillIntent')
  try {
    // get intent Information
    const thisIntent =
      await s.ecoTestNetIntentSourceContractIntentCreator.getIntent(intentHash)

    // transfer the intent tokens to the Inbox Contract
    const targetToken = s.baseSepoliaUSDCContractSolver
    const fundTx = await targetToken.transfer(
      networks.baseSepolia.inboxAddress,
      intent.targetAmounts[0],
    )
    await fundTx.wait()

    // fulfill the intent

    const fulfillTx = await s.baseSepoliaInboxContractSolver.fulfillStorage(
      networkIds.ecoTestNet, // source chainId
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

export async function baseSepoliaOptimismSepoliaIntentSolve() {
  console.log('In createIntent BaseSepoliaOptimismSepolia')
  // approve lockup
  const rewardToken = s.baseSepoliaUSDCContractIntentCreator
  const approvalTx = await rewardToken.approve(
    networks.baseSepolia.intentSourceAddress,
    intent.rewardAmounts[0],
  )
  await approvalTx.wait()

  // get the block before creating the intent
  const latestBlock = await s.baseSepoliaProvider.getBlock('latest')
  const latestBlockNumberHex = toQuantity(latestBlock.number)
  // create intent
  const data: BytesLike[] = [
    await encodeTransfer(actors.recipient, intent.targetAmounts[0]),
  ]
  const expiryTime: BigNumberish = latestBlock?.timestamp + intent.duration
  let intentHash
  try {
    const intentTx =
      await s.baseSepoliaIntentSourceContractIntentCreator.createIntent(
        networkIds.optimismSepolia, // desination chainId
        networks.optimismSepolia.inboxAddress, // destination inbox address
        [networks.optimismSepolia.usdcAddress], // target Tokens
        data, // calldata for destination chain
        [networks.baseSepolia.usdcAddress], // reward Tokens on source chain
        intent.rewardAmounts, // reward amounts on source chain
        expiryTime, // intent expiry time
        networks.baseSepolia.proverContractAddress, // prover contract address on the sourceChain
      )
    await intentTx.wait()

    // Get the event from the latest Block checking transaction hash
    const intentHashEvents =
      await s.baseSepoliaIntentSourceContractIntentCreator.queryFilter(
        s.baseSepoliaIntentSourceContractIntentCreator.getEvent(
          'IntentCreated',
        ),
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
    if (e.data && s.baseSepoliaIntentSourceContractIntentCreator) {
      const decodedError =
        s.baseSepoliaIntentSourceContractIntentCreator.interface.parseError(
          e.data,
        )
      console.log(`Transaction failed in createIntent : ${decodedError?.name}`)
      console.log('createIntent decodedError: ', decodedError)
    } else {
      console.log(`Error in createIntent:`, e)
    }
  }
  // console.log('In fulfillIntent')
  try {
    // get intent Information
    const thisIntent =
      await s.baseSepoliaIntentSourceContractIntentCreator.getIntent(intentHash)

    // transfer the intent tokens to the Inbox Contract
    const targetToken = s.optimismSepoliaUSDCContractSolver
    const fundTx = await targetToken.transfer(
      networks.optimismSepolia.inboxAddress,
      intent.targetAmounts[0],
    )
    await fundTx.wait()

    // fulfill the intent

    const fulfillTx = await s.optimismSepoliaInboxContractSolver.fulfillStorage(
      networkIds.baseSepolia, // source chainId
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

export async function optimismSepoliaBaseSepoliaIntentSolve() {
  console.log('In createIntent OptimismSepoliaBaseSepolia')
  // approve lockup
  const rewardToken = s.optimismSepoliaUSDCContractIntentCreator
  const approvalTx = await rewardToken.approve(
    networks.optimismSepolia.intentSourceAddress,
    intent.rewardAmounts[0],
  )
  await approvalTx.wait()

  // get the block before creating the intent
  const latestBlock = await s.optimismSepoliaProvider.getBlock('latest')
  const latestBlockNumberHex = toQuantity(latestBlock.number)
  // create intent
  const data: BytesLike[] = [
    await encodeTransfer(actors.recipient, intent.targetAmounts[0]),
  ]
  const expiryTime: BigNumberish = latestBlock?.timestamp + intent.duration
  let intentHash
  try {
    const intentTx =
      await s.optimismSepoliaIntentSourceContractIntentCreator.createIntent(
        networkIds.baseSepolia, // desination chainId
        networks.baseSepolia.inboxAddress, // destination inbox address
        [networks.baseSepolia.usdcAddress], // target Tokens
        data, // calldata for destination chain
        [networks.optimismSepolia.usdcAddress], // reward Tokens on source chain
        intent.rewardAmounts, // reward amounts on source chain
        expiryTime, // intent expiry time
        networks.optimismSepolia.proverContractAddress, // prover contract address on the sourceChain
      )
    await intentTx.wait()

    // Get the event from the latest Block checking transaction hash
    const intentHashEvents =
      await s.optimismSepoliaIntentSourceContractIntentCreator.queryFilter(
        s.optimismSepoliaIntentSourceContractIntentCreator.getEvent(
          'IntentCreated',
        ),
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
    if (e.data && s.optimismSepoliaIntentSourceContractIntentCreator) {
      const decodedError =
        s.optimismSepoliaIntentSourceContractIntentCreator.interface.parseError(
          e.data,
        )
      console.log(`Transaction failed in createIntent : ${decodedError?.name}`)
      console.log('createIntent decodedError: ', decodedError)
    } else {
      console.log(`Error in createIntent:`, e)
    }
  }
  // console.log('In fulfillIntent')
  try {
    // get intent Information
    const thisIntent =
      await s.optimismSepoliaIntentSourceContractIntentCreator.getIntent(
        intentHash,
      )

    // transfer the intent tokens to the Inbox Contract
    const targetToken = s.baseSepoliaUSDCContractSolver
    const fundTx = await targetToken.transfer(
      networks.baseSepolia.inboxAddress,
      intent.targetAmounts[0],
    )
    await fundTx.wait()

    // fulfill the intent

    const fulfillTx = await s.baseSepoliaInboxContractSolver.fulfillStorage(
      networkIds.optimismSepolia, // source chainId
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

export async function optimismSepoliaEcoTestNetIntentSolve() {
  console.log('In createIntent OptimismSepoliaEcoTestNet')
  // approve lockup
  const rewardToken = s.optimismSepoliaUSDCContractIntentCreator
  const approvalTx = await rewardToken.approve(
    networks.optimismSepolia.intentSourceAddress,
    intent.rewardAmounts[0],
  )
  await approvalTx.wait()

  // get the block before creating the intent
  const latestBlock = await s.optimismSepoliaProvider.getBlock('latest')
  const latestBlockNumberHex = toQuantity(latestBlock.number)
  // create intent
  const data: BytesLike[] = [
    await encodeTransfer(actors.recipient, intent.targetAmounts[0]),
  ]
  const expiryTime: BigNumberish = latestBlock?.timestamp + intent.duration
  let intentHash
  try {
    const intentTx =
      await s.optimismSepoliaIntentSourceContractIntentCreator.createIntent(
        networkIds.ecoTestNet, // desination chainId
        networks.ecoTestNet.inboxAddress, // destination inbox address
        [networks.ecoTestNet.usdcAddress], // target Tokens
        data, // calldata for destination chain
        [networks.optimismSepolia.usdcAddress], // reward Tokens on source chain
        intent.rewardAmounts, // reward amounts on source chain
        expiryTime, // intent expiry time
        networks.optimismSepolia.proverContractAddress, // prover contract address on the sourceChain
      )
    await intentTx.wait()

    // Get the event from the latest Block checking transaction hash
    const intentHashEvents =
      await s.optimismSepoliaIntentSourceContractIntentCreator.queryFilter(
        s.optimismSepoliaIntentSourceContractIntentCreator.getEvent(
          'IntentCreated',
        ),
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
    if (e.data && s.optimismSepoliaIntentSourceContractIntentCreator) {
      const decodedError =
        s.optimismSepoliaIntentSourceContractIntentCreator.interface.parseError(
          e.data,
        )
      console.log(`Transaction failed in createIntent : ${decodedError?.name}`)
      console.log('createIntent decodedError: ', decodedError)
    } else {
      console.log(`Error in createIntent:`, e)
    }
  }
  // console.log('In fulfillIntent')
  try {
    // get intent Information
    const thisIntent =
      await s.optimismSepoliaIntentSourceContractIntentCreator.getIntent(
        intentHash,
      )

    // transfer the intent tokens to the Inbox Contract
    const targetToken = s.ecoTestNetUSDCContractSolver
    const fundTx = await targetToken.transfer(
      networks.ecoTestNet.inboxAddress,
      intent.targetAmounts[0],
    )
    await fundTx.wait()

    // fulfill the intent

    const fulfillTx = await s.ecoTestNetInboxContractSolver.fulfillStorage(
      networkIds.optimismSepolia, // source chainId
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

export async function ecoTestNetOptimismSepoliaIntentSolve() {
  console.log('In createIntent ecoTestNetOptimismSepolia')
  // approve lockup
  const rewardToken = s.ecoTestNetUSDCContractIntentCreator
  const approvalTx = await rewardToken.approve(
    networks.ecoTestNet.intentSourceAddress,
    intent.rewardAmounts[0],
  )
  await approvalTx.wait()

  // get the block before creating the intent
  const latestBlock = await s.ecoTestNetProvider.getBlock('latest')
  const latestBlockNumberHex = toQuantity(latestBlock.number)
  // create intent
  const data: BytesLike[] = [
    await encodeTransfer(actors.recipient, intent.targetAmounts[0]),
  ]
  const expiryTime: BigNumberish = latestBlock?.timestamp + intent.duration
  let intentHash
  try {
    const intentTx =
      await s.ecoTestNetIntentSourceContractIntentCreator.createIntent(
        networkIds.optimismSepolia, // desination chainId
        networks.optimismSepolia.inboxAddress, // destination inbox address
        [networks.optimismSepolia.usdcAddress], // target Tokens
        data, // calldata for destination chain
        [networks.ecoTestNet.usdcAddress], // reward Tokens on source chain
        intent.rewardAmounts, // reward amounts on source chain
        expiryTime, // intent expiry time
        networks.ecoTestNet.proverContractAddress, // prover contract address on the sourceChain
      )
    await intentTx.wait()

    // Get the event from the latest Block checking transaction hash
    const intentHashEvents =
      await s.ecoTestNetIntentSourceContractIntentCreator.queryFilter(
        s.ecoTestNetIntentSourceContractIntentCreator.getEvent('IntentCreated'),
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
    if (e.data && s.ecoTestNetIntentSourceContractIntentCreator) {
      const decodedError =
        s.ecoTestNetIntentSourceContractIntentCreator.interface.parseError(
          e.data,
        )
      console.log(`Transaction failed in createIntent : ${decodedError?.name}`)
      console.log('createIntent decodedError: ', decodedError)
    } else {
      console.log(`Error in createIntent:`, e)
    }
  }
  // console.log('In fulfillIntent')
  try {
    // get intent Information
    const thisIntent =
      await s.ecoTestNetIntentSourceContractIntentCreator.getIntent(intentHash)

    // transfer the intent tokens to the Inbox Contract
    const targetToken = s.optimismSepoliaUSDCContractSolver
    const fundTx = await targetToken.transfer(
      networks.optimismSepolia.inboxAddress,
      intent.targetAmounts[0],
    )
    await fundTx.wait()

    // fulfill the intent

    const fulfillTx = await s.optimismSepoliaInboxContractSolver.fulfillStorage(
      networkIds.ecoTestNet, // source chainId
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

export async function baseSepoliaOptimismSepoliaIntentSolveHyperproveInstant() {
  console.log('In createIntent BaseSepoliaOptimismSepolia')
  // approve lockup
  const rewardToken = s.baseSepoliaUSDCContractIntentCreator
  const approvalTx = await rewardToken.approve(
    networks.baseSepolia.intentSourceAddress,
    intent.rewardAmounts[0],
  )
  await approvalTx.wait()

  // get the block before creating the intent
  const latestBlock = await s.baseSepoliaProvider.getBlock('latest')
  const latestBlockNumberHex = toQuantity(latestBlock.number)
  // create intent
  const data: BytesLike[] = [
    await encodeTransfer(actors.recipient, intent.targetAmounts[0]),
  ]
  const expiryTime: BigNumberish = latestBlock?.timestamp + intent.duration
  let intentHash
  try {
    const intentTx =
      await s.baseSepoliaIntentSourceContractIntentCreator.createIntent(
        networkIds.optimismSepolia, // desination chainId
        networks.optimismSepolia.inboxAddress, // destination inbox address
        [networks.optimismSepolia.usdcAddress], // target Tokens
        data, // calldata for destination chain
        [networks.baseSepolia.usdcAddress], // reward Tokens on source chain
        intent.rewardAmounts, // reward amounts on source chain
        expiryTime, // intent expiry time
        networks.baseSepolia.hyperproverContractAddress, // prover contract address on the sourceChain
      )
    await intentTx.wait()

    // Get the event from the latest Block checking transaction hash
    const intentHashEvents =
      await s.baseSepoliaIntentSourceContractIntentCreator.queryFilter(
        s.baseSepoliaIntentSourceContractIntentCreator.getEvent(
          'IntentCreated',
        ),
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
    if (e.data && s.baseSepoliaIntentSourceContractIntentCreator) {
      const decodedError =
        s.baseSepoliaIntentSourceContractIntentCreator.interface.parseError(
          e.data,
        )
      console.log(`Transaction failed in createIntent : ${decodedError?.name}`)
      console.log('createIntent decodedError: ', decodedError)
    } else {
      console.log(`Error in createIntent:`, e)
    }
  }
  // console.log('In fulfillIntent')
  try {
    // get intent Information
    const thisIntent =
      await s.baseSepoliaIntentSourceContractIntentCreator.getIntent(intentHash)

    // transfer the intent tokens to the Inbox Contract
    const targetToken = s.optimismSepoliaUSDCContractSolver
    const fundTx = await targetToken.transfer(
      networks.optimismSepolia.inboxAddress,
      intent.targetAmounts[0],
    )
    await fundTx.wait()

    // fulfill the intent

    const fulfillTx =
      await s.optimismSepoliaInboxContractSolver.fulfillHyperInstant(
        networkIds.baseSepolia, // source chainId
        thisIntent.targets.toArray(), // target  token addresses
        thisIntent.data.toArray(), // calldata
        thisIntent.expiryTime, // expiry time
        thisIntent.nonce, // nonce
        actors.claimant, // claimant
        intentHash, // expected intent hash
        networks.baseSepolia.hyperproverContractAddress, // hyperprover contract address
      )
    await fulfillTx.wait()
    console.log('Fulfillment tx: ', fulfillTx.hash)
    return fulfillTx.hash
  } catch (e) {
    console.log(e)
  }
}

// export async function optimismSepoliaBaseSepoliaIntentSolveHyperproveInstant() {
//   console.log('In createIntent OptimismSepoliaBaseSepolia')
//   // approve lockup
//   const rewardToken = s.optimismSepoliaUSDCContractIntentCreator
//   const approvalTx = await rewardToken.approve(
//     networks.optimismSepolia.intentSourceAddress,
//     intent.rewardAmounts[0],
//   )
//   await approvalTx.wait()

//   // get the block before creating the intent
//   const latestBlock = await s.optimismSepoliaProvider.getBlock('latest')
//   const latestBlockNumberHex = toQuantity(latestBlock.number)
//   // create intent
//   const data: BytesLike[] = [
//     await encodeTransfer(actors.recipient, intent.targetAmounts[0]),
//   ]
//   const expiryTime: BigNumberish = latestBlock?.timestamp + intent.duration
//   let intentHash
//   try {
//     const intentTx =
//       await s.optimismSepoliaIntentSourceContractIntentCreator.createIntent(
//         networkIds.baseSepolia, // desination chainId
//         networks.baseSepolia.inboxAddress, // destination inbox address
//         [networks.baseSepolia.usdcAddress], // target Tokens
//         data, // calldata for destination chain
//         [networks.optimismSepolia.usdcAddress], // reward Tokens on source chain
//         intent.rewardAmounts, // reward amounts on source chain
//         expiryTime, // intent expiry time
//         networks.optimismSepolia.proverContractAddress, // prover contract address on the sourceChain
//       )
//     await intentTx.wait()

//     // Get the event from the latest Block checking transaction hash
//     const intentHashEvents =
//       await s.optimismSepoliaIntentSourceContractIntentCreator.queryFilter(
//         s.optimismSepoliaIntentSourceContractIntentCreator.getEvent(
//           'IntentCreated',
//         ),
//         latestBlockNumberHex,
//       )
//     for (const intentHashEvent of intentHashEvents) {
//       if (intentHashEvent.transactionHash === intentTx.hash) {
//         intentHash = intentHashEvent.topics[1]
//         break
//       }
//     }
//     console.log('Created Intent Hash: ', intentHash)
//     console.log('Intent Creation tx: ', intentTx.hash)
//   } catch (e) {
//     if (e.data && s.optimismSepoliaIntentSourceContractIntentCreator) {
//       const decodedError =
//         s.optimismSepoliaIntentSourceContractIntentCreator.interface.parseError(
//           e.data,
//         )
//       console.log(`Transaction failed in createIntent : ${decodedError?.name}`)
//       console.log('createIntent decodedError: ', decodedError)
//     } else {
//       console.log(`Error in createIntent:`, e)
//     }
//   }
//   // console.log('In fulfillIntent')
//   try {
//     // get intent Information
//     const thisIntent =
//       await s.optimismSepoliaIntentSourceContractIntentCreator.getIntent(
//         intentHash,
//       )

//     // transfer the intent tokens to the Inbox Contract
//     const targetToken = s.baseSepoliaUSDCContractSolver
//     const fundTx = await targetToken.transfer(
//       networks.baseSepolia.inboxAddress,
//       intent.targetAmounts[0],
//     )
//     await fundTx.wait()

//     // fulfill the intent

//     const fulfillTx = await s.baseSepoliaInboxContractSolver.fulfillStorage(
//       networkIds.optimismSepolia, // source chainId
//       thisIntent.targets.toArray(), // target  token addresses
//       thisIntent.data.toArray(), // calldata
//       thisIntent.expiryTime, // expiry time
//       thisIntent.nonce, // nonce
//       actors.claimant, // claimant
//       intentHash, // expected intent hash
//     )
//     await fulfillTx.wait()
//     console.log('Fulfillment tx: ', fulfillTx.hash)
//     return fulfillTx.hash
//   } catch (e) {
//     console.log(e)
//   }
// }

export async function baseSepoliaOptimismSepoliaIntentSolveHyperproveBatched() {
  console.log('In createIntent BaseSepoliaOptimismSepolia')
  // approve lockup
  const rewardToken = s.baseSepoliaUSDCContractIntentCreator
  const approvalTx = await rewardToken.approve(
    networks.baseSepolia.intentSourceAddress,
    intent.rewardAmounts[0] * 2,
  )
  await approvalTx.wait()

  // get the block before creating the intent
  const latestBlock = await s.baseSepoliaProvider.getBlock('latest')
  const latestBlockNumberHex = toQuantity(latestBlock.number)
  // create intent
  const data: BytesLike[] = [
    await encodeTransfer(actors.recipient, intent.targetAmounts[0]),
  ]
  const expiryTime: BigNumberish = latestBlock?.timestamp + intent.duration
  let intentHash
  let intentHash2
  try {
    const intentTx =
      await s.baseSepoliaIntentSourceContractIntentCreator.createIntent(
        networkIds.optimismSepolia, // desination chainId
        networks.optimismSepolia.inboxAddress, // destination inbox address
        [networks.optimismSepolia.usdcAddress], // target Tokens
        data, // calldata for destination chain
        [networks.baseSepolia.usdcAddress], // reward Tokens on source chain
        intent.rewardAmounts, // reward amounts on source chain
        expiryTime, // intent expiry time
        networks.baseSepolia.hyperproverContractAddress, // prover contract address on the sourceChain
      )
    await intentTx.wait()

    // second intent tx for batch
    const intentTx2 =
      await s.baseSepoliaIntentSourceContractIntentCreator.createIntent(
        networkIds.optimismSepolia, // desination chainId
        networks.optimismSepolia.inboxAddress, // destination inbox address
        [networks.optimismSepolia.usdcAddress], // target Tokens
        data, // calldata for destination chain
        [networks.baseSepolia.usdcAddress], // reward Tokens on source chain
        intent.rewardAmounts, // reward amounts on source chain
        expiryTime, // intent expiry time
        networks.baseSepolia.hyperproverContractAddress, // prover contract address on the sourceChain
      )
    await intentTx2.wait()

    // Get the event from the latest Block checking transaction hash
    const intentHashEvents =
      await s.baseSepoliaIntentSourceContractIntentCreator.queryFilter(
        s.baseSepoliaIntentSourceContractIntentCreator.getEvent(
          'IntentCreated',
        ),
        latestBlockNumberHex,
      )
    for (const intentHashEvent of intentHashEvents) {
      if (intentHashEvent.transactionHash === intentTx.hash) {
        intentHash = intentHashEvent.topics[1]
        break
      }
    }
    console.log('Created Intent Hash1: ', intentHash)
    console.log('Intent Creation tx1: ', intentTx.hash)

    for (const intentHashEvent of intentHashEvents) {
      if (intentHashEvent.transactionHash === intentTx2.hash) {
        intentHash2 = intentHashEvent.topics[1]
        break
      }
    }
    console.log('Created Intent Hash2: ', intentHash2)
    console.log('Intent Creation tx2: ', intentTx2.hash)
  } catch (e) {
    if (e.data && s.baseSepoliaIntentSourceContractIntentCreator) {
      const decodedError =
        s.baseSepoliaIntentSourceContractIntentCreator.interface.parseError(
          e.data,
        )
      console.log(`Transaction failed in createIntent : ${decodedError?.name}`)
      console.log('createIntent decodedError: ', decodedError)
    } else {
      console.log(`Error in createIntent:`, e)
    }
  }
  // console.log('In fulfillIntent')
  try {
    // get intent Information
    const thisIntent =
      await s.baseSepoliaIntentSourceContractIntentCreator.getIntent(intentHash)

    // transfer the intent tokens to the Inbox Contract
    const targetToken = s.optimismSepoliaUSDCContractSolver
    const fundTx = await targetToken.transfer(
      networks.optimismSepolia.inboxAddress,
      intent.targetAmounts[0],
    )
    await fundTx.wait()

    // fulfill intent1 batch

    const fulfillTx =
      await s.optimismSepoliaInboxContractSolver.fulfillHyperBatched(
        networkIds.baseSepolia, // source chainId
        thisIntent.targets.toArray(), // target  token addresses
        thisIntent.data.toArray(), // calldata
        thisIntent.expiryTime, // expiry time
        thisIntent.nonce, // nonce
        actors.claimant, // claimant
        intentHash, // expected intent hash
        networks.baseSepolia.hyperproverContractAddress, // hyperprover contract address
      )
    await fulfillTx.wait()
    console.log('Fulfillment tx: ', fulfillTx.hash)

    // fulfill intent2 batch

    const fulfillTx2 =
      await s.optimismSepoliaInboxContractSolver.fulfillHyperBatched(
        networkIds.baseSepolia, // source chainId
        thisIntent.targets.toArray(), // target  token addresses
        thisIntent.data.toArray(), // calldata
        thisIntent.expiryTime, // expiry time
        thisIntent.nonce, // nonce
        actors.claimant, // claimant
        intentHash2, // expected intent hash
        networks.baseSepolia.hyperproverContractAddress, // hyperprover contract address
      )
    await fulfillTx2.wait()
    console.log('Fulfillment tx2: ', fulfillTx2.hash)

    //send batch

    const sendBatchTx = await s.optimismSepoliaInboxContractSolver.sendBatch(
      networkIds.baseSepolia, // source chainId
      networks.baseSepolia.hyperproverContractAddress, // hyperprover contract address
      [intentHash, intentHash2], // txHashes
    )
    await sendBatchTx.wait()
    console.log('SendBatch tx: ', sendBatchTx.hash)
    return sendBatchTx.hash

  } catch (e) {
    console.log(e)
  }
}

// export async function optimismSepoliaBaseSepoliaIntentSolveHyperproveBatched() {
//   console.log('In createIntent OptimismSepoliaBaseSepolia')
//   // approve lockup
//   const rewardToken = s.optimismSepoliaUSDCContractIntentCreator
//   const approvalTx = await rewardToken.approve(
//     networks.optimismSepolia.intentSourceAddress,
//     intent.rewardAmounts[0],
//   )
//   await approvalTx.wait()

//   // get the block before creating the intent
//   const latestBlock = await s.optimismSepoliaProvider.getBlock('latest')
//   const latestBlockNumberHex = toQuantity(latestBlock.number)
//   // create intent
//   const data: BytesLike[] = [
//     await encodeTransfer(actors.recipient, intent.targetAmounts[0]),
//   ]
//   const expiryTime: BigNumberish = latestBlock?.timestamp + intent.duration
//   let intentHash
//   try {
//     const intentTx =
//       await s.optimismSepoliaIntentSourceContractIntentCreator.createIntent(
//         networkIds.baseSepolia, // desination chainId
//         networks.baseSepolia.inboxAddress, // destination inbox address
//         [networks.baseSepolia.usdcAddress], // target Tokens
//         data, // calldata for destination chain
//         [networks.optimismSepolia.usdcAddress], // reward Tokens on source chain
//         intent.rewardAmounts, // reward amounts on source chain
//         expiryTime, // intent expiry time
//         networks.optimismSepolia.proverContractAddress, // prover contract address on the sourceChain
//       )
//     await intentTx.wait()

//     // Get the event from the latest Block checking transaction hash
//     const intentHashEvents =
//       await s.optimismSepoliaIntentSourceContractIntentCreator.queryFilter(
//         s.optimismSepoliaIntentSourceContractIntentCreator.getEvent(
//           'IntentCreated',
//         ),
//         latestBlockNumberHex,
//       )
//     for (const intentHashEvent of intentHashEvents) {
//       if (intentHashEvent.transactionHash === intentTx.hash) {
//         intentHash = intentHashEvent.topics[1]
//         break
//       }
//     }
//     console.log('Created Intent Hash: ', intentHash)
//     console.log('Intent Creation tx: ', intentTx.hash)
//   } catch (e) {
//     if (e.data && s.optimismSepoliaIntentSourceContractIntentCreator) {
//       const decodedError =
//         s.optimismSepoliaIntentSourceContractIntentCreator.interface.parseError(
//           e.data,
//         )
//       console.log(`Transaction failed in createIntent : ${decodedError?.name}`)
//       console.log('createIntent decodedError: ', decodedError)
//     } else {
//       console.log(`Error in createIntent:`, e)
//     }
//   }
//   // console.log('In fulfillIntent')
//   try {
//     // get intent Information
//     const thisIntent =
//       await s.optimismSepoliaIntentSourceContractIntentCreator.getIntent(
//         intentHash,
//       )

//     // transfer the intent tokens to the Inbox Contract
//     const targetToken = s.baseSepoliaUSDCContractSolver
//     const fundTx = await targetToken.transfer(
//       networks.baseSepolia.inboxAddress,
//       intent.targetAmounts[0],
//     )
//     await fundTx.wait()

//     // fulfill the intent

//     const fulfillTx =
//       await s.baseSepoliaInboxContractSolver.fulfillHyperBatched(
//         networkIds.optimismSepolia, // source chainId
//         thisIntent.targets.toArray(), // target  token addresses
//         thisIntent.data.toArray(), // calldata
//         thisIntent.expiryTime, // expiry time
//         thisIntent.nonce, // nonce
//         actors.claimant, // claimant
//         intentHash, // expected intent hash
//       )
//     await fulfillTx.wait()
//     console.log('Fulfillment tx: ', fulfillTx.hash)
//     return fulfillTx.hash
//   } catch (e) {
//     console.log(e)
//   }
// }
async function main() {
  // define the variables used for each state of the intent lifecycle
  try {
    console.log('In Main')
    await baseSepoliaEcoTestNetIntentSolve()
    await ecoTestNetBaseSepoliaIntentSolve()
    await baseSepoliaOptimismSepoliaIntentSolve()
    await optimismSepoliaBaseSepoliaIntentSolve()
    await optimismSepoliaEcoTestNetIntentSolve()
    await ecoTestNetOptimismSepoliaIntentSolve()
    await baseSepoliaOptimismSepoliaIntentSolveHyperproveInstant()
    // await optimismSepoliaBaseSepoliaIntentSolveHyperproveInstant()
    await baseSepoliaOptimismSepoliaIntentSolveHyperproveBatched()
    // await optimismSepoliaBaseSepoliaIntentSolveHyperproveBatched()
  } catch (e) {
    console.log(e)
  }
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
