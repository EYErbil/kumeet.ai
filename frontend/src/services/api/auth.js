import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged, 
  sendEmailVerification,
  sendPasswordResetEmail,
  GoogleAuthProvider,
  signInWithPopup,
  updateProfile
} from "firebase/auth";
import { auth } from "../../config/firebase";

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000/api';

// Function to send verification email with custom settings
const sendVerificationEmail = async (user) => {
  try {
    // Get the current URL's origin for the continue URL
    const continueUrl = process.env.REACT_APP_VERIFICATION_REDIRECT_URL || 'http://localhost:3000/verify-email';
    
    const actionCodeSettings = {
      url: continueUrl,
      handleCodeInApp: false, // Set to false for standard email verification flow
    };
    
    console.log('Sending verification email with settings:', actionCodeSettings);
    console.log('Current user:', {
      email: user.email,
      emailVerified: user.emailVerified,
      uid: user.uid
    });

    // Send the verification email with actionCodeSettings
    await sendEmailVerification(user, actionCodeSettings);
    
    // Log the user's email for verification
    console.log('Verification email should be sent to:', user.email);
    
    // Check if the email was actually sent
    if (user.emailVerified === false) {
      console.log('Email verification status:', {
        email: user.email,
        emailVerified: user.emailVerified,
        emailSent: true,
        continueUrl
      });
    }
    
    return true;
  } catch (error) {
    console.error('Error sending verification email:', error.code, error.message);
    if (error.code === 'auth/missing-continue-uri') {
      console.error('⚠️ Missing or invalid actionCodeSettings URL.');
    } else if (error.code === 'auth/too-many-requests') {
      console.error('⚠️ Too many requests. Try again later.');
    }
    throw new Error(`Failed to send verification email: ${error.message}`);
  }
};


export const register = async (userData) => {
  try {
    console.log('Starting registration process...');
    
    let userCredential;
    try {
      userCredential = await createUserWithEmailAndPassword(auth, userData.email, userData.password);
    } catch (firebaseError) {
      if (firebaseError.code === 'auth/email-already-in-use') {
        throw new Error('This email is already registered. Please try logging in instead.');
      } else {
        throw firebaseError;
      }
    }

    console.log('User created successfully, waiting for auth state change...');

    // Ensure the user is authenticated before sending verification email
    onAuthStateChanged(auth, async (user) => {
      if (user) {
        console.log('User authenticated:', user.email);

        // Update the user's display name
        await updateProfile(user, {
          displayName: `${userData.firstName} ${userData.lastName}`
        });

        console.log('User profile updated successfully');

        // Send email verification
        try {
          await sendEmailVerification(user);
          console.log('Verification email sent successfully');
        } catch (error) {
          console.error('Failed to send verification email:', error);
        }
      } else {
        console.log('User is not signed in, cannot send verification email');
      }
    });

    return userCredential.user;
  } catch (error) {
    console.error('Registration error:', error);
    throw error;
  }
};


// Google Sign in
export const signInWithGoogle = async () => {
  try {
    console.log('Starting Google sign-in process...');
    const provider = new GoogleAuthProvider();
    const result = await signInWithPopup(auth, provider);
    
    // Get the user's ID token
    console.log('Getting ID token...');
    const idToken = await result.user.getIdToken();
    
    // Verify token with backend
    console.log('Verifying token with backend...');
    const response = await fetch(`${API_URL}/auth/verify-token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ idToken }),
      credentials: 'include'
    });

    console.log('Backend response status:', response.status);
    const data = await response.json();
    console.log('Backend response data:', data);

    if (!response.ok) {
      throw new Error(data.detail || 'Google sign-in failed');
    }

    console.log('Google sign-in completed successfully');
    return result.user;
  } catch (error) {
    console.error('Google sign-in error:', error);
    throw error;
  }
};

// Login function
export const login = async (email, password) => {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    return userCredential.user;
  } catch (error) {
    console.error("Error logging in:", error.message);
    throw error;
  }
};

// Logout function
export const logout = async () => {
  try {
    await signOut(auth);
    console.log("User logged out");
  } catch (error) {
    console.error("Error logging out:", error.message);
    throw error;
  }
};

// Get current user
export const getCurrentUser = () => {
  return auth.currentUser;
};

// Auth state change listener
export const onAuthStateChangedListener = (callback) => {
  return onAuthStateChanged(auth, callback);
};

// Password reset function
export const resetPassword = async (email) => {
  try {
    await sendPasswordResetEmail(auth, email);
    console.log("Password reset email sent");
  } catch (error) {
    console.error("Error resetting password:", error.message);
    throw error;
  }
};
