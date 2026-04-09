# Hướng dẫn Deploy "Một Lần Duy Nhất" (Không cần cấp quyền GitHub)

GitHub chặn AI thay đổi file hệ thống (`.github/workflows/`) để bảo mật. Để giải quyết **DỨT ĐIỂM** việc phải tạo lại file hay cấp quyền rắc rối, tôi khuyên bạn nên dùng **Vercel**.

### Cách 1: Dùng Vercel (Khuyên dùng - Tự động 100%, không cần file config)
Đây là cách các lập trình viên chuyên nghiệp thường dùng cho React:
1. Truy cập [Vercel.com](https://vercel.com) và đăng nhập bằng tài khoản GitHub của bạn.
2. Nhấn **"Add New"** -> **"Project"**.
3. Chọn Repository này từ danh sách GitHub của bạn.
4. Nhấn **"Deploy"**.
5. **Xong!** Từ nay về sau, mỗi khi bạn nhấn **"Commit & Push"** ở AI Studio, Vercel sẽ tự động thấy code mới và cập nhật trang web cho bạn. Bạn không cần file `deploy.yml`, không cần cấp quyền Actions.

---

### Cách 2: Nếu bạn vẫn muốn dùng GitHub Pages
Nếu bạn không muốn dùng Vercel, bạn buộc phải làm thủ công trên GitHub mỗi khi file bị mất:
1. Vào tab **Actions** trên GitHub.
2. Nếu không thấy workflow nào, hãy tạo lại file `.github/workflows/deploy.yml` với nội dung dưới đây.
3. **Lưu ý:** AI Studio có thể xóa file này trên GitHub mỗi khi bạn Push code (do cơ chế đồng bộ). Đây là lý do tôi khuyên bạn dùng **Cách 1**.

#### Nội dung file `deploy.yml`:
```yaml
name: Deploy to GitHub Pages
on:
  push:
    branches: ["main"]
  workflow_dispatch:
permissions:
  contents: read
  pages: write
  id-token: write
concurrency:
  group: "pages"
  cancel-in-progress: true
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'npm'
      - run: npm install
      - run: npm run build
      - uses: actions/configure-pages@v4
      - uses: actions/upload-pages-artifact@v3
        with:
          path: './dist'
      - uses: actions/deploy-pages@v4
```
