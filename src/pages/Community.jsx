import React, { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate, Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import { supabase } from "../lib/supabase.js";
import { uploadImage } from "../lib/storage.js";
import { CHAIN_OPTIONS, fetchTokenInfo } from "../lib/dexscreener.js";
import LiveTokenPanel from "../components/LiveTokenPanel.jsx";
import ReplyThread from "../components/ReplyThread.jsx";
import Icon, { XIcon, TelegramIcon, DiscordIcon } from "../components/Icon.jsx";

const CHAIN_LABELS = Object.fromEntries(CHAIN_OPTIONS.map((c) => [c.id, c.label]));

export default function Community() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const [community, setCommunity] = useState(null);
  const [membership, setMembership] = useState(null);
  const [posts, setPosts] = useState([]);
  const [draft, setDraft] = useState("");
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState("");
  const [posting, setPosting] = useState(false);
  const [joining, setJoining] = useState(false);
  const [notFound, setNotFound] = useState(false);
  const [loading, setLoading] = useState(true);
  const [memberCount, setMemberCount] = useState(null);
  const [openThread, setOpenThread] = useState(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editChain, setEditChain] = useState("solana");
  const [editAddress, setEditAddress] = useState("");
  const [editLookup, setEditLookup] = useState({ status: "idle", data: null });
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState("");

  const openEdit = () => {
    setEditChain(community.chain || "solana");
    setEditAddress(community.contract_address || "");
    setEditLookup({ status: "idle", data: null });
    setEditError("");
    setEditOpen(true);
    setMenuOpen(false);
  };

  useEffect(() => {
    if (!editOpen) return;
    const address = editAddress.trim();
    if (!address) {
      setEditLookup({ status: "idle", data: null });
      return;
    }
    setEditLookup({ status: "loading", data: null });
    const timer = setTimeout(async () => {
      try {
        const info = await fetchTokenInfo(address, editChain);
        setEditLookup(info ? { status: "found", data: info } : { status: "not-found", data: null });
      } catch {
        setEditLookup({ status: "error", data: null });
      }
    }, 600);
    return () => clearTimeout(timer);
  }, [editAddress, editChain, editOpen]);

  const handleSaveEdit = async () => {
    setEditSaving(true);
    setEditError("");
    const payload = {
      chain: editChain,
      contract_address: editAddress.trim() || null,
    };
    if (editLookup.status === "found" && editLookup.data) {
      payload.logo = editLookup.data.logo || community.logo;
      payload.market_cap = editLookup.data.marketCap ?? community.market_cap;
      payload.website = editLookup.data.website;
      payload.twitter = editLookup.data.twitter;
      payload.telegram = editLookup.data.telegram;
      payload.discord = editLookup.data.discord;
    }
    const { data, error } = await supabase
      .from("communities")
      .update(payload)
      .eq("id", community.id)
      .select()
      .single();
    setEditSaving(false);
    if (error) {
      setEditError(error.message);
      return;
    }
    setCommunity(data);
    setEditOpen(false);
  };

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
      .select(
        "id, content, image_url, created_at, profile_id, profiles(username, display_name, avatar), likes(profile_id), comments(count)"
      )
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

  const handleImageChange = (e) => {
    const file = e.target.files?.[0] || null;
    setImageFile(file);
    setImagePreview(file ? URL.createObjectURL(file) : "");
  };

  const handlePost = async () => {
    if ((!draft.trim() && !imageFile) || !community) return;
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
      community_id: community.id,
      profile_id: user.id,
      content: draft.trim(),
      image_url: imageUrl,
    });
    setPosting(false);
    if (!error) {
      setDraft("");
      setImageFile(null);
      setImagePreview("");
      loadCommunity();
    }
  };

  const handleDelete = async (postId) => {
    await supabase.from("posts").delete().eq("id", postId);
    setPosts((prev) => prev.filter((p) => p.id !== postId));
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

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch (err) {
      // Clipboard API can be blocked (e.g. no HTTPS, permissions) — fail quietly.
    }
    setMenuOpen(false);
  };

  const handleDeleteCommunity = async () => {
    if (!community) return;
    if (!window.confirm(`Delete "${community.name}" permanently? This removes all posts, members, and comments. This can't be undone.`)) {
      return;
    }
    setDeleting(true);
    const { error } = await supabase.from("communities").delete().eq("id", community.id);
    setDeleting(false);
    if (!error) {
      navigate("/app/explore", { replace: true });
    }
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
        <div className="headerMenu communityMenu">
          <button className="dotsButton" onClick={() => setMenuOpen((v) => !v)} aria-label="Community options">
            <Icon name="dots" filled />
          </button>
          {menuOpen && (
            <div className="dropdownMenu" onMouseLeave={() => setMenuOpen(false)}>
              <button onClick={handleCopyLink}>
                <Icon name="link" />
                {copied ? "Link copied" : "Copy link"}
              </button>
              {community.owner_id === user?.id && (
                <>
                  <button onClick={openEdit}>
                    <Icon name="edit" />
                    Edit community
                  </button>
                  <hr />
                  <button className="danger" onClick={handleDeleteCommunity} disabled={deleting}>
                    <Icon name="trash" />
                    {deleting ? "Deleting..." : "Delete community"}
                  </button>
                </>
              )}
            </div>
          )}
        </div>
        <div
          className="banner"
          style={
            community.banner
              ? { backgroundImage: `url(${community.banner})`, backgroundSize: "cover" }
              : { background: "linear-gradient(120deg, rgba(255,90,31,.35), rgba(255,176,32,.08))" }
          }
        />
        <div className="communityHeroBody">
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div className="avatar heroAvatar">
              {community.logo ? <img src={community.logo} alt="" /> : community.name.slice(0, 1).toUpperCase()}
            </div>
            <div>
              <h1>
                {community.name} {community.verified && <span className="verified"><Icon name="check" /></span>}
              </h1>
              <span className="symbol">{community.symbol ? `$${community.symbol}` : ""}</span>
              <span className="chainTag">{CHAIN_LABELS[community.chain] || community.chain}</span>
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

      <LiveTokenPanel contractAddress={community.contract_address} chain={community.chain} />

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
          {(community.website || community.twitter || community.telegram || community.discord) && (
            <div className="socialIcons">
              {community.website && (
                <a href={community.website} target="_blank" rel="noreferrer" aria-label="Website" title="Website">
                  <Icon name="link" />
                </a>
              )}
              {community.twitter && (
                <a href={community.twitter} target="_blank" rel="noreferrer" aria-label="X" title="X">
                  <XIcon />
                </a>
              )}
              {community.telegram && (
                <a href={community.telegram} target="_blank" rel="noreferrer" aria-label="Telegram" title="Telegram">
                  <TelegramIcon />
                </a>
              )}
              {community.discord && (
                <a href={community.discord} target="_blank" rel="noreferrer" aria-label="Discord" title="Discord">
                  <DiscordIcon />
                </a>
              )}
            </div>
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

      {editOpen && (
        <div className="modalOverlay" onClick={() => setEditOpen(false)}>
          <div className="glassPanel modalCard" onClick={(e) => e.stopPropagation()}>
            <h3>Edit community</h3>
            <p className="muted" style={{ marginTop: 4 }}>
              Update the contract address (and chain, if it changed). Website and social links refresh automatically from DexScreener.
            </p>
            <div className="formGrid" style={{ marginTop: 16 }}>
              <label>
                Chain
                <select value={editChain} onChange={(e) => setEditChain(e.target.value)}>
                  {CHAIN_OPTIONS.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="wideField">
                Contract address
                <input value={editAddress} onChange={(e) => setEditAddress(e.target.value)} placeholder="Paste the token's contract address" />
              </label>
            </div>

            {editLookup.status === "loading" && <p className="inlineNotice">Looking up token info on DexScreener...</p>}
            {editLookup.status === "not-found" && (
              <p className="inlineNotice">No DexScreener data found for that address yet — you can still save it and fill this in later.</p>
            )}
            {editLookup.status === "error" && <p className="inlineNotice">Couldn't reach DexScreener — you can still save.</p>}
            {editLookup.status === "found" && editLookup.data && (
              <div className="tokenPreview">
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  {editLookup.data.logo ? (
                    <img src={editLookup.data.logo} alt="" style={{ width: 40, height: 40, borderRadius: 8 }} />
                  ) : (
                    <div className="avatar">{(editLookup.data.symbol || "?").slice(0, 1)}</div>
                  )}
                  <div>
                    <strong>{editLookup.data.name}</strong>
                    <br />
                    <span className="symbol">{editLookup.data.symbol ? `$${editLookup.data.symbol}` : ""}</span>
                  </div>
                </div>
                <div>
                  <span className="muted">Market cap</span>
                  <br />
                  <strong>{editLookup.data.marketCap ? `$${Number(editLookup.data.marketCap).toLocaleString()}` : "—"}</strong>
                </div>
              </div>
            )}

            {editError && <p className="inlineNotice">{editError}</p>}

            <div className="createActions" style={{ marginTop: 16 }}>
              <button className="button primary" onClick={handleSaveEdit} disabled={editSaving}>
                {editSaving ? "Saving..." : "Save changes"}
              </button>
              <button className="button ghost" onClick={() => setEditOpen(false)}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {isMember ? (
        <div className="composer glassPanel">
          <div className="avatar">
            {profile?.avatar ? <img src={profile.avatar} alt="" /> : (profile?.display_name || "?").slice(0, 1).toUpperCase()}
          </div>
          <div className="composerBody">
            <textarea
              placeholder={`Post in ${community.name}...`}
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
                <button className="button primary" disabled={posting || (!draft.trim() && !imageFile)} onClick={handlePost}>
                  {posting ? "Posting..." : "Post"}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="readOnlyNotice glassPanel">
          <span>Join this community to post and comment.</span>
        </div>
      )}

      <div className="feedStack">
        {posts.map((post) => {
          const likedByMe = post.likes?.some((l) => l.profile_id === user?.id);
          return (
            <article className="postCard glassPanel" key={post.id}>
              <div className="avatar">
                {post.profiles?.avatar ? <img src={post.profiles.avatar} alt="" /> : (post.profiles?.display_name || "?").slice(0, 1).toUpperCase()}
              </div>
              <div className="postBody">
                <header>
                  <strong>{post.profiles?.display_name}</strong>
                  <small>@{post.profiles?.username}</small>
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
                  {(post.profile_id === user?.id || canModerate) && (
                    <button onClick={() => handleDelete(post.id)}><Icon name="trash" /> Delete</button>
                  )}
                </div>
                {openThread === post.id && <ReplyThread postId={post.id} />}
              </div>
            </article>
          );
        })}
        {posts.length === 0 && <p className="muted">No posts yet — be the first.</p>}
      </div>
    </div>
  );
}
