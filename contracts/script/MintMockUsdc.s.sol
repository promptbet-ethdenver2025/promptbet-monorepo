// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import {Script} from "forge-std/Script.sol";
import {MockUSDC} from "../mocks/MockUSDC.sol";

contract MintMockUsdcScript is Script {
    function run() public {
        // Load environment variables
        uint256 privateKey = vm.envUint("MAIN_PRIVATE_KEY");
        address mockUsdcAddress = vm.envAddress("MOCK_USDC_ADDRESS");
        
        // Hardcoded recipient address - replace with your desired address
        address recipient = 0x144dA759D7e0a7F69BC6cDA63650Ab1b0A7CC0E3;
        
        // Amount to mint (1000 USDC with 6 decimals)
        uint256 amount = 1000 * 1e6;

        // Start broadcast with private key
        vm.startBroadcast(privateKey);

        // Attach to existing contract and mint
        MockUSDC mockUsdc = MockUSDC(mockUsdcAddress);
        mockUsdc.mint(recipient, amount);

        vm.stopBroadcast();
    }
}
