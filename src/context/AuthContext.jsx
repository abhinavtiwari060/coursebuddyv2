import { createContext, useState, useEffect, useContext } from 'react';
import api, { authService } from '../api/api';
import { requestForToken, onMessageListener, signInWithGoogle } from '../utils/firebase';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Initialize Auth
  useEffect(() => {
    const token = localStorage.getItem('studyflow_token');
    const userData = localStorage.getItem('studyflow_user');
    
    if (token && userData) {
      setUser(JSON.parse(userData));
    }
    setLoading(false);
  }, []);

  // Request & register FCM token automatically whenever a user is logged in
  useEffect(() => {
    if (user) {
      const syncFCM = async () => {
        try {
          if (Notification.permission === 'default') {
            const permission = await Notification.requestPermission();
            if (permission === 'granted') {
              const fcmToken = await requestForToken();
              if (fcmToken) await api.post('/api/profile/fcm-token', { token: fcmToken });
            }
          } else if (Notification.permission === 'granted') {
            const fcmToken = await requestForToken();
            if (fcmToken) await api.post('/api/profile/fcm-token', { token: fcmToken });
          }
        } catch (err) {
          console.log("Failed to sync FCM token", err);
        }
      };
      syncFCM();

      // Listen for foreground messages
      onMessageListener().then(payload => {
         alert(`Notification: ${payload?.notification?.title}\n${payload?.notification?.body}`);
      }).catch(err => console.log('failed: ', err));
    }
  }, [user]);

  const login = async (email, password) => {
    const data = await authService.login(email, password);
    const { token, user: userData } = data;
    
    localStorage.setItem('studyflow_token', token);
    localStorage.setItem('studyflow_user', JSON.stringify(userData));
    setUser(userData);
    return userData;
  };

  const signup = async (name, email, password) => {
    const data = await authService.signup(name, email, password);
    const { token, user: userData } = data;
    
    localStorage.setItem('studyflow_token', token);
    localStorage.setItem('studyflow_user', JSON.stringify(userData));
    setUser(userData);
    return userData;
  };

  const loginWithGoogle = async () => {
    const result = await signInWithGoogle();
    const fbUser = result.user;
    
    // Connect firebase user to our backend
    const data = await authService.googleLogin(
      fbUser.displayName || 'Google User', 
      fbUser.email, 
      fbUser.photoURL || ''
    );
    const { token, user: userData } = data;
    
    localStorage.setItem('studyflow_token', token);
    localStorage.setItem('studyflow_user', JSON.stringify(userData));
    setUser(userData);
    return userData;
  };

  const logout = async () => {
    try {
      await api.post('/api/auth/logout');
    } catch (err) {
      console.log('Logout API error (non-critical)', err);
    }
    localStorage.removeItem('studyflow_token');
    localStorage.removeItem('studyflow_user');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, signup, loginWithGoogle, logout }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
