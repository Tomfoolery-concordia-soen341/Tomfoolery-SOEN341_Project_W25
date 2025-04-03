import React, { useState, useEffect } from "react";
import { auth, db } from "../../config/firebase";
import { useAuthState } from "react-firebase-hooks/auth";
import {
  updateEmail,
  updatePassword,
  EmailAuthProvider,
  reauthenticateWithCredential,
} from "firebase/auth";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { useNavigate } from "react-router-dom";

const ProfilePage = () => {
  const [user, loading] = useAuthState(auth);

  const [formData, setFormData] = useState({
    username: "",
    currentPassword: "",
  });

  const [emailForm, setEmailForm] = useState({
    currentPassword: "",
    newEmail: "",
  });

  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [showSuccessPopup, setShowSuccessPopup] = useState(false);

  const navigate = useNavigate();

  const fetchUserData = async () => {
    if (user) {
      const userDoc = await getDoc(doc(db, "users", user.uid));
      if (userDoc.exists()) {
        setFormData((prev) => ({
          ...prev,
          username: userDoc.data().username || "",
          newEmail: user.email || "",
        }));
      }
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const triggerSuccessPopup = (message) => {
    setSuccess(message);
    setShowSuccessPopup(true);
    setTimeout(() => {
      setShowSuccessPopup(false);
      setSuccess("");
    }, 3000);
  };

  const handleUpdateUsername = async (e) => {
    e.preventDefault();
    try {
      const credential = EmailAuthProvider.credential(
        user.email,
        formData.currentPassword
      );
      await reauthenticateWithCredential(user, credential);
      await updateDoc(doc(db, "users", user.uid), {
        username: formData.username.trim(),
      });
      triggerSuccessPopup("Username updated successfully!");
      setError("");
    } catch (err) {
      setError(err.message);
      setTimeout(() => setError(""), 3000);
    }
  };

  const handleUpdateEmail = async (e) => {
    e.preventDefault();
    try {
      const credential = EmailAuthProvider.credential(
        user.email,
        emailForm.currentPassword
      );
      await reauthenticateWithCredential(user, credential);
      await updateEmail(user, emailForm.newEmail);
      await updateDoc(doc(db, "users", user.uid), {
        email: emailForm.newEmail,
      });
      triggerSuccessPopup("Email updated successfully!");
      setError("");
    } catch (err) {
      setError(err.message);
      setTimeout(() => setError(""), 3000);
    }
  };

  const handleUpdatePassword = async (e) => {
    e.preventDefault();
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setError("Passwords do not match");
      setTimeout(() => setError(""), 3000);
      return;
    }

    try {
      const credential = EmailAuthProvider.credential(
        user.email,
        passwordForm.currentPassword
      );
      await reauthenticateWithCredential(user, credential);
      await updatePassword(user, passwordForm.newPassword);
      triggerSuccessPopup("Password updated successfully!");
      setError("");
      setPasswordForm({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
    } catch (err) {
      setError(err.message);
      setTimeout(() => setError(""), 3000);
    }
  };

  useEffect(() => {
    fetchUserData().then(() => null);
  }, [user]);

  return (
    <div
      className="container has-background-light"
      style={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        minHeight: "100vh",
      }}
    >
      <div className="has-background-light" style={{ width: "50%" }}>
        {/* Success Popup Modal */}
        {showSuccessPopup && (
          <div
            className="modal is-active"
            onClick={() => setShowSuccessPopup(false)} // Close modal on background click
          >
            <div className="modal-background"></div>
            <div
              className="modal-content"
              onClick={(e) => e.stopPropagation()} // Prevent closing when clicking inside the modal content
            >
              <div className="notification is-success has-text-centered">
                {success}
              </div>
            </div>
            <button
              className="modal-close is-large"
              aria-label="close"
              onClick={() => setShowSuccessPopup(false)}
            ></button>
          </div>
        )}

        <h1 className="title has-text-centered">Profile Settings</h1>

        <form onSubmit={handleUpdateUsername} className="box">
          <h2 className="subtitle">Username</h2>
          <div className="field">
            <label className="label">New Username</label>
            <div className="control">
              <input
                className="input"
                name="username"
                value={formData.username}
                onChange={handleChange}
                placeholder="Enter username"
                required
              />
            </div>
          </div>
          <div className="field">
            <label className="label">Current Password</label>
            <div className="control">
              <input
                className="input"
                type="password"
                name="currentPassword"
                value={formData.currentPassword}
                onChange={handleChange}
                placeholder="Current password"
                required
              />
            </div>
          </div>
          <button className="button is-primary" type="submit">
            Update Username
          </button>
        </form>

        <form onSubmit={handleUpdateEmail} className="box">
          <h2 className="subtitle">Email</h2>
          <div className="field">
            <label className="label">New Email</label>
            <div className="control">
              <input
                className="input"
                type="email"
                name="newEmail"
                value={emailForm.newEmail}
                onChange={handleChange}
                required
              />
            </div>
          </div>
          <div className="field">
            <label className="label">Current Password</label>
            <div className="control">
              <input
                className="input"
                type="password"
                name="currentPassword"
                value={emailForm.currentPassword}
                onChange={handleChange}
                placeholder="Current password"
                required
              />
            </div>
          </div>
          <button className="button is-primary" type="submit">
            Update Email
          </button>
        </form>

        <form onSubmit={handleUpdatePassword} className="box">
          <h2 className="subtitle">Password</h2>
          <div className="field">
            <label className="label">Current Password</label>
            <div className="control">
              <input
                className="input"
                type="password"
                name="currentPassword"
                value={passwordForm.currentPassword}
                onChange={(e) =>
                  setPasswordForm({
                    ...passwordForm,
                    currentPassword: e.target.value,
                  })
                }
                placeholder="Current password"
                required
              />
            </div>
          </div>
          <div className="field">
            <label className="label">New Password</label>
            <div className="control">
              <input
                className="input"
                type="password"
                name="newPassword"
                value={passwordForm.newPassword}
                onChange={(e) =>
                  setPasswordForm({
                    ...passwordForm,
                    newPassword: e.target.value,
                  })
                }
                placeholder="New password (min 6 chars)"
                minLength="6"
                required
              />
            </div>
          </div>
          <div className="field">
            <label className="label">Confirm New Password</label>
            <div className="control">
              <input
                className="input"
                type="password"
                name="confirmPassword"
                value={passwordForm.confirmPassword}
                onChange={(e) =>
                  setPasswordForm({
                    ...passwordForm,
                    confirmPassword: e.target.value,
                  })
                }
                placeholder="Confirm new password"
                required
              />
            </div>
          </div>
          <button className="button is-primary" type="submit">
            Update Password
          </button>
        </form>

        {error && <div className="notification is-danger">{error}</div>}

        <button
          className="button is-link is-light"
          onClick={() => navigate(-1)}
        >
          ← Back to Dashboard
        </button>
      </div>
    </div>
  );
};

export default ProfilePage;
