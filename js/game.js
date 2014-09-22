var Game = {
	// Константы для определения типа сообщений от клиента
	NEW_NAME : -1,
	LINE_SEGMENT : 0,
	CHAT_MESSAGE : 1,
	GAME_LOGIC : 2,
	SAVE_IMAGE : 3,
	GET_IMAGE : 4,
	SET_IMAGE : 5,
	GAME_NEXT : 6,
	// Константы для контроля хода игры
	WAITING_TO_START : 0,
	GAME_START: 1,
	GAME_OVER : 2,
	GAME_RESTART : 3,
	
	
	// подключение констант если кто-то из игроков рисует.
	isDrawing : false,
	yourTurnToDraw : false,
	
	// Начальные точки следующей линии рисования
	startX : 0,
	startY : 0,
	size: 2
};

var UserName = undefined;
var UserScores = 0;
var User = undefined;
var Images = [];
var NumberImage = 0;
var getColor = false;
var canvas3 = document.getElementById('drawing-none');
var ctx3 = canvas3.getContext('2d'); 
var canvas = document.getElementById('drawing-pad'); 
var ctx = canvas.getContext('2d');

var thecolor = "#000000",tempcolor ="#000000";

var bCanPreview = true; 

// создаем привязку к холсту выбора цвета
var canvas1 = document.getElementById('picker');
var ctx1 = canvas1.getContext('2d');

// подгрузка картинки после события onload
var image = new Image();
image.onload = function () {
	ctx1.drawImage(image, 0, 0, image.width, image.height); // рисование цветовой палитры на холсте выбора
}

// установка схемы палитры
var imageSrc = 'images/colorwheel1.png';
    image.src = imageSrc;
	
