export type UserRole = "user" | "admin";

export interface UserProfile {
  id: string;
  email: string;
  balance: number;
  role: UserRole;
  createdAt: any; // Firestore Timestamp
}

export type TransactionType = "deposit" | "trade" | "withdraw";
export type TransactionStatus = "pending" | "completed" | "failed";

export interface Transaction {
  id: string;
  userId: string;
  type: TransactionType;
  amount: number;
  status: TransactionStatus;
  createdAt: any;
  details?: string;
}

export interface PlatformSettings {
  btc_address: string;
  eth_address: string;
  xrp_address: string;
}
