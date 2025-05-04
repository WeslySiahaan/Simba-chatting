import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { auth } from "../firebase-config";
import "../styles/ChatList.css";

export const ChatList = ({ posts, setPosts }) => {
  const [search, setSearch] = useState("");
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchPosts = async () => {
      try {
        const response = await fetch("http://localhost:8080/posts");
        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`Failed to fetch posts: ${errorText}`);
        }
        const data = await response.json();
        console.log("Fetched posts:", data);
        setPosts(data);
      } catch (err) {
        console.error("Fetch error:", err);
        setError(err.message);
      }
    };

    fetchPosts();
  }, [setPosts]);

  const filteredPosts = posts.filter((post) =>
    (post.title.toLowerCase() + " " + post.description.toLowerCase()).includes(search.toLowerCase())
  );

  console.log("Filtered posts:", filteredPosts);

  const handleLike = async (postId) => {
    if (!auth.currentUser) return;

    const maxRetries = 3;
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        const token = await auth.currentUser.getIdToken();
        console.log("Sending token:", token); // Debug log
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
        // Refresh posts to update like count
        const updatedResponse = await fetch("http://localhost:8080/posts");
        const updatedData = await updatedResponse.json();
        setPosts(updatedData);
        return;
      } catch (err) {
        if (attempt === maxRetries - 1) {
          console.error("Like error after retries:", err);
          setError(`Failed to like post after ${maxRetries} attempts: ${err.message}`);
        } else {
          console.warn(`Like attempt ${attempt + 1} failed, retrying...`, err);
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }
    }
  };

  return (
    <div className="chat-list">
      <div className="header">
        <h1>Posts</h1>
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
        {error && <p className="error">{error}</p>}
        {filteredPosts.length === 0 && !error && <p>No posts found.</p>}
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
              onError={(e) => console.error("Error loading image:", post.image_data)}
            />
            <div className="post-overlay">
              <h3>{post.title}</h3>
              <p className="like-count">Likes: {post.like_count}</p>
              <button onClick={(e) => { e.stopPropagation(); handleLike(post.id); }} className="like-button">
                Like
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};