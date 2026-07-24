import React, { useEffect, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import { supabase } from "../lib/supabase.js";
import { uploadImage } from "../lib/storage.js";
import Icon from "../components/Icon.jsx";
import ReplyThread from "../components/ReplyThread.jsx";

const PAGE_SIZE = 10;

export default function Home() {
  const { user, profile } = useAuth();
  const [memberships, setMemberships] = useState([]);
  const [selectedCommunity, setSelectedCommunity] = useState("");
  const [draft, setDraft] = useState("");
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState("");
  const [posting, setPosting] = useState(false);
  const [posts, setPosts] = useState([]);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(true);
  const [openThread, setOpenThread] = useState(null);

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
          "id, content, image_url, created_at, community_id, profile_id, profiles(username, display_name, avatar), communities(name, slug), likes(profile_id), comments(count)"
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

  const handleImageChange = (e) => {
    const file = e.target.files?.[0] || null;
    setImageFile(file);
    setImagePreview(file ? URL.createObjectURL(file) : "");
  };

  const handlePost = async () => {
    if ((!draft.trim() && !imageFile) || !selectedCommunity) return;
    setPosting(true);
    let imageUrl = null;
    if (imageFile) {
      try {
        imageUrl = await uploadImage(imageFile, "posts", user.id);
      } catch (err) {
        setPosting(false);
        return;
      }
    }
    const { error } = await supabase.from("posts").insert({
      community_id: selectedCommunity,
      profile_id: user.id,
      content: draft.trim(),
      image_url: imageUrl,
    });
    setPosting(false);
    if (!error) {
      setDraft("");
      setImageFile(null);
      setImagePreview("");
      setPage(0);
      loadPosts(0);
    }
  };

  const toggleLike = async (post) => {
    const likedByMe = post.likes?.some((l) => l.profile_id === user.id);
    setPosts((prev) =>
      prev.map((p) =>
        p.id === post.id
          ? {
              ...p,
              likes: likedByMe
                ? p.likes.filter((l) => l.profile_id !== user.id)
                : [...(p.likes || []), { profile_id: user.id }],
            }
          : p
      )
    );
    if (likedByMe) {
      await supabase.from("likes").delete().eq("post_id", post.id).eq("profile_id", user.id);
    } else {
      await supabase.from("likes").insert({ post_id: post.id, profile_id: user.id });
    }
  };

  const handleDelete = async (postId) => {
    await supabase.from("posts").delete().eq("id", postId);
    setPosts((prev) => prev.filter((p) => p.id !== postId));
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
          <div className="avatar">
            {profile?.avatar ? <img src={profile.avatar} alt="" /> : (profile?.display_name || "?").slice(0, 1).toUpperCase()}
          </div>
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
            {imagePreview && (
              <div className="composerImagePreview">
                <img src={imagePreview} alt="" />
                <button
                  type="button"
                  className="removeImage"
                  onClick={() => {
                    setImageFile(null);
                    setImagePreview("");
                  }}
                >
                  <Icon name="close" />
                </button>
              </div>
            )}
            <div className="composerActions">
              <label className="imageAttach">
                <Icon name="image" />
                <input type="file" accept="image/*" onChange={handleImageChange} hidden />
              </label>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <small>{draft.length}/500</small>
                <button
                  className="button primary"
                  disabled={posting || (!draft.trim() && !imageFile) || !selectedCommunity}
                  onClick={handlePost}
                >
                  {posting ? "Posting..." : "Post"}
                </button>
              </div>
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
        {posts.map((post) => {
          const likedByMe = post.likes?.some((l) => l.profile_id === user.id);
          return (
            <article className="postCard glassPanel" key={post.id}>
              <div className="avatar">
                {post.profiles?.avatar ? <img src={post.profiles.avatar} alt="" /> : (post.profiles?.display_name || "?").slice(0, 1).toUpperCase()}
              </div>
              <div className="postBody">
                <header>
                  <strong>{post.profiles?.display_name}</strong>
                  <small>@{post.profiles?.username}</small>
                  <small>·</small>
                  <Link to={`/app/community/${post.communities?.slug}`}>
                    <small>{post.communities?.name}</small>
                  </Link>
                </header>
                {post.content && <p>{post.content}</p>}
                {post.image_url && (
                  <div className="postImage">
                    <img src={post.image_url} alt="" />
                  </div>
                )}
                <div className="postActions">
                  <button className={likedByMe ? "liked" : ""} onClick={() => toggleLike(post)}>
                    <Icon name="heart" filled={likedByMe} /> {post.likes?.length || 0}
                  </button>
                  <button onClick={() => setOpenThread(openThread === post.id ? null : post.id)}>
                    <Icon name="comment" /> {post.comments?.[0]?.count || 0}
                  </button>
                  {post.profile_id === user?.id && (
                    <button onClick={() => handleDelete(post.id)}>
                      <Icon name="trash" /> Delete
                    </button>
                  )}
                </div>
                {openThread === post.id && <ReplyThread postId={post.id} />}
              </div>
            </article>
          );
        })}
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
