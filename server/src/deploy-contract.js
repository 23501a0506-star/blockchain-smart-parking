import { ethers } from 'ethers';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import 'dotenv/config';

const __dirname = dirname(fileURLToPath(import.meta.url));
const CONTRACT_ARTIFACT = join(__dirname, '..', '..', 'blockchain', 'artifacts', 'contracts', 'ParkingRegistry.sol', 'ParkingRegistry.json');
const DEPLOYMENT_FILE = join(__dirname, 'deployment.json');

const RPC_URL = process.env.RPC_URL ?? 'http://127.0.0.1:8545';
const PRIVATE_KEY = process.env.DEPLOYER_PRIVATE_KEY;

if (!PRIVATE_KEY) {
  console.error('DEPLOYER_PRIVATE_KEY not set. Copy server/.env.example -> server/.env');
  process.exit(1);
}

if (!existsSync(CONTRACT_ARTIFACT)) {
  console.error(`Contract artifact not found at ${CONTRACT_ARTIFACT}`);
  console.error('Run "cd blockchain && npx hardhat compile" first.');
  process.exit(1);
}

async function main() {
  const provider = new ethers.JsonRpcProvider(RPC_URL);
  const network = await provider.getNetwork();
  console.log(`Connected to network ${network.chainId} at ${RPC_URL}`);

  const signer = new ethers.Wallet(PRIVATE_KEY, provider);
  console.log(`Deploying with account ${signer.address}`);

  const artifact = JSON.parse(readFileSync(CONTRACT_ARTIFACT, 'utf8'));
  const factory = new ethers.ContractFactory(artifact.abi, artifact.bytecode, signer);
  const contract = await factory.deploy();
  console.log(`Tx sent: ${contract.deploymentTransaction()?.hash}`);
  await contract.waitForDeployment();

  const address = await contract.getAddress();
  console.log(`\n✓ ParkingRegistry deployed to: ${address}`);

  const deployment = { address, chainId: Number(network.chainId), rpcUrl: RPC_URL, deployedAt: new Date().toISOString() };
  writeFileSync(DEPLOYMENT_FILE, JSON.stringify(deployment, null, 2));
  console.log(`Saved deployment to ${DEPLOYMENT_FILE}`);
  console.log('\nNext: add CONTRACT_ADDRESS to server/.env and run "npm start"');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
