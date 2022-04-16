//Connection
var socket = io.connect("http://localhost:3000");

var userName = document.querySelector("#name");
var button = document.querySelector("#send");
var fuck = document.querySelector("#fuck");

var message = document.querySelector("#message");
var send = document.querySelector("#sendMessage");
var messageArea = document.querySelector("#msgArea");

var typing = document.querySelector("#msgtyping");

var leave = document.querySelector(".leave");
var restart = document.querySelector(".restart");
var eliminate = document.querySelector(".eliminate");

button.addEventListener("click", () => {
  socket.emit("joinRoom", {
    roomId: "0142f610-d5ae-484c-a5e0-0b59c8abc214",
    userId: "123",
  });
});
leave.addEventListener("click", () => {
  console.log("it");
  var user = {
    name: "aptal",
    id: "1",
  };
  socket.emit("leave", {
    userInfo: user,
    roomId: "0142f610-d5ae-484c-a5e0-0b59c8abc214",
  });
});

eliminate.addEventListener("click", () => {
  postData("http://localhost:3000/timeUp", {
    roomId: "7a2f7fda-4362-446a-a258-28f5556a8162",
  }).then((data) => {
    console.log(data); // JSON data parsed by `data.json()` call
  });
});

restart.addEventListener("click", () => {
  postData("http://localhost:3000/restartGame", {
    roomId: "7a2f7fda-4362-446a-a258-28f5556a8162",
  }).then((data) => {
    console.log(data); // JSON data parsed by `data.json()` call
  });
});

async function postData(url = "", data = {}) {
  var bearer =
    "Bearer " +
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJhdmF0YXJJZCI6MiwibmFtZSI6IjIiLCJsYW5ndWFnZSI6IjIiLCJpZCI6IjIiLCJkYXRlIjoxNjUwMTEyMzMxODAzLCJpYXQiOjE2NTAxMTIzMzF9.IrDw5uDqtTZmCgpZc5OKX_JHyD8hPgdRos6WHkxMh6U";
  const response = await fetch(url, {
    method: "POST", // *GET, POST, PUT, DELETE, etc.
    mode: "cors", // no-cors, *cors, same-origin
    cache: "no-cache", // *default, no-cache, reload, force-cache, only-if-cached
    credentials: "same-origin", // include, *same-origin, omit
    headers: {
      "Content-Type": "application/json",
      Authorization: bearer,
    },
    redirect: "follow", // manual, *follow, error
    referrerPolicy: "no-referrer", // no-referrer, *no-referrer-when-downgrade, origin, origin-when-cross-origin, same-origin, strict-origin, strict-origin-when-cross-origin, unsafe-url
    body: JSON.stringify(data), // body data type must match "Content-Type" header
  });
  return response.json(); // parses JSON response into native JavaScript objects
}

socket.on("gameMessage", (data) => {
  console.log(data);
  typing.innerHTML = "";
  messageArea.innerHTML += `
        <p><bold>${data.message.action_type}:</bold>${data.message.message}</p>
        <p>TURN ID:${data.nextUserId}</p>
        <p>TURN INDEX:${data.nextUserIndex}</p>
    `;
});
socket.on("join", (data) => {
  console.log(data);
  messageArea.innerHTML += `
                <p><bold>${data.userId}:</bold>Katıldı.</p>
            `;
});
socket.on("leave", (data) => {
  console.log(data);
  messageArea.innerHTML += `
            <p><bold>${data.message.userInfo.name}:</bold>Ayrıldı.</p>
        `;
});

send.addEventListener("click", () => {
  console.log("joinRoom");
  socket.emit("gameMessage", {
    action_type: "MESSAGE",
    message: message.value,
    roomId: "0142f610-d5ae-484c-a5e0-0b59c8abc214",
  });
});
