"use strict";
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
const express_1 = __importDefault(require("express"));
const http_1 = __importDefault(require("http"));
const socket_io_1 = require("socket.io");
const multer_1 = __importDefault(require("multer"));
const path_1 = __importDefault(require("path"));
const cors_1 = __importDefault(require("cors"));
const client_1 = require("@prisma/client");
const date_fns_1 = require("date-fns");
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
app.get("/", (req, res) => {
    res.sendFile(path_1.default.join(publicPath, "index.html"));
});
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