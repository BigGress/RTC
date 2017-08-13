(() => {
    var socket = io("http://localhost:8000");
    var userId = Date.now();
    var textarea = document.querySelector(".input-message");
    var messageList = document.querySelector(".message-list");
    var usersDom = document.querySelector(".user-list");
    var users;
    var sendData = {
       initUserId: userId,
    };
    var FromUser = {};

    window.RTCConnection = new RTCPeerConnection(null, null);
    var sendChannel = RTCConnection.createDataChannel("sendDataChannel", null);
    console.log("123")
    socket.emit("login", {userId: userId});
    socket.on("get users", function (data) {
        users = data.users;
        console.log(users);
        renderUsers();
    })
    socket.on("get user info", function (data) {
        console.log(data);
        if (data.token) {
            console.log(data.token instanceof String ? JSON.parse(data.token) : data.token);
            setRemoteDesc(data.token instanceof String ? JSON.parse(data.token) : data.token);
        }
        if (data.candidate) {
            addIceCandidate(data.candidate instanceof String ? JSON.parse(data.candidate) : data.candidate);


            createAnswer(data.initUserId);
        }
    })

    window.socket = socket;
    // 渲染用户列表
    function renderUsers() {
        var html = ``;
        users.forEach(e => {
            if (e != userId) {
                html += `<li><h5>${e}</h5></li>`;
            }
        })

        usersDom.innerHTML = html;

        return html;
    }

    usersDom.addEventListener("click", (event) => {
        var dom = event.target;
        sendData.recUserId = dom.innerText.replace("\n", "");
        console.log(sendData)

        if (!sendData.token) {
            RTCConnection.onicecandidate = (event) => {
                if (event.candidate) {
                    sendData.candidate = event.candidate
                    RTCConnection.onicecandidate = undefined;
                    socket.emit("start communicate", Object.assign(sendData));
                    // console.log(2)
                }
            }
            
            RTCConnection.createOffer().then((desc) => {
                RTCConnection.setLocalDescription(desc);

                sendData.token = desc;
                // console.log(1)
            });
        } else {
            socket.emit("start communicate", Object.assign(sendData));
        }


        socket.once("send remote back", function(data) {
            console.log(data)
            if (data.token) {
                setRemoteDesc(JSON.parse(data.token))
            }

            if (data.candidate) {
                addIceCandidate(JSON.parse(data.candidate));
                RTCConnection.createOffer().then(desc => {
                    console.log("最后的连接")
                })
            }
        });

        setChannel();
    })

    window.onbeforeunload = function () {
        socket.emit("log out", {userId: userId});
    }

    /**
     * 生成响应
     * 
     * @param {any} toUserId 
     */
    function createAnswer(toUserId) {
        var descData;
        RTCConnection.onicecandidate = (event) => {
            if (event.candidate) {
                console.log(descData);
                socket.emit("send remote token", {
                    initUserId: userId,
                    recUserId: toUserId,
                    token: JSON.stringify(descData),
                    candidate: JSON.stringify(event.candidate),
                })

                RTCConnection.onicecandidate = undefined;
            }

            console.log(3)
        }
        RTCConnection.createAnswer().then(desc => {
            RTCConnection.setLocalDescription(desc);
            descData = desc;
            console.log(4)
        });
        setChannel();
    }

    function setChannel() {
        RTCConnection.ondatachannel = function(event) {
            var channel = event.channel;
            channel.onmessage = function(event) {
                console.log("我获得到数据了");
                console.log(event);
                setMessage(JSON.parse(event.data));
            }
        }
    }

    function setMessage(data) {
        var now = new Date();
        var data = data;
        var html = `
            <li>
                <label>${data.user} ${now.getFullYear()}-${now.getMonth()}-${now.getDate()} ${now.getHours()}:${now.getMinutes()}:${now.getSeconds()}</label>
                <p>${data.message}</p>
            </li>
        `;
        messageList.innerHTML += html ;
    }

    function setRemoteDesc(desc) {
        RTCConnection.setRemoteDescription(desc);
    }
    
    function addIceCandidate(candidate) {
        RTCConnection.addIceCandidate(candidate)
            .then(() => {
                console.log(`添加一个candidate`);
            }, (err) => {
                console.error(`添加candidate 失败了`);

                console.error(err)
            })
    }

    textarea.addEventListener("keyup", function (event) {
        if (event.keyCode === 13) {
            var sendMessageObj = JSON.stringify({
                user: userId,
                message: textarea.value
            });
            setMessage(JSON.parse(sendMessageObj))
            sendChannel.send(sendMessageObj);
        }
    })
})()