export default {
  async fetch(request, env, ctx) {
    const KV = env.SALES_PHONES; // tham chiếu KV namespace
    let SHEET_CSV_URL = await KV.get("csv_url"); // lấy URL từ KV namepace nếu có
    if (!SHEET_CSV_URL) {
      // fallback sang ENV nếu KV chưa có
      SHEET_CSV_URL = env.CSV_SALES_PHONE;
      await KV.put("csv_url", SHEET_CSV_URL);
    }
    const STATUS = [];

    try {
      STATUS.push("🚀 Bắt đầu xử lý request...");

      // --- Lấy dữ liệu từ KV ---
      const [cachedPhonesStr, cachedTSStr] = await Promise.all([
        KV.get("phones"),
        KV.get("phones_ts"),
      ]);
      let phones = cachedPhonesStr ? JSON.parse(cachedPhonesStr) : [];
      const ts = cachedTSStr ? parseInt(cachedTSStr) : 0;
      const now = Date.now();

      STATUS.push(`🔹 Tổng số điện thoại: ${phones.length}`);
      STATUS.push(`🔹 Thời gian cập nhật: ${ts || "chưa có"}`);

      // --- Hàm fetch CSV ---
      const fetchAndCache = async () => {
        try {
          STATUS.push("📡 Tải CSV số điện thoại từ Google Sheet...");
          const res = await fetch(SHEET_CSV_URL);
          if (!res.ok)
            throw new Error(
              "❌ Không tải được được CSV số điện thoại từ Google Sheet"
            );
          const csvText = await res.text();

          const lines = csvText.split("\n").slice(1);
          const newPhones = lines
            .map((line) => line.split(",")[1]?.trim().replace(/[.\s]/g, ""))
            .filter(Boolean);

          await Promise.all([
            KV.put("phones", JSON.stringify(newPhones)),
            KV.put("phones_ts", Date.now().toString()),
          ]);

          STATUS.push(`✅ Đã cập nhật ${newPhones.length} số điện thoại`);
        } catch (e) {
          STATUS.push(
            `❌ Lỗi Không tải được CSV số điện thoại từ Google Sheet: ${e.message}`
          );
        }
      };

      // --- Chọn số hiển thị ngay ---
      let randomPhone =
        "❌ Không có số điện thoại nào trong cơ sở dữ liệu, Chờ tải CSV số điện thoại từ Google Sheet...";
      if (phones.length) {
        randomPhone = phones[Math.floor(Math.random() * phones.length)];
        STATUS.push(`☎️ Số điện thoại được chọn: ${randomPhone}`);

        const FOUR_HOURS = 4 * 60 * 60 * 1000;
        if (!ts || now - ts >= FOUR_HOURS - 5 * 60 * 1000) {
          STATUS.push(
            "⏳ Cache gần hết hạn/đã quá hạn, đang cập nhật lại dữ liệu số điện thoại trong nền cho người dùng sau..."
          );
          ctx.waitUntil(fetchAndCache());
        }
      } else {
        STATUS.push(
          "⚠️ Không có số điện thoại trong cơ sở dữ liệu, đang tải CSV số điện thoại trực tiếp từ Google Sheet..."
        );
        await fetchAndCache();
        // cập nhật lại phones sau khi fetch thành công
        const updatedPhonesStr = await KV.get("phones");
        phones = updatedPhonesStr ? JSON.parse(updatedPhonesStr) : [];
        if (phones.length)
          randomPhone = phones[Math.floor(Math.random() * phones.length)];
      }

      // --- HTML + CSS giao diện đẹp + hiệu ứng nút call ---
      return new Response(
        `<html>
          <head>
            <meta charset="UTF-8">
            <title>Số điện thoại để liên hệ với Rừng Khoái</title>
            <style>
              @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap');
              * { margin:0; padding:0; box-sizing:border-box; font-family: 'Inter', sans-serif; }
              html, body { height: 100%; display: flex; justify-content: center; align-items: center; background: #f5f5f5; }
              h1 { font-size: 1.75rem; color: #054219; margin-bottom: 16px; }
              .container { text-align: center; background: #fff; padding: 40px; border-radius: 12px; box-shadow: 0 8px 24px rgba(0,0,0,0.1); max-width: 360px; width: 90%; animation: fadeIn 0.5s ease-in-out; }
              .phone-number { font-size: 2.5rem; font-weight: 700; color: #1f2937; margin: 24px 0; animation: pulse 1.5s infinite; display: inline-block; }
              .call-button { display: inline-block; background: #10b981; color: #fff; font-size: 1.25rem; font-weight: 600; padding: 16px 32px; border-radius: 8px; text-decoration: none; transition: background 0.3s, transform 0.2s; box-shadow: 0 4px 12px rgba(0,0,0,0.1); }
              .call-button:hover { background: #059669; transform: translateY(-3px); box-shadow: 0 6px 16px rgba(0,0,0,0.15); }
              .call-button:active { transform: translateY(0); box-shadow: 0 3px 8px rgba(0,0,0,0.1); }
              .debug { margin-top: 24px; text-align: left; font-size: 0.875rem; color: #6b7280; max-height: 200px; overflow-y: auto; background: #f9fafb; padding: 12px; border-radius: 6px; }
              @keyframes pulse { 0% { transform: scale(1); } 50% { transform: scale(1.05); } 100% { transform: scale(1); } }
              @keyframes fadeIn { from { opacity:0; } to { opacity:1; } }
            </style>
          </head>
          <body>
            <div class="container">
              <h1>📞 Liên hệ với </br> Rừng Khoái</h1>
              <div class="phone-number">${randomPhone}</div>
              <a class="call-button" href="tel:${randomPhone}">Nhấn để gọi</a>
              
            </div>
            <!--div class="debug"><pre>${STATUS.join("\n")}</pre></div-->
          </body>
        </html>`,
        { headers: { "Content-Type": "text/html; charset=UTF-8" } }
      );
    } catch (e) {
      return new Response(
        `<html><head><meta charset="UTF-8"></head>
        <body><h1>❌ Lỗi:</h1><pre>${e.message}</pre></body></html>`,
        { status: 500, headers: { "Content-Type": "text/html; charset=UTF-8" } }
      );
    }
  },

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
