import React, { useState, useEffect } from 'react';
import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  addDoc,
  doc,
  updateDoc,
} from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { Ticket, TicketMessage } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { StatusBadge } from '../../components/common/StatusBadge';
import {
  Headphones,
  PlusCircle,
  MessageSquare,
  Send,
  X,
  Clock,
  CheckCircle2,
  ChevronRight,
  ArrowLeft,
  User,
  Shield,
} from 'lucide-react';

export const SupportView: React.FC = () => {
  const { profile, currentUser, isAdmin } = useAuth();
  const { success, error } = useToast();

  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [activeTicket, setActiveTicket] = useState<Ticket | null>(null);
  const [messages, setMessages] = useState<TicketMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isSending, setIsSending] = useState(false);

  // New Ticket Form state
  const [isCreatingTicket, setIsCreatingTicket] = useState(false);
  const [subject, setSubject] = useState('');
  const [orderId, setOrderId] = useState('');
  const [initialMessage, setInitialMessage] = useState('');
  const [isSubmittingTicket, setIsSubmittingTicket] = useState(false);

  // Listen to user tickets in real-time
  useEffect(() => {
    if (!currentUser) return;
    const q = query(
      collection(db, 'tickets'),
      where('userId', '==', currentUser.uid)
    );
    const unsub = onSnapshot(q, (snap) => {
      const list = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Ticket));
      list.sort((a, b) => (b.lastMessageAt || 0) - (a.lastMessageAt || 0));
      setTickets(list);
    }, (err) => console.warn('Tickets subscription note:', err));
    return () => unsub();
  }, [currentUser]);

  // Listen to messages for active ticket
  useEffect(() => {
    if (!activeTicket) {
      setMessages([]);
      return;
    }
    const q = query(
      collection(db, 'ticketMessages'),
      where('ticketId', '==', activeTicket.id)
    );
    const unsub = onSnapshot(q, (snap) => {
      const list = snap.docs.map((d) => ({ id: d.id, ...d.data() } as TicketMessage));
      list.sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));
      setMessages(list);
    }, (err) => console.warn('Ticket messages subscription note:', err));
    return () => unsub();
  }, [activeTicket]);

  const handleCreateTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;
    if (!subject.trim() || !initialMessage.trim()) {
      error('Please fill in both subject and message.');
      return;
    }

    setIsSubmittingTicket(true);
    try {
      const ticketIdStr = `TKT${Math.floor(10000 + Math.random() * 90000)}`;

      const ticketData: Record<string, any> = {
        ticketId: ticketIdStr,
        userId: profile.id,
        username: profile.username,
        userEmail: profile.email,
        subject: subject.trim(),
        status: 'Open',
        priority: 'Medium',
        lastMessageAt: Date.now(),
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      const trimmedOrderId = orderId?.trim();
      if (trimmedOrderId) {
        ticketData.orderId = trimmedOrderId;
      }

      const ticketRef = await addDoc(collection(db, 'tickets'), ticketData);

      // Add initial message
      await addDoc(collection(db, 'ticketMessages'), {
        ticketId: ticketRef.id,
        senderId: profile.id,
        senderName: profile.name || profile.username,
        senderRole: 'user',
        message: initialMessage.trim(),
        createdAt: Date.now(),
      });

      success(`Ticket #${ticketIdStr} created successfully.`);
      setIsCreatingTicket(false);
      setSubject('');
      setOrderId('');
      setInitialMessage('');
    } catch (err: any) {
      error(err?.message || 'Failed to create ticket.');
    } finally {
      setIsSubmittingTicket(false);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile || !activeTicket || !newMessage.trim()) return;

    setIsSending(true);
    try {
      await addDoc(collection(db, 'ticketMessages'), {
        ticketId: activeTicket.id,
        senderId: profile.id,
        senderName: profile.name || profile.username,
        senderRole: profile.role || 'user',
        message: newMessage.trim(),
        createdAt: Date.now(),
      });

      // Update ticket lastMessageAt
      await updateDoc(doc(db, 'tickets', activeTicket.id), {
        lastMessageAt: Date.now(),
        status: 'Pending',
        updatedAt: Date.now(),
      });

      setNewMessage('');
    } catch (err: any) {
      error(err?.message || 'Failed to send message.');
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="w-full max-w-xl mx-auto px-4 py-4 pb-28">
      {/* Title */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-xl font-extrabold text-white">Support Tickets</h1>
          <p className="text-xs text-slate-400">24/7 dedicated assistance for orders &amp; payments</p>
        </div>
        {!activeTicket && !isCreatingTicket && (
          <button
            onClick={() => setIsCreatingTicket(true)}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs transition shadow-md shadow-emerald-500/25"
          >
            <PlusCircle className="w-4 h-4 stroke-[2.5]" />
            <span>New Ticket</span>
          </button>
        )}
      </div>

      {/* CREATE TICKET MODAL/FORM */}
      {isCreatingTicket && (
        <div className="p-5 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl space-y-3 mb-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h3 className="text-sm font-bold text-white">Create Support Ticket</h3>
            <button
              onClick={() => setIsCreatingTicket(false)}
              className="text-slate-400 hover:text-white p-1 rounded hover:bg-slate-800"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <form onSubmit={handleCreateTicket} className="space-y-3 text-xs">
            <div>
              <label className="block font-semibold text-slate-300 mb-1">
                Subject <span className="text-rose-400">*</span>
              </label>
              <input
                type="text"
                required
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="e.g. Order delivery delay or payment query"
                className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-800 focus:border-emerald-500 focus:outline-none text-white transition"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-400 mb-1">
                Order ID (Optional)
              </label>
              <input
                type="text"
                value={orderId}
                onChange={(e) => setOrderId(e.target.value)}
                placeholder="e.g. IM102458"
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 focus:border-emerald-500 focus:outline-none text-white font-mono transition"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-300 mb-1">
                Message <span className="text-rose-400">*</span>
              </label>
              <textarea
                required
                rows={3}
                value={initialMessage}
                onChange={(e) => setInitialMessage(e.target.value)}
                placeholder="Describe your issue with order link and details..."
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 focus:border-emerald-500 focus:outline-none text-white transition resize-none"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsCreatingTicket(false)}
                className="px-4 py-2 rounded-xl border border-slate-800 hover:bg-slate-800 text-slate-300 transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmittingTicket}
                className="px-5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold transition flex items-center gap-1.5 disabled:opacity-50"
              >
                {isSubmittingTicket ? 'Creating...' : 'Submit Ticket'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ACTIVE TICKET CHAT THREAD */}
      {activeTicket && (
        <div className="p-4 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <button
              onClick={() => setActiveTicket(null)}
              className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-white px-2 py-1 rounded hover:bg-slate-800 transition"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Tickets</span>
            </button>

            <StatusBadge status={activeTicket.status} />
          </div>

          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs text-emerald-400 font-bold">
                #{activeTicket.ticketId}
              </span>
              {activeTicket.orderId && (
                <span className="text-[10px] text-slate-400 bg-slate-950 px-2 py-0.5 rounded border border-slate-800 font-mono">
                  Order #{activeTicket.orderId}
                </span>
              )}
            </div>
            <h3 className="text-sm font-bold text-white mt-1">{activeTicket.subject}</h3>
          </div>

          {/* Messages Timeline */}
          <div className="max-h-80 overflow-y-auto space-y-3 p-3 rounded-2xl bg-slate-950 border border-slate-800/80">
            {messages.map((msg) => {
              const isAdminMsg = msg.senderRole === 'admin';
              const timeStr = new Date(msg.createdAt).toLocaleTimeString('en-IN', {
                hour: '2-digit',
                minute: '2-digit',
              });

              return (
                <div
                  key={msg.id}
                  className={`p-3 rounded-2xl text-xs space-y-1 ${
                    isAdminMsg
                      ? 'bg-purple-950/40 border border-purple-500/30 text-purple-100 ml-4'
                      : 'bg-slate-900 border border-slate-800 text-slate-200 mr-4'
                  }`}
                >
                  <div className="flex items-center justify-between text-[10px] text-slate-400">
                    <span className="font-semibold flex items-center gap-1 text-slate-300">
                      {isAdminMsg ? (
                        <>
                          <Shield className="w-3 h-3 text-purple-400" />
                          <span className="text-purple-300 font-bold">INSTA MART Support</span>
                        </>
                      ) : (
                        <>
                          <User className="w-3 h-3 text-emerald-400" />
                          <span>{msg.senderName}</span>
                        </>
                      )}
                    </span>
                    <span className="font-mono">{timeStr}</span>
                  </div>
                  <p className="leading-relaxed whitespace-pre-wrap">{msg.message}</p>
                </div>
              );
            })}
          </div>

          {/* Reply Form */}
          {activeTicket.status !== 'Closed' ? (
            <form onSubmit={handleSendMessage} className="flex items-center gap-2">
              <input
                type="text"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Type your reply..."
                className="flex-1 px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 focus:border-emerald-500 focus:outline-none text-white text-xs transition"
              />
              <button
                type="submit"
                disabled={isSending || !newMessage.trim()}
                className="p-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 transition disabled:opacity-50"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          ) : (
            <p className="text-xs text-center text-slate-500 py-2">
              This ticket has been marked as closed.
            </p>
          )}
        </div>
      )}

      {/* TICKETS LIST */}
      {!activeTicket && !isCreatingTicket && (
        <div className="space-y-2.5">
          {tickets.length === 0 ? (
            <div className="text-center py-14 px-4 rounded-3xl bg-slate-900/40 border border-slate-800/80">
              <Headphones className="w-10 h-10 text-slate-600 mx-auto mb-3" />
              <h3 className="text-base font-bold text-white">No Support Tickets</h3>
              <p className="text-xs text-slate-400 mt-1 max-w-xs mx-auto">
                Need help with an order or payment? Create a ticket and our team will assist you.
              </p>
              <button
                onClick={() => setIsCreatingTicket(true)}
                className="mt-4 px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs transition"
              >
                Open Support Ticket
              </button>
            </div>
          ) : (
            tickets.map((tkt) => {
              const dateStr = new Date(tkt.lastMessageAt).toLocaleDateString('en-IN', {
                day: 'numeric',
                month: 'short',
              });

              return (
                <div
                  key={tkt.id}
                  onClick={() => setActiveTicket(tkt)}
                  className="p-4 rounded-2xl bg-slate-900/90 hover:bg-slate-850 border border-slate-800 hover:border-emerald-500/40 cursor-pointer transition shadow-md active:scale-[0.99] flex items-center justify-between gap-3 group"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-mono text-xs font-bold text-emerald-400">
                        #{tkt.ticketId}
                      </span>
                      <StatusBadge status={tkt.status} />
                      {tkt.orderId && (
                        <span className="text-[10px] text-slate-400 bg-slate-950 px-1.5 py-0.5 rounded font-mono">
                          Order #{tkt.orderId}
                        </span>
                      )}
                    </div>
                    <h4 className="text-sm font-bold text-white group-hover:text-emerald-300 transition truncate">
                      {tkt.subject}
                    </h4>
                    <span className="text-[10px] text-slate-500 font-mono">
                      Last update: {dateStr}
                    </span>
                  </div>

                  <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-emerald-400 transition" />
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
};
