import express from "express";
import dotenv from "dotenv";
import axios from "axios";

dotenv.config();
const app = express();
app.use(express.json());

// ✅ Webhook từ SePay
app.post("/api/sepay/webhook", async (req, res) => {
  try {
    const data = req.body;
    console.log("📩 Webhook nhận được:", data);

    const {
      transferAmount,
      content,
      accountNumber,
      transactionDate,
      referenceCode,
    } = data;

    // 👉 Tìm mã booking trong nội dung (ví dụ: BOOK123 hoặc BK12345)
    const match = content?.match(/BOOK\d+|BK\d+/i);
    const bookingCode = match ? match[0].toUpperCase() : null;

    if (bookingCode) {
      console.log(`🔍 Phát hiện mã booking: ${bookingCode}`);
      console.log(`💰 Số tiền: ${transferAmount}`);

      // 🔗 Gửi dữ liệu sang backend XemPhim để xác nhận thanh toán
      await axios.post(
        "http://localhost:8080/api/payments/confirm", // ⬅️ đổi thành API thật của bạn
        {
          bookingCode,
          amount: transferAmount,
          referenceCode,
          accountNumber,
          transactionDate,
        }
      );

      console.log(`✅ Đã gửi xác nhận thanh toán cho ${bookingCode}`);
    } else {
      console.log("⚠️ Không tìm thấy mã booking trong nội dung giao dịch!");
    }

    res.status(200).json({ message: "OK" });
  } catch (error) {
    console.error("❌ Lỗi khi xử lý webhook:", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

// ✅ Route test
app.get("/", (req, res) => {
  res.send("🚀 SePay Webhook Server đang chạy ngon lành!");
});

// ✅ Start server
const PORT = process.env.PORT || 9090;
app.listen(PORT, () => {
  console.log(`🚀 Server đang chạy ở port ${PORT}`);
});
