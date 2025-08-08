const express = require('express');
const fetch = (...args) => import('node-fetch').then(({ default: f }) => f(...args));
const app = express();
const PORT = process.env.PORT || 8080;

// petite util pour fetch JSON en sécurité
async function getJSON(url) {
  const r = await fetch(url, { headers: { 'User-Agent': 'robloxprofileapi/1.0' } });
  if (!r.ok) throw new Error(`${r.status} ${r.statusText} for ${url}`);
  return r.json();
}

app.get('/profile/:userid', async (req, res) => {
  const userId = req.params.userid;

  try {
    // --- Friends / Followers / Following
    const [friendsData, followersData, followingData] = await Promise.all([
      getJSON(`https://friends.roblox.com/v1/users/${userId}/friends`),
      getJSON(`https://friends.roblox.com/v1/users/${userId}/followers/count`),
      getJSON(`https://friends.roblox.com/v1/users/${userId}/followings/count`),
    ]);

    // --- Profil de base (description, verified)
    const userData = await getJSON(`https://users.roblox.com/v1/users/${userId}`);
    const description = userData.description || "";
    const isVerified = !!userData.hasVerifiedBadge; // renvoyé par l’API users

    // --- Items portés
    const avatarData = await getJSON(`https://avatar.roblox.com/v1/users/${userId}/avatar`);
    const assetsWorn = (avatarData.assets || []).map(a => ({
      id: a.id,
      name: a.name,
      assetType: a.assetType,
    }));

    // --- Groupes
    const rolesData = await getJSON(`https://groups.roblox.com/v1/users/${userId}/groups/roles`);
    const groups = (rolesData.data || []).map(g => ({
      id: g.group.id,
      name: g.group.name,
      description: g.group.description,
      role: g.role?.name || "Member",
      // La miniature sera chargée côté client via rbxthumb://type=GroupIcon&id=<id>
    }));

    // --- Favorites (jeux) : on prend jusqu’à 48 derniers favoris
    const favResp = await getJSON(`https://games.roblox.com/v2/users/${userId}/favorite/games?limit=48&sortOrder=Desc`);
    const favoritesRaw = favResp.data || [];

    // On extrait les universeIds pour récupérer les icônes en 1 requête
    const universeIds = favoritesRaw.map(g => g.id).filter(Boolean);
    let thumbsByUni = {};
    if (universeIds.length > 0) {
      const chunk = (arr, n) => arr.length ? [arr.slice(0, n), ...chunk(arr.slice(n), n)] : [];
      const chunks = chunk(universeIds, 25); // l’API thumbnails accepte ~25 ids max par call
      const allThumbs = [];
      for (const ids of chunks) {
        const q = ids.join(',');
        const t = await getJSON(`https://thumbnails.roblox.com/v1/games/icons?universeIds=${q}&size=150x150&format=Png&isCircular=false`);
        allThumbs.push(...(t.data || []));
      }
      thumbsByUni = allThumbs.reduce((acc, t) => {
        if (t && t.targetId) acc[t.targetId] = t.imageUrl;
        return acc;
      }, {});
    }

    const favorites = favoritesRaw.map(g => ({
      universeId: g.id,
      rootPlaceId: g.rootPlaceId || null,
      name: g.name || g.sourceName || "Game",
      creatorName: g.creator?.name || null,
      playing: g.playing || null,
      visits: g.visits || null,
      thumbnail: thumbsByUni[g.id] || "", // image pour l’UI
    }));

    res.json({
      userId: Number(userId),
      verified: isVerified,
      friends: friendsData.data || [],
      followers: followersData.count || 0,
      following: followingData.count || 0,
      description,
      assetsWorn,
      groups,
      favorites,
    });

  } catch (err) {
    console.error('API error:', err.message);
    res.status(500).json({ error: "Failed to fetch Roblox data." });
  }
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Serveur profil Roblox lancé sur port ${PORT}`);
});

