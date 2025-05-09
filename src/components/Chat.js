import React, { useState, useEffect } from "react";
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

const Chat = ({ postId }) => {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const messagesRef = collection(db, `posts/${postId}/comments`);

  useEffect(() => {
    if (!postId) return;

    const queryMessages = query(messagesRef, orderBy("createdAt"));
    const unsubscribe = onSnapshot(
      queryMessages,
      (snapshot) => {
        const msgs = snapshot.docs.map((doc) => ({
          ...doc.data(),
          id: doc.id,
        }));
        setMessages(msgs);
      },
      (error) => {
        console.error("Error fetching comments:", error);
      }
    );

    return () => unsubscribe();
  }, [postId]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!newMessage.trim() || !auth.currentUser) return;

    try {
      await addDoc(messagesRef, {
        text: newMessage,
        createdAt: serverTimestamp(),
        user: auth.currentUser.displayName || "Anonymous",
        userId: auth.currentUser.uid,
        postId,
      });
      setNewMessage("");
    } catch (err) {
      console.error("Error adding comment:", err);
    }
  };

  return (
    <div className="container">
      <div className="chat-app">
        <div className="header">
          <h1
            style={{
              color: "#ffffff",
              border: "2px solid #ffffff",
              padding: "0.5rem 1rem",
              borderRadius: "8px",
              display: "inline-block",
              fontSize: "1.75rem",
              fontWeight: 700,
              margin: 0,
            }}
          >
            Comments for Post
          </h1>
        </div>

        <div className="messages">
          {messages.length === 0 && (
            <div className="message system">
              <span className="user">System:</span> No comments yet. Be the first!
            </div>
          )}

          {messages.map((message) => (
            <div key={message.id} className="message">
              <span className="user">{message.user}:</span>
              <span>{message.text}</span>
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
          <button type="submit" className="send-button">
            Send
          </button>
        </form>
      </div>
    </div>
  );
};

export default Chat;