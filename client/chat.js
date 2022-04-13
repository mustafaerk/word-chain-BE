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

button.addEventListener("click", function () {
  socket.emit("joinRoom", {
    roomId: "0142f610-d5ae-484c-a5e0-0b59c8abc214",
    userId: "123",
  });
});
leave.addEventListener("click", function () {
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

socket.on("gameMessage", function (data) {
  console.log(data);
  typing.innerHTML = "";
  messageArea.innerHTML += `
        <p><bold>${data.message.action_type}:</bold>${data.message.message}</p>
    `;
});
socket.on("join", function (data) {
  console.log(data);
  messageArea.innerHTML += `
                <p><bold>${data.userId}:</bold>Katıldı.</p>
            `;
});
socket.on("leave", function (data) {
  console.log(data);
  messageArea.innerHTML += `
            <p><bold>${data.message.userInfo.name}:</bold>Ayrıldı.</p>
        `;
});

send.addEventListener("click", function () {
  console.log("joinRoom");
  socket.emit("gameMessage", {
    action_type: "MESSAGE",
    message: message.value,
    roomId: "0142f610-d5ae-484c-a5e0-0b59c8abc214",
  });
});

/*message.addEventListener("keypress",function(){
    socket.emit('typing',{
        user: userName.value
    });
});

send.addEventListener("click",function(){
    socket.emit('chat',{
        user: userName.value,
        message: message.value
    });
    message.value="";
});

socket.on('matching',function(data){
    if(data=='Wait'){
        fuck.innerHTML=`
        <h1>STILL WAITING FOR MATCHING</h1>
        `;
    }
    else{
        fuck.innerHTML=`
            <h1>player1:</h1>${data.player1}
            <h1>player2:</h1>${data.player2}
            <h1>Room:</h1>${data.roomId}
        `;
    }
   
});

socket.on('chat',function(data){
    console.log(data.user);
    typing.innerHTML="";
    messageArea.innerHTML+=`
        <p><bold>${data.user}:</bold>${data.message}</p>
    `;
});

socket.on('typing',function(data){
    console.log(data.user);
    typing.innerHTML=`
        <p><bold>${data.user}</bold> is typing</p>
    `;
});*/
