import fetch from 'node-fetch';
import queryString from 'query-string';

/**
 * Auth Utility to handle OAuth flows for Google, Facebook, and LinkedIn.
 */
export class AuthProvider {
    constructor(config) {
        this.config = config;
    }

    /**
     * Google OAuth implementation
     */
    static google = {
        getAuthUrl: (clientId, redirectUri) => {
            const params = queryString.stringify({
                client_id: clientId,
                redirect_uri: redirectUri,
                response_type: 'code',
                scope: 'openid email profile',
                access_type: 'offline',
                prompt: 'select_account'
            });
            return `https://accounts.google.com/o/oauth2/v2/auth?${params}`;
        },
        getUserData: async (code, clientId, clientSecret, redirectUri) => {
            const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: queryString.stringify({
                    code,
                    client_id: clientId,
                    client_secret: clientSecret,
                    redirect_uri: redirectUri,
                    grant_type: 'authorization_code'
                })
            });
            const { access_token } = await tokenResponse.json();
            
            const userResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
                headers: { Authorization: `Bearer ${access_token}` }
            });
            const userData = await userResponse.json();
            return {
                id: userData.id,
                email: userData.email,
                name: userData.name,
                picture: userData.picture,
                provider: 'google'
            };
        }
    };

    /**
     * Facebook OAuth implementation
     */
    static facebook = {
        getAuthUrl: (clientId, redirectUri) => {
            const params = queryString.stringify({
                client_id: clientId,
                redirect_uri: redirectUri,
                scope: 'email,public_profile',
                response_type: 'code',
                auth_type: 'rerequest',
                display: 'popup'
            });
            return `https://www.facebook.com/v18.0/dialog/oauth?${params}`;
        },
        getUserData: async (code, clientId, clientSecret, redirectUri) => {
            const tokenResponse = await fetch(`https://graph.facebook.com/v18.0/oauth/access_token?` + queryString.stringify({
                client_id: clientId,
                redirect_uri: redirectUri,
                client_secret: clientSecret,
                code
            }));
            const { access_token } = await tokenResponse.json();

            const userResponse = await fetch(`https://graph.facebook.com/me?fields=id,name,email,picture&access_token=${access_token}`);
            const userData = await userResponse.json();
            return {
                id: userData.id,
                email: userData.email,
                name: userData.name,
                picture: userData.picture?.data?.url,
                provider: 'facebook'
            };
        }
    };

    /**
     * LinkedIn OAuth implementation (OpenID Connect flow)
     */
    static linkedin = {
        getAuthUrl: (clientId, redirectUri) => {
            const params = queryString.stringify({
                response_type: 'code',
                client_id: clientId,
                redirect_uri: redirectUri,
                state: 'random_state_string', // In production, generate a secure random state
                scope: 'openid profile email'
            });
            return `https://www.linkedin.com/oauth/v2/authorization?${params}`;
        },
        getUserData: async (code, clientId, clientSecret, redirectUri) => {
            const tokenResponse = await fetch('https://www.linkedin.com/oauth/v2/accessToken', {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: queryString.stringify({
                    grant_type: 'authorization_code',
                    code,
                    client_id: clientId,
                    client_secret: clientSecret,
                    redirect_uri: redirectUri
                })
            });
            const { access_token } = await tokenResponse.json();

            const userResponse = await fetch('https://api.linkedin.com/v2/userinfo', {
                headers: { Authorization: `Bearer ${access_token}` }
            });
            const userData = await userResponse.json();
            return {
                id: userData.sub,
                email: userData.email,
                name: userData.name,
                picture: userData.picture,
                provider: 'linkedin'
            };
        }
    };
}
