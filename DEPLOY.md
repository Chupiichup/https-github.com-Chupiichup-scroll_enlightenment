# Hướng dẫn Triển khai (Deployment Guide)

Tài liệu này hướng dẫn bạn cách đưa ứng dụng lên GitHub Pages.

## Triển khai Tự động (GitHub Actions)

Hệ thống đã được cấu hình để tự động triển khai mỗi khi bạn push code lên GitHub.

### Cách thực hiện:
1. Trong AI Studio, nhấn vào tab **GitHub** ở góc trên bên phải.
2. Nhấn nút **"Stage and commit all changes"**.
3. GitHub sẽ tự động nhận diện file `.github/workflows/deploy.yml` và bắt đầu quá trình build.
4. Sau khoảng 1-2 phút, trang web của bạn sẽ được cập nhật.

---

## Lưu ý về AI
Ứng dụng hiện tại đã **loại bỏ hoàn toàn AI**. Tính năng phân rã mục tiêu hiện đang sử dụng thuật toán toán học định sẵn (Deterministic Logic) để đảm bảo tính chính xác và ổn định. Bạn không cần phải cấu hình `GEMINI_API_KEY` nữa.

