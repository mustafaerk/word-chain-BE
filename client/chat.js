//Connection
var socket = io.connect("http://localhost:3001");

var userName = document.querySelector("#name");
var button = document.querySelector("#join");
var fuck = document.querySelector("#fuck");

var message = document.querySelector("#message");
var send = document.querySelector("#sendMessage");
var messageArea = document.querySelector("#msgArea");

var typing = document.querySelector("#msgtyping");

var leave = document.querySelector(".leave");
var start = document.querySelector("#start");
var restart = document.querySelector(".restart");
var eliminate = document.querySelector(".eliminate");

let user = {
  name: "AYRILDIM",
  id: "e5b60e92-3c2f-4bd5610easad",
  isEliminated: false,
  language: "tr",
  userAvatarId: 8,
  point: 15,
};

start.addEventListener("click" , () =>{
  socket.emit("createRoom", {
    room: {
      roomAvatarId: 1,
      roomSize: 8,
      roomName: "sasa's Room",
      isPublic: true,
      isActive: true,
      isStarted: false,
    },
   user
  });
  socket.emit("start");
})

send.addEventListener("click", () => {
  user.id=message.value;
  socket.emit("join",{
    roomId:"af438098-f100-4977-9e54-45a90155dc1c",
    user
  });

  // socket.emit("reconnect", {
  //   roomId: "5c707893-02b9-40f1-abfb-bb603daffde2",
  // });

  // socket.emit("gameMessage", {
  //   action_type: "MESSAGE",
  //   message: message.value,
  //   roomId: "1ee890d4-9bb3-4591-9cf7-041549bd65f3",
  // });
});
// join.addEventListener("click", () => {
  //   socket.emit("join", {
    //     roomId: "1ee890d4-9bb3-4591-9cf7-041549bd65f3",
    //     user: { avatarId: "1", name: "hebele", id: "123" },
    //   });
    // });
    


leave.addEventListener("click", () => {
  socket.emit("leave", "");
});

eliminate.addEventListener("click", () => {
  socket.emit("leave");
});

restart.addEventListener("click", () => {
  socket.emit("timeUp");
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
                <p><bold>${data.userId}:</bold>Kat??ld??.</p>
            `;
});
socket.on("leave", (data) => {
  console.log(data);
  messageArea.innerHTML += `
            <p><bold>${data.message.userInfo.name}:</bold>Ayr??ld??.</p>
        `;
});

socket.on("eliminate", (data) =>{
  console.log(data,"Eliminated");
})
socket.on("winner", (data) =>{
  console.log(data,"Winner");
})
socket.on("finish", (data) =>{
  console.log(data,"finished");
})

socket.on("notJoined", (data) => {
  console.log(data);
});
socket.on("room", (room) => {
  console.log({ room });
  //REDUX NEW ROOM
  //NAVIGATE TO ROOM
});

/* NAVIGATE ROOM FUNC{
  if(!redux.room)return false;
    socket.emit("join", { roomId: room.roomId, user });
}*/ 

socket.on("createdRoom", (room) => {
  console.log({ room });
});

