export default {
  async fetch(request) {
    const phoneNumber = "+84987654321"; // chỉnh sửa ở đây khi cần đổi số
    return Response.redirect(`tel:${phoneNumber}`, 301);
  }
}
