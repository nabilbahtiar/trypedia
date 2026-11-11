export interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  avatar: string;
  photoUrl?: string;
  isVerified: boolean;
  role?: "USER" | "SUPERADMIN";
}

export interface UserAccount extends User {
  password: string;
}

// Database Pengguna TryPedia (Default User Data)
export const DUMMY_USERS: UserAccount[] = [
  {
    id: "usr_001",
    name: "Khayru Nabiel Bahtiar",
    email: "khayrunabielbahtiar@gmail.com",
    password: "trypedia123",
    phone: "0813-355-313-338",
    avatar: "KN",
    isVerified: true,
  },
  {
    id: "usr_001_alias",
    name: "Khayru Nabiel Bahtiar",
    email: "pengguna@gmail.com",
    password: "trypedia123",
    phone: "0813-355-313-338",
    avatar: "KN",
    isVerified: true,
  },
  {
    id: "usr_002",
    name: "Sneaker Zone Jember",
    email: "sneakerzone@gmail.com",
    password: "trypedia123",
    phone: "0812-9876-5432",
    avatar: "SZ",
    isVerified: true,
  },
];

export function updateDummyUser(id: string, data: Partial<UserAccount>) {
  const user = DUMMY_USERS.find((u) => u.id === id);
  if (user) {
    if (data.name) user.name = data.name;
    if (data.email) user.email = data.email.toLowerCase();
    if (data.phone) user.phone = data.phone;
    if (data.avatar) user.avatar = data.avatar;
    if (data.photoUrl !== undefined) user.photoUrl = data.photoUrl;
    if (data.password) user.password = data.password;
  }
}

export function authenticateUser(email: string, password: string): User | null {
  const normalizedEmail = email.trim().toLowerCase();
  const matched = DUMMY_USERS.find(
    (u) =>
      u.email.toLowerCase() === normalizedEmail &&
      u.password === password.trim()
  );

  if (!matched) return null;

  // Return public user profile without sensitive password
  const { password: _, ...userProfile } = matched;
  return userProfile;
}

