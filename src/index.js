// File: src/index.js
export default {
  async fetch(request, env, ctx) {
    const KV = env.SALES_PHONES; // KV binding từ wrangler.toml
    const SHEET_CSV_URL = env.CSV_SALES_PHONE; // CSV Google Sheet URL
    const STATUS = [];

    try {
      STATUS.push("🚀 Bắt đầu xử lý...");

      // --- Lấy cache từ KV ---
      const [cachedPhonesStr, cachedTSStr] = await Promise.all([
        KV.get("phones"),
        KV.get("phones_ts"),
      ]);
      let phones = cachedPhonesStr ? JSON.parse(cachedPhonesStr) : [];
      const ts = cachedTSStr ? parseInt(cachedTSStr) : 0;
      const now = Date.now();

      STATUS.push(`🔹 Số điện thoại trong KV: ${phones.length}`);
      STATUS.push(`🔹 Timestamp cache: ${ts || "chưa có"}`);

      // --- Hàm fetch CSV từ Google Sheet ---
      const fetchAndCache = async () => {
        STATUS.push("📡 Fetch CSV từ Google Sheet...");
        const res = await fetch(SHEET_CSV_URL);
        if (!res.ok) throw new Error("❌ Không fetch được CSV");
        const csvText = await res.text();

        const lines = csvText.split("\n").slice(1);
        const newPhones = lines
          .map((line) => line.split(",")[1]?.trim().replace(/[.\s]/g, ""))
          .filter(Boolean);

        await Promise.all([
          KV.put("phones", JSON.stringify(newPhones)),
          KV.put("phones_ts", Date.now().toString()),
        ]);

        STATUS.push(`✅ Đã lưu ${newPhones.length} số vào KV`);
        return newPhones;
      };

      // --- Quyết định fetch CSV ---
      if (!phones.length) {
        STATUS.push("⚠️ Cache trống, fetch CSV trực tiếp...");
        phones = await fetchAndCache();
      } else if (now - ts >= 4 * 60 * 60 * 1000) {
        STATUS.push("⏳ Cache quá 4h, fetch CSV mới trong background...");
        ctx.waitUntil(fetchAndCache()); // fetch background
      }

      if (!phones.length) {
        return new Response(
          `<html><head><meta charset="UTF-8"></head>
          <body>
            <h1>⚠️ Không có số điện thoại</h1>
            <pre>${STATUS.join("\n")}</pre>
          </body></html>`,
          {
            status: 500,
            headers: { "Content-Type": "text/html; charset=UTF-8" },
          }
        );
      }

      // --- Chọn số ngẫu nhiên ---
      const randomPhone = phones[Math.floor(Math.random() * phones.length)];
      STATUS.push(`☎️ Số điện thoại được chọn: ${randomPhone}`);

      // --- Trả về HTML ---
      return new Response(
        `<html>
          <head><meta charset="UTF-8"><title>Số điện thoại ngẫu nhiên</title></head>
          <body>
            <h1>Số điện thoại ngẫu nhiên</h1>
            <p>${randomPhone}</p>
            <a href="tel:${randomPhone}"><button>Nhấn để gọi</button></a>
            <h2>DEBUG</h2>
            <pre>${STATUS.join("\n")}</pre>
          </body>
        </html>`,
        { headers: { "Content-Type": "text/html; charset=UTF-8" } }
      );
    } catch (e) {
      return new Response(
        `<html><head><meta charset="UTF-8"></head>
        <body>
          <h1>❌ Lỗi Worker:</h1>
          <pre>${e.message}</pre>
        </body></html>`,
        { status: 500, headers: { "Content-Type": "text/html; charset=UTF-8" } }
      );
    }
  },
};
