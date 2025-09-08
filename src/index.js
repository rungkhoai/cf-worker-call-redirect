// File: src/index.js
export default {
  async fetch(request, env, ctx) {
    const KV = env.SALES_PHONES;
    const SHEET_CSV_URL = env.CSV_SALES_PHONE;
    const STATUS = [];

    try {
      STATUS.push("🚀 Bắt đầu xử lý request...");

      // --- Lấy KV ---
      const [cachedPhonesStr, cachedTSStr] = await Promise.all([
        KV.get("phones"),
        KV.get("phones_ts"),
      ]);
      let phones = cachedPhonesStr ? JSON.parse(cachedPhonesStr) : [];
      const ts = cachedTSStr ? parseInt(cachedTSStr) : 0;
      const now = Date.now();

      STATUS.push(`🔹 Số điện thoại trong KV: ${phones.length}`);
      STATUS.push(`🔹 Timestamp cache: ${ts || "chưa có"}`);

      // --- Hàm fetch CSV ---
      const fetchAndCache = async () => {
        try {
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

          STATUS.push(`✅ Đã cập nhật ${newPhones.length} số vào KV`);
        } catch (e) {
          STATUS.push(`❌ Lỗi fetch CSV: ${e.message}`);
        }
      };

      // --- Chọn số hiển thị ngay ---
      let randomPhone = "❌ Không có số trong KV";
      if (phones.length) {
        randomPhone = phones[Math.floor(Math.random() * phones.length)];
        STATUS.push(`☎️ Số điện thoại được chọn: ${randomPhone}`);

        // fetch background nếu gần hết hạn (>3h55)
        const FOUR_HOURS = 4 * 60 * 60 * 1000;
        if (!ts || now - ts >= FOUR_HOURS - 5 * 60 * 1000) {
          STATUS.push(
            "⏳ Cache gần hết hạn/đã quá hạn, fetch CSV background..."
          );
          ctx.waitUntil(fetchAndCache());
        }
      } else {
        // cache trống, bắt buộc fetch
        STATUS.push("⚠️ Cache trống, fetch CSV trực tiếp...");
        phones = await fetchAndCache();
        if (phones.length)
          randomPhone = phones[Math.floor(Math.random() * phones.length)];
      }

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

  // --- Cron job mỗi 6h ---
  async scheduled(event, env, ctx) {
    const KV = env.SALES_PHONES;
    const SHEET_CSV_URL = env.CSV_SALES_PHONE;

    try {
      console.log("⏰ Cron job bắt đầu fetch CSV...");
      const res = await fetch(SHEET_CSV_URL);
      if (!res.ok) throw new Error("❌ Không fetch được CSV");
      const csvText = await res.text();

      const lines = csvText.split("\n").slice(1);
      const phones = lines
        .map((l) => l.split(",")[1]?.trim().replace(/[.\s]/g, ""))
        .filter(Boolean);

      await Promise.all([
        KV.put("phones", JSON.stringify(phones)),
        KV.put("phones_ts", Date.now().toString()),
      ]);

      console.log(`✅ Cron job cập nhật ${phones.length} số vào KV`);
    } catch (e) {
      console.error("❌ Cron job lỗi:", e.message);
    }
  },
};
