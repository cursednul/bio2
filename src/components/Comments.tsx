import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Send, MessageSquare, Trash2, ShieldCheck, Pin, PinOff, Loader2, Reply, CornerDownRight, X } from 'lucide-react';
import { collection, onSnapshot, addDoc, deleteDoc, doc, updateDoc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { CommentEntry, CommentReply, ThemeConfig } from '../types';
import { sound } from '../utils/audio';

interface CommentsProps {
  theme: ThemeConfig;
  isAdmin: boolean;
  onOpenAdmin: () => void;
  showToast: (msg: string) => void;
  onUpdateCount?: (count: number) => void;
}

export const Comments: React.FC<CommentsProps> = ({ isAdmin, onOpenAdmin, showToast, onUpdateCount }) => {
  const [entries, setEntries] = useState<CommentEntry[]>(() => {
    try {
      const saved = localStorage.getItem('cursed_saved_comments');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {
      // LocalStorage error fallback
    }
    return [];
  });

  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [author, setAuthor] = useState('');
  const [message, setMessage] = useState('');

  // Reply states
  const [replyingToId, setReplyingToId] = useState<string | null>(null);
  const [replyAuthor, setReplyAuthor] = useState('');
  const [replyMessage, setReplyMessage] = useState('');
  const [isSubmittingReply, setIsSubmittingReply] = useState(false);

  // Real-time Firestore sync: comments and replies are visible to all users across the web
  useEffect(() => {
    let hasMigratedLocal = false;
    const commentsCol = collection(db, 'comments');

    const unsubscribe = onSnapshot(
      commentsCol,
      (snapshot) => {
        const list: (CommentEntry & { createdAt?: string })[] = [];
        snapshot.forEach((docSnap) => {
          const data = docSnap.data();
          list.push({
            id: docSnap.id,
            author: (data.author as string) || 'anonymous',
            message: (data.message as string) || '',
            timestamp: (data.timestamp as string) || '',
            pinned: Boolean(data.pinned),
            isAdmin: Boolean(data.isAdmin),
            replies: Array.isArray(data.replies)
              ? (data.replies as CommentReply[]).map((r) => ({
                  ...r,
                  isAdmin: Boolean(r.isAdmin),
                }))
              : [],
            createdAt: (data.createdAt as string) || '',
          });
        });

        // Migrate pre-existing local comments if Firestore is empty on first setup
        if (snapshot.empty && !hasMigratedLocal) {
          hasMigratedLocal = true;
          try {
            const saved = localStorage.getItem('cursed_saved_comments');
            if (saved) {
              const parsed = JSON.parse(saved);
              if (Array.isArray(parsed) && parsed.length > 0) {
                parsed.forEach(async (c: Partial<CommentEntry>) => {
                  if (c && c.message) {
                    try {
                      await addDoc(collection(db, 'comments'), {
                        author: c.author || 'anonymous',
                        message: c.message,
                        timestamp: c.timestamp || 'Recent',
                        pinned: false,
                        isAdmin: Boolean(c.isAdmin),
                        replies: [],
                        createdAt: new Date().toISOString(),
                      });
                    } catch {
                      // Ignore migration errors
                    }
                  }
                });
              }
            }
          } catch {
            // Ignore
          }
        }

        // Sort: pinned comments at the top, then newest first
        list.sort((a, b) => {
          if (a.pinned && !b.pinned) return -1;
          if (!a.pinned && b.pinned) return 1;
          const dateA = a.createdAt || '';
          const dateB = b.createdAt || '';
          if (dateA && dateB) {
            return dateB.localeCompare(dateA);
          }
          return 0;
        });

        setEntries(list);
        if (onUpdateCount) onUpdateCount(list.length);
        setIsLoading(false);
        try {
          localStorage.setItem('cursed_saved_comments', JSON.stringify(list));
        } catch {
          // Ignore
        }
      },
      (error) => {
        handleFirestoreError(error, OperationType.GET, 'comments');
        setIsLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() || isSubmitting) return;

    setIsSubmitting(true);
    sound.playChime();

    const now = new Date();
    const timeFormatted = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const dateFormatted = now.toLocaleDateString([], { month: 'short', day: 'numeric' });

    const newCommentData = {
      author: author.trim() || (isAdmin ? 'cursed' : 'anonymous'),
      message: message.trim(),
      timestamp: `${dateFormatted}, ${timeFormatted}`,
      pinned: false,
      isAdmin: isAdmin,
      replies: [],
      createdAt: now.toISOString(),
    };

    try {
      await addDoc(collection(db, 'comments'), newCommentData);
      setMessage('');
      setAuthor('');
      showToast('Comment published for everyone! ✨');
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'comments');
      showToast('Failed to post comment. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePostReply = async (commentId: string) => {
    if (!replyMessage.trim() || isSubmittingReply) return;

    setIsSubmittingReply(true);
    sound.playChime();

    const now = new Date();
    const timeFormatted = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const dateFormatted = now.toLocaleDateString([], { month: 'short', day: 'numeric' });

    const newReply: CommentReply = {
      id: `reply_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      author: replyAuthor.trim() || (isAdmin ? 'cursed' : 'anonymous'),
      message: replyMessage.trim(),
      timestamp: `${dateFormatted}, ${timeFormatted}`,
      isAdmin: isAdmin,
      createdAt: now.toISOString(),
    };

    const targetComment = entries.find((e) => e.id === commentId);
    const existingReplies = targetComment?.replies || [];
    const updatedReplies = [...existingReplies, newReply];

    try {
      await updateDoc(doc(db, 'comments', commentId), {
        replies: updatedReplies,
      });
      setReplyMessage('');
      setReplyAuthor('');
      setReplyingToId(null);
      showToast('Reply published! 💬');
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `comments/${commentId}`);
      showToast('Failed to post reply.');
    } finally {
      setIsSubmittingReply(false);
    }
  };

  const handleDeleteReply = async (commentId: string, replyId: string) => {
    if (!isAdmin) return;
    sound.playPop();

    const targetComment = entries.find((e) => e.id === commentId);
    if (!targetComment) return;

    const updatedReplies = (targetComment.replies || []).filter((r) => r.id !== replyId);

    try {
      await updateDoc(doc(db, 'comments', commentId), {
        replies: updatedReplies,
      });
      showToast('Reply deleted');
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `comments/${commentId}`);
      showToast('Failed to delete reply');
    }
  };

  const handleDelete = async (id: string) => {
    if (!isAdmin) return;
    sound.playPop();
    try {
      await deleteDoc(doc(db, 'comments', id));
      showToast('Comment deleted by admin');
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `comments/${id}`);
      showToast('Failed to delete comment');
    }
  };

  const handleTogglePin = async (id: string, currentlyPinned?: boolean) => {
    if (!isAdmin) return;
    sound.playClick();
    const nextPinned = !currentlyPinned;
    try {
      await updateDoc(doc(db, 'comments', id), { pinned: nextPinned });
      showToast(nextPinned ? 'Comment pinned to top 📌' : 'Comment unpinned');
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `comments/${id}`);
      showToast('Failed to update pin status');
    }
  };

  return (
    <div className="w-full max-w-xl mx-auto mt-6 px-1 sm:px-0">

      {/* Admin Mode Status Banner */}
      {isAdmin && (
        <div className="mb-4 p-3 rounded-2xl bg-purple-950/40 border border-purple-500/30 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2 text-purple-300">
            <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
            <span className="font-semibold truncate">Admin Mode Active (Pin & Delete Enabled)</span>
          </div>
          <button
            onClick={onOpenAdmin}
            className="px-3 py-1.5 min-h-[36px] rounded-lg bg-purple-600 active:bg-purple-700 hover:bg-purple-500 text-white text-[11px] font-medium transition-colors cursor-pointer shrink-0"
          >
            Admin Suite
          </button>
        </div>
      )}

      {/* Leave a Comment Form */}
      <form
        onSubmit={handleSubmit}
        className="p-3 sm:p-5 rounded-3xl bg-white/[0.04] border border-white/10 backdrop-blur-xl shadow-xl mb-6 touch-manipulation"
      >
        <div className="flex items-center gap-2 mb-3">
          <MessageSquare className="w-4 h-4 text-purple-400" />
          <h3 className="text-sm font-semibold text-zinc-100">Leave a Comment</h3>
        </div>

        <div className="space-y-3">
          <input
            type="text"
            placeholder="Your name or handle (optional)"
            value={author}
            onChange={(e) => setAuthor(e.target.value)}
            maxLength={32}
            className="w-full px-3.5 py-3 rounded-xl bg-black/40 border border-white/15 text-base sm:text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-purple-400 transition-colors"
          />

          <textarea
            placeholder="Write your comment for everyone to see..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={3}
            maxLength={300}
            required
            className="w-full px-3.5 py-3 rounded-xl bg-black/40 border border-white/15 text-base sm:text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-purple-400 resize-none transition-colors"
          />

          {/* Submit Row */}
          <div className="flex items-center justify-between pt-1">
            <span className="text-[11px] font-mono text-zinc-500">
              Visible to all visitors
            </span>

            <button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center gap-2 px-5 py-2.5 min-h-[44px] rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 active:scale-96 disabled:opacity-50 text-white text-xs font-semibold shadow-md transition-all cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Posting...</span>
                </>
              ) : (
                <>
                  <span>Post Comment</span>
                  <Send className="w-3.5 h-3.5" />
                </>
              )}
            </button>
          </div>
        </div>
      </form>

      {/* Comments List */}
      {isLoading && entries.length === 0 ? (
        <div className="p-8 text-center rounded-2xl bg-white/[0.02] border border-white/5 text-zinc-400 text-xs flex items-center justify-center gap-2">
          <Loader2 className="w-4 h-4 animate-spin text-purple-400" />
          <span>Loading comments...</span>
        </div>
      ) : entries.length === 0 ? (
        <div className="p-8 text-center rounded-2xl bg-white/[0.02] border border-dashed border-white/10 text-zinc-500 text-xs">
          No comments yet. Be the first to leave one!
        </div>
      ) : (
        <div className="space-y-3">
          <AnimatePresence>
            {entries.map((comment) => (
              <motion.div
                key={comment.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className={`p-4 rounded-2xl border backdrop-blur-md shadow-sm flex flex-col justify-between group transition-colors ${
                  comment.pinned
                    ? 'bg-purple-950/20 border-purple-500/50 shadow-purple-900/10'
                    : 'bg-white/[0.04] border-white/10'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2 truncate">
                    <span className="font-semibold text-xs text-zinc-200 truncate">
                      {comment.author}
                    </span>
                    {comment.isAdmin && (
                      <span className="px-1.5 py-0.5 rounded text-[9px] font-mono bg-purple-500/30 text-purple-300 border border-purple-400/30 flex items-center gap-0.5 shrink-0 shadow-sm">
                        <ShieldCheck className="w-2.5 h-2.5 text-emerald-400" />
                        <span>ADMIN</span>
                      </span>
                    )}
                    {comment.pinned && (
                      <span className="px-1.5 py-0.5 rounded text-[9px] font-mono bg-purple-500/30 text-purple-300 border border-purple-400/30 flex items-center gap-0.5 shrink-0">
                        <Pin className="w-2.5 h-2.5" />
                        <span>PINNED</span>
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-[10px] font-mono text-zinc-500">
                      {comment.timestamp}
                    </span>

                    {/* ADMIN ACTIONS: Pin and Delete */}
                    {isAdmin && (
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => handleTogglePin(comment.id, comment.pinned)}
                          title={comment.pinned ? 'Unpin comment' : 'Pin comment'}
                          className={`p-1.5 min-w-[36px] min-h-[36px] rounded-lg transition-all flex items-center justify-center cursor-pointer ${
                            comment.pinned
                              ? 'bg-purple-600/40 text-purple-200'
                              : 'bg-white/5 active:bg-white/15 text-zinc-400 hover:text-purple-300'
                          }`}
                        >
                          {comment.pinned ? <PinOff className="w-3.5 h-3.5" /> : <Pin className="w-3.5 h-3.5" />}
                        </button>

                        <button
                          onClick={() => handleDelete(comment.id)}
                          title="Delete comment"
                          className="p-1.5 min-w-[36px] min-h-[36px] rounded-lg bg-rose-950/40 active:bg-rose-900/60 text-rose-400 border border-rose-500/20 transition-all flex items-center justify-center cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                <p className="text-xs text-zinc-300 leading-relaxed break-words">
                  {comment.message}
                </p>

                {/* Reply Trigger Bar */}
                <div className="mt-3 pt-2.5 border-t border-white/5 flex items-center justify-between text-xs">
                  <button
                    onClick={() => {
                      sound.playClick();
                      if (replyingToId === comment.id) {
                        setReplyingToId(null);
                      } else {
                        setReplyingToId(comment.id);
                        setReplyAuthor('');
                        setReplyMessage('');
                      }
                    }}
                    className="flex items-center gap-1.5 text-[11px] font-mono text-purple-300 hover:text-purple-200 cursor-pointer py-1 px-2.5 rounded-lg bg-purple-950/30 hover:bg-purple-900/40 border border-purple-500/20 transition-colors"
                  >
                    <Reply className="w-3 h-3" />
                    <span>{replyingToId === comment.id ? 'Cancel Reply' : 'Reply'}</span>
                    {comment.replies && comment.replies.length > 0 && (
                      <span className="ml-1 text-[10px] px-1.5 rounded-full bg-purple-500/30 text-purple-200">
                        {comment.replies.length}
                      </span>
                    )}
                  </button>
                </div>

                {/* Nested Replies List */}
                {comment.replies && comment.replies.length > 0 && (
                  <div className="mt-3 pl-3 sm:pl-4 border-l-2 border-purple-500/30 space-y-2">
                    {comment.replies.map((r) => (
                      <div
                        key={r.id}
                        className="p-2.5 rounded-xl bg-white/[0.03] border border-white/5 text-xs flex flex-col gap-1"
                      >
                        <div className="flex items-center justify-between text-[11px]">
                          <div className="flex items-center gap-1.5">
                            <CornerDownRight className="w-3 h-3 text-purple-400 shrink-0" />
                            <span className="font-semibold text-purple-300">{r.author}</span>
                            {r.isAdmin && (
                              <span className="px-1.5 py-0.5 rounded text-[9px] font-mono bg-purple-500/30 text-purple-300 border border-purple-400/30 flex items-center gap-0.5 shrink-0 shadow-sm">
                                <ShieldCheck className="w-2.5 h-2.5 text-emerald-400" />
                                <span>ADMIN</span>
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-1.5 text-zinc-500 text-[10px] font-mono">
                            <span>{r.timestamp}</span>
                            {isAdmin && (
                              <button
                                onClick={() => handleDeleteReply(comment.id, r.id)}
                                title="Delete reply"
                                className="p-1 text-rose-400 hover:text-rose-300 cursor-pointer ml-1"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            )}
                          </div>
                        </div>

                        <p className="text-zinc-300 leading-relaxed break-words pl-4">
                          {r.message}
                        </p>
                      </div>
                    ))}
                  </div>
                )}

                {/* Inline Reply Form Drawer */}
                <AnimatePresence>
                  {replyingToId === comment.id && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="mt-3 overflow-hidden"
                    >
                      <div className="p-3 rounded-2xl bg-black/50 border border-purple-500/30 space-y-2">
                        <div className="flex items-center justify-between text-[11px] text-zinc-400 font-mono">
                          <span>Replying to {comment.author}</span>
                          <button
                            onClick={() => setReplyingToId(null)}
                            className="p-1 hover:text-white cursor-pointer"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        <input
                          type="text"
                          placeholder="Your name or handle (optional)"
                          value={replyAuthor}
                          onChange={(e) => setReplyAuthor(e.target.value)}
                          maxLength={32}
                          className="w-full px-3 py-2 rounded-xl bg-black/40 border border-white/15 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-purple-400"
                        />

                        <textarea
                          placeholder="Write your reply..."
                          value={replyMessage}
                          onChange={(e) => setReplyMessage(e.target.value)}
                          rows={2}
                          maxLength={250}
                          autoFocus
                          required
                          className="w-full px-3 py-2 rounded-xl bg-black/40 border border-white/15 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-purple-400 resize-none"
                        />

                        <div className="flex justify-end gap-2 pt-1">
                          <button
                            type="button"
                            onClick={() => setReplyingToId(null)}
                            className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-zinc-400 text-xs cursor-pointer"
                          >
                            Cancel
                          </button>
                          <button
                            type="button"
                            onClick={() => handlePostReply(comment.id)}
                            disabled={isSubmittingReply || !replyMessage.trim()}
                            className="px-4 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer shadow-sm"
                          >
                            {isSubmittingReply ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <>
                                <span>Post Reply</span>
                                <Send className="w-3 h-3" />
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
};
