export default async function handler(req, res) {
  // CORS
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  if (req.method === "OPTIONS") return res.status(200).end();

  try {
    const { url } = req.query;

    if (!url) {
      return res.status(400).json({ code: -1, msg: "URL missing", data: null });
    }

    const headers = {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      Accept:
        "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      "Accept-Language": "en-US,en;q=0.5",
      "Sec-Fetch-Mode": "navigate",
    };

    // URL türünü belirle
    const shortcodeMatch = url.match(
      /(?:\/p\/|\/reel\/|\/reels\/)([A-Za-z0-9_-]+)/
    );
    const usernameMatch = url.match(/instagram\.com\/([a-zA-Z0-9._]+)\/?$/);

    let result;

    if (shortcodeMatch) {
      result = await fetchByShortcode(shortcodeMatch[1], headers);
    } else if (usernameMatch) {
      result = await fetchProfilePicture(usernameMatch[1], headers);
    } else {
      return res
        .status(200)
        .json({ code: -1, msg: "Geçersiz Instagram URL'si", data: null });
    }

    return res.status(200).json({ code: 0, msg: "success", data: result });
  } catch (error) {
    console.error("Instagram error:", error.message);
    return res
      .status(200)
      .json({ code: -1, msg: error.message || "İçerik alınamadı", data: null });
  }
}

async function fetchByShortcode(shortcode, headers) {
  const pageUrl = `https://www.instagram.com/p/${shortcode}/`;
  const response = await fetch(pageUrl, { headers, redirect: "follow" });
  const html = await response.text();

  const items = [];

  const videoUrlMatch = html.match(
    /<meta\s+property="og:video"\s+content="([^"]+)"/
  );
  const imageUrlMatch = html.match(
    /<meta\s+property="og:image"\s+content="([^"]+)"/
  );
  const typeMatch = html.match(
    /<meta\s+property="og:type"\s+content="([^"]+)"/
  );

  const isVideo = typeMatch && typeMatch[1].includes("video");

  if (isVideo && videoUrlMatch) {
    items.push({
      url: videoUrlMatch[1],
      type: "video",
      thumbnail: imageUrlMatch ? imageUrlMatch[1] : null,
    });
  } else if (imageUrlMatch) {
    items.push({
      url: imageUrlMatch[1],
      type: "image",
      thumbnail: null,
    });
  }

  const scriptDataMatch = html.match(
    /"edge_sidecar_to_children":\{"edges":\[(.*?)\]\}/
  );
  if (scriptDataMatch) {
    try {
      const edges = JSON.parse(`[${scriptDataMatch[1]}]`);
      items.length = 0;
      for (const edge of edges) {
        const node = edge.node;
        if (node.is_video) {
          items.push({
            url: node.video_url,
            type: "video",
            thumbnail: node.display_url,
          });
        } else {
          items.push({
            url: node.display_url,
            type: "image",
            thumbnail: null,
          });
        }
      }
    } catch (e) {
    }
  }

  if (items.length > 0) {
    return {
      type: items.length > 1 ? "carousel" : items[0].type,
      items,
    };
  }

  const oembedUrl = `https://api.instagram.com/oembed/?url=https://www.instagram.com/p/${shortcode}/`;
  const oembedRes = await fetch(oembedUrl, { headers });

  if (oembedRes.ok) {
    const oembedData = await oembedRes.json();
    if (oembedData.thumbnail_url) {
      return {
        type: "image",
        items: [{ url: oembedData.thumbnail_url, type: "image" }],
      };
    }
  }

  throw new Error("İçerik çıkarılamadı. Başka bir link deneyin.");
}

async function fetchProfilePicture(username, headers) {
  const profileUrl = `https://www.instagram.com/${username}/`;
  const response = await fetch(profileUrl, { headers, redirect: "follow" });
  const html = await response.text();

  const profilePicMatch = html.match(
    /<meta\s+property="og:image"\s+content="([^"]+)"/
  );

  if (profilePicMatch) {
    let hdUrl = profilePicMatch[1]
      .replace(/s150x150/, "s1080x1080")
      .replace(/s320x320/, "s1080x1080")
      .replace(/s640x640/, "s1080x1080");

    return {
      type: "image",
      items: [{ url: hdUrl, type: "image" }],
    };
  }

  throw new Error("Profil fotoğrafı bulunamadı.");
}