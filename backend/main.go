package main

import (
	"context"
	"log"

	firebase "firebase.google.com/go"
	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
	"google.golang.org/api/option"
)

type Post struct {
	ID          string   `json:"id"`
	UserID      string   `json:"user_id"`
	Title       string   `json:"title"`
	ImageData   string   `json:"image_data"`
	Description string   `json:"description"`
	LikeCount   int      `json:"like_count"`
	CreatedAt   string   `json:"created_at"`
	LikedBy     []string `json:"likedBy"`
}

func main() {
	// Initialize Firebase
	ctx := context.Background()
	sa := option.WithCredentialsFile("service-account.json")
	app, err := firebase.NewApp(ctx, nil, sa)
	if err != nil {
		log.Fatalf("Failed to initialize Firebase: %v", err)
	}

	// Initialize Firestore
	client, err := app.Firestore(ctx)
	if err != nil {
		log.Fatalf("Failed to initialize Firestore: %v", err)
	}
	defer client.Close()

	// Initialize Firebase Auth client
	authClient, err := app.Auth(ctx)
	if err != nil {
		log.Fatalf("Failed to initialize Firebase Auth client: %v", err)
	}

	// Explicitly use the auth package to avoid unused import error
	// This is a temporary debug step to confirm usage
	_ = authClient

	// Initialize Gin router
	r := gin.Default()

	// Configure CORS
	config := cors.DefaultConfig()
	config.AllowOrigins = []string{"http://localhost:3000"}
	config.AllowMethods = []string{"GET", "POST", "OPTIONS"}
	config.AllowHeaders = []string{"Authorization", "Content-Type"}
	r.Use(cors.New(config))

	// Authentication middleware
	r.Use(func(c *gin.Context) {
		// Skip authentication for GET requests (list and get posts)
		if c.Request.Method == "GET" {
			c.Next()
			return
		}

		authHeader := c.GetHeader("Authorization")
		log.Printf("Received Authorization header: %s", authHeader)
		if authHeader == "" {
			c.JSON(401, gin.H{"error": "No authorization header"})
			c.Abort()
			return
		}

		// Extract token (format: "Bearer <token>")
		if len(authHeader) <= len("Bearer ") {
			c.JSON(401, gin.H{"error": "Invalid authorization header"})
			c.Abort()
			return
		}
		token := authHeader[len("Bearer "):]
		log.Printf("Extracted token: %s", token)

		// Verify the token using Firebase Auth
		decodedToken, err := authClient.VerifyIDToken(ctx, token)
		if err != nil {
			log.Printf("Token verification failed: %v", err)
			c.JSON(401, gin.H{"error": "Invalid token: " + err.Error()})
			c.Abort()
			return
		}

		// Set user_id in context
		userID := decodedToken.UID
		log.Printf("Verified user ID: %s", userID)
		c.Set("user_id", userID)
		c.Next()
	})

	// Setup routes
	r.POST("/posts", func(c *gin.Context) {
		createPostHandler(c, ctx, client, nil)
	})
	r.GET("/posts", func(c *gin.Context) {
		listPostsHandler(c, ctx, client)
	})
	r.GET("/posts/:id", func(c *gin.Context) {
		getPostHandler(c, ctx, client)
	})
	r.POST("/posts/:id/like", func(c *gin.Context) {
		likePostHandler(c, ctx, client)
	})

	// Start server
	r.Run(":8080")
}