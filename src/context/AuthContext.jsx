import { createContext, useState, useEffect, useContext } from 'react';
import api, { authService, profileService } from '../api/api';
import { requestForToken, onMessageListener, signInWithGoogle, signOutFirebase } from '../utils/firebase';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Initialize Auth
  useEffect(() => {
    let isMounted = true;

    const initAuth = async () => {
      const token = localStorage.getItem('studymate_token');

      if (token) {
        try {
          const data = await authService.me();
          if (data && data.user && isMounted) {
            localStorage.setItem('studymate_user', JSON.stringify(data.user));
            setUser(data.user);
          } else if (isMounted) {
            // Invalid token
            localStorage.removeItem('studymate_token');
            localStorage.removeItem('studymate_user');
            await signOutFirebase();
            setUser(null);
          }
        } catch (err) {
          console.warn("Auth initialization notice:", err?.message || err);
          const userData = localStorage.getItem('studymate_user');
          if (userData && isMounted) {
            try {
              setUser(JSON.parse(userData));
            } catch {
              localStorage.removeItem('studymate_user');
              localStorage.removeItem('studymate_token');
              await signOutFirebase();
              setUser(null);
            }
          } else if (isMounted) {
            localStorage.removeItem('studymate_token');
            localStorage.removeItem('studymate_user');
            await signOutFirebase();
            setUser(null);
          }
        }
      } else {
        // No local session; ensure any dangling Firebase Auth credentials are clean
        await signOutFirebase();
      }

      if (isMounted) {
        setLoading(false);
      }
    };

    initAuth();

    return () => {
      isMounted = false;
    };
  }, []);

  // Request & register FCM token safely when a user is logged in
  useEffect(() => {
    if (user && typeof window !== 'undefined' && 'Notification' in window) {
      let isSubscribed = true;

      const syncFCM = async () => {
        try {
          // Only automatically retrieve token if permission was already granted
          if (Notification.permission === 'granted') {
            const fcmToken = await requestForToken();
            if (fcmToken && isSubscribed) {
              await api.post('/api/profile/fcm-token', { token: fcmToken });
            }
          }
        } catch (err) {
          console.warn("FCM sync handled gracefully:", err?.message || err);
        }
      };

      syncFCM();

      // Listen for foreground notifications safely
      if (Notification.permission === 'granted') {
        onMessageListener()
          .then((payload) => {
            if (isSubscribed && payload?.notification) {
              const { title, body } = payload.notification;
              console.log(`[Notification] ${title}: ${body}`);
            }
          })
          .catch((err) => console.warn('Notification listener error:', err));
      }

      return () => {
        isSubscribed = false;
      };
    }
  }, [user]);

  const refreshUser = async () => {
    try {
      const data = await profileService.get();
      if (data && data.user) {
        localStorage.setItem('studymate_user', JSON.stringify(data.user));
        setUser(data.user);
        return data.user;
      }
    } catch (err) {
      console.warn("Failed to refresh user profile:", err?.message || err);
    }
  };

  const login = async (email, password) => {
    const data = await authService.login(email, password);
    const { token, user: userData } = data;

    localStorage.setItem('studymate_token', token);
    localStorage.setItem('studymate_user', JSON.stringify(userData));
    setUser(userData);
    return userData;
  };

  const signup = async (name, email, password) => {
    const data = await authService.signup(name, email, password);
    const { token, user: userData } = data;

    localStorage.setItem('studymate_token', token);
    localStorage.setItem('studymate_user', JSON.stringify(userData));
    setUser(userData);
    return userData;
  };

  const loginWithGoogle = async () => {
    const result = await signInWithGoogle();
    const fbUser = result.user;

    const data = await authService.googleLogin(
      fbUser.displayName || 'Google User',
      fbUser.email,
      fbUser.photoURL || ''
    );
    const { token, user: userData } = data;

    localStorage.setItem('studymate_token', token);
    localStorage.setItem('studymate_user', JSON.stringify(userData));
    setUser(userData);
    return userData;
  };

  const logout = async () => {
    try {
      await api.post('/api/auth/logout');
    } catch (err) {
      console.warn('Logout API error (non-critical):', err?.message || err);
    }
    // Cleanly sign out from Firebase to purge refresh tokens & prevent securetoken 400 loops
    await signOutFirebase();
    localStorage.removeItem('studymate_token');
    localStorage.removeItem('studymate_user');
    setUser(null);
  };

  const updateUserCategory = async (category) => {
    const data = await profileService.update({ category });
    const updated = data.user || data;
    const merged = { ...user, ...updated, category };
    localStorage.setItem('studymate_user', JSON.stringify(merged));
    setUser(merged);
    return merged;
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        setUser,
        loading,
        login,
        signup,
        loginWithGoogle,
        logout,
        refreshUser,
        updateUserCategory
      }}
    >
      {loading ? (
        <div className="min-h-screen flex items-center justify-center bg-[#FFF7ED]">
          <div className="flex flex-col items-center gap-3">
            <span className="font-['Outfit'] text-2xl font-black text-[#431407]">
              Study<span className="text-[#EA580C]">Mate</span>
            </span>
            <div className="w-10 h-1 bg-[#FED7AA] rounded-full overflow-hidden">
              <div className="w-full h-full bg-[#EA580C] animate-pulse" />
            </div>
          </div>
        </div>
      ) : (
        children
      )}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
