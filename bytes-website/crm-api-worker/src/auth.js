/**
 * OAuth providers for Cloudflare Workers.
 * Uses native fetch and URLSearchParams — no node-fetch or query-string.
 */
export class AuthProvider {
    static google = {
        getAuthUrl: (clientId, redirectUri, state) => {
            const params = new URLSearchParams({
                client_id: clientId,
                redirect_uri: redirectUri,
                response_type: 'code',
                scope: 'openid email profile',
                access_type: 'offline',
                prompt: 'select_account',
                state
            });
            return `https://accounts.google.com/o/oauth2/v2/auth?${params}`;
        },
        getUserData: async (code, clientId, clientSecret, redirectUri) => {
            const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: new URLSearchParams({ code, client_id: clientId, client_secret: clientSecret, redirect_uri: redirectUri, grant_type: 'authorization_code' })
            });
            const { access_token } = await tokenRes.json();

            const userRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
                headers: { Authorization: `Bearer ${access_token}` }
            });
            const u = await userRes.json();
            return { id: u.id, email: u.email, name: u.name, picture: u.picture, provider: 'google', emailVerified: u.verified_email !== false };
        }
    };

    static facebook = {
        getAuthUrl: (clientId, redirectUri, state) => {
            const params = new URLSearchParams({
                client_id: clientId,
                redirect_uri: redirectUri,
                scope: 'email,public_profile',
                response_type: 'code',
                auth_type: 'rerequest',
                display: 'popup',
                state
            });
            return `https://www.facebook.com/v18.0/dialog/oauth?${params}`;
        },
        getUserData: async (code, clientId, clientSecret, redirectUri) => {
            const tokenRes = await fetch(`https://graph.facebook.com/v18.0/oauth/access_token?${new URLSearchParams({ client_id: clientId, redirect_uri: redirectUri, client_secret: clientSecret, code })}`);
            const { access_token } = await tokenRes.json();

            const userRes = await fetch(`https://graph.facebook.com/me?fields=id,name,email,picture&access_token=${access_token}`);
            const u = await userRes.json();
            return { id: u.id, email: u.email, name: u.name, picture: u.picture?.data?.url, provider: 'facebook' };
        }
    };

    static linkedin = {
        getAuthUrl: (clientId, redirectUri, state) => {
            const params = new URLSearchParams({
                response_type: 'code',
                client_id: clientId,
                redirect_uri: redirectUri,
                state,
                scope: 'openid profile email'
            });
            return `https://www.linkedin.com/oauth/v2/authorization?${params}`;
        },
        getUserData: async (code, clientId, clientSecret, redirectUri) => {
            const tokenRes = await fetch('https://www.linkedin.com/oauth/v2/accessToken', {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: new URLSearchParams({ grant_type: 'authorization_code', code, client_id: clientId, client_secret: clientSecret, redirect_uri: redirectUri })
            });
            const { access_token } = await tokenRes.json();

            const userRes = await fetch('https://api.linkedin.com/v2/userinfo', {
                headers: { Authorization: `Bearer ${access_token}` }
            });
            const u = await userRes.json();
            return { id: u.sub, email: u.email, name: u.name, picture: u.picture, provider: 'linkedin', emailVerified: u.email_verified !== false };
        }
    };
}
