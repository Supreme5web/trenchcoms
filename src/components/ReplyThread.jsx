import React, { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext.jsx";
import { supabase } from "../lib/supabase.js";
import Icon from "./Icon.jsx";

export default function ReplyThread({ postId }) {
  const { user, profile } = useAuth();
  const [replies, setReplies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);

  useEffect(() => {
    let active = true;
    setLoading(true);
    supabase
      .from("comments")
      .select("id, content, created_at, profile_id, profiles(username, display_name, avatar)")
      .eq("post_id", postId)
      .order("created_at", { ascending: true })
      .then(({ data, error }) => {
        if (active && !error) setReplies(data || []);
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [postId]);

  const handleReply = async () => {
    if (!draft.trim()) return;
    setSending(true);
    const { data, error } = await supabase
      .from("comments")
      .insert({ post_id: postId, profile_id: user.id, content: draft.trim() })
      .select("id, content, created_at, profile_id")
      .single();
    setSending(false);
    if (!error) {
      setReplies((prev) => [
        ...prev,
        { ...data, profiles: { username: profile?.username, display_name: profile?.display_name, avatar: profile?.avatar } },
      ]);
      setDraft("");
    }
  };

  const handleDelete = async (id) => {
    await supabase.from("comments").delete().eq("id", id);
    setReplies((prev) => prev.filter((r) => r.id !== id));
  };

  return (
    <div className="replyThread">
      {loading && <p className="muted">Loading replies...</p>}
      {!loading &&
        replies.map((r) => (
          <div className="reply" key={r.id}>
            <div className="avatar small">
              {r.profiles?.avatar ? <img src={r.profiles.avatar} alt="" /> : (r.profiles?.display_name || "?").slice(0, 1).toUpperCase()}
            </div>
            <div className="replyBody">
              <header>
                <strong>{r.profiles?.display_name}</strong>
                <small>@{r.profiles?.username}</small>
              </header>
              <p>{r.content}</p>
            </div>
            {r.profile_id === user?.id && (
              <button className="replyDelete" onClick={() => handleDelete(r.id)}>
                <Icon name="close" />
              </button>
            )}
          </div>
        ))}
      {!loading && replies.length === 0 && <p className="muted">No replies yet.</p>}

      <div className="replyComposer">
        <input
          placeholder="Post a reply"
          value={draft}
          maxLength={300}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleReply()}
        />
        <button className="button small primary" disabled={sending || !draft.trim()} onClick={handleReply}>
          Reply
        </button>
      </div>
    </div>
  );
}