$(function(){
	// проверка поддержки браузером webSocket
	if (window["WebSocket"]) {
		// создаем подключение к сервереу WebSocket
		//Game.socket = new WebSocket("ws://127.0.0.1:8080");
		Game.socket =  new WebSocket("ws://10.255.0.249:8070/","echo-protocol");
		
		// событие когда присоединился новый игрок
		Game.socket.onopen = function(connection) {
			console.log('WebSocket соединение установлено.');
		};
		$("#chat-history").val("");
		// событие когда пришло новое сообщение от сервера
		Game.socket.onmessage = function(connection) {
		
			var data = JSON.parse(connection.data);
			if (data.dataType == Game.NEW_NAME){
				UserName = data.UserName;
				UserID = data.UserID;
			}
			if (data.dataType == Game.CHAT_MESSAGE) {
			
				if (data.UserName!==undefined){
					data.message1 = data.UserName+":"+data.message1;
				}
				$("#chat-history").val(data.message1+"\n" +$("#chat-history").val());
			
			} else if (data.dataType == Game.LINE_SEGMENT){
				drawLine(ctx, data.startX, data.startY, data.endX, data.endY, data.size, data.colorXY);
			
			} else if (data.dataType == Game.SAVE_IMAGE){
				 for (var i=4;i>1;i--){
					var temp = i-1;
					$('#Image'+i).attr('src', $("#Image"+temp).attr('src'));
					$('#Image'+i).attr('number',$("#Image"+temp).attr('number'));
					$('#Image'+i).attr('user',$("#Image"+temp).attr('user'));
				 };
				 $("#Image1").attr('src',data.image);
				 $('#Image1').attr('number',data.imageNumber);
				 $('#Image1').attr('user',data.imageUser);
				 //передать параметры изображения на сервер
			} else if (data.dataType == Game.GET_IMAGE){
				//console.log(UserID+" "+data.imageUser);
				var Images = localStorage.Images ? JSON.parse(localStorage.Images) : [];
				// выбираем рисунок из локального хранилища и отправляем по запросу другого игрока
				setImage(Images[data.imageNumber],data.UserImage);
			}else if (data.dataType == Game.SET_IMAGE){
			
				var canvas10 = document.getElementById('drawing-pad'); 
				var ctx10 = canvas10.getContext('2d');
				var img = new Image();
				img.onload = function(){
					//очищаем холст
					canvas10.width = img.width;
					ctx10.drawImage(img, 0, 0, img.width, img.height);
				}
				img.src = data.image;
			
			} else if (data.dataType == Game.GAME_LOGIC){	
				if (data.gameState == Game.GAME_OVER){
					if (Game.yourTurnToDraw){
						// сохранение рисунка у того кто рисовал
						sendImage();
					}
					Game.yourTurnToDraw = false;
					
					$("#chat-history").val("В этом раунде, победил "+data.winner+"! Правильный ответ '"+data.answer+"'\n" +$("#chat-history").val());
					$("#restart").show();
					
					$("#chat-history").val("Следующий раунд игры!\n" +$("#chat-history").val());
					
					var logic1 = {};
					logic1.dataType = Game.GAME_LOGIC;
					logic1.gameState = Game.GAME_NEXT;
					logic1.UserID = data.UserID;
					logic1.clearScores = false;
					if (data.UserID == UserID) {
						UserScores = data.UserScores;
						console.log("У вас "+UserScores ," баллов");
						if (UserScores > 2){
							//После окончание игры нужно отправить угодавшему игроку
							logic1.clearScores = true;
							var data = {};
							data.dataType = Game.CHAT_MESSAGE;
							data.message1  ="Победитель!\n";
							Game.socket.send(JSON.stringify(data));
						} 
					}
					Game.socket.send(JSON.stringify(logic1));
					console.log("UserID - "+data.UserID," score:"+data.UserScores);					
				} else if (data.gameState == Game.GAME_START){	

					if (data.clearScores){
						UserScores = 0;
						$("#chat-history").val("Новая игра и новый раунд игры поехали ...\n" +$("#chat-history").val());
					}
					// очистка холста для рисования
					canvas.width = canvas.width;
				
					// прячем кнопку рестарт
					$("#restart").hide();
					
					if (data.isPlayerTurn){
						Game.yourTurnToDraw = true;
						$("#chat-history").val("Нарисуйте '"+data.answer+"'\n"+$("#chat-history").val());
					} else { 
						if (data.GamerTurn != UserID){
						$("#chat-history").val("Новая игра, угадайте что рисует игрок?\n" +$("#chat-history").val());
						}
					}
				}
			}  else if (data.dataType === 'history') { 
			
				$("#restart").show();
				for (var i=0; i < data.data.length; i++) {
					drawLine(ctx, data.data[i].startX, data.data[i].startY, data.data[i].endX, data.data[i].endY, data.data[i].size, data.data[i].colorXY)
				}
			} else if (data.dataType === 'historyImage') { 

				$("#restart").show();
				var temp = 1;
				for (var i=data.data.length-1; i >= data.data.length-4; i--) {
					 $("#Image"+temp).attr('src',data.data[i].image);
					 $('#Image'+temp).attr('number',data.data[i].imageNumber);
					 $('#Image'+temp).attr('user',data.data[i].imageUser);
					 temp = temp+1;
				 };
				
				
				
			} else if (data.dataType === 'statistic') {
				console.log('statistic обновляем');
				$(".Hello").remove();
				for (var i=0; i < data.data.length; i++) {
				//console.log(data.data.length);
				if (data.data[i].UserID !== 'null') {
					if (data.data[i].UserID !== undefined) {
					$(".listusers").append("<a href='#' class='Hello' title='Игрок"+data.data[i].UserID
					+" Очков "+data.data[i].UserScores
					+" Игр "+data.data[i].Game
					+" Побед "+data.data[i].Victory
					+"' >"+data.data[i].UserName+"</a>\n");
					}
				}
				}
				
				
			}
		
		};
		
		// событие закрытия подключения
		Game.socket.onclose = function(connection) {
			console.log('WebSocket соединение закрыто');
		};		
	} else {
		alert('WebSocket не поддерживается');
	};
	
	$("#send").click(sendMessage);
	$("#buttonSaveImage").click(function(e){
		sendImage();
	});
	// размер курсора для рисования
	$("#slider1").change(function(){    
	  if (this.sliderTimeour) clearTimeout(this.sliderTimeour);
	  this.sliderTimeour = setTimeout(function(){
		console.log($('#slider1').val())
		Game.size = $('#slider1').val();
	  },10);
	});
	
	$("#tool3").click(function(event){
		tempcolor = thecolor;
		thecolor = "#f3f4f6";
	});
	$("#tool2").click(function(event){
		thecolor = tempcolor;
	});
	$("#tool6").click(function(event){
		getColor = true;

	});
	$("#chat-input").keypress(function(event) {  
		if (event.keyCode == '13') {  
			sendMessage();  
		}  
	});
	
	$("#hexVal").keypress(function(event) {  
		if (event.keyCode == '13') {  
			thecolor = $('#hexVal').val();
			$('#tool1').css('backgroundColor', thecolor);
		}  
	});

	$("#restart").click(function(){
		canvas.width = canvas.width;
		$("#chat-history").val("Перезагрузка игры!\n" +$("#chat-history").val());
		var data = {};
		data.dataType = Game.GAME_LOGIC;
		data.gameState = Game.GAME_RESTART;
		Game.socket.send(JSON.stringify(data));
		
		$("#restart").hide();
	});
	
	$("#drawing-pad").click(function(e) {
		$("#drawing-pad").css({'cursor':'none'});
		// Разрешаем рисование если очеред игрока
    	if (Game.yourTurnToDraw && Game.isDrawing) {
		
			var mouseX = e.layerX || 0;
			var mouseY = e.layerY || 0;
			
			// рисование по x и y на холсте в соответвиии с координатмаи от лева и вниз
			drawLine(ctx,mouseX+1,mouseY+1,mouseX,mouseY,Game.size,thecolor);
			
			// Отправка нарисованных данных на сервер
			var data = {};
			data.dataType = Game.LINE_SEGMENT;
			data.startX = mouseX+1;
			data.startY = mouseY+1;
			data.endX = mouseX;
			data.endY = mouseY;
			data.size = Game.size;
			data.colorXY  = thecolor;
			Game.socket.send(JSON.stringify(data));
			Game.startX = mouseX;
			Game.startY = mouseY;
		}
		
		
		if (getColor){
			//console.log(getColor);
			getColor = false;
			var canvasOffset = $(canvas).offset();
            var canvasX = Math.floor(e.pageX - canvasOffset.left);
            var canvasY = Math.floor(e.pageY - canvasOffset.top);

            // установка и перевод пикселя в цвет
            var imageData = ctx.getImageData(canvasX, canvasY, 1, 1);
            var pixel = imageData.data;

            // Изменить значения полей с цветами
            $('#rVal').val(pixel[0]);
            $('#gVal').val(pixel[1]);
            $('#bVal').val(pixel[2]);
            $('#rgbVal').val(pixel[0]+','+pixel[1]+','+pixel[2]);

            var dColor = pixel[2] + 256 * pixel[1] + 65536 * pixel[0];
			thecolor = '#' + ('0000' + dColor.toString(16)).substr(-6);
		}
		
    });
	
	// Логика рисования на холсте 
	$("#drawing-pad").mousedown(function(e) {
		// рисование по x и y на холсте в соответвиии с координатмаи от лева и вниз
    	var mouseX = e.layerX || 0;
    	var mouseY = e.layerY || 0;
		Game.startX = mouseX;
		Game.startY = mouseY;
		Game.isDrawing = true;
    });
    
    // рисуем линию в момент зажали ЛКМ
    $("#drawing-pad").mousemove(function(e) {
		$("#drawing-pad").css({'cursor':'crosshair'});
		// Разрешаем рисование если очеред игрока
    	if (Game.yourTurnToDraw && Game.isDrawing) {
			// рисование по x и y на холсте в соответвиии с координатмаи от лева и вниз
	    	var mouseX = e.layerX || 0;
	    	var mouseY = e.layerY || 0;
			
			if (!(mouseX == Game.startX && mouseY == Game.startY))
			{				
				drawLine(ctx,Game.startX,Game.startY,mouseX,mouseY,Game.size,thecolor);
				
				// Отправка нарисованных данных на сервер
				var data = {};
				data.dataType = Game.LINE_SEGMENT;
				data.startX = Game.startX;
				data.startY = Game.startY;
				data.endX = mouseX;
				data.endY = mouseY;
				data.colorXY  = thecolor;
				data.size = Game.size;
				Game.socket.send(JSON.stringify(data));
				
				Game.startX = mouseX;
				Game.startY = mouseY;
			}
			
		}
    });
	
    // Прекращаем рисовать если отжата ЛКМ
    $("#drawing-pad").mouseup(function(e) {
		Game.isDrawing = false;
    });
});
	
    $('#picker').mousemove(function(e) { // при передвижении указателя
	
	if (bCanPreview) {
            // записать координаты x и y холста выбора цвета
            var canvasOffset = $(canvas1).offset();
            var canvasX = Math.floor(e.pageX - canvasOffset.left);
            var canvasY = Math.floor(e.pageY - canvasOffset.top);

            // установка и перевод пикселя в цвет
            var imageData = ctx1.getImageData(canvasX, canvasY, 1, 1);
            var pixel = imageData.data;
			
            // изменить цвет класса preview
            var pixelColor = "rgb("+pixel[0]+", "+pixel[1]+", "+pixel[2]+")";
            $('#tool1').css('backgroundColor', pixelColor);

            // Изменить значения полей с цветами
            $('#rVal').val(pixel[0]);
            $('#gVal').val(pixel[1]);
            $('#bVal').val(pixel[2]);
            $('#rgbVal').val(pixel[0]+','+pixel[1]+','+pixel[2]);

            var dColor = pixel[2] + 256 * pixel[1] + 65536 * pixel[0];
            $('#hexVal').val('#' + ('0000' + dColor.toString(16)).substr(-6));
			thecolor = $('#hexVal').val();
        }
    });
	
    $('#picker').click(function(e) { // click event handler
	
	if (bCanPreview) {
            // записать координаты x и y холста выбора цвета
            var canvasOffset = $(canvas1).offset();
            var canvasX = Math.floor(e.pageX - canvasOffset.left);
            var canvasY = Math.floor(e.pageY - canvasOffset.top);

            // установка и перевод пикселя в цвет
            var imageData = ctx1.getImageData(canvasX, canvasY, 1, 1);
            var pixel = imageData.data;
			
            // изменить цвет id #tool1
            var pixelColor = "rgb("+pixel[0]+", "+pixel[1]+", "+pixel[2]+")";
            $('#tool1').css('backgroundColor', pixelColor);

            // Изменить значения полей с цветами
            $('#rVal').val(pixel[0]);
            $('#gVal').val(pixel[1]);
            $('#bVal').val(pixel[2]);
            $('#rgbVal').val(pixel[0]+','+pixel[1]+','+pixel[2]);

            var dColor = pixel[2] + 256 * pixel[1] + 65536 * pixel[0];
            $('#hexVal').val('#' + ('0000' + dColor.toString(16)).substr(-6));
			thecolor = $('#hexVal').val();
        }
        bCanPreview = !bCanPreview;	
    }); 
    $('#tool1').click(function(e) { // preview click
        $('.colorpicker').fadeToggle("fast", "linear");
        bCanPreview = true;
    });
	
	$('#Image1').click(getImage);
	$('#Image2').click(getImage);
	$('#Image4').click(getImage);	
	$('#Image3').click(getImage);

