const { instagramGetUrl } = require("instagram-url-direct");

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  if (req.method === "OPTIONS") return res.status(200).end();

  try {
    const { url } = req.query;

    if (!url) {
      return res.status(400).json({ code: -1, msg: "URL eksik", data: null });
    }

    // Doğrudan kendi sunucumuz üzerinden Instagram'ı kazıyoruz
    const data = await instagramGetUrl(url);

    if (!data || !data.url_list || data.url_list.length === 0) {
      throw new Error("Medya bulunamadı veya hesap gizli.");
    }

    const items = data.url_list.map(mediaUrl => ({
      url: mediaUrl,
      type: "video" 
    }));

    return res.status(200).json({
      code: 0,
      msg: "success",
      data: {
        type: items.length > 1 ? "carousel" : "video",
        items: items
      }
    });

  } catch (error) {
    console.error("Scraper Hatası:", error.message);
    return res.status(200).json({ 
      code: -1, 
      msg: "İçerik alınamadı: " + error.message, 
      data: null 
    });
  }
}
