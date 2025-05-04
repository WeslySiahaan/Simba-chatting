package main

import (
	"context"
	"encoding/base64"
	"fmt"
	"net/http"
	"time"

	"cloud.google.com/go/firestore"
	"github.com/gin-gonic/gin"
)

func createPostHandler(c *gin.Context, ctx context.Context, client *firestore.Client, storageClient interface{}) {
	// Parse form data
	title := c.PostForm("title")
	description := c.PostForm("description")
	imageData := c.PostForm("image_data") // Expect Base64 string
	userID := c.GetString("user_id")

	if title == "" || description == "" || imageData == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Title, description, and image data are required"})
		return
	}

	// Validate Base64 (optional, basic check)
	if _, err := base64.StdEncoding.DecodeString(imageData); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid Base64 image data"})
		return
	}

	// Save post to Firestore
	postID := fmt.Sprintf("post_%d", time.Now().UnixNano())
	fmt.Println("Creating post with ID:", postID) // Debug log
	post := Post{
		ID:          postID,
		UserID:      userID,
		Title:       title,
		ImageData:   imageData,
		Description: description,
		LikeCount:   0,
		CreatedAt:   time.Now().Format(time.RFC3339),
		LikedBy:     []string{},
	}
	_, err := client.Collection("posts").Doc(postID).Set(ctx, post)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to save post: " + err.Error()})
		return
	}

	c.JSON(http.StatusCreated, post)
}

func listPostsHandler(c *gin.Context, ctx context.Context, client *firestore.Client) {
	posts := []Post{}
	iter := client.Collection("posts").Documents(ctx)
	for {
		doc, err := iter.Next()
		if err != nil {
			break
		}
		var post Post
		if err := doc.DataTo(&post); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to parse post"})
			return
		}
		posts = append(posts, post)
	}
	c.JSON(http.StatusOK, posts)
}

func getPostHandler(c *gin.Context, ctx context.Context, client *firestore.Client) {
	id := c.Param("id")

	// Set a timeout for Firestore request
	ctx, cancel := context.WithTimeout(ctx, 5*time.Second)
	defer cancel()

	doc, err := client.Collection("posts").Doc(id).Get(ctx)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Post not found: " + err.Error()})
		return
	}
	var post Post
	if err := doc.DataTo(&post); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to parse post: " + err.Error()})
		return
	}
	c.JSON(http.StatusOK, post)
}

func likePostHandler(c *gin.Context, ctx context.Context, client *firestore.Client) {
	id := c.Param("id")
	userID := c.GetString("user_id")

	fmt.Println("Like request for post:", id, "by user:", userID) // Debug log

	if userID == "" {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
		return
	}

	// Set a timeout for Firestore request
	ctx, cancel := context.WithTimeout(ctx, 5*time.Second)
	defer cancel()

	// Get the post
	docRef := client.Collection("posts").Doc(id)
	doc, err := docRef.Get(ctx)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Post not found: " + err.Error()})
		return
	}

	var post Post
	if err := doc.DataTo(&post); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to parse post: " + err.Error()})
		return
	}

	// Check if user has already liked the post
	for _, likedUserID := range post.LikedBy {
		if likedUserID == userID {
			c.JSON(http.StatusBadRequest, gin.H{"error": "User has already liked this post"})
			return
		}
	}

	// Update like count and add user to likedBy
	_, err = docRef.Update(ctx, []firestore.Update{
		{Path: "like_count", Value: firestore.Increment(1)},
		{Path: "likedBy", Value: firestore.ArrayUnion(userID)},
	})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to like post: " + err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Post liked"})
}