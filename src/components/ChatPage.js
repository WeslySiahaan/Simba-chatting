import React, { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { db, auth } from "../firebase-config";
import {
  collection,
  addDoc,
  serverTimestamp,
  onSnapshot,
  query,
  orderBy,
} from "firebase/firestore";
import "../styles/Chat.css";

const ChatPage = () => {
  const { postId } = useParams();
  const navigate = useNavigate();
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [post, setPost] = useState(null);
  const [error, setError] = useState(null);

  const messagesRef = useMemo(() => collection(db, `posts/${postId}/comments`), [postId]);

  useEffect(() => {
    if (!postId) {
      navigate("/");
      return;
    }

    const abortController = new AbortController();
    const signal = abortController.signal;

    const fetchPost = async () => {
      try {
        const response = await fetch(`http://localhost:8080/posts/${postId}`, { signal });
        if (!response.ok) {
          if (response.status === 404) {
            setError("Post not found.");
            navigate("/");
            return;
          }
          throw new Error(`Failed to fetch post: ${response.statusText}`);
        }
        const data = await response.json();
        setPost(data);
        setError(null);
      } catch (err) {
        if (err.name !== 'AbortError') {
          setError(`Failed to fetch post: ${err.message}`);
          navigate("/");
        }
      }
    };

    fetchPost();

    const unsubscribe = onSnapshot(query(messagesRef, orderBy("createdAt")), (snapshot) => {
      const updatedMessages = snapshot.docs.map((doc) => ({ ...doc.data(), id: doc.id }));
      setMessages(updatedMessages);
    }, (err) => {
      console.error("Error fetching comments:", err);
      setError(`Failed to load comments: ${err.message}`);
    });

    return () => {
      abortController.abort();
      unsubscribe();
    };
  }, [postId, messagesRef, navigate]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!newMessage || !auth.currentUser) return;

    try {
      await addDoc(messagesRef, {
        text: newMessage,
        createdAt: serverTimestamp(),
        user: auth.currentUser.displayName || "Anonymous",
        userId: auth.currentUser.uid,
        postId,
      });
      setNewMessage("");
    } catch (error) {
      setError(`Failed to add comment: ${error.message}`);
    }
  };

  const handleLike = async () => {
    if (!postId || !auth.currentUser) return;

    const maxRetries = 3;
    for (let i = 0; i < maxRetries; i++) {
      try {
        const token = await auth.currentUser.getIdToken();
        const response = await fetch(`http://localhost:8080/posts/${postId}/like`, {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        });
        if (!response.ok) throw new Error(`Failed to like post: ${response.statusText}`);
        const updatedPost = await response.json();
        setPost(updatedPost);
        return;
      } catch (err) {
        if (i === maxRetries - 1) {
          setError(`Failed to like post after ${maxRetries} attempts: ${err.message}`);
        } else {
          await new Promise((res) => setTimeout(res, 1000));
        }
      }
    }
  };


  return (
    <div className="chat-app">
      <div className="header">
        <button onClick={() => navigate(-1)} className="back-button">← Back</button>
      </div>
      {error && <p className="error">{error}</p>}
      {post && (
        <div className="post-preview">
          <h2 className="post-title">{post.title}</h2>
          <img
            src={`data:image/png;base64,${post.image_data}`}
            alt={post.description}
            className="post-image"
          />
          <p className="post-description">{post.description}</p>
          <button onClick={handleLike} className="like-button">
            Like ({post.like_count || 0})
          </button>
        </div>
      )}
      <div className="messages">
        {messages.map((message) => (
          <div key={message.id} className="message">
            <span className="user">{message.user}:</span> {message.text}
          </div>
        ))}
      </div>
      <form onSubmit={handleSubmit} className="new-message-form">
        <input
          type="text"
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          className="new-message-input"
          placeholder="Type your comment here..."
        />
        <button type="submit" className="send-button">Send</button>
      </form>
    </div>
  );
};

export default ChatPage;
