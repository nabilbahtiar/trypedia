import { NextResponse } from "next/server";
import { query } from "@/lib/db";

// Helper to resolve partner user ID
async function resolveReceiverId(
  senderId: string,
  receiverId?: string,
  sellerName?: string,
  buyerName?: string
): Promise<string> {
  if (receiverId && receiverId !== senderId) {
    return receiverId;
  }

  if (sellerName) {
    const storeRows = await query(
      `SELECT user_id FROM stores WHERE store_name ILIKE $1 LIMIT 1`,
      [`%${sellerName}%`]
    );
    if (storeRows.length > 0 && storeRows[0].user_id !== senderId) {
      return storeRows[0].user_id;
    }

    const userRows = await query(
      `SELECT id FROM users WHERE name ILIKE $1 LIMIT 1`,
      [`%${sellerName}%`]
    );
    if (userRows.length > 0 && userRows[0].id !== senderId) {
      return userRows[0].id;
    }
  }

  if (buyerName) {
    const userRows = await query(
      `SELECT id FROM users WHERE name ILIKE $1 LIMIT 1`,
      [`%${buyerName}%`]
    );
    if (userRows.length > 0 && userRows[0].id !== senderId) {
      return userRows[0].id;
    }
  }

  // Fallback defaults between the 2 primary users
  return senderId === "usr_001" ? "usr_002" : "usr_001";
}

// GET: Fetch messages for a conversation
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    let conversationId = searchParams.get("conversationId");
    const userId = searchParams.get("userId");
    const sellerName = searchParams.get("sellerName");
    const buyerName = searchParams.get("buyerName");
    const targetUserId = searchParams.get("targetUserId");
    const orderId = searchParams.get("orderId");

    if (!userId) {
      return NextResponse.json(
        { success: false, message: "Parameter userId diperlukan." },
        { status: 400 }
      );
    }

    // If conversationId is not provided, locate or create based on target
    if (!conversationId && (targetUserId || sellerName || buyerName)) {
      const resolvedTarget = await resolveReceiverId(userId, targetUserId || undefined, sellerName || undefined, buyerName || undefined);
      const u1 = userId < resolvedTarget ? userId : resolvedTarget;
      const u2 = userId < resolvedTarget ? resolvedTarget : userId;
      conversationId = `conv_${u1}_${u2}`;

      await query(
        `INSERT INTO chat_conversations (id, user1_id, user2_id, order_id, last_message, last_message_at)
         VALUES ($1, $2, $3, $4, 'Memulai percakapan baru', CURRENT_TIMESTAMP)
         ON CONFLICT (id) DO UPDATE SET
           order_id = COALESCE(EXCLUDED.order_id, chat_conversations.order_id),
           updated_at = CURRENT_TIMESTAMP`,
        [conversationId, u1, u2, orderId || null]
      );
    }

    if (!conversationId) {
      return NextResponse.json(
        { success: false, message: "Parameter conversationId diperlukan." },
        { status: 400 }
      );
    }

    // Mark messages as read for current user
    await query(
      `UPDATE chat_messages 
       SET is_read = true 
       WHERE conversation_id = $1 AND receiver_id = $2 AND is_read = false`,
      [conversationId, userId]
    );

    // Fetch conversation info
    const convRows = await query(
      `SELECT 
         c.id, c.user1_id as "user1Id", c.user2_id as "user2Id",
         c.order_id as "orderId", c.product_id as "productId",
         c.last_message as "lastMessage", c.last_message_at as "lastMessageAt",
         CASE WHEN c.user1_id = $2 THEN c.user2_id ELSE c.user1_id END as "interlocutorId",
         COALESCE(s.store_name, u.name) as "interlocutorName",
         u.avatar as "interlocutorAvatar",
         COALESCE(s.photo_url, u.photo_url) as "interlocutorPhotoUrl",
         u.is_verified as "interlocutorVerified",
         o.product_title as "orderProductTitle",
         o.product_image as "orderProductImage",
         o.total_price as "orderTotalPrice",
         o.status as "orderStatus",
         o.order_type as "orderType"
       FROM chat_conversations c
       LEFT JOIN users u ON u.id = (CASE WHEN c.user1_id = $2 THEN c.user2_id ELSE c.user1_id END)
       LEFT JOIN stores s ON s.user_id = u.id
       LEFT JOIN orders o ON o.order_id = c.order_id
       WHERE c.id = $1`,
      [conversationId, userId]
    );

    const conversation = convRows[0] || null;

    // Fetch messages
    const messages = await query(
      `SELECT 
         id,
         conversation_id as "conversationId",
         sender_id as "senderId",
         receiver_id as "receiverId",
         message,
         is_read as "isRead",
         created_at as "createdAt"
       FROM chat_messages
       WHERE conversation_id = $1
       ORDER BY created_at ASC`,
      [conversationId]
    );

    return NextResponse.json({
      success: true,
      conversationId,
      conversation,
      messages: messages || [],
    });
  } catch (err: any) {
    console.error("Error in GET /api/chat/messages:", err);
    return NextResponse.json(
      { success: false, message: err.message || "Gagal memuat pesan." },
      { status: 500 }
    );
  }
}

