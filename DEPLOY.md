# Hướng dẫn Triển khai (Deployment Guide)

Tài liệu này hướng dẫn bạn cách đưa ứng dụng lên GitHub Pages và cấu hình các tính năng cần thiết. Bạn có thể lưu file `DEPLOY.md` này trực tiếp vào repository của mình để tiện tra cứu.

## Phương án 1: Triển khai Tự động (GitHub Actions) - KHUYÊN DÙNG

Vì bạn sử dụng GitHub Pages, bạn cần cung cấp "Chìa khóa AI" (Gemini API Key) thủ công để tính năng Phân rã AI hoạt động.

### Bước 1: Lấy Gemini API Key (Miễn phí)
1. Truy cập [Google AI Studio](https://aistudio.google.com/app/apikey).
2. Đăng nhập bằng tài khoản Google của bạn.
3. Nhấn nút **"Create API key"**.
4. Copy mã khóa vừa tạo (có dạng `AIza...`).

### Bước 2: Cấu hình trên GitHub (Để AI hoạt động vĩnh viễn)
1. Vào Repository của bạn trên GitHub.
2. Chọn tab **Settings** -> **Secrets and variables** -> **Actions**.
3. Nhấn nút **"New repository secret"**.
4. Ô **Name**: Nhập chính xác `GEMINI_API_KEY`.
5. Ô **Secret**: Dán mã khóa bạn vừa copy ở Bước 1 vào.
6. Nhấn **Add secret**.

### Bước 3: Cập nhật lại trang web
Sau khi thêm Secret, bạn cần chạy lại bản build:
1. Vào tab **Actions** trên GitHub.
2. Chọn workflow **Deploy to GitHub Pages**.
3. Nhấn **Run workflow** -> **Run workflow**.

---

## Phương án 2: Triển khai Thủ công (Dành cho máy cá nhân)

Nếu bạn muốn tự mình triển khai từ máy tính (Local), hãy làm theo các bước sau:

1. **Cài đặt:** Chạy `npm install` để cài đặt các thư viện cần thiết.
2. **Cấu hình AI:** Tạo file `.env` ở thư mục gốc và thêm dòng:
   `VITE_GEMINI_API_KEY=mã_khóa_của_bạn`
3. **Triển khai:** Chạy lệnh `npm run deploy`. Lệnh này sẽ tự động build và đẩy code lên nhánh `gh-pages`.

---

### Lưu ý về Đăng xuất
Tôi đã cập nhật nút Đăng xuất to hơn và dễ bấm hơn. Bạn chỉ cần click vào ảnh đại diện, một menu lớn sẽ hiện ra, nhấn vào dòng **"Đăng Xuất"** màu đỏ để thoát.
