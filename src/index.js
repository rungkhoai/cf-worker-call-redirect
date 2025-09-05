export default {
  async fetch(request, env, ctx) {
    const KV = env.SALES_PHONES; // KV binding từ wrangler.toml
    const SHEET_CSV_URL = env.CSV_SALES_PHONE; // URL CSV Google Sheet
    const STATUS = [];

    try {
      STATUS.push("Bắt đầu xử lý...");

      // Lấy cache từ KV
      const [cachedPhonesStr, cachedTSStr] = await Promise.all([
        KV.get("phones"),
        KV.get("phones_ts"),
      ]);
      const cachedPhones = cachedPhonesStr ? JSON.parse(cachedPhonesStr) : [];
      const cachedTS = cachedTSStr ? parseInt(cachedTSStr) : 0;
      const now = Date.now();

      STATUS.push(`Lấy dữ liệu từ KV: ${cachedPhones.length} số`);

      // Hàm fetch CSV Google Sheet và lưu vào KV
      const fetchAndCache = async () => {
        STATUS.push("Fetch CSV từ Google Sheet...");
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
        STATUS.push(`Đã lưu ${phones.length} số vào KV`);
        return phones;
      };

      let phonesToUse = cachedPhones;

      if (!cachedPhones.length) {
        STATUS.push("Cache trống, fetch trực tiếp...");
        phonesToUse = await fetchAndCache();
      } else if (now - cachedTS >= 4 * 60 * 60 * 1000) {
        STATUS.push("Cache quá 4 giờ, cập nhật dữ liệu mới...");
        ctx.waitUntil(fetchAndCache()); // fetch background
      }

      if (!phonesToUse.length) {
        return new Response(
          "<h1>⚠️ Không có số điện thoại trong CSV.</h1><pre>" +
            STATUS.join("\n") +
            "</pre>",
          { status: 500, headers: { "Content-Type": "text/html" } }
        );
      }

      // Chọn số ngẫu nhiên
      const random = Math.floor(Math.random() * phonesToUse.length);
      const phoneNumber = phonesToUse[random];

      STATUS.push(`Số điện thoại được chọn: ${phoneNumber}`);

      // Trả về trang HTML thay vì redirect
      return new Response(
        `
          <html>
            <body>
              <h1>Số điện thoại ngẫu nhiên</h1>
              <p>${phoneNumber}</p>
              <a href="tel:${phoneNumber}">
                <button>Nhấn để gọi</button>
              </a>
              <h2>DEBUG</h2>
              <pre>${STATUS.join("\n")}</pre>
            </body>
          </html>
        `,
        { headers: { "Content-Type": "text/html" } }
      );
    } catch (e) {
      return new Response("<h1>Lỗi Worker:</h1><pre>" + e.message + "</pre>", {
        status: 500,
        headers: { "Content-Type": "text/html" },
      });
    }
  },
};
