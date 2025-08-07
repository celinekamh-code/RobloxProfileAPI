const express = require('express');
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));
const cheerio = require('cheerio'); // AJOUT POUR PARSER LE HTML
const app = express();
const PORT = process.env.PORT || 8080;

app.get('/profile/:userid', async (req, res) => {
  const userId = req.params.userid;

  try {
    // Friends
    const friendsRes = await fetch(`https://friends.roblox.com/v1/users/${userId}/friends`);
    const friendsData = await friendsRes.json();

    // Followers
    const followersRes = await fetch(`https://friends.roblox.com/v1/users/${userId}/followers/count`);
    const followersData = await followersRes.json();

    // Following
    const followingRes = await fetch(`https://friends.roblox.com/v1/users/${userId}/followings/count`);
    const followingData = await followingRes.json();

    // Description
    const descRes = await fetch(`https://users.roblox.com/v1/users/${userId}`);
    const descData = await descRes.json();
    const description = descData.description || "";

    // ITEMS PORTÉS
    const avatarRes = await fetch(`https://avatar.roblox.com/v1/users/${userId}/avatar`);
    const avatarData = await avatarRes.json();
    const assetsWorn = (avatarData.assets || []).map(asset => ({
      id: asset.id,
      name: asset.name,
      assetType: asset.assetType
    }));

    // ----- AJOUT: Vérification si le compte est vérifié -----
    let isVerified = false;
    try {
      const profileHtmlRes = await fetch(`https://www.roblox.com/users/${userId}/profile`);
      const html = await profileHtmlRes.text();
      const $ = cheerio.load(html);

      // Cherche la présence de la classe du badge "verified"
      isVerified =
        $("span.icon-verified-roblox-badge").length > 0 ||
        $("span.verified-badge-icon").length > 0;
    } catch (err) {
      // Si ça plante, on ignore, ça reste false
      console.error("Erreur lors de la vérification du badge vérifié:", err);
    }
    // --------------------------------------------------------

    res.json({
      userId: Number(userId),
      friends: friendsData.data || [],
      followers: followersData.count || 0,
      following: followingData.count || 0,
      description: description,
      assetsWorn: assetsWorn,
      isVerified // AJOUTE LE FLAG DANS LA REPONSE
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch Roblox data." });
  }
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Serveur profil Roblox lancé sur port ${PORT}`);
});

