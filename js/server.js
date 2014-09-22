// Подключаем библиотеки websocket 
var WebSocketServer = require('websocket').server;
// http
var http = require('http');
// sys
var sys = require('sys'); 

// вывод путь каталога на сервере
//console.log(__dirname);
// Константы для определения типа сообщений от клиента
var NEW_NAME = -1;
var LINE_SEGMENT = 0;
var CHAT_MESSAGE = 1;
var GAME_LOGIC = 2;
var SAVE_IMAGE = 3;
var GET_IMAGE = 4;
var SET_IMAGE = 5;
var GAME_NEXT = 6;

// Константы для контроля хода игры
var WAITING_TO_START = 0;
var GAME_START = 1;
var GAME_OVER = 2;
var GAME_RESTART = 3;

var history = [ ];
var historyImage = [ ];
var statistic = [ ];
// Номер игрока, чья очередь рисовать(значение по умолчанию)

var wordsList = ['яблоко','будильник','стакан',
'апельсин','автобус',
'Монета','арбуз','Бэтмен','море','вулкан','Вода',
'банан','Пистолет','Франкенштейн','Бублик','Восход',
'Комикс','Дом','Торнадо','Ракета','Вампир','Педагог',
'Поезд','Обезьяна',
'Машина','Зорро',
'Глобус','Трансформер','Пират',
'Микрофон',
'Кольчуга',
'Батарейка',
'Лиса',
'Молния',
'Чебурашка','Победитель','Трактор','Марионетка','Фантомас','Велосипед','Таблетка'];

var currentAnswer = undefined;

var currentGameState = WAITING_TO_START;
var UserID=0;
var gameOverTimeout;

var server = http.createServer(function(request, response) {
    console.log((new Date()) + ' Received request for ' + request.url);
    response.writeHead(404);
    response.end();
});
server.listen(8070, function() {
    console.log("WebSocket сервер запущен.");
	console.log("Транслация проходит на порт 8080.");
});

wsServer = new WebSocketServer({
    httpServer: server,
    autoAcceptConnections: false
});

function originIsAllowed(origin) {
  return true;
}

