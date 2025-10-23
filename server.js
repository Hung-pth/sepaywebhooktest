// import express from "express";
// import dotenv from "dotenv";
// import axios from "axios";

// dotenv.config();
// const app = express();
// app.use(express.json());



// // ✅ Webhook từ SePay
// app.post("/api/sepay/webhook", async (req, res) => {
//   console.log("📬 [SePay] Webhook nhận được yêu cầu mới!");
//   console.log("🧾 Payload nhận:", req.body);

//   try {
//     const data = req.body;
//     const {
//       transferAmount,
//       content,
//       accountNumber,
//       transactionDate,
//       referenceCode,
//     } = data;

//     // 👉 Tìm mã booking trong nội dung (ví dụ: BOOK123 hoặc BK12345)
//     const match = content?.match(/BOOK\d+|BK\d+/i);
//     const bookingCode = match ? match[0].toUpperCase() : null;

//     if (bookingCode) {
//       console.log(`🔍 Phát hiện mã booking: ${bookingCode}`);
//       console.log(`💰 Số tiền giao dịch: ${transferAmount}`);
//       console.log(`🏦 Ngân hàng / tài khoản: ${accountNumber}`);
//       console.log(`📅 Ngày giao dịch: ${transactionDate}`);
//       console.log(`🧾 Mã tham chiếu: ${referenceCode}`);

//       // 🔗 Gửi dữ liệu sang backend XemPhim để xác nhận thanh toán
//       const backendUrl = process.env.BACKEND_URL || "https://unsentiently-fattenable-daria.ngrok-free.dev";
//       const confirmUrl = `${backendUrl}/api/payments/confirm`;

//       console.log(`🚀 Gửi xác nhận thanh toán tới backend: ${confirmUrl}`);

//       try {
//         const response = await axios.post(confirmUrl, {
//           bookingCode,
//           amount: transferAmount,
//           referenceCode,
//           accountNumber,
//           transactionDate,
//         });

//         console.log(
//           `✅ Backend phản hồi [${response.status}]:`,
//           response.data || "(no data)"
//         );
//         console.log(`🎉 Đã gửi xác nhận thành công cho ${bookingCode}`);
//       } catch (err) {
//         console.error(
//           `❌ Lỗi khi gửi tới backend (${confirmUrl}): ${err.message}`
//         );
//         if (err.response) {
//           console.error(
//             "🧩 Phản hồi lỗi từ backend:",
//             err.response.status,
//             err.response.data
//           );
//         }
//       }
//     } else {
//       console.warn("⚠️ Không tìm thấy mã booking trong nội dung giao dịch!");
//     }

//     res.status(200).json({ message: "OK" });
//   } catch (error) {
//     console.error("💥 Lỗi khi xử lý webhook tổng thể:", error);
//     res.status(500).json({ message: "Internal Server Error" });
//   }
// });

// // ✅ Route test
// app.get("/", (req, res) => {
//   res.send("🚀 SePay Webhook Server đang chạy ngon lành!");
// });

// // ✅ Start server
// const PORT = process.env.PORT || 9090;
// app.listen(PORT, () => {
//   console.log(`🚀 [SePay Webhook] Server đang chạy ở port ${PORT}`);
// });



import express from "express";
import dotenv from "dotenv";
import axios from "axios";

dotenv.config();
const app = express();
app.use(express.json());

// ✅ Webhook SePay (tiền vào / ra)
app.post("/api/sepay/webhook", async (req, res) => {
  console.log("📬 [SePay] Webhook mới nhận được!");
  console.log("🧾 Payload:", req.body);

  try {
    const data = req.body;
    const {
      amount_in,
      amount_out,
      transaction_content,
      account_number,
      transaction_date,
      reference_number,
    } = data;

    // ⚙️ 1. Phân loại inbound / outbound
    const isInbound = parseFloat(amount_in || 0) > 0;
    const isOutbound = parseFloat(amount_out || 0) > 0;

    // 👉 2. Inbound (tiền vào) = user thanh toán vé
    if (isInbound) {
      const match = transaction_content?.match(/BOOK\d+|BK\d+/i);
      const bookingCode = match ? match[0].toUpperCase() : null;

      if (bookingCode) {
        console.log(`💰 Thanh toán inbound cho booking: ${bookingCode}`);
        await notifyBackend("payment", {
          bookingCode,
          amount: amount_in,
          reference: reference_number,
          account_number,
          transaction_date,
        });
      } else {
        console.warn("⚠️ Không tìm thấy mã booking trong inbound content!");
      }
    }

    // 👉 3. Outbound (tiền ra) = admin hoàn tiền
    if (isOutbound) {
      const match = transaction_content?.match(/HT-BOOK(\d+)-([A-Za-z0-9\-]+)/);
      if (match) {
        const bookingId = parseInt(match[1]);
        const bookingCode = match[2];
        console.log(
          `💸 Hoàn tiền outbound cho BOOK${bookingId}-${bookingCode} (số tiền: ${amount_out})`
        );

        await notifyBackend("refund", {
          bookingId,
          bookingCode,
          amount: amount_out,
          reference: reference_number,
          account_number,
          transaction_date,
        });
      } else {
        console.warn("⚠️ Không tìm thấy pattern HT-BOOK trong outbound content!");
      }
    }

    res.status(200).json({ message: "Webhook received OK" });
  } catch (err) {
    console.error("💥 Lỗi xử lý webhook:", err);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

// 🧩 Hàm gửi dữ liệu về backend chính (XEMPHIM)
async function notifyBackend(type, payload) {
  const backendUrl = process.env.BACKEND_URL || "https://unsentiently-fattenable-daria.ngrok-free.dev";
  const endpoint =
    type === "payment"
      ? `${backendUrl}/api/payments/confirm`
      : `${backendUrl}/api/refunds/confirm`;

  console.log(`🚀 [${type.toUpperCase()}] Gửi dữ liệu tới backend: ${endpoint}`);
  try {
    const res = await axios.post(endpoint, payload);
    console.log(`✅ Backend phản hồi ${res.status}:`, res.data);
  } catch (error) {
    console.error(`❌ Lỗi gửi ${type} webhook -> backend:`, error.message);
    if (error.response)
      console.error("🧩 Response:", error.response.status, error.response.data);
  }
}

// ✅ Route test
app.get("/", (_, res) => res.send("🚀 SePay Webhook Server sẵn sàng!"));

// ✅ Start server
const PORT = process.env.PORT || 9090;
app.listen(PORT, () => console.log(`🚀 Webhook server listening on port ${PORT}`));




