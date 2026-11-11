"use client";

import React, { useState, useEffect, useRef, Suspense } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import {
  MessageSquare,
  Send,
  Search,
  Check,
  CheckCheck,
  ArrowLeft,
  Store,
  Package,
  Calendar,
  Clock,
  ExternalLink,
  ChevronRight,
  ShoppingBag,
  Sparkles,
  Loader2,
} from "lucide-react";

interface ConversationItem {
  id: string;
  user1Id: string;
  user2Id: string;
  orderId?: string | null;
  productId?: string | null;
  lastMessage: string;
  lastMessageAt: string;
  createdAt: string;
  interlocutorId: string;
  interlocutorName: string;
  interlocutorAvatar: string;
  interlocutorPhotoUrl?: string | null;
  interlocutorVerified?: boolean;
  unreadCount: number;
}

interface ChatMessage {
  id: number | string;
  conversationId: string;
  senderId: string;
  receiverId: string;
  message: string;
  isRead: boolean;
  createdAt: string;
}

interface OrderContextData {
  orderProductTitle?: string;
  orderProductImage?: string;
  orderTotalPrice?: number;
  orderStatus?: string;
  orderType?: string;
  orderId?: string;
}

const QUICK_CHIPS = [
  "Apakah produk masih ada?",
  "Apakah ada minus pada produknya?",
  "Apakah harganya masih bisa turun lagi?",
  "Ya, produk masih ada",
  "Maaf harga tidak bisa turun",
];

// Per-user in-memory cache for chat conversations and messages
const chatConversationsCacheByUser: Record<string, ConversationItem[]> = {};
const chatMessagesCacheByUser: Record<string, { [convId: string]: ChatMessage[] }> = {};

interface ChatClientProps {
  initialUserId?: string | null;
  initialConversations?: ConversationItem[] | null;
}

