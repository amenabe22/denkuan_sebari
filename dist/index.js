"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const os_1 = __importDefault(require("os"));
const express_1 = __importDefault(require("express"));
const http_1 = __importDefault(require("http"));
const socket_io_1 = require("socket.io");
const multer_1 = __importDefault(require("multer"));
const path_1 = __importDefault(require("path"));
const cors_1 = __importDefault(require("cors"));
const client_1 = require("@prisma/client");
const date_fns_1 = require("date-fns");
const fs = __importStar(require("fs"));
const qrcode = __importStar(require("qrcode"));
const app = (0, express_1.default)();
const server = http_1.default.createServer(app);
const prisma = new client_1.PrismaClient();
const io = new socket_io_1.Server(server, {
    cors: {
        origin: "*",
    },
});
const port = 3000;
app.use((0, cors_1.default)());
app.use(express_1.default.static(path_1.default.join(__dirname, "public")));
app.use("/uploads", express_1.default.static(path_1.default.join(__dirname, "public", "uploads")));
const publicPath = path_1.default.join(__dirname, "public");
const storage = multer_1.default.diskStorage({
    destination: path_1.default.join(publicPath, "uploads"),
    filename: function (req, file, cb) {
        cb(null, file.originalname);
    },
});
const upload = (0, multer_1.default)({ storage });
app.use(express_1.default.static(publicPath));
function getHostIpAddress() {
    const interfaces = os_1.default.networkInterfaces();
    for (const interfaceName in interfaces) {
        const networkInterface = interfaces[interfaceName];
        const wlanInterface = networkInterface.find((network) => network.family === "IPv4" &&
            !network.internal &&
            interfaceName.toLowerCase().includes("wi-fi"));
        if (wlanInterface) {
            return wlanInterface.address;
        }
    }
    return null;
}
function generateQRCode(text, filePath) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const qrCodeBuffer = yield qrcode.toBuffer(text);
            const fileName = "qrcode.png";
            const qrCodePath = path_1.default.join(filePath, fileName);
            fs.writeFileSync(qrCodePath, qrCodeBuffer);
            return fileName;
        }
        catch (error) {
            throw new Error(`Failed to generate QR code: ${error}`);
        }
    });
}
app.post("/upload", upload.single("photo"), (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const file = req.file;
    if (!file) {
        return res.status(400).send("No file uploaded.");
    }
    const fileUrl = req.protocol + "://" + req.get("host") + "/uploads/" + file.filename;
    io.emit("newPhoto", fileUrl);
    yield prisma.photo.create({
        data: {
            filename: file.originalname,
            path: fileUrl,
        },
    });
    res.send({ url: fileUrl });
}));
app.get("/start", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    console.log("duu");
    const hostIp = yield getHostIpAddress();
    const savePath = path_1.default.join(__dirname, "public/uploads");
    if (!hostIp) {
        return res.status(400).json({ error: "Unable to determine host IP" });
    }
    const url = `http://${hostIp}:3000/uploads/qrcode.png`;
    const qrData = { host: hostIp, url: url };
    yield generateQRCode(JSON.stringify(qrData), savePath);
    res.sendFile(path_1.default.join(publicPath, "index.html"));
}));
app.post("/generate-qrcode", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const hostIp = yield getHostIpAddress();
        const savePath = path_1.default.join(__dirname, "public/uploads");
        if (!hostIp) {
            return res.status(400).json({ error: "Unable to determine host IP" });
        }
        const filename = yield generateQRCode(hostIp, savePath);
        const url = `http://${hostIp}:3000/uploads/${filename}`;
        return res.json({ url });
    }
    catch (error) {
        console.log("ERROR: ", error);
        return res.status(500).json({ error: "Failed to generate QR code" });
    }
}));
app.get("/", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    console.log("duu");
    const hostIp = yield getHostIpAddress();
    const savePath = path_1.default.join(__dirname, "public/uploads");
    if (!hostIp) {
        return res.status(400).json({ error: "Unable to determine host IP" });
    }
    yield generateQRCode(hostIp, savePath);
    res.sendFile(path_1.default.join(publicPath, "index.html"));
}));
app.get("/photos", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const today = new Date();
    const startOfToday = (0, date_fns_1.startOfDay)(today);
    const endOfToday = (0, date_fns_1.endOfDay)(today);
    const photos = yield prisma.photo.findMany({
        where: {
            createdAt: {
                gte: startOfToday,
                lt: endOfToday,
            },
        },
        orderBy: {
            createdAt: client_1.SortOrder.desc,
        },
    });
    return res.json(photos);
}));
io.on("connection", (socket) => {
    console.log("User connected.");
});
server.listen(port, "0.0.0.0", () => {
    console.log(`Server listening on port ${port}.`);
});
//# sourceMappingURL=index.js.map