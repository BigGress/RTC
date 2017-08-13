var http = require("http");
var socket = require("socket.io");
var fs = require("fs");
var path = require("path");
var user = {};

var app = http.createServer(handler);
var io = socket(app);

function handler(req, res) {
    if (req.url.startsWith("/assets")) {
        let type = () => {
            let extName = req.url.split(".")[req.url.split(".").length - 1];
            switch (extName) {
                case "css":
                    return "text/css";
                case "js":
                    return "text/javascript";
                case "html":
                    return "text/html";
                default:
                    return "text/plain";
            }
        }
        // console.log(type())
        if (type() === "application/javascript") {
            res.setHeader("content-encoding", "gzip");
        }
        res.setHeader("Content-Type", type());
        fs.readFile(path.join(__dirname, req.url), function (err, data) {
            if (err) {
                // console.log(err);
            }
            res.writeHead(200);
            res.end(data, "utf-8");
        })
    } else {
        fs.readFile(__dirname + 'assets/index.html',
        function (err, data) {
            if (err) {
            res.writeHead(500);
            return res.end('Error loading index.html');
            }

            res.writeHead(200);
            res.end(data);
        });
    }
}

// 广播用户
function sendUser(socket) {
    socket.broadcast.emit("get users", {users: Object.keys(user)});
}

io.on("connection", function (socket) {
    console.log("连接了")
    socket.emit("news", {hello: "world"});
    // 初始化用户对象
    socket.on("login", function(data) {
        // let user = JSON.parse(data);
        user[data.userId] = {
            socket: socket,
        };

        socket.emit("get users", {users: Object.keys(user)});
        Object.keys(user).forEach(e => {
            if (e != data.userId) {
                user[e].socket.emit("get users", {users: Object.keys(user)});
            }
        })
    })

    // 获取用户描述
    socket.on("token", function(data) {
        user[data.userId].token = data.token;
        sendUser(socket);
    })

    // 获取候选人描述
    socket.on("candidate", function (data) {
        user[data.userId].candidate = data.candidate;
        sendUser(socket);
        // console.log(user)
    })

    // 登出
    socket.on("log out", function(data) {
        delete user[data.userId];
        sendUser(socket);;
    })

    // 获取到用户用户id，后发送用户信息
    socket.on("start communicate", function(data) {
        // var initUserId = data.initUserId;
        var recUserId = data.recUserId;
        user[recUserId].socket.emit("get user info", data);
    })

    // 获取响应数据
    socket.on("send remote token", function(data) {
        var recUserId = data.recUserId;
        console.log(data)
        console.log(Object.keys(user), recUserId);
        console.log(user[recUserId])

        user[recUserId].socket.emit("send remote back", data);
    })
})

app.listen(8000);

console.log(`服务开始在8000`)
