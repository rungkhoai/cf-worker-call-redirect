// File: src/index.js
export default {
  async fetch(request, env, ctx) {
    try {
      return new Response("Worker OK: " + request.url);
    } catch (e) {
      return new Response("Error: " + e.message, { status: 500 });
    }
  }
}
/*
export default {
  async fetch(request, env) {
    // Lấy danh sách số từ biến môi trường (được inject qua GitHub Secrets)
    const phones = JSON.parse(env.PHONE_LIST);

    // Round-robin hoặc random đều được
    // Ở đây chọn random để demo
    const random = Math.floor(Math.random() * phones.length);
    const phoneNumber = phones[random];

    return Response.redirect(`tel:${phoneNumber}`, 301);
  }
}
*/
