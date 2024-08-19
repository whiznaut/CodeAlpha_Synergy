// Toggle between Login and Register forms
function toggleForm() {
  const registerForm = document.getElementById("register-form");
  const loginForm = document.getElementById("login-form");

  if (registerForm.style.display === "none") {
    registerForm.style.display = "block";
    loginForm.style.display = "none";
  } else {
    registerForm.style.display = "none";
    loginForm.style.display = "block";
  }
}

window.addEventListener("DOMContentLoaded", (event) => {
  const loginForm = document.getElementById("login-form");
  if (loginForm) {
    loginForm.addEventListener("submit", async (e) => {
      e.preventDefault();

      const email = document.getElementById("login-email").value;
      const password = document.getElementById("login-password").value;

      try {
        const response = await fetch("http://localhost:5000/login", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ email, password }),
        });

        const result = await response.json();

        if (response.ok && result.success) {
          localStorage.setItem("token", result.token);
          localStorage.setItem("username", result.username);
          window.location.href = "http://localhost:5500/public/main.html";
        } else {
          alert(result.message || "Login failed.");
        }
      } catch (error) {
        console.error("Error:", error);
        alert("An error occurred while logging in.");
      }
    });
  }

  const registerForm = document.getElementById("register-form");
  if (registerForm) {
    registerForm.addEventListener("submit", async (e) => {
      e.preventDefault();

      const username = document.getElementById("reg-username").value;
      const email = document.getElementById("reg-email").value;
      const password = document.getElementById("reg-password").value;

      try {
        const response = await fetch("http://localhost:5000/register", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ username, email, password }),
        });

        if (!response.ok) throw new Error("Network response was not ok");

        const result = await response.json();

        if (result.success) {
          alert("Registration successful! Please log in.");
          toggleForm();
        } else {
          alert(result.message || "Registration failed.");
        }
      } catch (error) {
        console.error("Error:", error);
        alert("An error occurred while registering.");
      }
    });
  }

  const postForm = document.getElementById("post-form");
  const postImageInput = document.getElementById("post-image");
  const postImagePreview = document.getElementById("post-image-preview");

  if (postForm && postImageInput && postImagePreview) {
    postImageInput.addEventListener("change", () => {
      const file = postImageInput.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (e) => {
          postImagePreview.src = e.target.result;
          postImagePreview.style.display = "block";
        };
        reader.readAsDataURL(file);
      } else {
        postImagePreview.src = "";
        postImagePreview.style.display = "none";
      }
    });

    postForm.addEventListener("submit", async (e) => {
      e.preventDefault();

      const content = document.getElementById("post-caption").value;
      const imageFile = postImageInput.files[0];

      const formData = new FormData();
      formData.append("content", content);
      if (imageFile) {
        formData.append("image", imageFile);
      }

      try {
        const response = await fetch("http://localhost:5000/posts", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
          body: formData,
        });

        if (response.ok) {
          alert("Post created successfully!");
          loadPosts();
        } else {
          alert("Failed to create post.");
        }
      } catch (error) {
        console.error("Error:", error);
        alert("An error occurred while creating the post.");
      }
    });
  }

  async function loadPosts() {
    const token = localStorage.getItem("token");
    if (!token) {
      window.location.href = "http://localhost:5500/public/index.html";
      return;
    }
    try {
      const response = await fetch("http://localhost:5000/posts", {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });

      if (!response.ok) {
        if (response.status === 400) {
          alert("Session expired. Please log in again.");
          window.location.href = "http://localhost:5500/public/index.html";
          return;
        }
        throw new Error(`Network response was not ok: ${response.statusText}`);
      }

      const result = await response.json();
      const posts = result.posts;
      const loggedInUserId = result.loggedInUserId;

      if (!loggedInUserId) {
        throw new Error("Logged in user ID not found in response");
      }

      const postsContainer = document.getElementById("posts-container");

      if (!postsContainer) return;

      postsContainer.innerHTML = "";

      posts.forEach((post) => {
        const username = post.author.username || "Unknown User";
        const profilePicture =
          post.author.profilePicture || "/profile/default-profile-picture.png";
        const likesCount = Array.isArray(post.likes) ? post.likes.length : 0;
        const postElement = document.createElement("div");
        postElement.classList.add("post");

        postElement.innerHTML = `
  <div class="post-container" data-post-id="${post._id}">
      <div class="post-header">
          <div class="profile-info">
              <img src="${profilePicture}" alt="${username}'s profile picture" class="profile-picture">
              <span class="username">${username}</span>
          </div>
          <div class="follow-container">
                            ${
                              post.author._id !== loggedInUserId
                                ? `<button class="follow-btn" data-user-id="${post.author._id}">Loading...</button>`
                                : ""
                            }
                        </div>
          <button class="expand-comments-btn">
              <img src="../assets/arrow-icon.png" alt="Expand Comments Icon">
          </button>
      </div>
      <img src="${post.image}" alt="Post Image" class="post-image">
      <div class="post-content">${post.content}</div>
      <div class="post-actions">
          <div class="action-icons">
              <div class="action-buttons">
                  <div class="like-icon">
                      <button onclick="likePost('${
                        post._id
                      }')" class="action-btn">
                          <img src="../assets/like-icon.png" alt="Like Icon">
                          <span>${likesCount}</span>
                      </button>
                  </div>
                  <div class="comment-icon">
                      <button class="action-btn comment-btn" data-post-id="${
                        post._id
                      }">
                          <img src="../assets/comment-icon.png" alt="Comment Icon">
                      </button>
                      <textarea id="comment-area-${
                        post._id
                      }" class="comment-area" placeholder="Write a comment..."></textarea>
                      <button class="comment-submit-icon" data-post-id="${
                        post._id
                      }">
                          <img src="../assets/checkmark-icon.png" alt="Submit Comment">
                      </button>
                  </div>
              </div>
          </div>
      </div>
      <div class="comments-section" id="comments-section-${post._id}">
          <!-- Comments will be dynamically inserted here -->
      </div>
  </div>
`;

        postsContainer.appendChild(postElement);
      });

      // Add event listeners to the follow/unfollow buttons
      document.querySelectorAll(".follow-btn").forEach((button) => {
        const userId = button.getAttribute("data-user-id");
        checkFollowStatus(userId, button);

        button.addEventListener("click", async function () {
          const isFollowing = button.classList.contains("following");

          try {
            const followUrl = isFollowing
              ? `http://localhost:5000/unfollow/${userId}`
              : `http://localhost:5000/follow/${userId}`;
            const method = isFollowing ? "DELETE" : "POST";

            const followResponse = await fetch(followUrl, {
              method: method,
              headers: {
                Authorization: `Bearer ${localStorage.getItem("token")}`,
              },
            });

            if (followResponse.ok) {
              if (isFollowing) {
                button.classList.remove("following");
                button.textContent = "Follow";
                loadPosts();
              } else {
                button.classList.add("following");
                button.textContent = "Unfollow";
                loadPosts();
              }
            } else {
              console.error("Failed to follow/unfollow");
            }
          } catch (error) {
            console.error("Error following/unfollowing:", error);
          }
        });
      });

      // Add event listeners to the expand comments buttons
      document.querySelectorAll(".expand-comments-btn").forEach((button) => {
        button.addEventListener("click", function () {
          const postId =
            this.closest(".post-container").getAttribute("data-post-id");
          const commentsSection = document.getElementById(
            `comments-section-${postId}`
          );
          console.log("Toggling comments for post ID:", postId); // Debug log
          commentsSection.classList.toggle("active");

          // Move the arrow icon to the right edge of the comment section when it expands
          if (commentsSection.classList.contains("active")) {
            this.style.right = "-362px"; // Shift arrow to the right of the expanded comment section
          } else {
            this.style.right = "-47px"; // Reset arrow to its original position
          }

          // Load comments if not already loaded
          if (
            commentsSection.classList.contains("active") &&
            !commentsSection.hasAttribute("data-loaded")
          ) {
            loadComments(postId);
            commentsSection.setAttribute("data-loaded", "true");
          }
        });
      });

      // Add event listeners to all comment buttons after posts are loaded
      document.querySelectorAll(".comment-btn").forEach((button) => {
        button.addEventListener("click", function () {
          const postId = this.getAttribute("data-post-id");
          const commentArea = document.getElementById(`comment-area-${postId}`);
          const submitIcon = document.querySelector(
            `.comment-submit-icon[data-post-id='${postId}']`
          );

          // Toggle visibility of the comment area and submit icon
          commentArea.classList.toggle("active");
          submitIcon.classList.toggle("active");
        });
      });

      document.querySelectorAll(".comment-submit-icon").forEach((button) => {
        button.addEventListener("click", function (event) {
          event.preventDefault();

          const postId = this.getAttribute("data-post-id");
          const commentText = document.getElementById(
            `comment-area-${postId}`
          ).value;

          if (commentText.trim() !== "") {
            // Prepare the data to be sent to the server
            const commentData = {
              content: commentText,
            };

            // Send the comment to the server via a POST request
            fetch(`http://localhost:5000/posts/${postId}/comment`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${localStorage.getItem("token")}`,
              },
              body: JSON.stringify(commentData),
            })
              .then((response) => response.json())
              .then((data) => {
                console.log("Server response:", data);
                if (data.success) {
                  console.log("Comment submitted successfully:", data.comment);
                  document.getElementById(`comment-area-${postId}`).value = "";
                  document
                    .getElementById(`comment-area-${postId}`)
                    .classList.remove("active");
                  this.classList.remove("active");

                  // Add the new comment to the comments section
                  const commentsSection = document.getElementById(
                    `comments-section-${postId}`
                  );
                  const newCommentElement = document.createElement("div");
                  newCommentElement.classList.add("comment");
                  newCommentElement.innerHTML = `
                                <span class="comment-username">${data.comment.username}</span>
                                <p class="comment-content">${data.comment.content}</p>
                            `;
                  commentsSection.appendChild(newCommentElement);
                } else {
                  console.error("Failed to submit comment:", data.message);
                  alert("Failed to submit comment. Please try again.");
                }
              })
              .catch((error) => {
                console.error("Error submitting comment:", error);
                alert("Error submitting comment. Please try again.");
              });
          } else {
            alert("Please enter a comment.");
          }
        });
      });
    } catch (error) {
      console.error("Error:", error);
      // alert("An error occurred while loading posts.");
    }
  }

  // Function to check follow status
  async function checkFollowStatus(userId, button) {
    try {
      const response = await fetch(
        `http://localhost:5000/isFollowing/${userId}`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        if (data.isFollowing) {
          button.classList.add("following");
          button.textContent = "Unfollow";
        } else {
          button.textContent = "Follow";
        }
      } else {
        console.error("Failed to check follow status");
      }
    } catch (error) {
      console.error("Error checking follow status:", error);
    }
  }

  async function loadUsername() {
    const headerUsername = document.getElementById("header-username");
    let userIcon = document.getElementById("user-icon"); // Use let instead of const

    const token = localStorage.getItem("token");
    if (!token) {
      console.log("User is not logged in. Redirecting to login page.");
      window.location.href = "http://localhost:5500/public/index.html";
      return; // Stop the function if the user is not logged in
    }
    try {
      const response = await fetch("http://localhost:5000/profile", {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      console.log("Response Status:", response.status); // Debugging line

      if (!response.ok) {
        if (response.status === 400) {
          alert("Session expired. Please log in again.");
          window.location.href = "http://localhost:5500/public/index.html";
          return;
        }
        throw new Error(`Network response was not ok: ${response.statusText}`);
      }

      const userName = await response.json();

      if (!userName.success || !userName.user) {
        throw new Error("Username data is missing or invalid.");
      }

      if (headerUsername) {
        headerUsername.textContent =
          userName.user.username || "No username available";
      }
      if (userIcon) {
        userIcon.src =
          userName.user.profilePicture ||
          "../profile/default-profile-picture.jpg";
      }
    } catch (error) {
      console.error("Error:", error);
      alert("An error occurred while loading username information.");
    }
  }

  function loadComments(postId) {
    fetch(`http://localhost:5000/posts/${postId}/comments`, {
      headers: {
        Authorization: `Bearer ${localStorage.getItem("token")}`,
      },
    })
      .then((response) => response.json())
      .then((data) => {
        const commentsSection = document.getElementById(
          `comments-section-${postId}`
        );
        if (!commentsSection) return;

        commentsSection.innerHTML = ""; // Clear existing comments

        data.comments.forEach((comment) => {
          const username = comment.author.username || "Unknown User";
          const profilePicture =
            comment.author.profilePicture ||
            "/profile/default-profile-picture.png"; // Default if not available

          const commentElement = document.createElement("div");
          commentElement.classList.add("comment");

          commentElement.innerHTML = `
                <div class="comment-header">
                    <img src="${profilePicture}" alt="${username}'s profile picture" class="comment-profile-picture">
                    <span class="comment-username">${username}</span>
                </div>
                <p class="comment-content">${comment.content}</p>
            `;

          commentsSection.appendChild(commentElement);
        });
      })
      .catch((error) => {
        console.error("Error loading comments:", error);
      });
  }

  async function loadUserProfile() {
    const token = localStorage.getItem("token");

    if (!token) {
      console.log("User is not logged in. Redirecting to login page.");
      window.location.href = "http://localhost:5500/public/index.html";
      return;
    }

    try {
      const response = await fetch("http://localhost:5000/profile", {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      console.log("Response Status:", response.status); // Debugging line

      if (!response.ok) {
        if (response.status === 400) {
          alert("Session expired. Please log in again.");
          window.location.href = "http://localhost:5500/public/index.html";
          return;
        }
        throw new Error(`Network response was not ok: ${response.statusText}`);
      }

      const userProfile = await response.json();
      console.log("User Profile:", userProfile); // Debugging line

      if (!userProfile.success || !userProfile.user) {
        throw new Error("User profile data is missing or invalid.");
      }

      const profileUsername = document.getElementById("profile-username");
      const profileBio = document.getElementById("profile-bio");
      const profilePostsCount = document.getElementById("profile-posts-count");
      const profileFollowers = document.getElementById("profile-followers");
      const profileFollowing = document.getElementById("profile-following");
      const profilePicture = document.getElementById("profile-picture");
      const goBack = document.getElementById("go-back-btn");
      const logOut = document.getElementById("logout-btn");
      document.getElementById("update-profile-form").style.display = "none";

      profileUsername.textContent =
        userProfile.user.username || "No username available";
      profilePostsCount.textContent = userProfile.user.postCount || 0;
      profileBio.textContent = userProfile.user.bio || "No bio available";
      if (profileFollowers)
        profileFollowers.textContent = userProfile.user.followers.length || 0;
      if (profileFollowing)
        profileFollowing.textContent = userProfile.user.following.length || 0;

      // Set the profile picture
      if (profilePicture && userProfile.user.profilePicture)
        profilePicture.src =
          userProfile.user.profilePicture ||
          "../profile/defualt-profile-picture.jpg";

      if (goBack) {
        goBack.addEventListener("click", () => {
          window.location.href = "http://localhost:5500/public/main.html";
        });
      }

      if (logOut) {
        logOut.addEventListener("click", () => {
          window.location.href = "http://localhost:5500/public/index.html";
        });
      }
    } catch (error) {
      console.error("Error:", error);
      alert("An error occurred while loading profile information.");
    }
    initializeProfileEdit();
  }

  // Handle user profile click
  const userProfileIcon = document.querySelector(".user-profile");

  if (userProfileIcon) {
    userProfileIcon.addEventListener("click", () => {
      window.location.href = "http://localhost:5500/public/profile.html"; // Redirect to profile page
    });
  }

  // Call loadUserProfile on profile.html page
  if (window.location.pathname.endsWith("profile.html")) {
    loadUserProfile();
  }

  // Function to update user profile information (excluding profile picture)
  async function updateUserProfile() {
    const token = localStorage.getItem("token");
    if (!token) {
      console.log("User is not logged in. Redirecting to login page.");
      window.location.href = "http://localhost:5000/public/index.html";
      return; // Stop the function if the user is not logged in
    }

    // Get the updated values from the form fields
    const updatedUsername = document.getElementById("username").value;
    const updatedBio = document.getElementById("bio").value;

    // Update other user profile information
    try {
      const response = await fetch("http://localhost:5000/profile", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          username: updatedUsername,
          bio: updatedBio,
        }),
      });

      if (!response.ok) {
        if (response.status === 400) {
          alert("Session expired. Please log in again.");
          window.location.href = "http://localhost:5000/public/index.html";
          return;
        }
        throw new Error(`Network response was not ok: ${response.statusText}`);
      }

      const result = await response.json();

      if (result.success) {
        alert("Profile updated successfully!");
        // Reload the profile page to reflect changes
        loadUserProfile();
        // Hide the update form again
        document.getElementById("update-profile-form").style.display = "none";
      } else {
        alert(`Failed to update profile: ${result.message}`);
      }
    } catch (error) {
      console.error("Error:", error);
      alert("An error occurred while updating profile information.");
    }
  }

  // Function to initialize profile picture edit functionality
  function initializeProfileEdit() {
    // Initialize edit icon and file input
    const editIcon = document.querySelector(".edit-icon");
    const profilePictureInput = document.getElementById(
      "profile-picture-input"
    );
    const profilePicture = document.getElementById("profile-picture");

    // Check if elements are found
    if (!editIcon || !profilePictureInput || !profilePicture) {
      console.error("Required DOM elements not found.");
      return;
    }

    // When the edit icon is clicked, trigger the file input
    editIcon.addEventListener("click", () => {
      profilePictureInput.click();
    });

    // Handle file selection
    profilePictureInput.addEventListener("change", async () => {
      const file = profilePictureInput.files[0];

      if (file) {
        // Display a preview of the selected image (optional)
        const reader = new FileReader();
        reader.onload = (e) => {
          profilePicture.src = e.target.result;
        };
        reader.readAsDataURL(file);

        // Prepare the form data to send to the server
        const formData = new FormData();
        formData.append("profilePicture", file);

        // Send the profile picture to the server
        try {
          const token = localStorage.getItem("token");
          if (!token) {
            console.log("User is not logged in. Redirecting to login page.");
            window.location.href = "http://localhost:5000/public/index.html";
            return; // Stop the function if the user is not logged in
          }

          const response = await fetch("http://localhost:5000/profile", {
            method: "PUT",
            headers: {
              Authorization: `Bearer ${token}`,
            },
            body: formData,
          });

          const result = await response.json();

          if (result.success) {
            alert("Profile picture updated successfully!");
            // Update profile picture URL in the form
            document.getElementById("profile-picture").src =
              result.user.profilePicture;
          } else {
            alert(`Failed to update profile picture: ${result.message}`);
          }
        } catch (error) {
          console.error("Error:", error);
          alert("An error occurred while updating the profile picture.");
        }
      }
    });
  }

  // Handle form submission for updating profile
  const updateProfileForm = document.getElementById("update-profile-form");

  if (updateProfileForm) {
    updateProfileForm.addEventListener("submit", (e) => {
      e.preventDefault(); // Prevent the default form submission
      updateUserProfile();
    });
  }

  // Show the form when "Edit Profile" is clicked
  const editProfileBtn = document.getElementById("edit-profile-btn");
  if (editProfileBtn) {
    editProfileBtn.addEventListener("click", () => {
      const form = document.getElementById("update-profile-form");
      form.style.display = form.style.display === "none" ? "block" : "none"; // Toggle the form visibility
    });
  }

  // Function to fetch and display followers or following
  async function loadList(type) {
    const token = localStorage.getItem("token");
    if (!token) {
      console.log("User is not logged in. Redirecting to login page.");
      window.location.href = "http://localhost:5000/public/index.html";
      return; // Stop the function if the user is not logged in
    }

    try {
      const response = await fetch(`http://localhost:5000/${type}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        if (response.status === 400) {
          alert("Session expired. Please log in again.");
          window.location.href = "http://localhost:5000/public/index.html";
          return;
        }
        throw new Error(`Network response was not ok: ${response.statusText}`);
      }

      const data = await response.json();
      const listElement = document.getElementById(`${type}-list`);
      listElement.innerHTML = ""; // Clear existing list items

      data[type].forEach((user) => {
        const listItem = document.createElement("li");
        listItem.textContent = user.username;
        listElement.appendChild(listItem);
      });
    } catch (error) {
      console.error("Error:", error);
      alert("An error occurred while loading the list.");
    }
  }

  // Attach click events to followers and following elements
  document.getElementById("followers-btn")?.addEventListener("click", () => {
    console.log("Followers button clicked");
    loadList("followers");
    showModal("followers-modal");
  });

  document.getElementById("following-btn")?.addEventListener("click", () => {
    console.log("Following button clicked");
    loadList("following");
    showModal("following-modal");
  });

  // Close modals when the close button is clicked
  document
    .getElementById("close-followers-modal")
    ?.addEventListener("click", () => {
      hideModal("followers-modal");
    });

  document
    .getElementById("close-following-modal")
    ?.addEventListener("click", () => {
      hideModal("following-modal");
    });

  // Close modals when clicking outside the modal content
  window.addEventListener("click", (event) => {
    if (event.target.classList.contains("modal")) {
      hideModal("followers-modal");
      hideModal("following-modal");
    }
  });

  // Show Modal
  function showModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
      modal.style.display = "block";
    } else {
      console.error(`Modal with ID ${modalId} not found`);
    }
  }

  // Hide Modal
  function hideModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
      modal.style.display = "none";
    } else {
      console.error(`Modal with ID ${modalId} not found`);
    }
  }

  window.likePost = async function (postId) {
    try {
      const response = await fetch(
        `http://localhost:5000/posts/${postId}/like`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        }
      );

      const result = await response.json();

      if (response.ok) {
        alert(result.message);
        loadPosts(); // Refresh the posts to update the like count
      } else {
        alert(result.message || "Failed to like post.");
      }
    } catch (error) {
      console.error("Error:", error);
      alert("An error occurred while liking the post.");
    }
  };

  window.commentOnPost = async function (postId) {
    const commentContent = prompt("Enter your comment:");

    if (!commentContent) return;

    try {
      const response = await fetch(
        `http://localhost:5000/posts/${postId}/comment`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
          body: JSON.stringify({ content: commentContent }),
        }
      );

      if (response.ok) {
        loadPosts();
      } else {
        alert("Failed to comment on post.");
      }
    } catch (error) {
      console.error("Error:", error);
      alert("An error occurred while commenting on the post.");
    }
  };

  // Redirect to login if no token
  const token = localStorage.getItem("token");
  if (!token) {
    window.location.href = "http://localhost:5500/public/index.html";
  } else {
    // Check if the current page is 'main.html'
    const isMainPage = window.location.pathname.includes("main.html");

    if (isMainPage) {
      loadUsername();
      loadPosts();
    }
  }
});
