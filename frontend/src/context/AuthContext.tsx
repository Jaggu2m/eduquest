import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, Organization, ClassRoom } from '../types';
import { authService, LoginPayload, RegisterPayload } from '../services/auth.service';
import { orgService } from '../services/org.service';
import { classService } from '../services/class.service';

interface AuthContextType {
  user: User | null;
  selectedOrg: Organization | null;
  selectedClass: ClassRoom | null;
  organizations: Organization[];
  classes: ClassRoom[];
  isLoading: boolean;
  isAuthenticated: boolean;
  isTeacher: boolean;
  isStudent: boolean;
  isAdmin: boolean;
  login: (payload: LoginPayload) => Promise<void>;
  register: (payload: RegisterPayload) => Promise<void>;
  logout: () => void;
  setSelectedOrg: (org: Organization) => void;
  setSelectedClass: (cls: ClassRoom) => void;
  loadOrganizations: () => Promise<Organization[]>;
  loadClasses: (orgId: string) => Promise<ClassRoom[]>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('user');
    return saved ? JSON.parse(saved) : null;
  });

  const [selectedOrg, setSelectedOrgState] = useState<Organization | null>(() => {
    const saved = localStorage.getItem('selectedOrg');
    return saved ? JSON.parse(saved) : null;
  });

  const [selectedClass, setSelectedClassState] = useState<ClassRoom | null>(() => {
    const saved = localStorage.getItem('selectedClass');
    return saved ? JSON.parse(saved) : null;
  });

  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [classes, setClasses] = useState<ClassRoom[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const setSelectedOrg = (org: Organization) => {
    setSelectedOrgState(org);
    localStorage.setItem('selectedOrg', JSON.stringify(org));
    loadClasses(org.id);
  };

  const setSelectedClass = (cls: ClassRoom) => {
    setSelectedClassState(cls);
    localStorage.setItem('selectedClass', JSON.stringify(cls));
  };

  const loadOrganizations = async (): Promise<Organization[]> => {
    try {
      const orgs = await orgService.getOrganizations();
      setOrganizations(orgs);
      if (orgs.length > 0 && !selectedOrg) {
        setSelectedOrg(orgs[0]);
      }
      return orgs;
    } catch (err) {
      console.error('Failed to load orgs', err);
      return [];
    }
  };

  const loadClasses = async (orgId: string): Promise<ClassRoom[]> => {
    try {
      const clsList = await classService.getClasses(orgId);
      setClasses(clsList);
      if (clsList.length > 0 && (!selectedClass || selectedClass.organizationId !== orgId)) {
        setSelectedClass(clsList[0]);
      }
      return clsList;
    } catch (err) {
      console.error('Failed to load classes', err);
      return [];
    }
  };

  useEffect(() => {
    const initAuth = async () => {
      const token = localStorage.getItem('token');
      if (token) {
        try {
          const profile = await authService.getCurrentUser();
          setUser(profile);
          const orgs = await loadOrganizations();
          if (orgs.length > 0) {
            const currentOrg = selectedOrg || orgs[0];
            await loadClasses(currentOrg.id);
          }
        } catch (e) {
          console.warn('Session expired or invalid token');
          authService.logout();
          setUser(null);
        }
      }
      setIsLoading(false);
    };

    initAuth();
  }, []);

  const login = async (payload: LoginPayload) => {
    const data = await authService.login(payload);
    setUser(data.user);
    const orgs = await loadOrganizations();
    if (orgs.length > 0) {
      setSelectedOrg(orgs[0]);
      await loadClasses(orgs[0].id);
    }
  };

  const register = async (payload: RegisterPayload) => {
    const data = await authService.register(payload);
    setUser(data.user);
    const orgs = await loadOrganizations();
    if (orgs.length > 0) {
      setSelectedOrg(orgs[0]);
      await loadClasses(orgs[0].id);
    }
  };

  const logout = () => {
    authService.logout();
    setUser(null);
    setSelectedOrgState(null);
    setSelectedClassState(null);
    setOrganizations([]);
    setClasses([]);
  };

  const role = user?.role || (user?.isPlatformAdmin ? 'PLATFORM_ADMIN' : 'STUDENT');
  const isTeacher = role === 'TEACHER' || role === 'PLATFORM_ADMIN';
  const isStudent = role === 'STUDENT';
  const isAdmin = role === 'PLATFORM_ADMIN' || !!user?.isPlatformAdmin;

  return (
    <AuthContext.Provider
      value={{
        user,
        selectedOrg,
        selectedClass,
        organizations,
        classes,
        isLoading,
        isAuthenticated: !!user,
        isTeacher,
        isStudent,
        isAdmin,
        login,
        register,
        logout,
        setSelectedOrg,
        setSelectedClass,
        loadOrganizations,
        loadClasses,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