function ChatContent({
  initialUserId = null,
  initialConversations = null,
}: ChatClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, isLoggedIn, openLoginModal } = useAuth();
  const activeUid = user?.id || initialUserId || "";
  const seededConvs =
    (initialUserId && activeUid === initialUserId ? initialConversations : null) ??
    (activeUid ? chatConversationsCacheByUser[activeUid] : null) ??
    [];

  const urlSeller = searchParams.get("seller");
  const urlBuyer = searchParams.get("buyer");
  const urlOrderId = searchParams.get("orderId");
  const urlConvId = searchParams.get("conv");

  // Determine initial active conversation ID cleanly
  const initialConvId =
    urlConvId ||
    seededConvs[0]?.id ||
    (urlBuyer || urlSeller || urlOrderId ? "conv_usr_001_usr_002" : null);

  // Clean partner placeholder from URL params only (no hardcoded store/product flash)
  const initialPartnerInfo = urlBuyer || urlSeller
    ? {
        interlocutorId: urlBuyer ? "usr_001" : "usr_002",
        interlocutorName: urlBuyer || urlSeller || "Penjual TryPedia",
        interlocutorAvatar: (urlBuyer || urlSeller || "TP").slice(0, 2).toUpperCase(),
        orderId: urlOrderId || undefined,
      }
    : null;

  const userMsgCache = activeUid ? (chatMessagesCacheByUser[activeUid] ||= {}) : {};
  const [conversations, setConversations] = useState<ConversationItem[]>(seededConvs);
  const [activeConvId, setActiveConvId] = useState<string | null>(initialConvId);
  const [activeConvInfo, setActiveConvInfo] = useState<any | null>(initialPartnerInfo);
  const [messages, setMessages] = useState<ChatMessage[]>(() =>
    initialConvId ? userMsgCache[initialConvId] || [] : []
  );
  const [inputMessage, setInputMessage] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoadingConv, setIsLoadingConv] = useState<boolean>(seededConvs.length === 0 && !initialConversations);
  const [isLoadingMsgs, setIsLoadingMsgs] = useState<boolean>(
    !initialConvId || !userMsgCache[initialConvId]
  );
  const [isMobileChatOpen, setIsMobileChatOpen] = useState(false);

  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = (behavior: ScrollBehavior = "smooth") => {
    const container = messagesContainerRef.current;
    container?.scrollTo({ top: container.scrollHeight, behavior });
  };

  // 1. Fetch Conversations List
  const fetchConversations = async () => {
    const uid = user?.id || initialUserId;
    if (!uid) return;
    try {
      const res = await fetch(`/api/chat/conversations?userId=${encodeURIComponent(uid)}`);
      const data = await res.json();
      if (data.success && Array.isArray(data.conversations)) {
        chatConversationsCacheByUser[uid] = data.conversations;
        setConversations(data.conversations);
      }
    } catch (err) {
      console.warn("Failed to load conversations:", err);
    } finally {
      setIsLoadingConv(false);
    }
  };

  // 2. Fetch Messages for Active Conversation
  const fetchMessages = async (showLoading = false) => {
    const uid = user?.id || initialUserId;
    if (!uid) return;
    const msgCache = (chatMessagesCacheByUser[uid] ||= {});
    const targetConv = activeConvId || "conv_usr_001_usr_002";
    if (showLoading && !msgCache[targetConv]) {
      setIsLoadingMsgs(true);
    }

    try {
      const queryParams = new URLSearchParams({
        userId: uid,
        conversationId: targetConv,
        ...(urlSeller ? { sellerName: urlSeller } : {}),
        ...(urlBuyer ? { buyerName: urlBuyer } : {}),
        ...(urlOrderId ? { orderId: urlOrderId } : {}),
      });

      const res = await fetch(`/api/chat/messages?${queryParams.toString()}`);
      const data = await res.json();
      if (data.success) {
        if (data.messages) {
          msgCache[targetConv] = data.messages;
          setMessages(data.messages);
        }
        if (data.conversation) {
          setActiveConvInfo(data.conversation);
        }
        if (data.conversationId && data.conversationId !== activeConvId) {
          setActiveConvId(data.conversationId);
        }
      }
    } catch (err) {
      console.warn("Failed to load messages:", err);
    } finally {
      setIsLoadingMsgs(false);
    }
  };

  const didSkipInitialConvFetch = React.useRef(false);

  // Run initial fetch on mount (skip conversations list fetch if SSR hydrated matching userId)
  useEffect(() => {
    const uid = user?.id || initialUserId;
    if (!uid) return;
    fetchMessages(true);
    if (
      initialConversations !== null &&
      initialUserId &&
      uid === initialUserId &&
      !didSkipInitialConvFetch.current
    ) {
      didSkipInitialConvFetch.current = true;
      chatConversationsCacheByUser[uid] = initialConversations;
      return;
    }
    fetchConversations();
  }, [user, activeConvId, urlSeller, urlBuyer, urlOrderId, initialUserId, initialConversations]);

  // Auto-scroll on new messages
  useEffect(() => {
    scrollToBottom();
  }, [messages.length, activeConvId, isMobileChatOpen]);

  // Polling every 3.5 seconds for live messaging
  useEffect(() => {
    if (!user || !activeConvId) return;

    const interval = setInterval(() => {
      fetchMessages();
    }, 3500);

    return () => clearInterval(interval);
  }, [user, activeConvId]);

  // 3. Send Message Action
  const handleSendMessage = async (customText?: string) => {
    const textToSend = customText || inputMessage;
    if (!user || !activeConvId || !textToSend.trim() || isSending) return;

    setIsSending(true);
    setInputMessage("");

    try {
      const partnerId = activeConvInfo?.interlocutorId;
      const res = await fetch("/api/chat/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          conversationId: activeConvId,
          senderId: user.id,
          receiverId: partnerId,
          message: textToSend.trim(),
          orderId: urlOrderId || activeConvInfo?.orderId || undefined,
        }),
      });

      const data = await res.json();
      if (data.success && data.message) {
        setMessages((prev) => [...prev, data.message]);
        fetchConversations();
      } else {
        alert(data.message || "Gagal mengirim pesan.");
      }
    } catch (err) {
      alert("Terjadi kesalahan saat mengirim pesan.");
    } finally {
      setIsSending(false);
      setTimeout(() => textareaRef.current?.focus({ preventScroll: true }), 50);
    }
  };

  // Format timestamp
  const formatTime = (isoString?: string) => {
    if (!isoString) return "";
    try {
      const date = new Date(isoString);
      return date.toLocaleTimeString("id-ID", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      });
    } catch {
      return "";
    }
  };

  const formatDateLabel = (isoString?: string) => {
    if (!isoString) return "";
    try {
      const d = new Date(isoString);
      const now = new Date();
      if (d.toDateString() === now.toDateString()) {
        return formatTime(isoString);
      }
      return d.toLocaleDateString("id-ID", { day: "numeric", month: "short" });
    } catch {
      return "";
    }
  };

  const formatRupiah = (val?: number) => {
    if (!val) return "Rp 0";
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      maximumFractionDigits: 0,
    }).format(val);
  };

  // Filter conversations by search input
  const filteredConversations = conversations.filter((c) => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    return (
      c.interlocutorName.toLowerCase().includes(q) ||
      (c.lastMessage && c.lastMessage.toLowerCase().includes(q))
    );
  });

  const activePartner =
    conversations.find((c) => c.id === activeConvId) ||
    activeConvInfo;
  const partnerStoreUserId =
    conversations.find((c) => c.id === activeConvId)?.interlocutorId ||
    (activeConvInfo?.id === activeConvId ? activeConvInfo.interlocutorId : null);

  // If user is not logged in
  if (!isLoggedIn || !user) {
    return (
      <div className="min-h-screen bg-[#F5F7FA] flex flex-col justify-between">
        <Header />
        <main className="max-w-md mx-auto px-4 py-20 w-full text-center space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-[#EBF8EE] text-[#03AC0E] flex items-center justify-center mx-auto shadow-xs border border-emerald-100">
            <MessageSquare className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold text-gray-900">Masuk untuk Membuka Chat</h2>
          <p className="text-xs text-gray-500 leading-relaxed">
            Silakan masuk ke akun TryPedia Anda untuk berkomunikasi langsung dengan penjual atau pembeli mengenai produk dan jadwal COD.
          </p>
          <div className="pt-2">
            <button
              type="button"
              onClick={() => openLoginModal()}
              className="bg-[#03AC0E] hover:bg-[#02980C] text-white px-6 py-2.5 rounded-xl text-xs font-bold shadow-xs transition-all cursor-pointer"
            >
              Masuk Sekarang
            </button>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F5F7FA] flex flex-col">
      <Header />

      <main className="flex-1 max-w-7xl w-full mx-auto px-3 sm:px-6 py-4 sm:py-6 flex flex-col">
        {/* Breadcrumb Bar */}
        <div className="flex items-center gap-1.5 text-xs text-gray-500 mb-3.5">
          <Link href="/" className="hover:text-[#03AC0E] transition-colors">
            Beranda
          </Link>
          <ChevronRight className="w-3.5 h-3.5 text-gray-400" />
          <span className="text-gray-900 font-semibold">Pesan Langsung (Chat)</span>
        </div>

        {/* 2-COLUMN CHAT CARD CONTAINER */}
        <div className="bg-white rounded-2xl border border-gray-200/90 shadow-xs flex-1 flex flex-col lg:flex-row overflow-hidden min-h-[580px] max-h-[calc(100vh-140px)]">
          {/* LEFT COLUMN: CONVERSATION LIST */}
          <aside
            className={`w-full lg:w-80 xl:w-96 border-r border-gray-200 flex flex-col shrink-0 bg-white ${
              isMobileChatOpen ? "hidden lg:flex" : "flex"
            }`}
          >
            {/* Header Sidebar */}
            <div className="p-4 border-b border-gray-100 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <h1 className="text-base font-bold text-gray-900">Chat</h1>
                  <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-[#03AC0E] border border-emerald-200">
                    {conversations.length}
                  </span>
                </div>
              </div>

              {/* Search Bar */}
              <div className="relative">
                <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Cari percakapan..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3.5 py-2 rounded-xl border border-gray-200 text-xs text-gray-800 bg-gray-50 focus:bg-white focus:outline-none focus:border-[#03AC0E] focus:ring-1 focus:ring-[#03AC0E] transition-all"
                />
              </div>
            </div>

            {/* Conversation List Scrollable */}
            <div className="flex-1 overflow-y-auto divide-y divide-gray-100">
              {isLoadingConv && conversations.length === 0 ? (
                <div className="p-8 flex flex-col items-center justify-center gap-2 text-center">
                  <Loader2 className="w-5 h-5 text-[#03AC0E] animate-spin stroke-[2.5]" />
                  <span className="text-xs font-semibold text-gray-500">Memuat percakapan...</span>
                </div>
              ) : filteredConversations.length === 0 ? (
                <div className="p-8 text-center space-y-2">
                  <MessageSquare className="w-8 h-8 text-gray-300 mx-auto" />
                  <p className="text-xs font-semibold text-gray-700">Tidak ada percakapan</p>
                  <p className="text-[11px] text-gray-400">
                    {searchQuery ? "Hasil pencarian tidak ditemukan." : "Mulai chat dengan penjual dari kartu produk atau pesanan."}
                  </p>
                </div>
              ) : (
                filteredConversations.map((conv) => {
                  const isActive = conv.id === activeConvId;
                  return (
                    <button
                      key={conv.id}
                      type="button"
                      onClick={() => {
                        setActiveConvId(conv.id);
                        setIsMobileChatOpen(true);
                      }}
                      className={`w-full text-left p-3.5 flex items-start gap-3 transition-colors cursor-pointer ${
                        isActive
                          ? "bg-[#EBF8EE] border-l-4 border-l-[#03AC0E]"
                          : "hover:bg-gray-50 border-l-4 border-l-transparent"
                      }`}
                    >
                      {/* Avatar */}
                      <div className="w-11 h-11 rounded-xl shrink-0 overflow-hidden bg-gradient-to-br from-emerald-600 to-[#03AC0E] text-white font-bold text-sm flex items-center justify-center border border-emerald-400/30 shadow-2xs">
                        {conv.interlocutorPhotoUrl ? (
                          <img
                            src={conv.interlocutorPhotoUrl}
                            alt={conv.interlocutorName}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          conv.interlocutorAvatar || "U"
                        )}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-1 mb-0.5">
                          <span className="text-xs font-bold text-gray-900 truncate">
                            {conv.interlocutorName}
                          </span>
                          <span className="text-[10px] text-gray-400 shrink-0 font-mono">
                            {formatDateLabel(conv.lastMessageAt)}
                          </span>
                        </div>

                        <p className="text-[11px] text-gray-500 truncate leading-relaxed">
                          {conv.lastMessage || "Mulai obrolan..."}
                        </p>
                      </div>

                      {/* Unread Badge */}
                      {conv.unreadCount > 0 && (
                        <span className="w-5 h-5 rounded-full bg-[#03AC0E] text-white text-[10px] font-bold flex items-center justify-center shrink-0 shadow-2xs">
                          {conv.unreadCount}
                        </span>
                      )}
                    </button>
                  );
                })
              )}
            </div>
          </aside>

          {/* RIGHT COLUMN: ACTIVE CHAT PANE */}
          <section
            className={`flex-1 flex flex-col bg-[#F9FAFB] min-w-0 min-h-0 ${
              !isMobileChatOpen ? "hidden lg:flex" : "flex"
            }`}
          >
            {activeConvId && activePartner ? (
              <>
                {/* 1. Chat Header */}
                <div className="p-3.5 sm:px-5 bg-white border-b border-gray-200 flex items-center justify-between gap-3 shrink-0 shadow-2xs z-10">
                  <div className="flex items-center gap-3 min-w-0">
                    {/* Mobile Back Button */}
                    <button
                      type="button"
                      onClick={() => setIsMobileChatOpen(false)}
                      className="w-8 h-8 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-600 flex items-center justify-center lg:hidden cursor-pointer"
                    >
                      <ArrowLeft className="w-4 h-4" />
                    </button>

                    {/* Partner Avatar */}
                    <div className="w-10 h-10 rounded-xl shrink-0 overflow-hidden bg-gradient-to-br from-emerald-600 to-[#03AC0E] text-white font-bold text-sm flex items-center justify-center border border-emerald-400/30 shadow-2xs">
                      {activePartner.interlocutorPhotoUrl ? (
                        <img
                          src={activePartner.interlocutorPhotoUrl}
                          alt={activePartner.interlocutorName}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        activePartner.interlocutorAvatar || "U"
                      )}
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <h2 className="text-xs sm:text-sm font-bold text-gray-900 truncate">
                          {activePartner.interlocutorName}
                        </h2>
                      </div>
                      <div className="flex items-center gap-1.5 text-[11px] text-[#03AC0E] font-medium">
                        <span className="w-2 h-2 rounded-full bg-[#03AC0E] animate-pulse"></span>
                        <span>Online</span>
                      </div>
                    </div>
                  </div>

                  {/* Actions Right */}
                  <div className="flex items-center gap-2">
                    {partnerStoreUserId && (
                      <Link
                        href={`/store/${encodeURIComponent(partnerStoreUserId)}`}
                        className="text-xs font-semibold text-gray-700 hover:text-[#03AC0E] border border-gray-200 bg-white hover:bg-gray-50 px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer"
                      >
                        <Store className="w-3.5 h-3.5 text-[#03AC0E]" />
                        <span>Kunjungi Toko</span>
                      </Link>
                    )}
                  </div>
                </div>

                {/* 3. Messages Scroll Area */}
                <div ref={messagesContainerRef} className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-4 sm:p-5 space-y-3.5">
                  {isLoadingMsgs && messages.length === 0 ? (
                    <div className="py-20 flex flex-col items-center justify-center gap-2.5 text-center">
                      <div className="w-10 h-10 rounded-xl bg-emerald-50 text-[#03AC0E] flex items-center justify-center shadow-xs">
                        <Loader2 className="w-5 h-5 animate-spin stroke-[2.5]" />
                      </div>
                      <span className="text-xs font-semibold text-gray-600">Menyiapkan percakapan...</span>
                    </div>
                  ) : messages.length === 0 ? (
                    <div className="py-16 text-center space-y-2 max-w-sm mx-auto">
                      <div className="w-12 h-12 rounded-xl bg-emerald-50 text-[#03AC0E] flex items-center justify-center mx-auto">
                        <MessageSquare className="w-6 h-6" />
                      </div>
                      <p className="text-xs font-bold text-gray-800">Mulai Percakapan Baru</p>
                      <p className="text-[11px] text-gray-500">
                        Kirim pesan kepada {activePartner.interlocutorName} untuk berdiskusi tentang detail barang, pengiriman, atau titik temu COD.
                      </p>
                    </div>
                  ) : (
                    messages.map((msg) => {
                      const isMe = msg.senderId === user.id;

                      return (
                        <div
                          key={msg.id}
                          className={`flex items-end gap-2 ${
                            isMe ? "justify-end" : "justify-start"
                          }`}
                        >
                          <div
                            className={`max-w-[82%] sm:max-w-md px-4 py-2.5 rounded-2xl text-xs leading-relaxed shadow-2xs ${
                              isMe
                                ? "bg-[#03AC0E] text-white rounded-br-xs"
                                : "bg-white text-gray-900 border border-gray-200/80 rounded-bl-xs"
                            }`}
                          >
                            <p className="whitespace-pre-wrap break-words">{msg.message}</p>
                            <div
                              className={`flex items-center justify-end gap-1 mt-1 text-[10px] ${
                                isMe ? "text-emerald-100" : "text-gray-400"
                              }`}
                            >
                              <span>{formatTime(msg.createdAt)}</span>
                              {isMe && (
                                <CheckCheck className="w-3.5 h-3.5 text-emerald-200 stroke-[2.2]" />
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                {/* 4. Quick Suggestion Chips */}
                <div className="px-3.5 py-2 bg-white/90 border-t border-gray-100 flex items-center gap-1.5 overflow-x-auto no-scrollbar shrink-0">
                  <span className="text-[10.5px] font-semibold text-gray-400 shrink-0 flex items-center gap-1">
                    <Sparkles className="w-3 h-3 text-amber-500" />
                    Pesan Cepat:
                  </span>
                  {QUICK_CHIPS.map((chip, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleSendMessage(chip)}
                      disabled={isSending}
                      className="px-2.5 py-1 rounded-lg text-[11px] bg-gray-50 hover:bg-[#EBF8EE] text-gray-700 hover:text-[#03AC0E] border border-gray-200 hover:border-[#03AC0E]/50 whitespace-nowrap transition-all cursor-pointer disabled:opacity-50"
                    >
                      {chip}
                    </button>
                  ))}
                </div>

                {/* 5. Message Composer Bar */}
                <div className="p-3 sm:p-4 bg-white border-t border-gray-200 shrink-0">
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      handleSendMessage();
                    }}
                    className="flex items-center gap-2"
                  >
                    <textarea
                      ref={textareaRef}
                      rows={1}
                      value={inputMessage}
                      onChange={(e) => setInputMessage(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                          e.preventDefault();
                          handleSendMessage();
                        }
                      }}
                      placeholder={`Tulis pesan ke ${activePartner.interlocutorName}... (Tekan Enter untuk kirim)`}
                      className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 text-xs text-gray-900 bg-gray-50 focus:bg-white focus:outline-none focus:border-[#03AC0E] focus:ring-1 focus:ring-[#03AC0E] resize-none max-h-24 transition-all"
                    />

                    <button
                      type="submit"
                      disabled={!inputMessage.trim() || isSending}
                      className="w-10 h-10 rounded-xl bg-[#03AC0E] hover:bg-[#02980C] text-white flex items-center justify-center shrink-0 shadow-xs transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
                      title="Kirim Pesan"
                    >
                      <Send className="w-4 h-4 stroke-[2.2]" />
                    </button>
                  </form>
                </div>
              </>
            ) : isLoadingConv || isLoadingMsgs ? (
              <div className="flex-1 flex flex-col items-center justify-center p-8 text-center space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-[#03AC0E] flex items-center justify-center shadow-xs">
                  <Loader2 className="w-6 h-6 animate-spin stroke-[2.5]" />
                </div>
                <div className="text-center space-y-1">
                  <h3 className="text-sm font-bold text-gray-800">Menyiapkan Ruang Chat...</h3>
                  <p className="text-xs text-gray-500">Sedang memuat data percakapan Anda</p>
                </div>
              </div>
            ) : (
              /* No Active Conversation Selected State */
              <div className="flex-1 flex flex-col items-center justify-center p-8 text-center space-y-3">
                <div className="w-16 h-16 rounded-2xl bg-gray-100 text-gray-400 flex items-center justify-center shadow-inner">
                  <MessageSquare className="w-8 h-8 stroke-[1.5]" />
                </div>
                <h3 className="text-sm font-bold text-gray-800">Pilih Percakapan untuk Memulai</h3>
                <p className="text-xs text-gray-500 max-w-xs leading-relaxed">
                  Pilih salah satu kontak di kolom sebelah kiri untuk melihat pesan atau bernegosiasi seputar produk dan transaksi.
                </p>
              </div>
            )}
          </section>
        </div>
      </main>

      <Footer />
    </div>
  );
}

export default function ChatClient(props: ChatClientProps) {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#F5F7FA] flex flex-col items-center justify-center p-6">
          <div className="bg-white p-6 rounded-2xl border border-gray-200/90 shadow-sm flex flex-col items-center gap-3.5 max-w-xs w-full text-center">
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-[#03AC0E] flex items-center justify-center shadow-xs">
              <Loader2 className="w-6 h-6 animate-spin stroke-[2.5]" />
            </div>
            <div className="space-y-1">
              <h3 className="text-sm font-bold text-gray-800">Menyiapkan Ruang Chat</h3>
              <p className="text-xs text-gray-500">Sedang memuat data percakapan TryPedia...</p>
            </div>
          </div>
        </div>
      }
    >
      <ChatContent {...props} />
    </Suspense>
  );
}
