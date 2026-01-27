import { supabase } from '../lib/supabase';

export const authService = {
    /**
     * Initialize anonymous session if no user is logged in
     */
    async initSession() {
        try {
            const { data: { session } } = await supabase.auth.getSession();

            if (!session) {
                // We don't auto-sign in here anymore to avoid loops, 
                // but we can if we want. Let's keep it but add error handling.
                const { data, error } = await supabase.auth.signInAnonymously();
                if (error) {
                    console.error('Supabase Auth Error:', error.message);
                    return null;
                }
                if (data?.user) {
                    await this.syncUserProfile(data.user);
                }
                return data.user;
            }

            return session.user;
        } catch (err) {
            console.error('Auth initialization failed:', err);
            return null;
        }
    },

    /**
     * Explicit sign in (Anonymous)
     */
    async signIn() {
        const { data, error } = await supabase.auth.signInAnonymously();
        if (error) throw error;
        if (data?.user) {
            await this.syncUserProfile(data.user);
        }
        return data.user;
    },

    /**
     * Sync user profile to the 'users' table
     */
    async syncUserProfile(user) {
        const { data, error } = await supabase
            .from('users')
            .upsert({
                id: user.id,
                email: user.email || null,
                last_login: new Date().toISOString()
            }, { onConflict: 'id' });

        if (error) console.error('Error syncing user profile:', error.message);
        return data;
    },

    /**
     * Get user plan from DB
     */
    async getUserPlan(userId) {
        const { data, error } = await supabase
            .from('users')
            .select('plan')
            .eq('id', userId)
            .maybeSingle();

        if (error) {
            console.error('Error fetching plan:', error.message);
            return 'free';
        }
        return data?.plan || 'free';
    },

    /**
     * Update user plan
     */
    async updatePlan(userId, plan) {
        const { error } = await supabase
            .from('users')
            .update({ plan })
            .eq('id', userId);

        if (error) throw error;
    },

    /**
     * Sign out user
     */
    async signOut() {
        const { error } = await supabase.auth.signOut();
        if (error) console.error('Error signing out:', error.message);
    }
};
