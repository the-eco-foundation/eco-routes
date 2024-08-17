/* -*- c-basic-offset: 4 -*- */
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import "../Prover.sol";

contract TestProver is Prover {
    uint256 public constant BASE_SEPLOLIA_CHAIN_ID = 84532;
    uint256 public constant OPTIMISM_SEPLOLIA_CHAIN_ID = 11155420;
    address public constant baseL1OutputOracleAddress = 0x84457ca9D0163FbC4bbfe4Dfbb20ba46e48DF254;
    address public constant l2OptimismDisputeGameFactory = 0x05F9613aDB30026FFd634f38e5C4dFd30a197Fa1;
    Prover.ChainConfiguration public chainConfigBaseSepolia =
        Prover.ChainConfiguration(2, 11155111, baseL1OutputOracleAddress, baseL1OutputOracleAddress, 0);
    Prover.ChainConfiguration public chainConfigOptimismSepolia =
        Prover.ChainConfiguration(2, 11155111, l2OptimismDisputeGameFactory, baseL1OutputOracleAddress, 0);
    Prover.ChainConfigurationConstructor[] public _chainConfigurations = [
        ChainConfigurationConstructor(BASE_SEPLOLIA_CHAIN_ID, chainConfigBaseSepolia),
        ChainConfigurationConstructor(OPTIMISM_SEPLOLIA_CHAIN_ID, chainConfigOptimismSepolia)
    ];

    constructor() Prover(_chainConfigurations) {}

    function addProvenIntent(bytes32 _hash, address _claimant) public {
        provenIntents[_hash] = _claimant;
    }
}
