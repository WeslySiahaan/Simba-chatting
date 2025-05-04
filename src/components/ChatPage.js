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

  // Memoize messagesRef to prevent re-creation on every render
  const messagesRef = useMemo(() => collection(db, `posts/${postId}/comments`), [postId]);

  useEffect(() => {
    if (!postId) {
      navigate("/");
      return;
    }

    // Create an AbortController to cancel fetch requests
    const abortController = new AbortController();
    const signal = abortController.signal;

    // Fetch post data
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
        console.log("Initial post data:", data); // Debug initial data
        setPost(data);
        setError(null);
      } catch (err) {
        if (err.name === 'AbortError') {
          console.log("Fetch aborted for post:", postId);
          return;
        }
        setError(`Failed to fetch post: ${err.message}`);
        navigate("/");
        console.error("Fetch error:", err);
      }
    };

    fetchPost();

    // Set up real-time chat listener
    const queryMessages = query(messagesRef, orderBy("createdAt"));
    const unsubscribe = onSnapshot(queryMessages, (snapshot) => {
      let messages = [];
      snapshot.forEach((doc) => {
        messages.push({ ...doc.data(), id: doc.id });
      });
      setMessages(messages);
    }, (error) => {
      console.error("Error fetching comments:", error);
      setError(`Failed to load comments: ${error.message}`);
    });

    // Cleanup: Abort fetch and unsubscribe from Firestore listener
    return () => {
      abortController.abort();
      unsubscribe();
    };
  }, [postId, messagesRef, navigate]);

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (newMessage === "" || !postId || !auth.currentUser) return;

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
      console.error("Error adding comment:", error);
      setError(`Failed to add comment: ${error.message}`);
    }
  };

  const handleLike = async () => {
    if (!postId || !auth.currentUser) return;

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
        const updatedPost = await response.json();
        console.log("Updated post data:", updatedPost); // Debug updated data
        setPost(updatedPost); // Update state with the updated post
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

  if (!post && !error) {
    return <div>Loading...</div>;
  }

  return (
    <div className="chat-app">
      <div className="header">
        <button onClick={() => navigate(-1)} className="back-button">
          ← Back
        </button>
        <h1>Live Chat for Post {postId}</h1>
      </div>
      {error && <p className="error">{error}</p>}
      {post && (
        <div className="post-preview">
          <h2 className="post-title">{post.title}</h2>
          <img
            src={`data:image/png;base64,${post.image_data}`}
            alt={post.description}
            className="post-image"
            onError={(e) => console.error("Error loading image:", post.image_data)}
          />
          <p className="post-description">{post.description}</p>
          <button onClick={handleLike} className="like-button">
            Like ({post ? post.like_count : 0})
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
          onChange={(event) => setNewMessage(event.target.value)}
          className="new-message-input"
          placeholder="Type your comment here..."
        />
        <button type="submit" className="send-button">
          Send
        </button>
      </form>
    </div>
  );
};

export default ChatPage;