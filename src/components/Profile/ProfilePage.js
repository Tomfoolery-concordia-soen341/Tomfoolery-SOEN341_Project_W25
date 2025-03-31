import React, { useState, useEffect } from "react";
import { auth, db } from "../../config/firebase";
import { useAuthState } from "react-firebase-hooks/auth";
import {
  updateEmail,
  updatePassword,
  EmailAuthProvider,
  reauthenticateWithCredential,
    updateProfile
} from "firebase/auth";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { useNavigate } from "react-router-dom";
import "./ProfilePage.css";

const ProfilePage = () => {
  const [user] = useAuthState(auth);

  //change username
  const [formData, setFormData] = useState({
    displayName: "",
    currentPassword: "",
  });

  //for email change
  const [emailForm, setEmailForm] = useState({
    currentPassword: "",
    newEmail: "",
  });

  //change password
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  //error handling
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  //navigation
  const navigate = useNavigate();

  //fetch the user's information
  const fetchUserData = async () => {
    if (user) {
      const userDoc = await getDoc(doc(db, "users", user.uid));
      if (userDoc.exists()) {
        setFormData((prev) => ({
          ...prev,
          displayName: userDoc.data().displayName || "",
          newEmail: user.email || "",
        }));
      }
    }
  };

  //when
  const handleChange = (e) => {
    const { name, value } = e.target;
    if ((name === "newEmail" || name === "currentPassword") && e.target.form.id === "emailForm") {
      setEmailForm(prev => ({ ...prev, [name]: value }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleUpdateUsername = async (e) => {
    e.preventDefault();
    try {
      // authenticate user
      const credential = EmailAuthProvider.credential(
          user.email,
          formData.currentPassword
      );
      await reauthenticateWithCredential(user, credential);

      // update the displayname
      await updateProfile(user, {
        displayName: formData.displayName.trim()
      });

      // update in the firestore
      await updateDoc(doc(db, "users", user.uid), {
        displayName: formData.displayName.trim()
      });

      // show the update
      setSuccess(`Display name updated successfully to ${formData.displayName.trim()}!`);
      setError("");

      // clear password field
      setFormData(prev => ({ ...prev, currentPassword: "" }));
      setFormData(prev => ({ ...prev, displayName: "" }));

      setTimeout(() => setSuccess(""), 3000);
    } catch (err) {
      setError(err.message);
      setTimeout(() => setError(""), 3000);
    }
  };
  //similar to update username
  const handleUpdateEmail = async (e) => {
    e.preventDefault();
    try {
      //confirmation to change
      const credential = EmailAuthProvider.credential(
        user.email,
        emailForm.currentPassword
      );
      await reauthenticateWithCredential(user, credential);
      //update the email
      await updateEmail(user, emailForm.newEmail);
      await updateDoc(doc(db, "users", user.uid), {
        email: emailForm.newEmail,
      });
      setSuccess("Email updated successfully!");
      setError("");
      setTimeout(() => setSuccess(""), 3000);
    } catch (err) {
      setError(err.message);
      setTimeout(() => setError(""), 3000);
    }
  };
  //similar to username
  const handleUpdatePassword = async (e) => {
    e.preventDefault();
    //if the password is not yet confirmed, then error.
    if (formData.newPassword !== formData.confirmPassword) {
      setError("Passwords do not match");
      //in 3 seconds, its gone
      setTimeout(() => setError(""), 3000);
      return;
    }

    try {
      //authenticate
      const credential = EmailAuthProvider.credential(
        user.email,
        passwordForm.currentPassword
      );
      await reauthenticateWithCredential(user, credential);
      //update password
      await updatePassword(user, passwordForm.newPassword);
      setSuccess("Password updated successfully!");
      setError("");
      setFormData((prev) => ({
        ...prev,
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      }));
      setTimeout(() => setSuccess(""), 3000);
    } catch (err) {
      setError(err.message);
      setTimeout(() => setError(""), 3000);
    }
  };

  //constantly update functions per new user loaded
  useEffect(() => {
    fetchUserData().then((r) => null);
  }, [user]);

  return (
    <div className="profile-page">
      <h1>Profile Settings</h1>
      <form onSubmit={handleUpdateUsername} className="profile-section">
        <h2>Username</h2>
        <input
          name="displayName"
          value={formData.displayName}
          onChange={handleChange}
          placeholder="Enter username"
          required
        />
        <input
          type="password"
          name="currentPassword"
          value={formData.currentPassword}
          onChange={handleChange}
          placeholder="Current password"
          required
        />
        <button type="submit">Update Username</button>
      </form>

      <form onSubmit={handleUpdateEmail} className="profile-section">
        <h2>Email</h2>
        <input
          type="email"
          name="newEmail"
          value={emailForm.newEmail}
          placeholder="Enter email"
          onChange={handleChange}
          required
        />
        <input
          type="password"
          name="currentPassword"
          value={emailForm.currentPassword}
          onChange={handleChange}
          placeholder="Current password"
          required
        />
        <button type="submit">Update Email</button>
      </form>

      <form onSubmit={handleUpdatePassword} className="profile-section">
        <h2>Password</h2>
        <input
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
        <input
          type="password"
          name="newPassword"
          value={passwordForm.newPassword}
          onChange={(e) =>
            setPasswordForm({ ...passwordForm, newPassword: e.target.value })
          }
          placeholder="New password (min 6 chars)"
          minLength="6"
          required
        />
        <input
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
        <button type="submit">Update Password</button>
      </form>

      {error && <div className="alert error">{error}</div>}
      {success && <div className="alert success">{success}</div>}

      <button className="back-button" onClick={() => navigate(-1)}>
        ← Back to Dashboard
      </button>
    </div>
  );
};

export default ProfilePage;