function drawLine(ctx, x1, y1, x2, y2, thickness, thecolor) {	

	x1 = x1-0.5;
	y1 = y1-0.5;
	x2 = x2-0.5;
	y2 = y2-0.5;

	var deltaX = Math.abs(x2 - x1);
	var deltaY = Math.abs(y2 - y1);
	var signX = (x1 < x2) ? 0.5 : -0.5;
	var signY = (y1 < y2) ? 0.5 : -0.5;
	
	var error = deltaX - deltaY;
	ctx.beginPath();
	ctx.moveTo(x1,y1);
	ctx.lineTo(x2,y2);
	ctx.lineWidth = thickness;
	ctx.strokeStyle = thecolor.toString();
	ctx.lineCap = 'round';
	ctx.stroke();

}
	
function sendMessage()
{
	var message1 = $("#chat-input").val();
	// упаковка сообщения в объект
	var data = {};
	data.dataType = Game.CHAT_MESSAGE;
	data.UserName = UserName;
	data.UserScores = UserScores;
	data.message1 = message1;
	Game.socket.send(JSON.stringify(data));
	$("#chat-input").val("");
}
// запрашиваем изображене через сервер у другого клиента 
// по номеру картинки и номеру пользователя
function getImage()
{
	//var ThisID = '#Image'+Inum;

	var data = {};
	data.imageNumber = $(this).attr('number');
	data.imageUser = $(this).attr('user');
	data.dataType = Game.GET_IMAGE;
	console.log('GET_IMAGE -  getImage');
	Game.socket.send(JSON.stringify(data));
};
//  для загрузки изоброжения с img отправлятем запрос насервер
function setImage(Image,UserImage)
{
	var data = {};
	data.dataType = Game.SET_IMAGE;
	data.image = Image;
	data.UserImage = UserImage;
	console.log('SET_IMAGE - setImage');
	Game.socket.send(JSON.stringify(data));
}
// сохраняем изображение в наш клиент и отправляем данные на сервер.
function sendImage()
{	
	console.log('Сохраняем изображение');
	/*
	// создаем обект типа рисунок
	*/
	var Imagedata = {};
	Imagedata.image = SaveCanvas();
	
	//console.log(Imagedata.image);
	localStorage.Images = JSON.stringify(Images);
	
	// Вытаскиваем из локального массива
	//Images = localStorage.Images ? JSON.parse(localStorage.Images) : [];
	
	Imagedata.dataType = Game.SAVE_IMAGE;
	Imagedata.imageUser = UserID;
	Imagedata.imageNumber = NumberImage;
	NumberImage++;
	// отправляем данные
	Game.socket.send(JSON.stringify(Imagedata));
};

function SaveCanvas(){
	var Imagedata = {};
	//ctx.setTransform(1,0.5,-0.5,1,30,10);
	//ctx.fillStyle="blue";
	//ctx.fillRect(0,0,250,100);
	Imagedata.image = canvas.toDataURL("image/jpg").replace("image/jpg", "image/octet-stream");
	Images.push(Imagedata.image);
	// сохраняем в локальный массив
	var img3 = new Image(100,60);
	img3.onload = function(){
		//очищаем холст
		canvas3.width = img3.width;
		ctx3.drawImage(img3, 0, 0, img3.width, img3.height);
		//ctx3.drawImage(img3,10,10);
	}
	img3.src = Imagedata.image;
	return Imagedata.image;
	
	//return Imagedata.image;
	//return canvas3.toDataURL("image/jpg").replace("image/jpg", "image/octet-stream");
	//return Imagedata.image;
	/*
	var temp1;
	gameOverTimeout = setTimeout(function(e){
		temp1 = canvas3.toDataURL("image/jpg").replace("image/jpg", "image/octet-stream");
	},60);
	console.log('Сохранили', temp1);
	if (temp1 !='undefined'){
		return temp1;
		console.log('Нет', temp1);
	} else{
		return SaveCanvas();
	}*/
};