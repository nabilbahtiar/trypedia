import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { getServerSessionUser } from "@/lib/server-auth";

export interface WalletTransaction {
  id: string;
  userId: string;
  type: "TOPUP" | "PAYMENT" | "WITHDRAW" | "REFUND";
  amount: number;
  description: string;
  status: "SUCCESS" | "PENDING" | "FAILED";
  paymentMethod: string;
  createdAt: string;
}

// Global in-memory fallback for usr_001
declare global {
  var _inMemoryWalletBalance: number | undefined;
  var _inMemoryWalletTx: WalletTransaction[] | undefined;
}

// Reset to initial Rp 10.000.000 and initial top-up transaction
global._inMemoryWalletBalance = 10000000;
global._inMemoryWalletTx = [
  {
    id: "tx_init_001",
    userId: "usr_001",
    type: "TOPUP",
    amount: 10000000,
    description: "Berhasil top up sejumlah Rp 10.000.000",
    status: "SUCCESS",
    paymentMethod: "Sistem (Saldo Awal)",
    createdAt: new Date().toISOString(),
  },
];

let tablesChecked = true;
async function ensureTables() {
  return;
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const user = await getServerSessionUser();
    if (!user || user.role === "SUPERADMIN") return NextResponse.json({success:false},{status:401});
    const userId = user.id;
    if (searchParams.get("userId") && searchParams.get("userId") !== userId) return NextResponse.json({success:false},{status:403});
    const summaryOnly = searchParams.get("summary") === "1";

    try {
      // Query balance
      const balRes = await query<{ balance: string | number }>(
        `SELECT balance FROM user_wallets WHERE user_id = $1`,
        [userId]
      );

      let balance = 0;
      if (balRes && balRes.length > 0) {
        balance = Number(balRes[0].balance);
        global._inMemoryWalletBalance = balance;
      } else {
        // Initialize record in DB
        await query(
          `INSERT INTO user_wallets (user_id, balance) VALUES ($1, $2) ON CONFLICT (user_id) DO NOTHING`,
          [userId, 0]
        );
        balance = 0;
        global._inMemoryWalletBalance = 0;
      }

      if (summaryOnly) {
        return NextResponse.json({
          success: true,
          balance,
          transactions: [],
        });
      }

      // Query transactions
      const txRes = await query<any>(
        `SELECT id, user_id, type, amount, description, status, payment_method, created_at 
         FROM wallet_transactions 
         WHERE user_id = $1 
         ORDER BY created_at DESC`,
        [userId]
      );

      let transactions: WalletTransaction[] = [];
      if (txRes && txRes.length > 0) {
        transactions = txRes.map((r) => ({
          id: r.id,
          userId: r.user_id,
          type: r.type,
          amount: Number(r.amount),
          description: r.description,
          status: r.status,
          paymentMethod: r.payment_method || "Midtrans",
          createdAt: typeof r.created_at === "string" ? r.created_at : new Date(r.created_at).toISOString(),
        }));
        global._inMemoryWalletTx = transactions;
      }


      return NextResponse.json({
        success: true,
        balance,
        transactions,
      });
    } catch (dbErr) {
      console.warn("DB connection error in /api/wallet:", dbErr);
      return NextResponse.json({
        success: false,
        message: "Gagal memuat data dompet. Silakan coba lagi.",
      }, { status: 503 });
    }
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || "Gagal memuat data dompet" },
      { status: 500 }
    );
  }
}

export async function DELETE(){return NextResponse.json({success:false,message:"Reset saldo tidak tersedia."},{status:403});}
