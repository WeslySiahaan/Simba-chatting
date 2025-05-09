import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { auth } from "../firebase-config";
import "../styles/ChatList.css";

export const ChatList = ({ posts, setPosts }) => {
  const [search, setSearch] = useState("");
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [liking, setLiking] = useState(null);
  const navigate = useNavigate();

  const loadPosts = async () => {
    try {
      setLoading(true);
      const response = await fetch("http://localhost:8080/posts");
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to fetch posts: ${errorText}`);
      }
      const data = await response.json();
      setPosts(data);
    } catch (err) {
      console.error("Fetch error:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPosts();
  }, []);

  const filteredPosts = useMemo(() => {
    return posts.filter((post) =>
      (post.title.toLowerCase() + " " + post.description.toLowerCase()).includes(search.toLowerCase())
    );
  }, [posts, search]);

  const handleLike = async (postId) => {
    if (!auth.currentUser) return;

    setLiking(postId);
    const maxRetries = 3;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        const token = await auth.currentUser.getIdToken();
        const response = await fetch(`http://localhost:8080/posts/${postId}/like`, {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        });

        if (!response.ok) {
          throw new Error(`Failed to like post: ${response.statusText}`);
        }

        await loadPosts();
        return;
      } catch (err) {
        if (attempt === maxRetries - 1) {
          console.error("Like error after retries:", err);
          setError(`Failed to like post after ${maxRetries} attempts: ${err.message}`);
        } else {
          console.warn(`Retrying like (${attempt + 1})...`);
          await new Promise((resolve) => setTimeout(resolve, 1000));
        }
      } finally {
        setLiking(null);
      }
    }
  };

  return (
    <div className="chat-list">
      <div className="header">
      <h1 style={{ color: "black" }}>Posts</h1>
        <div className="menu-icon">⋮</div>
      </div>
      <input
        type="text"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search posts..."
        className="search-bar"
      />
      <div className="posts-grid">
        {loading && <p className="loading">Loading posts...</p>}
        {error && <p className="error">{error}</p>}
        {!loading && filteredPosts.length === 0 && !error && <p>No posts found.</p>}
        {filteredPosts.map((post) => (
          <div
            key={post.id}
            className="post-card"
            onClick={() => navigate(`/chat/${post.id}`)}
          >
            <img
              src={`data:image/png;base64,${post.image_data}`}
              alt={post.description}
              className="post-image"
              onError={(e) => {
                e.target.onerror = null;
                e.target.src = "/default-image.png";
              }}
            />
            <div className="post-overlay">
              <h3>{post.title}</h3>
              <p className="like-count">Likes: {post.like_count}</p>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleLike(post.id);
                }}
                className="like-button"
                disabled={liking === post.id}
              >
                {liking === post.id ? "Liking..." : "Like"}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
