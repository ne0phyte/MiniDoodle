document.addEventListener("DOMContentLoaded", function(){
   var BUFFER_SIZE = 10;
   var SCALE_FACTOR = 1000;

   var mouse = { click: false,
      move: false,
      x: 0, y: 0
   }
   var stroke_buffer = [];

   var canvas  = document.getElementById('drawing');
   var ctx     = canvas.getContext('2d');
   var width = 0;
   var height = 0;
   var online = false;

   var socket = io.connect({ 
      'reconnection' : true, 
      'reconnectionDelay' : 500,
      'reconnectionDelayMax' : 5000,
      'reconnectionAttempts' : 500
   });

   function resizeCanvas() {
      canvas.width = width = window.innerWidth;
      canvas.height = height = window.innerHeight;
   }

   function clearCanvas() {
      ctx.fillStyle = '#fff';
      ctx.fillRect(0, 0, width, height);
   }

   function redraw() {
      resizeCanvas();
      clearCanvas();
      socket.emit('get_history');
   }

   window.onresize = (function() {
      var timeout;
      return function() {
         clearTimeout(timeout);
         resizeCanvas();
         showMessage("PLEASE WAIT...");
         timeout = setTimeout(function() {
            redraw();
         }, 500);
      }
   })();

   window.onbeforeunload = function() { 
      socket.emit('disconnect'); 
   };

   socket.on('connect', function() { 
      online = true; 
      redraw();
      mainLoop();
   });

   socket.on('server_quit', function(){ 
      online = false; 
      showMessage("SERVER OFFLINE :("); 
   });

   socket.on('draw_strokes', function (data) {
      for (var i in data.strokes) {
         if (data.strokes[i].length > 0) {
            drawStroke(data.strokes[i], 2, '#000');
         }
      }
   });

   canvas.onmousedown = function(e) { mouse.click = true; };
   canvas.onmouseup = canvas.onmouseout = function(e) { mouse.click = false; };

   canvas.onmousemove = function(e) {
      mouse.x = Math.floor(SCALE_FACTOR * (e.pageX / width));
      mouse.y = Math.floor(SCALE_FACTOR * (e.pageY / height));
      mouse.move = true;
   };

   function showMessage(msg) {
      ctx.fillStyle = '#000'; 
      ctx.font = 'bold 32px monospace'; 
      ctx.textBaseline = 'middle';
      ctx.fillRect(0, height/2 - 32, width, 64);
      ctx.fillStyle = '#fff'; 
      ctx.fillText(msg, width/2 - (ctx.measureText(msg).width/2) , height/2);
   }

   function drawStroke(stroke, lineWidth, color) {
      ctx.lineWidth = lineWidth;
      ctx.strokeStyle = color;
      ctx.beginPath();
      ctx.moveTo(stroke[0][0] / (SCALE_FACTOR/width), 
            stroke[0][1] / (SCALE_FACTOR/height));
      for (var i = 1; i < stroke.length; i++) {
         ctx.lineTo(stroke[i][0] / (SCALE_FACTOR/width), 
               stroke[i][1] / (SCALE_FACTOR/height));
      }
      ctx.stroke();
   }

   function mainLoop() {
      if (!online) return;
      if ( (mouse.click && mouse.move) || 
            (!mouse.click && stroke_buffer.length)) {

         stroke_buffer.push([ mouse.x, mouse.y ]);
         drawStroke(stroke_buffer.slice(-2), 2, '#999');
         mouse.move = false;
         
         if (mouse.click) {
            if (stroke_buffer.length > BUFFER_SIZE) {
               socket.emit('draw_stroke', { stroke: stroke_buffer });
               stroke_buffer = stroke_buffer.slice(-1);
            }
         } else {
            socket.emit('draw_stroke', { stroke: stroke_buffer });
            stroke_buffer = [];
         }

      }
      setTimeout(mainLoop, 20);
   }
});
