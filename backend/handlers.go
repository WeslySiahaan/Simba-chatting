package main

import (
	"context"
	"encoding/base64"
	"fmt"
	"log"
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
	log.Printf("Creating post with ID: %s for user: %s", postID, userID) // Enhanced debug log
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
		log.Printf("Failed to save post %s to Firestore: %v", postID, err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to save post: " + err.Error()})
		return
	}
	log.Printf("Successfully saved post with ID: %s", postID) // Enhanced debug log

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
			log.Printf("Failed to parse post from document: %v", err)
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to parse post"})
			return
		}
		posts = append(posts, post)
	}
	log.Printf("Retrieved %d posts", len(posts)) // Debug log
	c.JSON(http.StatusOK, posts)
}

func getPostHandler(c *gin.Context, ctx context.Context, client *firestore.Client) {
	id := c.Param("id")

	// Set a timeout for Firestore request (increased to 10 seconds for debugging)
	ctx, cancel := context.WithTimeout(ctx, 10*time.Second)
	defer cancel()

	doc, err := client.Collection("posts").Doc(id).Get(ctx)
	if err != nil {
		log.Printf("Failed to get post %s: %v", id, err)
		c.JSON(http.StatusNotFound, gin.H{"error": "Post not found: " + err.Error()})
		return
	}
	var post Post
	if err := doc.DataTo(&post); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to parse post: " + err.Error()})
		return
	}
	log.Printf("Successfully retrieved post %s", id) // Debug log
	c.JSON(http.StatusOK, post)
}

func likePostHandler(c *gin.Context, ctx context.Context, client *firestore.Client) {
	id := c.Param("id")
	userID := c.GetString("user_id")

	log.Printf("Like request for post: %s by user: %s", id, userID) // Debug log

	if userID == "" {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
		return
	}

	// Set a timeout for Firestore request (increased to 10 seconds for debugging)
	ctx, cancel := context.WithTimeout(ctx, 10*time.Second)
	defer cancel()

	// Get the post
	docRef := client.Collection("posts").Doc(id)
	doc, err := docRef.Get(ctx)
	if err != nil {
		log.Printf("Failed to get post %s for like: %v", id, err)
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
		log.Printf("Failed to update like for post %s: %v", id, err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to like post: " + err.Error()})
		return
	}

	// Fetch updated post
	updatedDoc, err := docRef.Get(ctx)
	if err != nil {
		log.Printf("Failed to get updated post %s: %v", id, err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch updated post: " + err.Error()})
		return
	}
	var updatedPost Post
	if err := updatedDoc.DataTo(&updatedPost); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to parse updated post: " + err.Error()})
		return
	}

	log.Printf("Successfully liked post %s by user %s", id, userID) // Debug log
	c.JSON(http.StatusOK, updatedPost) // Return updated post
}