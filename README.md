# Furina AI ✦ Salon Solitaire & Opera Epiclese

Ứng dụng web AI mang phong cách **Lady Furina de Fontaine (Genshin Impact)** được xây dựng trên nền tảng **Google AI Studio Interactions API** (`@google/genai`) và triển khai trực tiếp trên **Netlify**.

🌐 **Live Demo:** [https://furina-ai-fontaine-studio.netlify.app](https://furina-ai-fontaine-studio.netlify.app)

## ✨ Tính năng nổi bật
- **Giao diện Sân Khấu Fontaine (Ousia & Pneuma)**: Chuyển đổi mượt mà giữa giao diện **Ousia (Hắc Thủy Hoàng Gia)** và **Pneuma (Bạch Thủy Quý Tộc)** cùng hiệu ứng bọt nước Hydro.
- **Google AI Studio Interactions API**: Hỗ trợ hội thoại nhiều lượt tự động nhớ ngữ cảnh (`previous_interaction_id`), phân tích hình ảnh, chạy Code Python, tra cứu Google Search và tạo ảnh 4K.
- **Quản lý Dự án & Hội thoại**: Ghim hội thoại (`Pinned Conversations`), nhóm hội thoại theo thư mục (`Projects`), mẫu tác vụ nhanh (`Automations`), và tuỳ chỉnh tính cách (`Customizations`).
- **Nhập liệu giọng nói & Đọc văn bản**: Tích hợp Web Speech API tiếng Việt.

## 🚀 Cài đặt và Chạy thử tại máy (Local)

1. Cài đặt thư viện:
   ```bash
   npm install
   ```
2. Tạo file `.env` (hoặc nhập trực tiếp API Key trên giao diện web ở mục **Settings**):
   ```env
   GEMINI_API_KEY=AIzaSy...
   PORT=3000
   ```
3. Khởi chạy server:
   ```bash
   npm start
   ```
4. Mở trình duyệt tại `http://localhost:3000`.
