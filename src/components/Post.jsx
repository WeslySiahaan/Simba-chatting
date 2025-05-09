import React from "react";
import "../styles/Post.css";

function Post({ post, onLike, selectedPostId }) {
  const isSelected = post.id === selectedPostId;

  return (
    <div
      style={{
        border: "1px solid #333",
        padding: "16px",
        margin: "12px 0",
        backgroundColor: isSelected ? "#1e1e1e" : "#121212", // Dark background
        color: "#fff",
        borderRadius: "8px",
        boxShadow: "0 2px 6px rgba(0, 0, 0, 0.3)",
        transition: "background-color 0.3s ease", // smooth transition
      }}
    >
      <img
        src={`data:image/png;base64,${post.image_data}`}
        alt={post.description}
        style={{
          maxWidth: "120px",
          maxHeight: "120px",
          borderRadius: "6px",
          marginBottom: "12px",
          objectFit: "cover",
        }}
        onError={(e) => console.error("Error loading image:", post.image_data)}
      />
      <p style={{ fontSize: "1rem", color: "#cccccc", marginBottom: "8px" }}>
        {post.description}
      </p>
      <p style={{ fontSize: "0.9rem", color: "#aaaaaa", marginBottom: "12px" }}>
        Likes: {post.like_count}
      </p>
      <button
        onClick={() => onLike(post.id)}
        style={{
          padding: "8px 16px",
          backgroundColor: "#4a90e2",
          color: "#fff",
          border: "none",
          borderRadius: "6px",
          fontSize: "1rem",
          fontWeight: "500",
          cursor: "pointer",
          transition: "background-color 0.3s ease, transform 0.2s ease",
          boxShadow: "0 2px 4px rgba(0, 0, 0, 0.2)",
        }}
        onMouseOver={(e) => (e.target.style.backgroundColor = "#357abd")}
        onMouseOut={(e) => (e.target.style.backgroundColor = "#4a90e2")}
      >
        Like
      </button>
    </div>
  );
}

export default Post;
