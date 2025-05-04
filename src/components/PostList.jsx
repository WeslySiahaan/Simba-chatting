import React, { useState, useEffect } from 'react';
import Post from './Post';
import { auth } from '../firebase-config';
import Chat from './Chat';

function PostList({ selectedPostId }) {
  const [posts, setPosts] = useState([]);
  const [error, setError] = useState(null);

  const fetchPosts = async () => {
    try {
      const response = await fetch('http://localhost:8080/posts');
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to fetch posts: ${errorText}`);
      }
      const data = await response.json();
      setPosts(data);
    } catch (err) {
      console.error('Fetch error:', err);
      setError(err.message);
    }
  };

  useEffect(() => {
    fetchPosts();
  }, []);

  const handleLike = async (postId) => {
    try {
      const token = await auth.currentUser.getIdToken();
      const response = await fetch(`http://localhost:8080/posts/${postId}/like`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to like post: ${errorText}`);
      }
      // Refetch posts to update like_count from Firestore
      await fetchPosts();
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div>
      {error && <p className="error">{error}</p>}
      {posts.map(post => (
        <div key={post.id}>
          <Post
            post={post}
            onLike={handleLike}
            selectedPostId={selectedPostId}
          />
          <Chat postId={post.id} />
        </div>
      ))}
    </div>
  );
}

export default PostList;