const express = require('express');
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));
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

    // GROUPES
    const groupsRes = await fetch(`https://groups.roblox.com/v1/users/${userId}/groups/roles`);
    const groupsData = await groupsRes.json();
    const groups = (groupsData.data || []).map(g => ({
      id: g.group.id,
      name: g.group.name,
      description: g.group.description,
      emblemUrl: g.group.emblemUrl || "", // si pas d'emblème
      role: g.role.name
    }));

    // FAVORITES (jeux)
    // 1) on récupère jusqu'à 48 favoris
    const favRes = await fetch(`https://games.roblox.com/v2/users/${userId}/favorite/games?limit=48&sortOrder=Desc`);
    const favData = await favRes.json();
    const favoritesRaw = favData.data || [];

    // 2) récupérer les miniatures des jeux en une ou plusieurs requêtes
    const universeIds = favoritesRaw.map(g => g.id).filter(Boolean);
    let thumbsByUni = {};
    if (universeIds.length > 0) {
      const chunk = (arr, n) => arr.length ? [arr.slice(0, n), ...chunk(arr.slice(n), n)] : [];
      const chunks = chunk(universeIds, 25); // l’API accepte ~25 ids par appel
      const allThumbs = [];
      for (const ids of chunks) {
        const q = ids.join(',');
        const tRes = await fetch(`https://thumbnails.roblox.com/v1/games/icons?universeIds=${q}&size=150x150&format=Png&isCircular=false`);
        const tData = await tRes.json();
        allThumbs.push(...(tData.data || []));
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
      thumbnail: thumbsByUni[g.id] || ""
    }));

    res.json({
      userId: Number(userId),
      friends: friendsData.data || [],
      followers: followersData.count || 0,
      following: followingData.count || 0,
      description: description,
      assetsWorn: assetsWorn,
      groups: groups,
      favorites: favorites
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch Roblox data." });
  }
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Serveur profil Roblox lancé sur port ${PORT}`);
});


