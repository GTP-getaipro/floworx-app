import { createClient } from '@supabase/supabase-js';
import bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

export interface User {
  id: string;
  email: string;
  password_hash: string;
  created_at: string;
}

export const findUserByEmail = async (email: string): Promise<User | null> => {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('email', email.toLowerCase())
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
      throw error;
    }

    return data;
  } catch (error) {
    console.error('Error finding user by email:', error);
    throw error;
  }
};

export const createUser = async (email: string, password: string): Promise<string> => {
  try {
    // Hash password
    const saltRounds = 12;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // Generate UUID
    const userId = uuidv4();

    // Insert user into database
    const { data, error } = await supabase
      .from('users')
      .insert([{
        id: userId,
        email: email.toLowerCase(),
        password_hash: passwordHash,
        created_at: new Date().toISOString()
      }])
      .select('id')
      .single();

    if (error) {
      throw error;
    }

    return data.id;
  } catch (error) {
    console.error('Error creating user:', error);
    throw error;
  }
};
