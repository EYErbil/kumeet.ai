import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged, 
  sendEmailVerification,
  sendPasswordResetEmail,
  GoogleAuthProvider,
  signInWithPopup,
  updateProfile,
  browserLocalPersistence,
  browserSessionPersistence,
  setPersistence
} from "firebase/auth";
import { auth } from "../../config/firebase";
import ROUTES from "../../constants/routes";

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000/api';

// Function to send verification email with custom settings
const sendVerificationEmail = async (user) => {
  try {
    // Set continue URL to login page
    const continueUrl = `${window.location.origin}${ROUTES.AUTH.LOGIN}`;
    
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
    console.error('Detailed error sending verification email:', {
      code: error.code,
      message: error.message,
      fullError: error
    });
    throw new Error(`Failed to send verification email: ${error.message}`);
  }
};

// Register function
export const register = async (userData) => {
  try {
    console.log('Starting registration process...');
    
    // Create user in Firebase
    console.log('Creating user in Firebase...');
    let userCredential;
    try {
      userCredential = await createUserWithEmailAndPassword(
        auth, 
        userData.email, 
        userData.password
      );
    } catch (firebaseError) {
      if (firebaseError.code === 'auth/email-already-in-use') {
        throw new Error('This email is already registered. Please try logging in instead.');
      } else {
        throw firebaseError;
      }
    }
    
    // Send verification email if we created a new user
    if (userCredential && userCredential.user) {
      console.log('Preparing to send verification email to:', userCredential.user.email);
      try {
        // First update the profile
        await updateProfile(userCredential.user, {
          displayName: `${userData.firstName} ${userData.lastName}`
        });
        console.log('User profile updated successfully');
        
        // Then send verification email
        await sendVerificationEmail(userCredential.user);
        
      } catch (error) {
        console.error('Error during post-registration process:', error);
        // Log specific error type
        if (error.code) {
          console.error('Firebase error code:', error.code);
        }
        throw error; // Propagate the error to show it to the user
      }
    }

    console.log('Registration completed successfully');
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
export const login = async (email, password, rememberMe = false) => {
  try {
    // Clear any existing session data
    localStorage.removeItem('loginTimestamp');
    localStorage.removeItem('sessionLength');

    // Set persistence based on rememberMe
    const persistenceType = rememberMe ? browserLocalPersistence : browserSessionPersistence;
    await setPersistence(auth, persistenceType);

    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    // Check if email is verified
    if (!user.emailVerified) {
      // Sign out the user since email isn't verified
      await signOut(auth);
      throw new Error('Please verify your email before logging in. Check your inbox for the verification link.');
    }

    // If remember me is enabled, store login timestamp
    if (rememberMe) {
      const loginTimestamp = Date.now();
      localStorage.setItem('loginTimestamp', loginTimestamp.toString());
      // Set session length to 1 month (in milliseconds)
      localStorage.setItem('sessionLength', (30 * 24 * 60 * 60 * 1000).toString());
    }

    return user;
  } catch (error) {
    console.error("Login error:", error);
    
    // Handle specific Firebase auth errors
    if (error.code === 'auth/invalid-credential') {
      throw new Error('Invalid email or password');
    } else if (error.code === 'auth/too-many-requests') {
      throw new Error('Too many failed login attempts. Please try again later.');
    } else if (error.code === 'auth/user-disabled') {
      throw new Error('This account has been disabled. Please contact support.');
    }
    
    // If it's our custom error for unverified email, throw it as is
    if (error.message.includes('Please verify your email')) {
      throw error;
    }
    
    // For any other errors
    throw new Error(error.message || 'An error occurred during login');
  }
};

// Logout function
export const logout = async () => {
  try {
    await signOut(auth);
    // Clear session storage
    localStorage.removeItem('loginTimestamp');
    localStorage.removeItem('sessionLength');
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
  return onAuthStateChanged(auth, (user) => {
    // Only check session expiry if remember me is enabled (loginTimestamp exists)
    if (user && localStorage.getItem('loginTimestamp')) {
      const isExpired = checkSessionExpiry();
      if (isExpired) {
        logout().then(() => callback(null));
        return;
      }
    }
    callback(user);
  });
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

// Add a function to check session expiry
export const checkSessionExpiry = () => {
  const loginTimestamp = localStorage.getItem('loginTimestamp');
  const sessionLength = localStorage.getItem('sessionLength');

  if (loginTimestamp && sessionLength) {
    const now = Date.now();
    const expiryTime = parseInt(loginTimestamp) + parseInt(sessionLength);
    console.log('Session check:', {
      now,
      loginTimestamp: parseInt(loginTimestamp),
      sessionLength: parseInt(sessionLength),
      expiryTime,
      timeLeft: expiryTime - now
    });

    if (now > expiryTime) {
      // Clear storage first
      localStorage.removeItem('loginTimestamp');
      localStorage.removeItem('sessionLength');
      // Then sign out
      signOut(auth).catch(console.error);
      return true;
    }
  }
  return false;
};
