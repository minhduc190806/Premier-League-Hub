# HƯỚNG DẪN CHẠY VÀ ĐƯA WEBSITE PREMIER LEAGUE LÊN INTERNET

Dự án: **Premier League Hub Việt Nam**  
Thư mục: `c:\Users\ADMIN\Downloads\minhducth29.25\PremierLeagueHub`

---

## 1. MỞ VÀ TRẢI NGHIỆM TRỰC TIẾP TRÊN MÁY TÍNH
1. Mở thư mục: `c:\Users\ADMIN\Downloads\minhducth29.25\PremierLeagueHub`.
2. Nhấp đúp chuột vào file **`index.html`** để mở trên Google Chrome, Cốc Cốc hoặc Microsoft Edge.
3. **Cơ chế Tự Động Đồng Bộ Dữ Liệu Trực Tiếp (Real-Time Live Sync):**
   - **Mỗi lần mở trang web:** Ứng dụng tự động kết nối máy chủ dữ liệu chính thức Premier League (qua FPL API) để lấy kết quả mới nhất, bảng xếp hạng và các bàn thắng vừa ghi.
   - **Tự động làm mới:** Khi người dùng giữ tab mở, web sẽ tự kiểm tra và đồng bộ lại mỗi 3 phút.
   - **Chạy mượt cả khi mất mạng:** Nếu không có kết nối internet, web tự động tải bản sao dữ liệu mới nhất đã lưu sẵn trong máy để bạn xem không bị gián đoạn.
   - **Bảng xếp hạng:** Đầy đủ 20 câu lạc bộ của mùa giải hiện tại với số điểm, bàn thắng/thua, hiệu số và phong độ 5 trận gần nhất.
   - **Thống kê:** Bàn thắng (Haaland, Isak...), Kiến tạo, **Thủ môn Giữ sạch lưới ($\ge 1$ trận)**, Thẻ phạt.
   - **Đội hình CLB:** Tách thành **4 nhóm vị trí rõ rệt** (🧤 Thủ môn - 🛡️ Hậu vệ - ⚙️ Tiền vệ - ⚡ Tiền đạo). Đã loại bỏ các cầu thủ đã rời đi.
   - **Modal Profile Cầu thủ:** Căn giữa màn hình 100%, không bị lệch góc, đóng bằng nút `✕`, phím `ESC` hoặc click ra ngoài.

---

## 2. CÁCH ĐƯA LÊN WEB MIỄN PHÍ VỚI NETLIFY (NHANH NHẤT - 1 PHÚT)

1. Truy cập [app.netlify.com](https://app.netlify.com) và đăng ký tài khoản miễn phí (bằng Google/GitHub).
2. Vào tab **Sites** $\rightarrow$ Kéo thả toàn bộ thư mục `PremierLeagueHub` vào ô **"Drag and drop your site output folder here"**.
3. Sau khoảng 5 giây, Netlify sẽ cấp cho bạn một đường link công khai (Ví dụ: `https://premier-league-hub-vn.netlify.app`). Bất kỳ ai trên thế giới cũng có thể truy cập được ngay lập tức mà không bị hỏi đăng nhập!

---

## 3. CÁCH ĐƯA LÊN WEB VỚI VERCEL

1. Truy cập [vercel.com](https://vercel.com) và đăng nhập bằng tài khoản GitHub.
2. Tạo một Repository mới trên GitHub (VD đặt tên `premier-league-hub`) rồi đẩy các file trong thư mục này lên.
3. Trên Vercel: Chọn **Add New Project** $\rightarrow$ Chọn repository vừa tạo $\rightarrow$ Bấm **Deploy**.
4. Bạn sẽ nhận được đường link dạng: `https://premier-league-hub.vercel.app`.

---

## 4. CÁCH GẮN TÊN MIỀN RIÊNG (CUSTOM DOMAIN: .COM, .VN, .NET...)

Khi bạn mua tên miền riêng (tại Tenten, Mắt Bão, Namecheap, Cloudflare...):

1. **Trên Vercel / Netlify:**
   - Vào dự án của bạn $\rightarrow$ Chọn **Settings** $\rightarrow$ **Domains**.
   - Nhập tên miền của bạn (VD: `bongdaepl.com` hoặc `ngoaihanganh247.vn`) $\rightarrow$ Bấm **Add**.
2. **Trên trang quản lý Tên Miền (nơi bạn mua):**
   - Vào mục **Cấu hình DNS** / **Quản lý bản ghi**.
   - Thêm 2 bản ghi sau:
     - **Bản ghi 1 (A Record):**
       - Loại: `A`
       - Tên / Host: `@`
       - Giá trị / IP: `76.76.21.21` (nếu dùng Vercel) hoặc `75.2.60.5` (nếu dùng Netlify).
     - **Bản ghi 2 (CNAME Record):**
       - Loại: `CNAME`
       - Tên / Host: `www`
       - Giá trị: `cname.vercel-dns.com` (nếu dùng Vercel) hoặc `ten-web-cua-ban.netlify.app` (nếu dùng Netlify).
3. Đợi khoảng 5 – 15 phút, hệ thống sẽ tự động kích hoạt chứng chỉ bảo mật **SSL (HTTPS)** miễn phí và trang web chính thức chạy trên tên miền riêng của bạn!
