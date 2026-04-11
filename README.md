# Cổ Thư Tu Tiên - Kim Chỉ Nam Phát Triển

Dự án này là một hệ thống quản lý mục tiêu và tracking thời gian thực theo phong cách tu tiên. Dưới đây là các yêu cầu cốt lõi (Kim Chỉ Nam) cần tuân thủ:

## 1. Hệ Thống View (5 Cấp Độ)
- **Đại Lộ Công Danh**: Quản lý các Dự án/Đại nguyện lớn.
- **Theo Năm**: Theo dõi mục tiêu cấp năm.
- **Theo Quý**: Theo dõi mục tiêu cấp quý (của từng năm).
- **Theo Tháng**: Theo dõi mục tiêu cấp tháng (của từng năm).
- **Theo Tuần**: Theo dõi mục tiêu cấp tuần (của từng năm).

## 2. Quản Lý Đại Nguyện & Phân Rã Mục Tiêu
- **Khởi tạo**: Khi tạo Đại nguyện, cho phép chọn thời gian (Năm, Quý, Tháng).
- **Phân rã tự động (Logic BE)**:
    - Năm -> Quý -> Tháng -> Tuần.
    - Quý -> Tháng -> Tuần.
    - Tháng -> Tuần.
- **Nguyên tắc phân rã**:
    - Chia đều mục tiêu cho các giai đoạn còn lại tính từ thời điểm hiện tại.
    - Làm tròn số nguyên dương (không thập phân).
    - Đại nguyện tối đa 1 năm.
- **Review**: Hiển thị kết quả phân rã để người dùng chỉnh sửa thủ công trước khi bấm "Duyệt". Sau khi duyệt, hệ thống tự động tạo các ticket tương ứng ở mọi cấp độ.

## 3. Tracking & Hiển Thị Real-time
- **Dual-line Tracking**:
    - **Line 1 (Số tuyệt đối)**: Người dùng nhập kết quả thực tế hàng tuần.
    - **Line 2 (% Trung bình)**: Tính toán dựa trên % hoàn thành của các mục tiêu con.
- **View Tuần**:
    - Cột trái: Danh sách Ticket tuần (link tới cha: Tháng/Quý/Năm).
    - Các cột ngày: Thứ 2 -> Chủ Nhật (hiển thị đến ngày cuối tháng nếu tuần giao thoa).
- **Cấu trúc Ticket Tuần**:
    - Chứa (1) Danh sách công việc và (2) Các Ticket con.
    - Ticket con có thể kéo thả vào các cột ngày trong tuần.
    - Ticket con có: Độ ưu tiên, Ghi chú, CRUD đầy đủ.

## 4. Thống Kê & Lịch Trình
- **Thống kê Đạo pháp**: Đầy đủ view Năm -> Quý -> Tháng -> Tuần.
- **Lịch trình**: 2 view (Tuần & Ngày), hỗ trợ kéo thả, chỉnh sửa timebox (giống Google Calendar).

## 5. Ràng Buộc Kỹ Thuật
- Loại bỏ hoàn toàn AI trong việc chia nhỏ mục tiêu, thay bằng logic code định sẵn.
- Cập nhật % hoàn thành realtime từ cấp thấp nhất lên cấp cao nhất (Sub-ticket -> Task List -> Week -> Month -> Quarter -> Year).
