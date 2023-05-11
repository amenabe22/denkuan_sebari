import express, { json } from "express";
import http from "http";
import { Server } from "socket.io";
import multer from "multer";
import path from "path";
import cors from "cors";
import { PrismaClient, SortOrder } from "@prisma/client";
import { startOfDay, endOfDay } from "date-fns";

const app = express();
const server = http.createServer(app);
const prisma = new PrismaClient();

const io = new Server(server, {
  cors: {
    origin: "*",
  },
});

const port = 3000;

app.use(cors());
app.use(express.static(path.join(__dirname, "public")));
app.use("/uploads", express.static(path.join(__dirname, "public", "uploads")));

const publicPath = path.join(__dirname, "public");

const storage = multer.diskStorage({
  destination: path.join(publicPath, "uploads"),
  filename: function (req, file, cb) {
    cb(null, file.originalname);
  },
});

const upload = multer({ storage });

// Use the public directory to serve static files
app.use(express.static(publicPath));

app.post("/upload", upload.single("photo"), async (req, res) => {
  const file = req.file;
  if (!file) {
    return res.status(400).send("No file uploaded.");
  }
  const fileUrl =
    req.protocol + "://" + req.get("host") + "/uploads/" + file.filename;
  io.emit("newPhoto", fileUrl);
  await prisma.photo.create({
    data: {
      filename: file.originalname,
      path: fileUrl,
    },
  });
  res.send({ url: fileUrl });
});

// Serve index.html as the root page
app.get("/", (req, res) => {
  res.sendFile(path.join(publicPath, "index.html"));
});

app.get("/photos", async (req, res) => {
  const today = new Date();
  const startOfToday = startOfDay(today);
  const endOfToday = endOfDay(today);
  const photos = await prisma.photo.findMany({
    where: {
      createdAt: {
        gte: startOfToday,
        lt: endOfToday,
      },
    },
    orderBy: {
      createdAt: SortOrder.desc,
    },
  });
  return res.json(photos);
});

io.on("connection", (socket) => {
  console.log("User connected.");
});

server.listen(port, "0.0.0.0", () => {
  console.log(`Server listening on port ${port}.`);
});
