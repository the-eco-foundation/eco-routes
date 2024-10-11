import { encodeTransfer } from '../../utils/encode'
import {
  AbiCoder,
  BigNumberish,
  BytesLike,
  toQuantity,
  zeroPadValue,
} from 'ethers'
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
        networkIds.ecoTestnet, // desination chainId
        networks.ecoTestnet.inboxAddress, // destination inbox address
        [networks.ecoTestnet.usdcAddress], // target Tokens
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
    const targetToken = s.ecoTestnetUSDCContractSolver
    const fundTx = await targetToken.transfer(
      networks.ecoTestnet.inboxAddress,
      intent.targetAmounts[0],
    )
    await fundTx.wait()

    // fulfill the intent

    const fulfillTx = await s.ecoTestnetInboxContractSolver.fulfillStorage(
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

export async function ecoTestnetBaseSepoliaIntentSolve() {
  console.log('In createIntent EcoTestNetBaseSepolia')
  // approve lockup
  const rewardToken = s.ecoTestnetUSDCContractIntentCreator
  const approvalTx = await rewardToken.approve(
    networks.ecoTestnet.intentSourceAddress,
    intent.rewardAmounts[0],
  )
  await approvalTx.wait()

  // get the block before creating the intent
  const latestBlock = await s.ecoTestnetProvider.getBlock('latest')
  const latestBlockNumberHex = toQuantity(latestBlock.number)
  // create intent
  const data: BytesLike[] = [
    await encodeTransfer(actors.recipient, intent.targetAmounts[0]),
  ]
  const expiryTime: BigNumberish = latestBlock?.timestamp + intent.duration
  let intentHash
  try {
    const intentTx =
      await s.ecoTestnetIntentSourceContractIntentCreator.createIntent(
        networkIds.baseSepolia, // desination chainId
        networks.baseSepolia.inboxAddress, // destination inbox address
        [networks.baseSepolia.usdcAddress], // target Tokens
        data, // calldata for destination chain
        [networks.ecoTestnet.usdcAddress], // reward Tokens on source chain
        intent.rewardAmounts, // reward amounts on source chain
        expiryTime, // intent expiry time
        networks.ecoTestnet.proverContractAddress, // prover contract address on the sourceChain
      )
    await intentTx.wait()

    // Get the event from the latest Block checking transaction hash
    const intentHashEvents =
      await s.ecoTestnetIntentSourceContractIntentCreator.queryFilter(
        s.ecoTestnetIntentSourceContractIntentCreator.getEvent('IntentCreated'),
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
    if (e.data && s.ecoTestnetIntentSourceContractIntentCreator) {
      const decodedError =
        s.ecoTestnetIntentSourceContractIntentCreator.interface.parseError(
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
      await s.ecoTestnetIntentSourceContractIntentCreator.getIntent(intentHash)

    // transfer the intent tokens to the Inbox Contract
    const targetToken = s.baseSepoliaUSDCContractSolver
    const fundTx = await targetToken.transfer(
      networks.baseSepolia.inboxAddress,
      intent.targetAmounts[0],
    )
    await fundTx.wait()

    // fulfill the intent

    const fulfillTx = await s.baseSepoliaInboxContractSolver.fulfillStorage(
      networkIds.ecoTestnet, // source chainId
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
        networkIds.ecoTestnet, // desination chainId
        networks.ecoTestnet.inboxAddress, // destination inbox address
        [networks.ecoTestnet.usdcAddress], // target Tokens
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
    const targetToken = s.ecoTestnetUSDCContractSolver
    const fundTx = await targetToken.transfer(
      networks.ecoTestnet.inboxAddress,
      intent.targetAmounts[0],
    )
    await fundTx.wait()

    // fulfill the intent

    const fulfillTx = await s.ecoTestnetInboxContractSolver.fulfillStorage(
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

export async function ecoTestnetOptimismSepoliaIntentSolve() {
  console.log('In createIntent ecoTestnetOptimismSepolia')
  // approve lockup
  const rewardToken = s.ecoTestnetUSDCContractIntentCreator
  const approvalTx = await rewardToken.approve(
    networks.ecoTestnet.intentSourceAddress,
    intent.rewardAmounts[0],
  )
  await approvalTx.wait()

  // get the block before creating the intent
  const latestBlock = await s.ecoTestnetProvider.getBlock('latest')
  const latestBlockNumberHex = toQuantity(latestBlock.number)
  // create intent
  const data: BytesLike[] = [
    await encodeTransfer(actors.recipient, intent.targetAmounts[0]),
  ]
  const expiryTime: BigNumberish = latestBlock?.timestamp + intent.duration
  let intentHash
  try {
    const intentTx =
      await s.ecoTestnetIntentSourceContractIntentCreator.createIntent(
        networkIds.optimismSepolia, // desination chainId
        networks.optimismSepolia.inboxAddress, // destination inbox address
        [networks.optimismSepolia.usdcAddress], // target Tokens
        data, // calldata for destination chain
        [networks.ecoTestnet.usdcAddress], // reward Tokens on source chain
        intent.rewardAmounts, // reward amounts on source chain
        expiryTime, // intent expiry time
        networks.ecoTestnet.proverContractAddress, // prover contract address on the sourceChain
      )
    await intentTx.wait()

    // Get the event from the latest Block checking transaction hash
    const intentHashEvents =
      await s.ecoTestnetIntentSourceContractIntentCreator.queryFilter(
        s.ecoTestnetIntentSourceContractIntentCreator.getEvent('IntentCreated'),
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
    if (e.data && s.ecoTestnetIntentSourceContractIntentCreator) {
      const decodedError =
        s.ecoTestnetIntentSourceContractIntentCreator.interface.parseError(
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
      await s.ecoTestnetIntentSourceContractIntentCreator.getIntent(intentHash)

    // transfer the intent tokens to the Inbox Contract
    const targetToken = s.optimismSepoliaUSDCContractSolver
    const fundTx = await targetToken.transfer(
      networks.optimismSepolia.inboxAddress,
      intent.targetAmounts[0],
    )
    await fundTx.wait()

    // fulfill the intent

    const fulfillTx = await s.optimismSepoliaInboxContractSolver.fulfillStorage(
      networkIds.ecoTestnet, // source chainId
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

    const messageBody = AbiCoder.defaultAbiCoder().encode(
      ['bytes[]', 'address[]'],
      [thisIntent.data.toArray(), thisIntent.targets.toArray()],
    )

    console.log('fetching fee')
    const fee = await s.optimismSepoliaInboxContractSolver.fetchFee(
      networkIds.baseSepolia,
      messageBody,
      zeroPadValue(networks.baseSepolia.hyperproverContractAddress, 32),
    )

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
        { value: fee },
      )
    await fulfillTx.wait()
    console.log('Fulfillment tx: ', fulfillTx.hash)
    return fulfillTx.hash
  } catch (e) {
    console.log(e)
  }

  console.log('Waiting for 30 seconds for the dust to settle')
  await setTimeout(15000)

  console.log('show me da money')
  await s.baseSepoliaClaimant.hyperproverContractAddress.queryFilter(
    s.optimismSepoliaIntentSourceContractIntentCreator.getEvent(
      'IntentCreated',
    ),
    latestBlockNumberHex,
  )
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
      intent.targetAmounts[0] * 2,
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

    // send batch

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
    // await baseSepoliaEcoTestNetIntentSolve()
    // await ecoTestnetBaseSepoliaIntentSolve()
    // await baseSepoliaOptimismSepoliaIntentSolve()
    // await optimismSepoliaBaseSepoliaIntentSolve()
    // await optimismSepoliaEcoTestNetIntentSolve()
    // await ecoTestnetOptimismSepoliaIntentSolve()
    await baseSepoliaOptimismSepoliaIntentSolveHyperproveInstant()
    // await optimismSepoliaBaseSepoliaIntentSolveHyperproveInstant()
    // await baseSepoliaOptimismSepoliaIntentSolveHyperproveBatched()
    // await optimismSepoliaBaseSepoliaIntentSolveHyperproveBatched()
  } catch (e) {
    console.log(e)
  }
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
