const express = require('express');
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));
const app = express();
const PORT = process.env.PORT || 8080;

app.get('/profile/:userid', async (req, res) => {
  const userId = req.params.userid;

  try {
    // Récupère amis
    const friendsRes = await fetch(`https://friends.roblox.com/v1/users/${userId}/friends`);
    const friendsData = await friendsRes.json();

    // Récupère followers
    const followersRes = await fetch(`https://friends.roblox.com/v1/users/${userId}/followers/count`);
    const followersData = await followersRes.json();

    // Récupère following
    const followingRes = await fetch(`https://friends.roblox.com/v1/users/${userId}/followings/count`);
    const followingData = await followingRes.json();

    // Récupère description (profile info)
    const descRes = await fetch(`https://users.roblox.com/v1/users/${userId}`);
    const descData = await descRes.json();
    const description = descData.description || "";

    res.json({
      userId: Number(userId),
      friends: friendsData.data || [],
      followers: followersData.count || 0,
      following: followingData.count || 0,
      description: description
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch Roblox data." });
  }
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Serveur profil Roblox lancé sur port ${PORT}`);
});
