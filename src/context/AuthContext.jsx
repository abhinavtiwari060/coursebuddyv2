import { createContext, useState, useEffect, useContext } from 'react';
import api, { authService } from '../api/api';

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
