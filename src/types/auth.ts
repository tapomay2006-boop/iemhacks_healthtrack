export type UserRole = 'ASHA_WORKER' | 'DISTRICT_ADMIN';

export interface UserProfile {
  id: string;
  name: string;
  role: UserRole;
  email: string;
  badgeId: string;
  assignedRegion: string;
  district: string;
  avatarUrl?: string;
}

export interface AuthSession {
  token: string;
  user: UserProfile;
  expiresAt: number;
}

// Registered User Database Credentials
export interface RegisteredUserAccount {
  email: string;
  passwordHash: string; // Plaintext for local client validation
  role: UserRole;
  profile: UserProfile;
}

export const USER_ACCOUNTS_DATABASE: RegisteredUserAccount[] = [
  // 10 UNIQUE ASHA HELPER ACCOUNTS (@helper.com)
  {
    email: 'sunita.helper@helper.com',
    passwordHash: 'sunita123',
    role: 'ASHA_WORKER',
    profile: {
      id: 'user_helper_01',
      name: 'Sunita Devi',
      role: 'ASHA_WORKER',
      email: 'sunita.helper@helper.com',
      badgeId: 'ASHA-WB-7841',
      assignedRegion: 'Sonarpur Sector 4 (Kolkata Outskirts)',
      district: 'Kolkata Metropolitan Sector',
      avatarUrl: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80',
    }
  },
  {
    email: 'anita.helper@helper.com',
    passwordHash: 'anita456',
    role: 'ASHA_WORKER',
    profile: {
      id: 'user_helper_02',
      name: 'Anita Ray',
      role: 'ASHA_WORKER',
      email: 'anita.helper@helper.com',
      badgeId: 'ASHA-WB-7842',
      assignedRegion: 'Adisaptagram Sector 1 (Hooghly)',
      district: 'Hooghly District',
      avatarUrl: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150&auto=format&fit=crop&q=80',
    }
  },
  {
    email: 'priya.helper@helper.com',
    passwordHash: 'priya789',
    role: 'ASHA_WORKER',
    profile: {
      id: 'user_helper_03',
      name: 'Priya Sharma',
      role: 'ASHA_WORKER',
      email: 'priya.helper@helper.com',
      badgeId: 'ASHA-WB-7843',
      assignedRegion: 'Habra Sector 2 (North 24 Parganas)',
      district: 'North 24 Parganas',
      avatarUrl: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&auto=format&fit=crop&q=80',
    }
  },
  {
    email: 'rekha.helper@helper.com',
    passwordHash: 'rekha101',
    role: 'ASHA_WORKER',
    profile: {
      id: 'user_helper_04',
      name: 'Rekha Das',
      role: 'ASHA_WORKER',
      email: 'rekha.helper@helper.com',
      badgeId: 'ASHA-WB-7844',
      assignedRegion: 'Siliguri Sector 3 (Darjeeling)',
      district: 'Darjeeling District',
      avatarUrl: 'https://images.unsplash.com/photo-1567532939604-b6b5b0db2604?w=150&auto=format&fit=crop&q=80',
    }
  },
  {
    email: 'meena.helper@helper.com',
    passwordHash: 'meena202',
    role: 'ASHA_WORKER',
    profile: {
      id: 'user_helper_05',
      name: 'Meena Kumari',
      role: 'ASHA_WORKER',
      email: 'meena.helper@helper.com',
      badgeId: 'ASHA-WB-7845',
      assignedRegion: 'Durgapur Sector 5 (Paschim Bardhaman)',
      district: 'Paschim Bardhaman',
      avatarUrl: 'https://images.unsplash.com/photo-1508214751196-bcfd4ca60f91?w=150&auto=format&fit=crop&q=80',
    }
  },
  {
    email: 'kabita.helper@helper.com',
    passwordHash: 'kabita303',
    role: 'ASHA_WORKER',
    profile: {
      id: 'user_helper_06',
      name: 'Kabita Ghosh',
      role: 'ASHA_WORKER',
      email: 'kabita.helper@helper.com',
      badgeId: 'ASHA-WB-7846',
      assignedRegion: 'Purulia Water Sector 6',
      district: 'Purulia District',
      avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
    }
  },
  {
    email: 'pooja.helper@helper.com',
    passwordHash: 'pooja404',
    role: 'ASHA_WORKER',
    profile: {
      id: 'user_helper_07',
      name: 'Pooja Roy',
      role: 'ASHA_WORKER',
      email: 'pooja.helper@helper.com',
      badgeId: 'ASHA-WB-7847',
      assignedRegion: 'Jhargram Sector 7',
      district: 'Jhargram District',
      avatarUrl: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150&auto=format&fit=crop&q=80',
    }
  },
  {
    email: 'laxmi.helper@helper.com',
    passwordHash: 'laxmi505',
    role: 'ASHA_WORKER',
    profile: {
      id: 'user_helper_08',
      name: 'Laxmi Murmu',
      role: 'ASHA_WORKER',
      email: 'laxmi.helper@helper.com',
      badgeId: 'ASHA-WB-7848',
      assignedRegion: 'Malda Delta Sector 8',
      district: 'Malda District',
      avatarUrl: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=150&auto=format&fit=crop&q=80',
    }
  },
  {
    email: 'bina.helper@helper.com',
    passwordHash: 'bina606',
    role: 'ASHA_WORKER',
    profile: {
      id: 'user_helper_09',
      name: 'Bina Paul',
      role: 'ASHA_WORKER',
      email: 'bina.helper@helper.com',
      badgeId: 'ASHA-WB-7849',
      assignedRegion: 'Birbhum Sector 9',
      district: 'Birbhum District',
      avatarUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80',
    }
  },
  {
    email: 'sangita.helper@helper.com',
    passwordHash: 'sangita707',
    role: 'ASHA_WORKER',
    profile: {
      id: 'user_helper_10',
      name: 'Sangita Seal',
      role: 'ASHA_WORKER',
      email: 'sangita.helper@helper.com',
      badgeId: 'ASHA-WB-7850',
      assignedRegion: 'Kalyani Sector 10 (Nadia)',
      district: 'Nadia District',
      avatarUrl: 'https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=150&auto=format&fit=crop&q=80',
    }
  },

  // 3 UNIQUE CHIEF MEDICAL OFFICER ACCOUNTS (@gov.com)
  {
    email: 'officer.kolkata@gov.com',
    passwordHash: 'kolkata123',
    role: 'DISTRICT_ADMIN',
    profile: {
      id: 'user_officer_01',
      name: 'Dr. Rajesh Sharma (CMOH Kolkata)',
      role: 'DISTRICT_ADMIN',
      email: 'officer.kolkata@gov.com',
      badgeId: 'CDMO-WB-001',
      assignedRegion: 'Kolkata Metropolitan Health Command (HQ)',
      district: 'Kolkata Health Directorate',
      avatarUrl: 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=150&auto=format&fit=crop&q=80',
    }
  },
  {
    email: 'cdmo.hooghly@gov.com',
    passwordHash: 'hooghly456',
    role: 'DISTRICT_ADMIN',
    profile: {
      id: 'user_officer_02',
      name: 'Dr. Anindya Banerjee (CDMO Hooghly)',
      role: 'DISTRICT_ADMIN',
      email: 'cdmo.hooghly@gov.com',
      badgeId: 'CDMO-WB-002',
      assignedRegion: 'Hooghly & North 24 Parganas Outbreak Command',
      district: 'Hooghly District HQ',
      avatarUrl: 'https://images.unsplash.com/photo-1537368910025-700350fe46c7?w=150&auto=format&fit=crop&q=80',
    }
  },
  {
    email: 'dho.siliguri@gov.com',
    passwordHash: 'siliguri789',
    role: 'DISTRICT_ADMIN',
    profile: {
      id: 'user_officer_03',
      name: 'Dr. Suman Sengupta (DHO North Bengal)',
      role: 'DISTRICT_ADMIN',
      email: 'dho.siliguri@gov.com',
      badgeId: 'CDMO-WB-003',
      assignedRegion: 'North Bengal Epidemic & Hilly Sector Command',
      district: 'Darjeeling / Siliguri Command',
      avatarUrl: 'https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?w=150&auto=format&fit=crop&q=80',
    }
  }
];

