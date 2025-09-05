// File: src/index.js
export default {
  async fetch(request, env, ctx) {
    const KV = env.SALES_PHONES; // KV binding từ wrangler.toml
    const SHEET_CSV_URL = env.CSV_SALES_PHONE; // GitHub Secret chứa link CSV Google Sheet

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

      // Hàm fetch Google Sheet CSV và lưu vào KV
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
        // Nếu chưa có cache, fetch trực tiếp
        phonesToUse = await fetchAndCache();
      } else if (now - cachedTS >= CACHE_MAX_AGE) {
        if (now - cachedTS < CACHE_MAX_AGE + STALE_MARGIN) {
          // Trả tạm dữ liệu cũ và fetch background
          ctx.waitUntil(fetchAndCache());
        } else {
          // Hết hạn quá lâu, fetch trực tiếp
          phonesToUse = await fetchAndCache();
        }
      }

      if (!phonesToUse.length) {
        return new Response("⚠️ Không có số điện thoại trong CSV.", {
          status: 500,
        });
      }

      // Chọn số ngẫu nhiên
      const random = Math.floor(Math.random() * phonesToUse.length);
      const phoneNumber = phonesToUse[random];

      return Response.redirect(`tel:${phoneNumber}`, 301);
    } catch (e) {
      return new Response("Lỗi Worker: " + e.message, { status: 500 });
    }
  },
};
