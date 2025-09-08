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

// File: src/index.js
export default {
  async fetch(request, env, ctx) {
    const KV = env.SALES_PHONES; // KV binding từ wrangler.toml
    const SHEET_CSV_URL = env.CSV_SALES_PHONE; // Đọc từ secret trực tiếp
    const STATUS = [];

    try {
      const sheetUrl = env.CSV_SALES_PHONE;
      if (sheetUrl) {
        STATUS.push(`ENV CSV_SALES_PHONE: ${sheetUrl.slice(0, 50)}...`);

        // Nếu chưa có trong KV hoặc KV khác ENV thì lưu/ghi đè
        const currentCsv = await KV.get("csv_url");
        if (!currentCsv || currentCsv !== sheetUrl) {
          await KV.put("csv_url", sheetUrl);
          STATUS.push("✅ Đã lưu ENV CSV_SALES_PHONE vào KV key csv_url");
        } else {
          STATUS.push("ℹ️ csv_url trong KV đã khớp với ENV, không cần lưu lại");
        }
      } else {
        STATUS.push("⚠️ Không có ENV CSV_SALES_PHONE khi deploy");
      }

      // Lấy từ KV để confirm
      const [kvCsvUrl, kvPhones, kvTs] = await Promise.all([
        KV.get("csv_url"),
        KV.get("phones"),
        KV.get("phones_ts"),
      ]);

      STATUS.push(
        `KV csv_url: ${kvCsvUrl ? kvCsvUrl.slice(0, 50) + "..." : "❌ Chưa có"}`
      );
      STATUS.push(
        `KV phones: ${kvPhones ? kvPhones.slice(0, 50) + "..." : "❌ Chưa có"}`
      );
      STATUS.push(`KV phones_ts: ${kvTs || "❌ Chưa có"}`);

      return new Response(
        `<html>
          <head><meta charset="UTF-8"><title>Debug Worker</title></head>
          <body>
            <h1>Debug cấu hình Worker</h1>
            <pre>${STATUS.join("\n")}</pre>
          </body>
        </html>`,
        { headers: { "Content-Type": "text/html; charset=UTF-8" } }
      );
    } catch (e) {
      return new Response(
        `<html><head><meta charset="UTF-8"></head>
        <body><h1>Lỗi Worker:</h1><pre>${e.message}</pre></body></html>`,
        { status: 500, headers: { "Content-Type": "text/html; charset=UTF-8" } }
      );
    }
  },
};

/*
// File: src/index.js
export default {
  async fetch(request, env, ctx) {
    const KV = env.SALES_PHONES;
    const STATUS = [];

    try {
      STATUS.push("Bắt đầu xử lý...");

      // Lấy URL CSV từ KV hoặc từ env nếu lần đầu
      let csvUrl = await KV.get("csv_url");
      if (!csvUrl) {
        csvUrl = env.CSV_SALES_PHONE;
        await KV.put("csv_url", csvUrl);
        STATUS.push(`Lưu URL CSV vào KV: ${csvUrl}`);
      } else {
        STATUS.push(`Đã có URL CSV trong KV: ${csvUrl}`);
      }

      // Lấy cache số điện thoại
      const [phonesStr, tsStr] = await Promise.all([KV.get("phones"), KV.get("phones_ts")]);
      let phones = phonesStr ? JSON.parse(phonesStr) : [];
      const ts = tsStr ? parseInt(tsStr) : 0;
      const now = Date.now();

      STATUS.push(`Lấy số điện thoại từ KV: ${phones.length} số`);

      // Nếu cache trống hoặc >4h, fetch CSV mới
      if (!phones.length || now - ts >= 4 * 60 * 60 * 1000) {
        STATUS.push("Cache hết hạn hoặc trống, fetch CSV từ Google Sheet...");
        const res = await fetch(csvUrl);
        if (!res.ok) throw new Error("Không fetch được CSV");
        const csvText = await res.text();
        const lines = csvText.split("\n").slice(1);
        phones = lines
          .map(l => l.split(",")[1]?.trim().replace(/[.\s]/g, ""))
          .filter(Boolean);
        await Promise.all([
          KV.put("phones", JSON.stringify(phones)),
          KV.put("phones_ts", Date.now().toString())
        ]);
        STATUS.push(`Đã lưu ${phones.length} số vào KV`);
      }

      if (!phones.length) {
        return new Response(`<html><head><meta charset="UTF-8"></head>
          <body><h1>⚠️ Không có số điện thoại</h1>
          <pre>${STATUS.join("\n")}</pre></body></html>`,
          { status: 500, headers: { "Content-Type": "text/html; charset=UTF-8" } });
      }

      // Chọn số ngẫu nhiên
      const randomPhone = phones[Math.floor(Math.random() * phones.length)];
      STATUS.push(`Số điện thoại được chọn: ${randomPhone}`);

      return new Response(`<html>
        <head><meta charset="UTF-8"><title>Số điện thoại</title></head>
        <body>
          <h1>Số điện thoại ngẫu nhiên</h1>
          <p>${randomPhone}</p>
          <a href="tel:${randomPhone}"><button>Nhấn để gọi</button></a>
          <h2>DEBUG</h2>
          <pre>${STATUS.join("\n")}</pre>
        </body>
      </html>`,
      { headers: { "Content-Type": "text/html; charset=UTF-8" } });

    } catch (e) {
      return new Response(`<html><head><meta charset="UTF-8"></head>
        <body><h1>Lỗi Worker:</h1><pre>${e.message}</pre></body></html>`,
        { status: 500, headers: { "Content-Type": "text/html; charset=UTF-8" } });
    }
  }
};*/
