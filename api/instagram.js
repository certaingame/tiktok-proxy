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

    // Instagram için alternatif public API (örn: SocialDownloader public API veya benzeri bir servis)
    // Kendi sunucumuz Instagram tarafından engellendiği için, public bir API'ye istek atıyoruz
    const apiUrl = "https://a.wuk.sh/api/json"; 
    
    const response = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json"
      },
      body: JSON.stringify({
        url: url,
        isAudioOnly: false
      })
    });

    if (!response.ok) {
      throw new Error("API sunucusu yanıt vermedi");
    }

    const data = await response.json();

    // API yanıtını kendi formatımıza çeviriyoruz
    const items = [];
    let contentType = "video";

    if (data.url) {
      items.push({
        url: data.url,
        type: "video",
        thumbnail: data.thumbnail || null
      });
    } else if (data.picker && data.picker.length > 0) {
      contentType = "carousel";
      data.picker.forEach(item => {
        items.push({
          url: item.url,
          type: item.type === "photo" ? "image" : "video",
          thumbnail: item.thumb || null
        });
      });
    } else {
      throw new Error("İçerik bulunamadı");
    }

    return res.status(200).json({ 
      code: 0, 
      msg: "success", 
      data: {
        type: contentType,
        items: items
      }
    });

  } catch (error) {
    console.error("Instagram error:", error.message);
    return res
      .status(200)
      .json({ code: -1, msg: "İçerik alınamadı: " + error.message, data: null });
  }
}
