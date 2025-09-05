export default {
  async fetch(request, env, ctx) {
    const KV = env.SALES_PHONES;
    const SHEET_CSV_URL = env.CSV_SALES_PHONE;

    const CACHE_MAX_AGE = 4 * 60 * 60 * 1000; // 4 giờ
    const STALE_MARGIN = 5 * 60 * 1000; // 5 phút

    try {
      // Lấy cache từ KV
      const [cachedPhonesStr, cachedTSStr] = await Promise.all([
        KV.get("phones"),
        KV.get("phones_ts"),
      ]);
      const cachedPhones = cachedPhonesStr ? JSON.parse(cachedPhonesStr) : [];
      const cachedTS = cachedTSStr ? parseInt(cachedTSStr) : 0;
      const now = Date.now();

      // Hàm fetch CSV Google Sheet
      const fetchAndCache = async () => {
        const res = await fetch(SHEET_CSV_URL);
        if (!res.ok) throw new Error("Không fetch được CSV");
        const csvText = await res.text();
        const lines = csvText.split("\n").slice(1); // bỏ header
        const phones = lines
          .map((line) => line.split(",")[1]?.trim().replace(/[.\s]/g, ""))
          .filter(Boolean);

        await Promise.all([
          KV.put("phones", JSON.stringify(phones)),
          KV.put("phones_ts", Date.now().toString()),
        ]);

        return phones;
      };

      let phonesToUse = cachedPhones;

      if (!cachedPhones.length) {
        phonesToUse = await fetchAndCache();
      } else if (now - cachedTS >= CACHE_MAX_AGE) {
        if (now - cachedTS < CACHE_MAX_AGE + STALE_MARGIN) {
          ctx.waitUntil(fetchAndCache());
        } else {
          phonesToUse = await fetchAndCache();
        }
      }

      if (!phonesToUse.length) {
        return new Response("⚠️ Không có số điện thoại trong CSV.", {
          status: 500,
        });
      }

      // Chọn số ngẫu nhiên
      const randomPhone =
        phonesToUse[Math.floor(Math.random() * phonesToUse.length)];

      // Trả về HTML
      const html = `
        <!DOCTYPE html>
        <html lang="vi">
        <head>
          <meta charset="UTF-8">
          <title>Liên hệ</title>
          <style>
            body { font-family: sans-serif; display:flex; flex-direction:column; align-items:center; justify-content:center; height:100vh; }
            .phone-box { font-size:2rem; margin-bottom:1rem; }
            button { padding:0.5rem 1rem; font-size:1rem; cursor:pointer; }
          </style>
        </head>
        <body>
          <div class="phone-box">${randomPhone}</div>
          <button onclick="window.location.href='tel:${randomPhone}'">Gọi ngay</button>
        </body>
        </html>
      `;

      return new Response(html, {
        headers: { "Content-Type": "text/html;charset=UTF-8" },
      });
    } catch (e) {
      return new Response("Lỗi Worker: " + e.message, { status: 500 });
    }
  },
};
