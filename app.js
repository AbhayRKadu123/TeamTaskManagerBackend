import express from "express";
import cors from "cors";
import mongoose from "mongoose";
import authRoutes from "./routes/authRoutes.js";
import dotenv from "dotenv";
import privaterouter from "./routes/privateroute.js";
import authMiddleware from "./middlewares/authMiddleware.js";
const app = express();

app.use(cors());
app.use(express.json());
dotenv.config();


app.get("/demo",(req,res)=>{
  res.json({message:"app is running"})
})
// TEST ROUTE
app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "Server is running"
  });
});

app.use("/auth", authRoutes);
app.use("/private",authMiddleware,privaterouter);
// DATABASE CONNECTION
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    console.log("MongoDB Connected");
  })
  .catch((err) => {
    console.log(err);
  });


// SERVER
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});