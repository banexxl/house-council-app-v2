import bcrypt from 'bcryptjs';

// Hash password
export const hashPassword = async (password: string): Promise<string> => {
     const salt = await bcrypt.genSalt(10); // Generate salt (10 rounds is a good balance)
     return await bcrypt.hash(password, salt);
}

// Verify password
export const verifyPassword = async (password: string, hashedPassword: string): Promise<boolean> => {
     return await bcrypt.compare(password, hashedPassword);
}