import React, { useEffect, useState, useCallback } from "react";
import { useParams, Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import { supabase } from "../lib/supabase.js";
import LiveTokenPanel from "../components/LiveTokenPanel.jsx";
import Icon from "../components/Icon.jsx";

export default function Community() {
  const { slug } = useParams();
  const { user, profile } = useAuth();
  const [community, setCommunity] = useState(null);
  const [membership, setMembership] = useState(null);
  const [posts, setPosts] = useState([]);
  const [draft, setDraft] = useState("");
  const [posting, setPosting] = useState(false);
  const [joining, setJoining] = useState(false);
  const [notFound, setNotFound] = useState(false);
  const [loading, setLoading] = useState(true);
  const [memberCount, setMemberCount] = useState(null);

  const loadCommunity = useCallback(async () => {
    const { data, error } = await supabase.from("communities").select("*").eq("slug", slug).maybeSingle();
    if (error || !data) {
      setNotFound(true);
      setLoading(false);
      return;
    }
    setCommunity(data);

    if (user) {
      const { data: mem } = await supabase
        .from("community_members")
        .select("*")
        .eq("community_id", data.id)
        .eq("profile_id", user.id)
        .maybeSingle();
      setMembership(mem || null);
    }

    const { count } = await supabase
      .from("community_members")
      .select("*", { count: "exact", head: true })
      .eq("community_id", data.id);
    setMemberCount(count ?? null);

    const { data: postData } = await supabase
      .from("posts")
      .select("id, content, created_at, profile_id, profiles(username, display_name), likes(count), comments(count)")
      .eq("community_id", data.id)
      .order("created_at", { ascending: false })
      .limit(25);
    setPosts(postData || []);
    setLoading(false);
  }, [slug, user]);

  useEffect(() => {
    setLoading(true);
    loadCommunity();
  }, [loadCommunity]);

  const handleJoin = async () => {
    if (!community || !user) return;
    setJoining(true);
    const { error } = await supabase.from("community_members").insert({
      community_id: community.id,
      profile_id: user.id,
    });
    if (!error) {
      setMembership({ role: "member" });
      setMemberCount((count) => (count === null ? count : count + 1));
    }
    setJoining(false);
  };

  const handleLeave = async () => {
    if (!community || !user) return;
    setJoining(true);
    await supabase.from("community_members").delete().eq("community_id", community.id).eq("profile_id", user.id);
    setMembership(null);
    setMemberCount((count) => (count === null ? count : Math.max(0, count - 1)));
    setJoining(false);
  };

  const handlePost = async () => {
    if (!draft.trim() || !community) return;
    setPosting(true);
    const { error } = await supabase.from("posts").insert({
      community_id: community.id,
      profile_id: user.id,
      content: draft.trim(),
    });
    setPosting(false);
    if (!error) {
      setDraft("");
      loadCommunity();
    }
  };

  const handleDelete = async (postId) => {
    await supabase.from("posts").delete().eq("id", postId);
    setPosts((prev) => prev.filter((p) => p.id !== postId));
  };

  if (notFound) return <Navigate to="/app/explore" replace />;
  if (loading || !community)
    return (
      <p className="muted" style={{ padding: 24 }}>
        Loading community...
      </p>
    );

  const isMember = !!membership;
  const canModerate = membership && (membership.role === "owner" || membership.role === "moderator");

  return (
    <div className="pageStack">
      <div className="communityHero glassPanel">
        <div
          className="banner"
          style={
            community.banner
              ? { backgroundImage: `url(${community.banner})`, backgroundSize: "cover" }
              : { background: "linear-gradient(120deg, rgba(139,92,246,.35), rgba(139,92,246,.08))" }
          }
        />
        <div className="communityHeroBody">
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div className="avatar heroAvatar">{community.name.slice(0, 1).toUpperCase()}</div>
            <div>
              <h1>
                {community.name} {community.verified && <span className="verified"><Icon name="check" /></span>}
              </h1>
              <span className="symbol">{community.symbol ? `$${community.symbol}` : ""}</span>
            </div>
          </div>
          {user &&
            (isMember ? (
              <button className="button ghost" onClick={handleLeave} disabled={joining || membership.role === "owner"}>
                {membership.role === "owner" ? "Owner" : joining ? "Leaving..." : "Leave"}
              </button>
            ) : (
              <button className="button primary" onClick={handleJoin} disabled={joining}>
                {joining ? "Joining..." : "Join"}
              </button>
            ))}
        </div>
      </div>

      {community.pinned_announcement && (
        <div className="announcement glassPanel">
          <Icon name="pin" />
          <span>{community.pinned_announcement}</span>
        </div>
      )}

      <LiveTokenPanel contractAddress={community.contract_address} />

      <div className="tokenStats">
        <div className="stat glassPanel">
          <span>Contract</span>
          <strong style={{ fontSize: 14, wordBreak: "break-all" }}>{community.contract_address || "—"}</strong>
        </div>
        <div className="stat glassPanel">
          <span>Members</span>
          <strong>{memberCount === null ? "Not available" : memberCount.toLocaleString()}</strong>
        </div>
      </div>

      <div className="communityInfo glassPanel">
        <div>
          <h3>About</h3>
          <p>{community.description}</p>
        </div>
        <div className="linkGrid">
          {community.website && (
            <a href={community.website} target="_blank" rel="noreferrer">
              Website
            </a>
          )}
          {community.twitter && (
            <a href={community.twitter} target="_blank" rel="noreferrer">
              Twitter
            </a>
          )}
          {community.telegram && (
            <a href={community.telegram} target="_blank" rel="noreferrer">
              Telegram
            </a>
          )}
          {community.discord && (
            <a href={community.discord} target="_blank" rel="noreferrer">
              Discord
            </a>
          )}
        </div>
        {community.rules?.length > 0 && (
          <div className="wideInfo">
            <h3>Rules</h3>
            <ul>
              {community.rules.map((rule, i) => (
                <li key={i}>{rule}</li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {isMember ? (
        <div className="composer glassPanel">
          <div className="avatar">{(profile?.display_name || "?").slice(0, 1).toUpperCase()}</div>
          <div className="composerBody">
            <textarea
              placeholder={`Post in ${community.name}...`}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              maxLength={500}
            />
            <div className="composerActions">
              <small>{draft.length}/500</small>
              <button className="button primary" disabled={posting || !draft.trim()} onClick={handlePost}>
                {posting ? "Posting..." : "Post"}
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="readOnlyNotice glassPanel">
          <span>Join this community to post and comment.</span>
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
              </header>
              <p>{post.content}</p>
              <div className="postActions">
                <button><Icon name="heart" /> {post.likes?.[0]?.count || 0}</button>
                <button><Icon name="comment" /> {post.comments?.[0]?.count || 0}</button>
                {(post.profile_id === user?.id || canModerate) && (
                  <button onClick={() => handleDelete(post.id)}><Icon name="trash" /> Delete</button>
                )}
              </div>
            </div>
          </article>
        ))}
        {posts.length === 0 && <p className="muted">No posts yet — be the first.</p>}
      </div>
    </div>
  );
}
