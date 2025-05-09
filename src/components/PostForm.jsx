import React, { useState } from "react";
import { auth } from "../firebase-config";
import "../styles/PostForm.css";

const PostForm = ({ addPost }) => {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [image, setImage] = useState(null);
  const [error, setError] = useState(null);

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImage(reader.result.split(",")[1]);
      };
      reader.readAsDataURL(file);
    }
  };

  const createPost = async (event) => {
    event.preventDefault();

    if (!title || !description || !image) {
      setError("Please fill in all fields and upload an image.");
      return;
    }

    try {
      const token = await auth.currentUser.getIdToken();
      const response = await fetch("http://localhost:8080/posts", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          title,
          description,
          image_data: image,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to create post: ${errorText}`);
      }

      const newPost = await response.json();
      addPost(newPost);
      setTitle("");
      setDescription("");
      setImage(null);
      setError(null);
    } catch (err) {
      console.error("Error creating post:", err);
      setError(`Failed to create post: ${err.message}`);
    }
  };

  return (
    <div className="post-form-wrapper">
      <div className="post-form">
        <form onSubmit={createPost} className="form-container">
          <input
            type="text"
            placeholder="Title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="form-input"
          />
          <textarea
            placeholder="Description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="form-textarea"
          />
          <input
            type="file"
            accept="image/*"
            onChange={handleImageChange}
            className="form-file"
          />
          {image && (
            <img
              src={`data:image/png;base64,${image}`}
              alt="Preview"
              className="image-preview"
            />
          )}
          <button type="submit" className="form-button">
            Post
          </button>
          {error && <p className="form-error">{error}</p>}
        </form>
      </div>
      <div className="image-side">
        <img src="/baru.png" alt="Side visual" className="side-image" />
      </div>
    </div>
  );
};

export default PostForm;
