import React, { useEffect, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import { supabase } from "../lib/supabase.js";

const PAGE_SIZE = 10;

export default function Home() {
  const { user, profile } = useAuth();
  const [memberships, setMemberships] = useState([]);
  const [selectedCommunity, setSelectedCommunity] = useState("");
  const [draft, setDraft] = useState("");
  const [posting, setPosting] = useState(false);
  const [posts, setPosts] = useState([]);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("community_members")
      .select("community_id, communities(id, name, slug)")
      .eq("profile_id", user.id)
      .then(({ data, error }) => {
        if (!error) setMemberships(data || []);
      });
  }, [user]);

  const loadPosts = useCallback(
    async (pageIndex) => {
      const communityIds = memberships.map((m) => m.community_id);
      if (communityIds.length === 0) {
        setPosts([]);
        setHasMore(false);
        setLoading(false);
        return;
      }
      setLoading(true);
      const from = pageIndex * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;
      const { data, error } = await supabase
        .from("posts")
        .select(
          "id, content, created_at, community_id, profile_id, profiles(username, display_name), communities(name, slug), likes(count), comments(count)"
        )
        .in("community_id", communityIds)
        .order("created_at", { ascending: false })
        .range(from, to);
      if (!error) {
        setPosts((prev) => (pageIndex === 0 ? data : [...prev, ...data]));
        setHasMore((data || []).length === PAGE_SIZE);
      }
      setLoading(false);
    },
    [memberships]
  );

  useEffect(() => {
    setPage(0);
    loadPosts(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [memberships]);

  const handlePost = async () => {
    if (!draft.trim() || !selectedCommunity) return;
    setPosting(true);
    const { error } = await supabase.from("posts").insert({
      community_id: selectedCommunity,
      profile_id: user.id,
      content: draft.trim(),
    });
    setPosting(false);
    if (!error) {
      setDraft("");
      setPage(0);
      loadPosts(0);
    }
  };

  const loadMore = () => {
    const next = page + 1;
    setPage(next);
    loadPosts(next);
  };

  return (
    <div className="pageStack">
      <div className="pageHeader">
        <span className="eyebrow">Home</span>
        <h1>Your feed</h1>
        <p>Posts from communities you've joined.</p>
      </div>

      {memberships.length > 0 ? (
        <div className="composer glassPanel">
          <div className="avatar">{(profile?.display_name || "?").slice(0, 1).toUpperCase()}</div>
          <div className="composerBody">
            <select value={selectedCommunity} onChange={(e) => setSelectedCommunity(e.target.value)}>
              <option value="">Post to...</option>
              {memberships.map((m) => (
                <option key={m.community_id} value={m.community_id}>
                  {m.communities?.name}
                </option>
              ))}
            </select>
            <textarea
              placeholder="Share an update, a call, or a question..."
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              maxLength={500}
            />
            <div className="composerActions">
              <small>{draft.length}/500</small>
              <button
                className="button primary"
                disabled={posting || !draft.trim() || !selectedCommunity}
                onClick={handlePost}
              >
                {posting ? "Posting..." : "Post"}
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="readOnlyNotice glassPanel">
          <span>
            <strong>Join a community</strong> to start posting and see a personalized feed.
          </span>
          <Link className="button primary" to="/app/explore">
            Explore communities
          </Link>
        </div>
      )}

      <div className="feedStack">
        {posts.map((post) => (
          <article className="postCard glassPanel" key={post.id}>
            <div className="avatar">{(post.profiles?.display_name || "?").slice(0, 1).toUpperCase()}</div>
            <div className="postBody">
              <header>
                <strong>{post.profiles?.display_name}</strong>
                <small>@{post.profiles?.username}</small>
                <small>·</small>
                <Link to={`/app/community/${post.communities?.slug}`}>
                  <small>{post.communities?.name}</small>
                </Link>
              </header>
              <p>{post.content}</p>
              <div className="postActions">
                <button>♥ {post.likes?.[0]?.count || 0}</button>
                <button>💬 {post.comments?.[0]?.count || 0}</button>
              </div>
            </div>
          </article>
        ))}
        {!loading && posts.length === 0 && memberships.length > 0 && (
          <p className="muted">No posts yet in your communities. Be the first to post.</p>
        )}
        {loading && <p className="muted">Loading...</p>}
      </div>

      {hasMore && posts.length > 0 && (
        <button className="button ghost loadMore" onClick={loadMore}>
          Load more
        </button>
      )}
    </div>
  );
}
