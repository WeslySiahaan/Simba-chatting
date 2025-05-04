import React from 'react';

function Post({ post, onLike, selectedPostId }) {
  const isSelected = post.id === selectedPostId;

  return (
    <div style={{
      border: '1px solid #ccc',
      padding: '10px',
      margin: '10px 0',
      backgroundColor: isSelected ? '#f0f0f0' : 'white'
    }}>
      <img
        src={`data:image/png;base64,${post.image_data}`}
        alt="Post"
        style={{ maxWidth: '100px', maxHeight: '100px' }}
        onError={(e) => console.error('Error loading image:', post.image_data)}
      />
      <p>{post.description}</p>
      <p>Likes: {post.like_count}</p>
      <button onClick={() => onLike(post.id)}>Like</button>
    </div>
  );
}

export default Post;