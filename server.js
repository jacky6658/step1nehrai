import express from 'express';
import cors from 'cors';
import axios from 'axios';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Middleware
app.use(cors());
app.use(express.json());

// Serve Static Files (Frontend)
app.use(express.static(path.join(__dirname, 'dist')));

// LinkedIn Configuration
const LINKEDIN_CLIENT_ID = process.env.LINKEDIN_CLIENT_ID;
const LINKEDIN_CLIENT_SECRET = process.env.LINKEDIN_CLIENT_SECRET;
// 在 Zeabur 上，這應該是 https://your-app.zeabur.app/api/linkedin/callback
// 本地開發則是 http://localhost:3000/api/linkedin/callback
const REDIRECT_URI = process.env.LINKEDIN_REDIRECT_URI || 'http://localhost:3000/api/linkedin/callback';

// 1. Auth Route: Redirect user to LinkedIn
app.get('/api/linkedin/auth', (req, res) => {
  if (!LINKEDIN_CLIENT_ID) {
    return res.status(500).send('Missing LINKEDIN_CLIENT_ID env');
  }
  const scope = 'w_member_social profile openid email'; 
  const state = Math.random().toString(36).substring(7);
  const url = `https://www.linkedin.com/oauth/v2/authorization?response_type=code&client_id=${LINKEDIN_CLIENT_ID}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&state=${state}&scope=${encodeURIComponent(scope)}`;
  res.redirect(url);
});

// 2. Callback Route: Exchange code for token
app.get('/api/linkedin/callback', async (req, res) => {
  const { code, error } = req.query;

  if (error) {
    return res.redirect(`/?error=${encodeURIComponent(String(error))}`);
  }

  if (!code) {
    return res.redirect('/?error=no_code');
  }

  try {
    const response = await axios.post('https://www.linkedin.com/oauth/v2/accessToken', null, {
      params: {
        grant_type: 'authorization_code',
        code,
        redirect_uri: REDIRECT_URI,
        client_id: LINKEDIN_CLIENT_ID,
        client_secret: LINKEDIN_CLIENT_SECRET
      },
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    });

    const accessToken = response.data.access_token;
    
    // Redirect back to frontend with token in query param
    // Frontend will grab this, save to localStorage, and clear the URL
    res.redirect(`/?linkedin_token=${accessToken}`);

  } catch (err) {
    console.error('LinkedIn Token Error:', err.response?.data || err.message);
    res.redirect(`/?error=token_exchange_failed`);
  }
});

// 3. Post Route: Create UGC Post
app.post('/api/linkedin/share', async (req, res) => {
  const { text, accessToken } = req.body;

  if (!text || !accessToken) {
    return res.status(400).json({ error: 'Missing text or access token' });
  }

  try {
    // Step 1: Get User ID (sub)
    const userRes = await axios.get('https://api.linkedin.com/v2/userinfo', {
      headers: { Authorization: `Bearer ${accessToken}` }
    });
    const userId = userRes.data.sub;

    // Step 2: Post Content
    const postRes = await axios.post('https://api.linkedin.com/v2/ugcPosts', {
      "author": `urn:li:person:${userId}`,
      "lifecycleState": "PUBLISHED",
      "specificContent": {
        "com.linkedin.ugc.ShareContent": {
          "shareCommentary": { "text": text },
          "shareMediaCategory": "NONE"
        }
      },
      "visibility": { "com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC" }
    }, {
      headers: { 
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    });

    res.json({ success: true, postId: postRes.data.id });

  } catch (err) {
    console.error('LinkedIn Post Error:', err.response?.data || err.message);
    res.status(500).json({ error: err.response?.data?.message || 'Failed to post to LinkedIn' });
  }
});

// Catch-all route to serve React App for any other path
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});