//var clients = [ ];
var connections = {};
var connectionIDCounter = 0, Num = 0;
console.log(module);
wsServer.on('request', function(request) {
    if (!originIsAllowed(request.origin)) {
      // Проверяем что мы получили только дозволеный оригинальный запрос
      request.reject();
      console.log((new Date()) + ' Соединение от запроса ' + request.origin + ' отклонена.');
      return;
    }

    var connection = request.accept('echo-protocol', request.origin);
	connectionIDCounter = connectionIDCounter+1;
	connection.id = connectionIDCounter;
	console.log(connectionIDCounter);
    connections[connection.id] = connection;
	Num = Num + 1;
	// Даем игроку имя при подключении к серверу
	var UserName = "Игрок"+connection.id;
	//clients[connection.id] = connection;

	var statdata = {};
	statdata.dataType = NEW_NAME;
	statdata.UserID = connection.id;
	statdata.UserName =  UserName;
	connection.send(JSON.stringify(statdata));
	
	var st = {}; 
	st.UserID =  connection.id;
	st.UserName =  UserName;
	st.UserScores = 0;
	st.Game = 0;
	st.Victory = 0;
	statistic.push(st);
	var ms = new Date();
	console.log((ms.toLocaleTimeString()) + ' Connection ID ' + connection.id + ' accepted.'+Num);
	// отправляем новому игроку историю передачи сообщений по LINE_SEGMENT
	if (history.length > 0) {
        connection.sendUTF(JSON.stringify( { dataType: 'history', data: history } ));

    }
	if (historyImage.length > 0) {
		console.log("Отправляем historyImage");
		connection.sendUTF(JSON.stringify( { dataType: 'historyImage', data: historyImage} ));
	}
	if (statistic.length > 0) {
		console.log("Отправляем statistic");
		broadcast(JSON.stringify( { dataType: 'statistic', data: statistic} ));
	}
	
	
	
	var message1 = "Добро пожаловать "+ UserName +". Игроков в чате:"+Num;
	var statdata = {};
	statdata.dataType = CHAT_MESSAGE;
	statdata.message1 = message1;
	wsServer.broadcast(JSON.stringify(statdata));
	
	// отправка сообщения всем игрокам от сервера клиенту о том, что необходимо дождаться подключение другого игрока.
	var Logic = {};
	Logic.dataType = GAME_LOGIC;
	Logic.gameState = WAITING_TO_START;
	wsServer.broadcast(JSON.stringify(Logic));
	// начало игры если более двух игроков ожидают игру
	if (currentGameState == WAITING_TO_START && Num > 1)
	{
		console.log("Запускаем игру");
		startGame(false);
	}
 
    connection.on('message', function(message) {
		try {
            var data = JSON.parse(message.utf8Data);
			if (data.dataType == LINE_SEGMENT) {
				history.push(data);
				
			}else if (data.dataType == SAVE_IMAGE) {
				console.log("Сохраняем historyImage");
				//historyImage.push(data);
			}
        } catch (e) {
            console.log('This doesn\'t look like a valid JSON: ', message.utf8Data);
            return;
        }
		
		if (data.dataType == SAVE_IMAGE) {
			console.log("dataType: "+data.dataType+ " data.imageNumber - " + data.imageNumber);
			var newdata = {};
			newdata.dataType = SAVE_IMAGE;
			newdata.gameState = GAME_OVER;
			newdata.imageUser = data.imageUser;
			newdata.imageNumber = data.imageNumber;
			newdata.image = data.image;
			historyImage.push(newdata);
			
			wsServer.broadcast(JSON.stringify(newdata));
		} else if (data.dataType == GET_IMAGE){
			console.log("dataType: "+data.dataType+ " data.imageNumber - " + data.imageNumber);
			var newdata = {};
			newdata.dataType = GET_IMAGE;
			newdata.imageUser = data.imageUser;
			newdata.imageNumber = data.imageNumber;
			newdata.UserImage = connection.id;
			sendToConnectionId(newdata.imageUser,JSON.stringify(newdata));
		}else if (data.dataType == SET_IMAGE) {
			var newdata = {};
			newdata.dataType = SET_IMAGE;
			newdata.UserImage =data.UserImage;
			newdata.image = data.image;
			sendToConnectionId(data.UserImage,JSON.stringify(newdata));
		} else if (data.dataType == LINE_SEGMENT) {
			wsServer.broadcast(JSON.stringify(data));
		} else if (data.dataType == CHAT_MESSAGE) {
			data.UserName = UserName;
			wsServer.broadcast(JSON.stringify(data));
		}
		// проверка и отправка сообщения об окончании игры если правльный ответ дан
		if (data.dataType == CHAT_MESSAGE) {
			data.UserName = UserName;
			console.log("dataType: "+data.message1+" Тип "+data.dataType +" "+currentAnswer+" "+currentGameState);
			if (currentGameState == GAME_START && data.message1.toUpperCase() == currentAnswer.toUpperCase())
			{
				
				var Logic = {};
				Logic.dataType = GAME_LOGIC;
				Logic.gameState = GAME_OVER;
				Logic.winner = UserName;
				Logic.UserID = connection.id;
				Logic.answer = currentAnswer;
				Logic.UserScores = data.UserScores + 1;
				console.log("Message: ",JSON.stringify(Logic));
				if (data.UserScores !== 'null')
					statistic[connection.id-1].UserScores = data.UserScores + 1;
					
				if (Logic.UserScores ==3){
					statistic[connection.id-1].Victory = statistic[connection.id-1].Victory+1;
					Object.keys(connections).forEach(function(key) {
						var connection = connections[key];
						if (connection.connected) {
							statistic[key-1].Game =statistic[key-1].Game  + 1;
						}
					});
				}
				broadcast((JSON.stringify( { dataType: 'statistic', data: statistic} )));
				wsServer.broadcast(JSON.stringify(Logic));
				
				currentGameState = WAITING_TO_START;
				
				// очищаем игру после окончания времени
				console.log("Очищаем игру ",Logic.UserScores);
				clearTimeout(gameOverTimeout);
			}
		} 
			
		if (data.dataType == GAME_LOGIC && data.gameState == GAME_NEXT) {
			if (data.UserID == connection.id){
				console.log("Очищаем игру GAME_NEXT");
				clearTimeout(gameOverTimeout);
				startGame(data.clearScores);
				// очищаем всю историю игры		
				history.length = 0;
			}
		}
		if (data.dataType == GAME_LOGIC && data.gameState == GAME_RESTART){
		
			console.log("Очищаем игру GAME_RESTART");
			startGame(false);
		}
		
    });
	
	
    connection.on('close', function(reasonCode, description) {
		console.log((ms.toLocaleTimeString()) + ' Peer ' + connection.remoteAddress + ' disconnected. ' +
                    "Connection ID: " + connection.id);
		delete connections[connection.id];
		//delete clients[connection.id];
		//statistic.splice(connection.id);
		//delete statistic.statdata[connection.i].UserID;
		delete statistic[connection.id-1].UserID;
		broadcast((JSON.stringify( { dataType: 'statistic', data: statistic} )));
		Num = Num - 1;
		var message1 = "Вышел "+ UserName +". Игроков в чате:"+Num;
		var statdata = {};
		statdata.dataType = CHAT_MESSAGE;
		statdata.message1 = message1;
		wsServer.broadcast(JSON.stringify(statdata));
		var Logic = {};
		Logic.dataType = GAME_LOGIC;
		Logic.gameState = WAITING_TO_START;
		Logic.isPlayerTurn = false;
		wsServer.broadcast(JSON.stringify(Logic));

    });
	
	
	connection.on('error', function(reasonCode, description) {
        console.log((ms.toLocaleTimeString()) + ' Error ' + connection.remoteAddress + ' disconnected.');
    });
});
	
