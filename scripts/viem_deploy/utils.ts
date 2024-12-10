import {
  Account,
  Chain,
  createWalletClient,
  Hex,
  http,
  PrivateKeyAccount,
  PublicActions,
  publicActions,
  RpcSchema,
  sha256,
  Transport,
  WalletClient,
  WalletRpcSchema,
} from 'viem'
import { privateKeyToAccount } from 'viem/accounts'
import { getGitHash } from '../publish/gitUtils'
import SepoliaContracts from './contracts/sepolia'
import MainnetContracts, { ContractNames } from './contracts/mainnet'
import { Prettify } from 'viem/chains'

export function getDeployAccount() {
  // Load environment variables
  const DEPLOYER_PRIVATE_KEY: Hex =
    (process.env.DEPLOYER_PRIVATE_KEY as Hex) || '0x'
  return privateKeyToAccount(DEPLOYER_PRIVATE_KEY)
}

export function getGitRandomSalt() {
  return sha256(`0x${getGitHash() + Math.random().toString()}`) // Random salt
}

export type DeployWalletClient<
  transport extends Transport = Transport,
  chain extends Chain | undefined = Chain | undefined,
  account extends Account | undefined = Account | undefined,
  rpcSchema extends RpcSchema | undefined = undefined,
> = Prettify<
  WalletClient<
    transport,
    chain,
    account,
    rpcSchema extends RpcSchema
      ? [...WalletRpcSchema, ...rpcSchema]
      : WalletRpcSchema
  > &
    PublicActions<transport, chain>
>

export function getClient(chain: Chain, account: PrivateKeyAccount) {
  const client = createWalletClient({
    transport: http(getUrl(chain)),
    chain,
    account,
  })
  return client.extend(publicActions)
}

function getUrl(chain: Chain) {
  return getAchemyRPCUrl(chain) || chain.rpcUrls.default.http[0]
}

function getAchemyRPCUrl(chain: Chain): string | undefined {
  const apiKey = process.env.ALCHEMY_API_KEY
  if (!chain.rpcUrls.alchemy) {
    return undefined
  }
  return chain.rpcUrls.alchemy.http[0] + '/' + apiKey
}

export function getConstructorArgs(chain: Chain, contract: ContractNames) {
  return chain.testnet ? SepoliaContracts[contract] : MainnetContracts[contract]
}

/**
 * Compares two integer strings left to right by digit to get the larger one
 * @param num1 - The first integer string
 * @param num2 - The second integer string
 * @returns 1 if num1 is larger, -1 if num2 is larger, 0 if they are equal
 */
export function compareSemverIntegerStrings(
  num1: string,
  num2: string,
): number {
  const len1 = num1.length
  const len2 = num2.length

  // Pad the shorter string with trailing zeros
  if (len1 > len2) {
    num2 = num2.padEnd(len1, '0')
  } else if (len2 > len1) {
    num1 = num1.padEnd(len2, '0')
  }

  for (let i = 0; i < num1.length; i++) {
    const digit1 = parseInt(num1[i], 10)
    const digit2 = parseInt(num2[i], 10)

    if (digit1 > digit2) {
      return 1
    } else if (digit1 < digit2) {
      return -1
    }
  }

  return 0
}
