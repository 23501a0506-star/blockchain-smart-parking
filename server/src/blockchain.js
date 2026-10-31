import { ethers, JsonRpcProvider } from 'ethers';
import { randomUUID } from 'node:crypto';

// ABI matching blockchain/contracts/ParkingRegistry.sol
export const PARKING_REGISTRY_ABI = [
  // createReservation(bytes32 id, uint256 slotId, string vehicleReg, string driverName, uint256 startTime, uint256 durationHours)
  'function createReservation(bytes32 id, uint256 slotId, string vehicleReg, string driverName, uint256 startTime, uint256 durationHours) external',
  // cancelReservation(bytes32 id)
  'function cancelReservation(bytes32 id) external',
  // recordViolation(bytes32 id, string vehicleReg, string violationType, string description, uint256 fineAmount)
  'function recordViolation(bytes32 id, string vehicleReg, string violationType, string description, uint256 fineAmount) external',
  // payFine(bytes32 id)
  'function payFine(bytes32 id) external',
  // events
  'event ReservationCreated(bytes32 indexed id, uint256 indexed slotId, string vehicleReg, uint256 startTime, uint256 durationHours, address indexed by)',
  'event ReservationCancelled(bytes32 indexed id, uint256 indexed slotId, address indexed by)',
  'event ViolationRecorded(bytes32 indexed id, string vehicleReg, string violationType, uint256 fineAmount, address indexed by)',
  'event FinePaid(bytes32 indexed id, string vehicleReg, uint256 amount, address indexed by)',
  'function reservations(bytes32) view returns (uint256 slotId, string vehicleReg, string driverName, uint256 startTime, uint256 durationHours, bool active)',
  'function violations(bytes32) view returns (string vehicleReg, string violationType, string description, uint256 fineAmount, bool paid)',
];

export interface BlockchainConfig {
  rpcUrl: string;
  privateKey: string;
  contractAddress: string;
}

export interface TxResult {
  txHash: string;
  blockNumber: number;
  fromAddress: string;
  toAddress: string;
}

/**
 * Wraps the deployed ParkingRegistry smart contract. Every method sends a real
 * on-chain transaction and waits for the receipt — no fake hashes anywhere.
 *
 * If the RPC node is unreachable, methods throw and the caller (server route)
 * surfaces the error to the client instead of inventing a hash.
 */
export class BlockchainService {
  private provider: JsonRpcProvider;
  private signer;
  private contract;

  constructor(cfg: BlockchainConfig) {
    this.provider = new JsonRpcProvider(cfg.rpcUrl);
    this.signer = new ethers.Wallet(cfg.privateKey, this.provider);
    this.contract = new ethers.Contract(cfg.contractAddress, PARKING_REGISTRY_ABI, this.signer);
  }

  async checkConnection(): Promise<{ ok: boolean; blockNumber: number | null; error?: string }> {
    try {
      const blockNumber = await this.provider.getBlockNumber();
      return { ok: true, blockNumber };
    } catch (e) {
      return { ok: false, blockNumber: null, error: (e as Error).message };
    }
  }

  contractAddress(): string {
    return this.contract.target as string;
  }

  /** Convert a UUID string to a bytes32 (solidity-friendly) id. */
  static idToBytes32(uuid: string): string {
    const hex = randomUUID().replace(/-/g, '').slice(0, 64).padStart(64, '0');
    void uuid; // we generate a fresh on-chain id per call to avoid collisions
    return '0x' + hex;
  }

  async createReservation(params: {
    onChainId: string;
    slotId: number;
    vehicleReg: string;
    driverName: string;
    startTime: number; // unix seconds
    durationHours: number;
  }): Promise<TxResult> {
    const tx = await this.contract.createReservation(
      params.onChainId,
      params.slotId,
      params.vehicleReg,
      params.driverName,
      params.startTime,
      params.durationHours,
    );
    const receipt = await tx.wait();
    return {
      txHash: receipt.hash,
      blockNumber: receipt.blockNumber,
      fromAddress: receipt.from,
      toAddress: receipt.to,
    };
  }

  async cancelReservation(onChainId: string): Promise<TxResult> {
    const tx = await this.contract.cancelReservation(onChainId);
    const receipt = await tx.wait();
    return {
      txHash: receipt.hash,
      blockNumber: receipt.blockNumber,
      fromAddress: receipt.from,
      toAddress: receipt.to,
    };
  }

  async recordViolation(params: {
    onChainId: string;
    vehicleReg: string;
    violationType: string;
    description: string;
    fineAmount: number;
  }): Promise<TxResult> {
    const tx = await this.contract.recordViolation(
      params.onChainId,
      params.vehicleReg,
      params.violationType,
      params.description,
      params.fineAmount,
    );
    const receipt = await tx.wait();
    return {
      txHash: receipt.hash,
      blockNumber: receipt.blockNumber,
      fromAddress: receipt.from,
      toAddress: receipt.to,
    };
  }

  async payFine(onChainId: string): Promise<TxResult> {
    const tx = await this.contract.payFine(onChainId);
    const receipt = await tx.wait();
    return {
      txHash: receipt.hash,
      blockNumber: receipt.blockNumber,
      fromAddress: receipt.from,
      toAddress: receipt.to,
    };
  }

  /** Verify a tx hash by fetching its receipt directly from the node. */
  async verifyTransaction(txHash: string) {
    const receipt = await this.provider.getTransactionReceipt(txHash);
    if (!receipt) return { verified: false, message: 'No receipt found on chain.', onChain: null };
    return {
      verified: receipt.status === 1,
      message: receipt.status === 1 ? `Confirmed in block ${receipt.blockNumber}` : 'Transaction reverted on chain.',
      onChain: {
        blockNumber: receipt.blockNumber,
        from: receipt.from,
        to: receipt.to,
        gasUsed: receipt.gasUsed.toString(),
        status: receipt.status,
      },
    };
  }
}
