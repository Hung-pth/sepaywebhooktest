import express from "express";
import dotenv from "dotenv";
import axios from "axios";

dotenv.config();
const app = express();
app.use(express.json());
console.log("PORT:", process.env.PORT);
console.log("BACKEND_URL:", process.env.BACKEND_URL);


// ✅ Webhook từ SePay
app.post("/api/sepay/webhook", async (req, res) => {
  console.log("📬 [SePay] Webhook nhận được yêu cầu mới!");
  console.log("🧾 Payload nhận:", req.body);

  try {
    const data = req.body;
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
      console.log(`💰 Số tiền giao dịch: ${transferAmount}`);
      console.log(`🏦 Ngân hàng / tài khoản: ${accountNumber}`);
      console.log(`📅 Ngày giao dịch: ${transactionDate}`);
      console.log(`🧾 Mã tham chiếu: ${referenceCode}`);

      // 🔗 Gửi dữ liệu sang backend XemPhim để xác nhận thanh toán
      const backendUrl = process.env.BACKEND_URL || "http://localhost:8080";
      const confirmUrl = `${backendUrl}/api/payments/confirm`;

      console.log(`🚀 Gửi xác nhận thanh toán tới backend: ${confirmUrl}`);

      try {
        const response = await axios.post(confirmUrl, {
          bookingCode,
          amount: transferAmount,
          referenceCode,
          accountNumber,
          transactionDate,
        });

        console.log(
          `✅ Backend phản hồi [${response.status}]:`,
          response.data || "(no data)"
        );
        console.log(`🎉 Đã gửi xác nhận thành công cho ${bookingCode}`);
      } catch (err) {
        console.error(
          `❌ Lỗi khi gửi tới backend (${confirmUrl}): ${err.message}`
        );
        if (err.response) {
          console.error(
            "🧩 Phản hồi lỗi từ backend:",
            err.response.status,
            err.response.data
          );
        }
      }
    } else {
      console.warn("⚠️ Không tìm thấy mã booking trong nội dung giao dịch!");
    }

    res.status(200).json({ message: "OK" });
  } catch (error) {
    console.error("💥 Lỗi khi xử lý webhook tổng thể:", error);
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
  console.log(`🚀 [SePay Webhook] Server đang chạy ở port ${PORT}`);
});

