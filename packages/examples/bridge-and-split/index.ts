import { Keypair } from '@solana/web3.js';
import { bridgeTokenFromSolana } from "@locker-labs/sdk";
const solanaTokenAddress = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"
const solanaTokenAmount = 1
const recipientChain = "base"
const recipientAddress = "0xF445b07Aad98De9cc2794593B68ecD4aa5f81076"
const bridgeProvider = 'cctp'
const mode = "devnet"

// CCTP to transfer from Solana to Base
const solanaSigner = Keypair.generate();
bridgeTokenFromSolana(solanaSigner, solanaTokenAddress, solanaTokenAmount, recipientChain, recipientAddress, bridgeProvider, mode)