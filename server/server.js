const express = require("express");
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
require("dotenv").config();
const bodyParser = require("body-parser");
const path = require("path");
const cors = require("cors");
const app = express();
const multer = require("multer");

const JWT_SECRET = process.env.JWT_SECRET;

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/");
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));
  },
});
const upload = multer({ storage });

app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, "../public")));
app.use("/uploads", express.static(path.join(__dirname, "uploads")));
app.use(cors());
app.use(express.json());

mongoose
  .connect("mongodb://localhost:27017/synergy", {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log("MongoDB connected"))
  .catch((err) => console.error("MongoDB connection error:", err));

const UserSchema = new mongoose.Schema({
  username: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  profilePicture: {
    type: String,
    default: "/profile/default-profile-picture.png",
  },
  bio: { type: String },
  createdAt: { type: Date, default: Date.now },
  postCount: { type: Number, default: 0 },
  followers: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
  following: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
});

const User = mongoose.model("User", UserSchema);

const PostSchema = new mongoose.Schema({
  content: { type: String, required: true },
  author: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  image: { type: String },
  likes: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
  comments: [{ type: mongoose.Schema.Types.ObjectId, ref: "Comment" }],
  createdAt: { type: Date, default: Date.now },
});

const Post = mongoose.model("Post", PostSchema);

const CommentSchema = new mongoose.Schema({
  content: { type: String, required: true },
  author: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  post: { type: mongoose.Schema.Types.ObjectId, ref: "Post", required: true },
  createdAt: { type: Date, default: Date.now },
});

const Comment = mongoose.model("Comment", CommentSchema);

app.post("/register", async (req, res) => {
  const { username, email, password } = req.body;

  try {
    const userExists = await User.findOne({ email });
    if (userExists) {
      return res
        .status(400)
        .json({ success: false, message: "User already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = new User({ username, email, password: hashedPassword });
    await newUser.save();

    res.json({ success: true, message: "User registered successfully" });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server error" });
  }
});

app.post("/login", async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await User.findOne({ email });
    if (!user) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid email or password" });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid email or password" });
    }

    const token = jwt.sign({ userId: user._id }, JWT_SECRET, {
      expiresIn: "1h",
    });
    res.json({ success: true, token, username: user.username });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server error" });
  }
});

