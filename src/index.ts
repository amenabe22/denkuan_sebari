import os from "os";
import express, { json } from "express";
import http from "http";
import { Server } from "socket.io";
import multer from "multer";
import path from "path";
import cors from "cors";
import { PrismaClient, SortOrder } from "@prisma/client";
import { startOfDay, endOfDay } from "date-fns";
import * as fs from "fs";
import * as qrcode from "qrcode";

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

function getHostIpAddress() {
  const interfaces = os.networkInterfaces();

  for (const interfaceName in interfaces) {
    const networkInterface: any = interfaces[interfaceName];

    // Filter by interface type (e.g., 'WLAN', 'Wi-Fi')
    const wlanInterface = networkInterface.find(
      (network: any) =>
        network.family === "IPv4" &&
        !network.internal &&
        interfaceName.toLowerCase().includes("wi-fi")
    );

    if (wlanInterface) {
      return wlanInterface.address;
    }
  }

  return null;
}

// generate QR-Code
async function generateQRCode(text: string, filePath: string): Promise<string> {
  try {
    // Generate QR code
    const qrCodeBuffer = await qrcode.toBuffer(text);

    // Save QR code to file
    const fileName = "qrcode.png";
    const qrCodePath = path.join(filePath, fileName);
    fs.writeFileSync(qrCodePath, qrCodeBuffer);

    // Return URL of the saved QR code
    // const url = `http://example.com/${fileName}`;
    return fileName;
  } catch (error) {
    throw new Error(`Failed to generate QR code: ${error}`);
  }
}

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
app.get("/start", async (req, res) => {
  console.log("duu");
  const hostIp = await getHostIpAddress(); // Extract the client's IP address from the request
  const savePath = path.join(__dirname, "public/uploads");

  if (!hostIp) {
    return res.status(400).json({ error: "Unable to determine host IP" });
  }

  await generateQRCode(hostIp, savePath);

  res.sendFile(path.join(publicPath, "index.html"));
});

app.post("/generate-qrcode", async (req, res) => {
  try {
    const hostIp = await getHostIpAddress(); // Extract the client's IP address from the request
    const savePath = path.join(__dirname, "public/uploads");

    if (!hostIp) {
      return res.status(400).json({ error: "Unable to determine host IP" });
    }

    const filename = await generateQRCode(hostIp, savePath);
    const url = `http://${hostIp}:3000/uploads/${filename}`;

    return res.json({ url });
  } catch (error) {
    console.log("ERROR: ", error);
    return res.status(500).json({ error: "Failed to generate QR code" });
  }
});
// Serve index.html as the root page
app.get("/", async (req, res) => {
  console.log("duu");
  const hostIp = await getHostIpAddress(); // Extract the client's IP address from the request
  const savePath = path.join(__dirname, "public/uploads");

  if (!hostIp) {
    return res.status(400).json({ error: "Unable to determine host IP" });
  }

  await generateQRCode(hostIp, savePath);

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