function startGame(clearScores) {
	//clearTimeout(gameOverTimeout);
	// создаем массив и помещаем всех кто подключен к серверу в него.
	var array = [];
	Object.keys(connections).forEach(function(key) {
        var connection = connections[key];
        if (connection.connected) {
            //connection.send(data);
			console.log(key+"- key\n");
			array.push(key);
        }
    });
	
	//console.log(array+"- array\n");
	// случайным образом определяем ключ одного игрока
	var newkey = Math.floor( Math.random() * array.length );
	// и выбираем его из массива
	var GamerTurn = array[newkey];
	console.log(GamerTurn+"- номер подключенного игрока\n");
	
	// также как игрока выбираем слово для следующей игры
	var answerIndex = Math.floor(Math.random() * wordsList.length);
	currentAnswer = wordsList[answerIndex];
	
	// начало игры для всех игроков
	var Logic1 = {};
	console.log("начало игры для всех игроков");
	Logic1.dataType = GAME_LOGIC;
	Logic1.gameState = GAME_START;
	Logic1.GamerTurn = GamerTurn;
	Logic1.isPlayerTurn = false;
	Logic1.clearScores = clearScores;
	console.log(clearScores);
	wsServer.broadcast(JSON.stringify(Logic1));
	
	//Даем управление выбранному игроку и задаем ему слово в answer
	console.log("Даем управление выбранному игроку и задаем ему слово в "+currentAnswer);
	var Logic2 = {};
	Logic2.dataType = GAME_LOGIC;
	Logic2.gameState = GAME_START;
	Logic2.GamerTurn = GamerTurn;
	Logic2.answer = currentAnswer;
	Logic2.isPlayerTurn = true;
	sendToConnectionId(GamerTurn,JSON.stringify(Logic2));

	
	
	// окончаниие игры 
	gameOverTimeout = setTimeout(function(){
		// очищаем историю
		var Logic = {};
		Logic.dataType = GAME_LOGIC;
		Logic.gameState = GAME_OVER;
		Logic.isPlayerTurn = false;
		Logic.UserID = GamerTurn;
		Logic.winner = " никто";
		Logic.answer = currentAnswer;
		wsServer.broadcast(JSON.stringify(Logic));
		currentGameState = WAITING_TO_START;
	},60*2000);

	currentGameState = GAME_START;
};

function get_random_color() {
    var letters = '0123456789ABCDEF'.split('');
    var color = '#';
    for (var i = 0; i < 6; i++ ) {
        color += letters[Math.round(Math.random() * 15)];
    }
    return color;
};

function broadcast(data) {
    Object.keys(connections).forEach(function(key) {
        var connection = connections[key];
        if (connection.connected) {
            connection.send(data);
        }
    });
};

function sendToConnectionId(connectionID, data) {
    var connection = connections[connectionID];
    if (connection && connection.connected) {
        connection.send(data);
    }
};