const authenticateToken = (req, res, next) => {
  const token = req.header("Authorization")?.replace("Bearer ", "");

  if (!token) {
    return res
      .status(401)
      .json({ message: "Access denied. No token provided." });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (ex) {
    console.error("Token verification error:", ex);
    res.status(400).json({ message: "Invalid token." });
  }
};

app.post(
  "/posts",
  authenticateToken,
  upload.single("image"),
  async (req, res) => {
    try {
      const { content } = req.body;
      const imageUrl = req.file ? `/uploads/${req.file.filename}` : null;
      const userId = req.user.userId;

      if (!userId) {
        return res.status(400).json({ error: "User ID is missing" });
      }

      const newPost = new Post({
        content,
        image: imageUrl,
        author: userId,
        likes: [],
        comments: [],
      });

      await newPost.save();

      await User.findByIdAndUpdate(userId, { $inc: { postCount: 1 } });

      res.status(201).json({ post: newPost });
    } catch (error) {
      console.error("Error creating post:", error);
      res.status(500).json({ error: "Failed to create post" });
    }
  }
);

// Get All Posts Route
app.get("/posts", authenticateToken, async (req, res) => {
  try {
    console.log("Authenticated User in /posts route:", req.user); // Debugging line

    const userId = req.user.userId; // Assuming req.user is populated by authentication middleware

    const posts = await Post.find()
      .populate("author", "username profilePicture") // Updated to include profilePicture
      .populate("comments");

    res.json({ success: true, posts, loggedInUserId: userId });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// Profile Route: Get User Profile
app.get("/profile", authenticateToken, async (req, res) => {
  const userId = req.user.userId;
  try {
    const user = await User.findById(userId)
      .populate("followers", "username")
      .populate("following", "username")
      .populate("profilePicture");
    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    res.json({
      success: true,
      user,
    });
  } catch (error) {
    res
      .status(500)
      .json({ success: false, message: "Failed to fetch profile" });
  }
});

app.put(
  "/profile",
  authenticateToken,
  upload.single("profilePicture"),
  async (req, res) => {
    const { bio } = req.body;
    const profilePicture = req.file ? `/uploads/${req.file.filename}` : null;

    try {
      const user = await User.findById(req.user.userId);
      if (!user) {
        return res
          .status(404)
          .json({ success: false, message: "User not found" });
      }

      user.bio = bio || user.bio;
      user.profilePicture = profilePicture || user.profilePicture;

      await user.save();
      res.json({ success: true, user });
    } catch (error) {
      res
        .status(500)
        .json({ success: false, message: "Failed to update profile" });
    }
  }
);

// Route to follow a user
app.post("/follow/:userId", authenticateToken, async (req, res) => {
  try {
    const userIdToFollow = req.params.userId;
    const loggedInUserId = req.user.userId;

    if (userIdToFollow === loggedInUserId.toString()) {
      return res.status(400).send({ error: "You cannot follow yourself." });
    }

    const userToFollow = await User.findById(userIdToFollow);
    const loggedInUser = await User.findById(loggedInUserId);

    if (!userToFollow || !loggedInUser) {
      return res.status(404).send({ error: "User not found." });
    }

    if (!userToFollow.followers.includes(loggedInUserId)) {
      userToFollow.followers.push(loggedInUserId);
      await userToFollow.save();
    }

    if (!loggedInUser.following.includes(userIdToFollow)) {
      loggedInUser.following.push(userIdToFollow);
      await loggedInUser.save();
    }

    res.send({ success: true });
  } catch (err) {
    res.status(500).send({ error: "Failed to follow user" });
  }
});

// Route to unfollow a user
app.delete("/unfollow/:userId", authenticateToken, async (req, res) => {
  try {
    const userIdToUnfollow = req.params.userId;
    const loggedInUserId = req.user.userId;

    const userToUnfollow = await User.findById(userIdToUnfollow);
    const loggedInUser = await User.findById(loggedInUserId);

    if (!userToUnfollow || !loggedInUser) {
      return res.status(404).send({ error: "User not found." });
    }

    userToUnfollow.followers = userToUnfollow.followers.filter(
      (followerId) => followerId.toString() !== loggedInUserId.toString()
    );
    await userToUnfollow.save();

    loggedInUser.following = loggedInUser.following.filter(
      (followingId) => followingId.toString() !== userIdToUnfollow.toString()
    );
    await loggedInUser.save();

    res.send({ success: true });
  } catch (err) {
    res.status(500).send({ error: "Failed to unfollow user" });
  }
});

// Endpoint to check if the logged-in user is following a specific user
app.get("/isFollowing/:userId", authenticateToken, async (req, res) => {
  try {
    const userId = req.params.userId;
    const loggedInUserId = req.user.userId;

    const user = await User.findById(loggedInUserId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const isFollowing = user.following.includes(userId);

    res.json({ isFollowing });
  } catch (error) {
    res.status(500).json({ message: "Internal server error" });
  }
});

// Get Followers Route
app.get("/followers", authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const user = await User.findById(userId).populate("followers", "username");

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json({ followers: user.followers });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
});

// Get Following Route
app.get("/following", authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const user = await User.findById(userId).populate("following", "username");

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json({ following: user.following });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
});

// Like a Post Route
app.post("/posts/:id/like", authenticateToken, async (req, res) => {
  try {
    const postId = req.params.id;
    const userId = req.user.userId;

    const post = await Post.findById(postId);

    if (!post) {
      return res.status(404).json({ message: "Post not found" });
    }

    const liked = post.likes.includes(userId);

    if (liked) {
      post.likes.pull(userId);
    } else {
      post.likes.push(userId);
    }

    await post.save();

    res.json({ success: true, message: liked ? "Post unliked" : "Post liked" });
  } catch (error) {
    res
      .status(500)
      .json({ message: "An error occurred while liking the post." });
  }
});

// Comment on a Post Route
app.post("/posts/:id/comment", authenticateToken, async (req, res) => {
  const { content } = req.body;

  try {
    const post = await Post.findById(req.params.id);
    if (!post) {
      return res
        .status(404)
        .json({ success: false, message: "Post not found" });
    }

    const newComment = new Comment({
      content,
      author: req.user.userId,
      post: req.params.id,
    });

    await newComment.save();

    post.comments.push(newComment._id);
    await post.save();

    res.json({ success: true, comment: newComment });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// Get Comments for a Post Route
app.get("/posts/:id/comments", authenticateToken, async (req, res) => {
  try {
    const postId = req.params.id;

    const post = await Post.findById(postId).populate("comments");
    if (!post) {
      return res
        .status(404)
        .json({ success: false, message: "Post not found" });
    }

    // Populate comments with author data
    const comments = await Comment.find({
      _id: { $in: post.comments },
    }).populate("author", "username profilePicture");

    res.json({ success: true, comments });
  } catch (error) {
    console.error("Server error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// Serve the login/registration page
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "../public/index.html"));
});

// Protected Route (Main Page)
app.get("/main", authenticateToken, (req, res) => {
  res.sendFile(path.join(__dirname, "../public/main.html"));
});

// Start Server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