export const AUTH_STORAGE_KEY = 'healthtrack_jwt_session';

export function getStoredSession(): AuthSession | null {
  try {
    const raw = localStorage.getItem(AUTH_STORAGE_KEY);
    if (!raw) return null;
    const session: AuthSession = JSON.parse(raw);
    if (Date.now() > session.expiresAt) {
      localStorage.removeItem(AUTH_STORAGE_KEY);
      return null;
    }
    return session;
  } catch {
    return null;
  }
}

export function validateAndAuthenticateUser(emailInput: string, passwordInput: string): { success: boolean; session?: AuthSession; message?: string } {
  const cleanEmail = emailInput.trim().toLowerCase();
  const cleanPass = passwordInput.trim();

  // Find exact account match in database
  const account = USER_ACCOUNTS_DATABASE.find(u => u.email.toLowerCase() === cleanEmail);

  if (account) {
    if (account.passwordHash === cleanPass) {
      const session: AuthSession = {
        token: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.mock_${account.role}_${account.profile.id}_${Date.now()}`,
        user: account.profile,
        expiresAt: Date.now() + 86400 * 1000 * 7,
      };
      localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(session));
      return { success: true, session };
    } else {
      return { success: false, message: `Incorrect Password for ${account.email}. (Expected: ${account.passwordHash})` };
    }
  }

  // Domain fallback rule if new unique email used
  if (cleanEmail.endsWith('@helper.com')) {
    const defaultHelper = USER_ACCOUNTS_DATABASE[0];
    const session: AuthSession = {
      token: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.mock_helper_custom_${Date.now()}`,
      user: { ...defaultHelper.profile, email: cleanEmail, name: `ASHA Helper (${cleanEmail.split('@')[0]})` },
      expiresAt: Date.now() + 86400 * 1000 * 7,
    };
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(session));
    return { success: true, session };
  }

  if (cleanEmail.endsWith('@gov.com')) {
    const defaultOfficer = USER_ACCOUNTS_DATABASE[10];
    const session: AuthSession = {
      token: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.mock_officer_custom_${Date.now()}`,
      user: { ...defaultOfficer.profile, email: cleanEmail, name: `Medical Officer (${cleanEmail.split('@')[0]})` },
      expiresAt: Date.now() + 86400 * 1000 * 7,
    };
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(session));
    return { success: true, session };
  }

  return {
    success: false,
    message: 'Access Denied: Invalid Email domain. ASHA Helpers must use *@helper.com and Officers must use *@gov.com.'
  };
}

export function saveSession(role: UserRole): AuthSession {
  const account = USER_ACCOUNTS_DATABASE.find(u => u.role === role) || USER_ACCOUNTS_DATABASE[0];
  const session: AuthSession = {
    token: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.mock_payload_${account.profile.id}_${Date.now()}`,
    user: account.profile,
    expiresAt: Date.now() + 86400 * 1000 * 7,
  };
  localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(session));
  return session;
}

export function clearSession() {
  localStorage.removeItem(AUTH_STORAGE_KEY);
}