// POST: Send a new message
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      conversationId: incomingConvId,
      senderId,
      receiverId: incomingReceiverId,
      sellerName,
      buyerName,
      orderId,
      productId,
      message,
    } = body;

    if (!senderId || !message || !String(message).trim()) {
      return NextResponse.json(
        { success: false, message: "Pengirim dan isi pesan tidak boleh kosong." },
        { status: 400 }
      );
    }

    const cleanMessage = String(message).trim();
    const resolvedReceiver = await resolveReceiverId(
      senderId,
      incomingReceiverId,
      sellerName,
      buyerName
    );

    // Build or ensure conversation ID
    let finalConvId = incomingConvId;
    if (!finalConvId) {
      const u1 = senderId < resolvedReceiver ? senderId : resolvedReceiver;
      const u2 = senderId < resolvedReceiver ? resolvedReceiver : senderId;
      finalConvId = `conv_${u1}_${u2}`;
    }

    // Ensure conversation exists
    const u1 = senderId < resolvedReceiver ? senderId : resolvedReceiver;
    const u2 = senderId < resolvedReceiver ? resolvedReceiver : senderId;

    await query(
      `INSERT INTO chat_conversations (
         id, user1_id, user2_id, order_id, product_id, last_message, last_message_at, updated_at
       ) VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
       ON CONFLICT (id) DO UPDATE SET
         last_message = EXCLUDED.last_message,
         last_message_at = CURRENT_TIMESTAMP,
         order_id = COALESCE(EXCLUDED.order_id, chat_conversations.order_id),
         product_id = COALESCE(EXCLUDED.product_id, chat_conversations.product_id),
         updated_at = CURRENT_TIMESTAMP`,
      [finalConvId, u1, u2, orderId || null, productId || null, cleanMessage]
    );

    // Insert message into chat_messages
    const inserted = await query(
      `INSERT INTO chat_messages (
         conversation_id, sender_id, receiver_id, message, is_read, created_at
       ) VALUES ($1, $2, $3, $4, false, CURRENT_TIMESTAMP)
       RETURNING id, conversation_id as "conversationId", sender_id as "senderId",
                 receiver_id as "receiverId", message, is_read as "isRead", created_at as "createdAt"`,
      [finalConvId, senderId, resolvedReceiver, cleanMessage]
    );

    return NextResponse.json({
      success: true,
      message: inserted[0],
      conversationId: finalConvId,
    });
  } catch (err: any) {
    console.error("Error in POST /api/chat/messages:", err);
    return NextResponse.json(
      { success: false, message: err.message || "Gagal mengirim pesan." },
      { status: 500 }
    );
  }
}

