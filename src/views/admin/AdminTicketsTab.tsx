import React, { useState, useEffect } from 'react';
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  addDoc,
  doc,
  updateDoc,
} from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { Ticket, TicketMessage, TicketStatus } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { StatusBadge } from '../../components/common/StatusBadge';
import {
  Headphones,
  Send,
  MessageSquare,
  X,
  User,
  Shield,
  ArrowLeft,
} from 'lucide-react';

export const AdminTicketsTab: React.FC = () => {
  const { profile } = useAuth();
  const { success, error } = useToast();

  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [activeTicket, setActiveTicket] = useState<Ticket | null>(null);
  const [messages, setMessages] = useState<TicketMessage[]>([]);
  const [replyText, setReplyText] = useState('');
  const [isSending, setIsSending] = useState(false);

  useEffect(() => {
    const q = query(collection(db, 'tickets'), orderBy('lastMessageAt', 'desc'));
    const unsub = onSnapshot(
      q,
      (snap) => {
        const list = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Ticket));
        setTickets(list);
      },
      (err) => console.warn('Admin tickets error:', err)
    );
    return () => unsub();
  }, []);

  useEffect(() => {
    if (!activeTicket) {
      setMessages([]);
      return;
    }
    const q = query(
      collection(db, 'ticketMessages'),
      orderBy('createdAt', 'asc')
    );
    const unsub = onSnapshot(q, (snap) => {
      const allMsgs = snap.docs.map((d) => ({ id: d.id, ...d.data() } as TicketMessage));
      setMessages(allMsgs.filter((m) => m.ticketId === activeTicket.id));
    });
    return () => unsub();
  }, [activeTicket]);

  const handleSendReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeTicket || !replyText.trim()) return;

    setIsSending(true);
    try {
      await addDoc(collection(db, 'ticketMessages'), {
        ticketId: activeTicket.id,
        senderId: profile?.id || 'admin',
        senderName: 'INSTA MART Support',
        senderRole: 'admin',
        message: replyText.trim(),
        createdAt: Date.now(),
      });

      await updateDoc(doc(db, 'tickets', activeTicket.id), {
        status: 'Answered',
        lastMessageAt: Date.now(),
        updatedAt: Date.now(),
      });

      setReplyText('');
      success('Reply sent to customer.');
    } catch (err: any) {
      error(err?.message || 'Failed to send reply.');
    } finally {
      setIsSending(false);
    }
  };

  const handleStatusChange = async (newStatus: TicketStatus) => {
    if (!activeTicket) return;
    try {
      await updateDoc(doc(db, 'tickets', activeTicket.id), {
        status: newStatus,
        updatedAt: Date.now(),
      });
      setActiveTicket({ ...activeTicket, status: newStatus });
      success(`Ticket status marked as ${newStatus}.`);
    } catch (err: any) {
      error(err?.message || 'Failed to update ticket status.');
    }
  };

  return (
    <div className="space-y-4">
      {/* Detail or List */}
      {activeTicket ? (
        <div className="p-4 rounded-3xl bg-slate-900 border border-slate-800 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <button
              onClick={() => setActiveTicket(null)}
              className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-white px-2 py-1 rounded hover:bg-slate-800 transition"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Tickets</span>
            </button>

            <div className="flex items-center gap-2">
              <select
                value={activeTicket.status}
                onChange={(e) => handleStatusChange(e.target.value as TicketStatus)}
                className="px-2.5 py-1 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white"
              >
                <option value="Open">Open</option>
                <option value="Pending">Pending</option>
                <option value="Answered">Answered</option>
                <option value="Closed">Closed</option>
              </select>
            </div>
          </div>

          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs text-purple-400 font-bold">
                #{activeTicket.ticketId}
              </span>
              <span className="text-xs text-white font-medium">@{activeTicket.username}</span>
              {activeTicket.orderId && (
                <span className="text-[10px] text-slate-400 bg-slate-950 px-2 py-0.5 rounded font-mono">
                  Order #{activeTicket.orderId}
                </span>
              )}
            </div>
            <h3 className="text-sm font-bold text-white mt-1">{activeTicket.subject}</h3>
          </div>

          {/* Messages */}
          <div className="max-h-80 overflow-y-auto space-y-3 p-3 rounded-2xl bg-slate-950 border border-slate-800 text-xs">
            {messages.map((m) => {
              const isAdmin = m.senderRole === 'admin';
              return (
                <div
                  key={m.id}
                  className={`p-3 rounded-2xl ${
                    isAdmin
                      ? 'bg-purple-950/40 border border-purple-500/30 text-purple-100 ml-4'
                      : 'bg-slate-900 border border-slate-800 text-slate-200 mr-4'
                  }`}
                >
                  <div className="flex items-center justify-between text-[10px] text-slate-400 mb-1">
                    <span className="font-bold">
                      {isAdmin ? 'INSTA MART Support (You)' : `@${activeTicket.username}`}
                    </span>
                    <span>{new Date(m.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                  <p className="leading-relaxed whitespace-pre-wrap">{m.message}</p>
                </div>
              );
            })}
          </div>

          {/* Reply Box */}
          <form onSubmit={handleSendReply} className="flex items-center gap-2">
            <input
              type="text"
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              placeholder="Type official admin response..."
              className="flex-1 px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:border-purple-500 focus:outline-none transition"
            />
            <button
              type="submit"
              disabled={isSending || !replyText.trim()}
              className="p-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white transition disabled:opacity-50"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      ) : (
        <div className="space-y-2.5">
          {tickets.length === 0 ? (
            <div className="text-center py-12 rounded-3xl bg-slate-900/40 border border-slate-800 text-slate-400 text-xs">
              No tickets found.
            </div>
          ) : (
            tickets.map((tkt) => (
              <div
                key={tkt.id}
                onClick={() => setActiveTicket(tkt)}
                className="p-4 rounded-2xl bg-slate-900/90 hover:bg-slate-850 border border-slate-800 hover:border-purple-500/40 cursor-pointer transition flex items-center justify-between gap-3"
              >
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-mono text-xs font-bold text-purple-400">
                      #{tkt.ticketId}
                    </span>
                    <span className="text-xs text-white font-medium">@{tkt.username}</span>
                    <StatusBadge status={tkt.status} />
                  </div>
                  <h4 className="text-sm font-bold text-white truncate">{tkt.subject}</h4>
                </div>
                <span className="text-[10px] text-slate-500 font-mono">
                  {new Date(tkt.lastMessageAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                </span>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};
