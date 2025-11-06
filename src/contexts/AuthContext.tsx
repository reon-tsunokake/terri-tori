'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, onAuthStateChanged } from 'firebase/auth';
import { auth } from '../lib/firebase';
import { AuthService } from '../services/authService';
import { UserService } from '../services/userService';
import { AuthContextType, SignInData, SignUpData } from '../types/auth';
import { UserDocument } from '../types/firestore';

// Services are static classes, no need to instantiate

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: React.ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserDocument | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        try {
          // Get or create user document in Firestore
          let profile = await UserService.getUser(user.uid);
          
          if (!profile) {
            // Create user document if it doesn't exist
            profile = await UserService.createUser(user);
          }
          
          setUserProfile(profile);
        } catch (error) {
          console.error('Error managing user document:', error);
        }
      } else {
        setUserProfile(null);
      }
      
      setUser(user);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const signIn = async (data: SignInData) => {
    try {
      setLoading(true);
      await AuthService.signIn(data);
    } catch (error) {
      setLoading(false);
      throw error;
    }
  };

  const signUp = async (data: SignUpData) => {
    try {
      setLoading(true);
      await AuthService.signUp(data);
    } catch (error) {
      setLoading(false);
      throw error;
    }
  };

  const signInWithGoogle = async () => {
    try {
      setLoading(true);
      await AuthService.signInWithGoogle();
    } catch (error) {
      setLoading(false);
      throw error;
    }
  };

  const logout = async () => {
    try {
      await AuthService.signOut();
      setUser(null);
      setUserProfile(null);
    } catch (error) {
      throw error;
    }
  };

  const updateUserProfile = async (profileData: Partial<UserDocument>) => {
    if (!user) throw new Error('No authenticated user');
    
    try {
      const updatedProfile = await UserService.updateUserProfile(user.uid, profileData);
      setUserProfile(updatedProfile);
    } catch (error) {
      throw error;
    }
  };

  const value: AuthContextType = {
    user,
    userProfile,
    loading,
    signIn,
    signUp,
    signInWithGoogle,
    logout,
    updateUserProfile,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};