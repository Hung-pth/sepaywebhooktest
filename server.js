import express from "express";
import dotenv from "dotenv";

dotenv.config();
const app = express();
app.use(express.json());

// ✅ Route test webhook SePay
app.post("/api/sepay/webhook", (req, res) => {
  console.log("📩 Webhook nhận được:", req.body);

  if (req.body.status === "success") {
    const { description, amount } = req.body;
    console.log(`✅ Thanh toán thành công: ${description} - ${amount}đ`);
  }

  res.status(200).json({ message: "OK" });
});

// Route kiểm tra
app.get("/", (req, res) => {
  res.send("🚀 SePay Webhook Server đang chạy ngon lành!");
});

const PORT = process.env.PORT || 9090;
app.listen(PORT, () => {
  console.log(`🚀 Server đang chạy ở port ${PORT}`);
});
