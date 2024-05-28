# Eco Association

Copyright (c) 2023 Eco Association

## Intent

```solidity
struct Intent {
  address creator;
  uint256 destinationChain;
  address[] targets;
  bytes[] data;
  address[] rewardTokens;
  uint256[] rewardAmounts;
  uint256 expiryTime;
  bool hasBeenWithdrawn;
  bytes32 intentHash;
}
```

