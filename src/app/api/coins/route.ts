import { NextResponse } from "next/server";
import { query } from "@/lib/db";

export interface CoinTransaction {
  id: string;
  userId: string;
  type: "BONUS" | "CASHBACK" | "REDEEM" | "EXPIRED";
  amount: number;
  description: string;
  status: "SUCCESS" | "PENDING" | "FAILED";
  createdAt: string;
}

// Global in-memory fallback
declare global {
  var _inMemoryCoinBalance: number | undefined;
  var _inMemoryCoinTx: CoinTransaction[] | undefined;
}

// Reset to initial 10.000 and initial bonus transaction
global._inMemoryCoinBalance = 10000;
global._inMemoryCoinTx = [
  {
    id: "coin_tx_init_001",
    userId: "usr_001",
    type: "BONUS",
    amount: 10000,
    description: "Bonus Pengguna Baru Trypedia",
    status: "SUCCESS",
    createdAt: new Date().toISOString(),
  },
];

let coinTablesChecked = true;
async function ensureCoinTables() {
  return;
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId") || "usr_001";
    const summaryOnly = searchParams.get("summary") === "1";

    try {
      const coinRes = await query<{ balance: number }>(
        `SELECT balance FROM user_coins WHERE user_id = $1`,
        [userId]
      );

      let coins = global._inMemoryCoinBalance!;
      if (coinRes && coinRes.length > 0) {
        coins = Number(coinRes[0].balance);
        global._inMemoryCoinBalance = coins;
      } else {
        await query(
          `INSERT INTO user_coins (user_id, balance) VALUES ($1, $2) ON CONFLICT (user_id) DO NOTHING`,
          [userId, 10000]
        );
        coins = 10000;
        global._inMemoryCoinBalance = 10000;
      }

      if (summaryOnly) {
        return NextResponse.json({
          success: true,
          coins,
          transactions: [],
        });
      }

      const txRes = await query<any>(
        `SELECT id, user_id, type, amount, description, status, created_at
         FROM coin_transactions
         WHERE user_id = $1
         ORDER BY created_at DESC`,
        [userId]
      );

      let transactions: CoinTransaction[] = [];
      if (txRes && txRes.length > 0) {
        transactions = txRes.map((r) => ({
          id: r.id,
          userId: r.user_id,
          type: r.type,
          amount: Number(r.amount),
          description: r.description,
          status: r.status,
          createdAt: typeof r.created_at === "string" ? r.created_at : new Date(r.created_at).toISOString(),
        }));
        global._inMemoryCoinTx = transactions;
      } else {
        await query(
          `INSERT INTO coin_transactions (id, user_id, type, amount, description, status)
           VALUES ($1, $2, $3, $4, $5, $6) ON CONFLICT (id) DO NOTHING`,
          [
            "coin_tx_init_001",
            userId,
            "BONUS",
            10000,
            "Bonus Pengguna Baru Trypedia",
            "SUCCESS",
          ]
        );
        transactions = [...(global._inMemoryCoinTx || [])];
      }

      return NextResponse.json({
        success: true,
        coins,
        transactions,
      });
    } catch (dbErr) {
      console.warn("Coin DB query failed, using in-memory:", dbErr);
      return NextResponse.json({
        success: true,
        coins: global._inMemoryCoinBalance ?? 10000,
        transactions: global._inMemoryCoinTx ?? [],
      });
    }
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || "Gagal memuat koin" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    await ensureCoinTables();
    const body = await request.json();
    const { userId = "usr_001", amount, orderId, orderDescription } = body;

    const numAmount = Math.round(Number(amount));
    if (isNaN(numAmount) || numAmount <= 0) {
      return NextResponse.json(
        { success: false, message: "Jumlah koin tidak valid" },
        { status: 400 }
      );
    }

    if (global._inMemoryCoinBalance === undefined) {
      global._inMemoryCoinBalance = 10000;
    }

    if (global._inMemoryCoinBalance < numAmount) {
      return NextResponse.json(
        { success: false, message: "Koin Trypedia tidak mencukupi" },
        { status: 400 }
      );
    }

    const txId = `coin_tx_redeem_${Date.now()}`;
    const description =
      orderDescription || `Tukar ${numAmount.toLocaleString("id-ID")} Koin untuk pesanan ${orderId || ""}`;
    const createdAt = new Date().toISOString();

    const newTx: CoinTransaction = {
      id: txId,
      userId,
      type: "REDEEM",
      amount: numAmount,
      description,
      status: "SUCCESS",
      createdAt,
    };

    global._inMemoryCoinBalance -= numAmount;
    if (!global._inMemoryCoinTx) {
      global._inMemoryCoinTx = [];
    }
    global._inMemoryCoinTx = [newTx, ...global._inMemoryCoinTx];

    let currentCoins = global._inMemoryCoinBalance;

    try {
      await query(
        `UPDATE user_coins SET balance = balance - $2, updated_at = CURRENT_TIMESTAMP WHERE user_id = $1 AND balance >= $2`,
        [userId, numAmount]
      );
      await query(
        `INSERT INTO coin_transactions (id, user_id, type, amount, description, status, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP)`,
        [txId, userId, "REDEEM", numAmount, description, "SUCCESS"]
      );
    } catch (e) {
      console.warn("Could not deduct coins in db:", e);
    }

    return NextResponse.json({
      success: true,
      message: `Berhasil menukarkan ${numAmount.toLocaleString("id-ID")} Koin Trypedia!`,
      coins: currentCoins,
      transaction: newTx,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || "Gagal menukarkan koin" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    global._inMemoryCoinBalance = 10000;
    global._inMemoryCoinTx = [
      {
        id: "coin_tx_init_001",
        userId: "usr_001",
        type: "BONUS",
        amount: 10000,
        description: "Bonus Pengguna Baru Trypedia",
        status: "SUCCESS",
        createdAt: new Date().toISOString(),
      },
    ];

    try {
      await ensureCoinTables();
      await query(`UPDATE user_coins SET balance = 10000 WHERE user_id = 'usr_001'`);
      await query(`DELETE FROM coin_transactions WHERE type = 'REDEEM'`);
    } catch (dbErr: any) {
      console.warn("Could not reset DB coins, using in-memory:", dbErr.message);
    }

    return NextResponse.json({
      success: true,
      message: "Saldo koin berhasil direset ke saldo awal",
      coins: 10000,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

