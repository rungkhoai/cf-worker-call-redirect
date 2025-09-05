// File: src/index.js
// Worker lấy số điện thoại ngẫu nhiên từ CSV Google Sheet, lưu cache trong KV

/*
export default {
  async fetch(request, env, ctx) {
    const KV = env.SALES_PHONES; // KV binding từ wrangler.toml
    const SHEET_CSV_URL = env.CSV_SALES_PHONE; // URL CSV Google Sheet
    const STATUS = []; // Mảng lưu log trạng thái các bước

    try {
      STATUS.push("Bắt đầu xử lý...");

      // --- Lấy cache từ KV ---
      const [cachedPhonesStr, cachedTSStr] = await Promise.all([
        KV.get("phones"), // danh sách số điện thoại đã cache
        KV.get("phones_ts"), // timestamp cache
      ]);
      const cachedPhones = cachedPhonesStr ? JSON.parse(cachedPhonesStr) : [];
      const cachedTS = cachedTSStr ? parseInt(cachedTSStr) : 0;
      const now = Date.now();

      STATUS.push(`Lấy dữ liệu từ KV: ${cachedPhones.length} số`);

      // --- Hàm fetch CSV từ Google Sheet và lưu vào KV ---
      const fetchAndCache = async () => {
        STATUS.push("Fetch CSV từ Google Sheet...");
        const res = await fetch(SHEET_CSV_URL);
        if (!res.ok) throw new Error("Không fetch được CSV");
        const csvText = await res.text();

        // Bỏ header, lấy cột số điện thoại (giả sử cột 2)
        const lines = csvText.split("\n").slice(1);
        const phones = lines
          .map((line) => line.split(",")[1]?.trim().replace(/[.\s]/g, ""))
          .filter(Boolean);

        // Lưu cache KV
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
          `<html><head><meta charset="UTF-8"></head>
          <body>
            <h1>⚠️ Không có số điện thoại trong CSV.</h1>
            <pre>${STATUS.join("\n")}</pre>
          </body></html>`,
          {
            status: 500,
            headers: { "Content-Type": "text/html; charset=UTF-8" },
          }
        );
      }

      // --- Chọn số ngẫu nhiên ---
      const random = Math.floor(Math.random() * phonesToUse.length);
      const phoneNumber = phonesToUse[random];
      STATUS.push(`Số điện thoại được chọn: ${phoneNumber}`);

      // --- Trả về trang HTML hiển thị số và nút gọi ---
      return new Response(
        `<html>
          <head>
            <meta charset="UTF-8">
            <title>Số điện thoại ngẫu nhiên</title>
          </head>
          <body>
            <h1>Số điện thoại ngẫu nhiên</h1>
            <p>${phoneNumber}</p>
            <a href="tel:${phoneNumber}">
              <button>Nhấn để gọi</button>
            </a>
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
          <h1>Lỗi Worker:</h1>
          <pre>${e.message}</pre>
        </body></html>`,
        { status: 500, headers: { "Content-Type": "text/html; charset=UTF-8" } }
      );
    }
  },
};
*/
// File: src/index.js
// Worker debug: hiển thị URL CSV Google Sheet lấy từ env

export default {
  async fetch(request, env) {
    const SHEET_CSV_URL = env.CSV_SALES_PHONE; // URL CSV từ env

    try {
      if (!SHEET_CSV_URL) {
        return new Response(
          `<html>
            <head><meta charset="UTF-8"><title>Debug CSV URL</title></head>
            <body>
              <h1>⚠️ CSV URL chưa được đặt!</h1>
              <p>Biến môi trường CSV_SALES_PHONE hiện undefined</p>
            </body>
          </html>`,
          { headers: { "Content-Type": "text/html; charset=UTF-8" } }
        );
      }

      return new Response(
        `<html>
          <head><meta charset="UTF-8"><title>Debug CSV URL</title></head>
          <body>
            <h1>✅ CSV URL đã lấy thành công!</h1>
            <p>CSV_SALES_PHONE = <strong>${SHEET_CSV_URL}</strong></p>
            <p>Test fetch trực tiếp:</p>
            <pre id="fetchResult">Đang fetch...</pre>

            <script>
              fetch("${SHEET_CSV_URL}")
                .then(res => res.text())
                .then(txt => {
                  document.getElementById('fetchResult').textContent = txt.slice(0, 500) + (txt.length > 500 ? "\\n... (cắt bớt)" : "");
                })
                .catch(err => {
                  document.getElementById('fetchResult').textContent = "Lỗi fetch: " + err;
                });
            </script>
          </body>
        </html>`,
        { headers: { "Content-Type": "text/html; charset=UTF-8" } }
      );
    } catch (e) {
      return new Response(
        `<html>
          <head><meta charset="UTF-8"></head>
          <body>
            <h1>Lỗi Worker:</h1>
            <pre>${e.message}</pre>
          </body>
        </html>`,
        { status: 500, headers: { "Content-Type": "text/html; charset=UTF-8" } }
      );
    }
  },
};
