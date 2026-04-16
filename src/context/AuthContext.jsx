import { createContext, useState, useEffect, useContext } from 'react';
import api, { authService } from '../api/api';
import { requestForToken, onMessageListener } from '../utils/firebase';

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
          const fcmToken = await requestForToken();
          if (fcmToken) {
            await api.post('/api/profile/fcm-token', { token: fcmToken });
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

  const logout = () => {
    localStorage.removeItem('studyflow_token');
    localStorage.removeItem('studyflow_user');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, signup, logout }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
