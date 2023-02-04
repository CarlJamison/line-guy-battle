var scale = 1;
var canvas = document.getElementById("myCanvas");
var ctx = canvas.getContext("2d");
var width = Math.floor(window.innerWidth / scale) - 10;
var height = Math.floor(window.innerHeight / scale) - 10;
var rtod = Math.PI / 180;
var socket = io("/view");

canvas.width = width * scale;
canvas.height = height * scale;

var platforms = [
	{ y: canvas.height - 300, sx: 0, ex: canvas.width },
	{ y: canvas.height - 400, sx: 400, ex: 600 },
	{ y: canvas.height - 500, sx: 600, ex: 800 },
	{ y: canvas.height - 600, sx: 800, ex: 1000 },
	{ y: canvas.height - 700, sx: 1000, ex: 1200 },
];

var standing = {
	lt: 100, la: 135, lf: 90, ll: 110, rt: 60, ra: 95, rf: 35,
	rl: 95, ab: 100, head: -65, neck: -65,
}

var jumping = {
	lt: 60, la: 145, lf: 85, ll: 135, rt: 20, ra: 35, rf: -35,
	rl: 100, ab: 100, head: -65, neck: -65,
}

var punch = {
	la: 10, lf: -10, ra: 140, rf: 35
}

var playerColors = [
	"#32a852",
	"#00d5ff",
	"#ff00fb",
	"#ff0000",
	"#f2ff00",
	"#ff9d00",
	"#1500ff",
	"#c300ff"
];

ctx.shadowBlur = 2;
ctx.lineWidth = 2 * scale;
ctx.lineJoin = "round";
ctx.lineCap = "round";

var guys = [];
var bullets = [];

socket.on('connection', id => addGuy(id));

socket.on('direction change', event => {
	var guy = getGuy(event.id);
	newTransition = {
		startState: getCurrentState(guy),
		start: Date.now(),
		end: Date.now() + 200
	}
	if(event.vector.x < -0.1){
		if(guy.running != -1){
			newTransition.endState = guy.falling ? reflect(jumping) : getLeftRunningState(200);
			guy.running = -1;
		}
	}else if(event.vector.x > 0.1){
		if(guy.running != 1){
			newTransition.endState = guys.falling ? jumping : getRunningState(200);
			guy.running = 1;
		}
	}else{
		if(guy.running != 0){
			newTransition.endState = guy.running == 1 ? standing : reflect(standing);
			guy.last = guy.running;
			guy.running = 0;
		}
	}

	if(newTransition.endState) guy.transition = newTransition;
});

socket.on('fire', msg => {
	var guy = getGuy(msg.id);

	if(msg.action == 0){
		guy.transition = {
			startState: getCurrentState(guy),
			endState: direction(guy) == 1 ? jumping : reflect(jumping),
			start: Date.now(),
			end: Date.now() + 200
		}
		guy.NYV = 15 * scale;
	}else{
		bullets.push({
			x: guy.state.rf.x, 
			y: guy.state.rf.y, 
			xV: direction(guy) * 8,
			yV: 0
		});
	}
});

socket.on('remove player', id => guys = guys.filter(g => id != g.id));

window.setInterval(runFrame, 10);

function drawHandgun(x, y){
	
	ctx.shadowColor = ctx.strokeStyle = "black";
	ctx.lineWidth = 1;
	ctx.beginPath();
	ctx.moveTo(x, y);
	ctx.lineTo(x + 5, y);
	ctx.lineTo(x + 5, y - 3);
	ctx.stroke();

	ctx.lineWidth = 2;
	ctx.beginPath();
	ctx.moveTo(x + 10, y - 3);
	ctx.lineTo(x, y - 3);
	ctx.moveTo(x + 2, y - 3);
	ctx.lineTo(x - 1, y + 3);
	
	ctx.stroke();
}


function getGuy(id){
	return guys.find(g => g.id == id) ?? addGuy(id);
}

function addGuy(id){
	var guy = {y: height / 2, x: width / 2};

	var la = {l: 11 * scale, a: 45, p: guy};
	var lf = {l: 12 * scale, a: 90, p: la};
	var ra = {l: 11 * scale, a: 135, p: guy};
	var rf = {l: 12 * scale, a: 90, p: ra};
	var ab = {l: 20 * scale, a: 100, p: guy};
	var lt = {l: 15 * scale, a: 135, p: ab};
	var ll = {l: 15 * scale, a: 135, p: lt};
	var rt = {l: 15 * scale, a: 135, p: ab};
	var rl = {l: 15 * scale, a: 135, p: rt};
	var neck = {l: 3 * scale, a: -65, p: guy};
	var head = {l: 5 * scale, a: -65, p: neck, head: true};
	la.c = [lf];
	ra.c = [rf];
	lt.c = [ll];
	rt.c = [rl];
	neck.c = [head];
	ab.c = [lt, rt];
	guy.c = [ab, la, ra, neck];
	guy.id = id;
	guy.state = { rt, rl, ll, lt, la, lf, ra, rf, head, neck, ab};
	guy.punching = { start: 0, end: 0 }
	guy.transition = { end: 0 };
	guy.NYV = 0;
	guy.running = 1;
	guy.last = 1;
	guy.falling = false;
	guy.color = playerColors.find(c => !guys.some(g => g.color == c));
	guys.push(guy);

	return guy;
}

function renderPlatforms(){
	ctx.shadowColor = ctx.strokeStyle = "black";

	ctx.beginPath();
	platforms.forEach(p => {
		ctx.moveTo(p.sx, p.y);
		ctx.lineTo(p.ex, p.y);
	});
	
	ctx.stroke();
}

function renderBullets(){
	ctx.shadowColor = ctx.strokeStyle = "black";

	ctx.beginPath();
	bullets.forEach(b => {
		ctx.moveTo(b.x, b.y);
		ctx.lineTo(b.x + (b.xV / 2), b.y + (b.yV / 2));
		b.x += b.xV;
		b.y += b.yV;
	});
	
	ctx.stroke();
}

function renderNode(node){
	if(node.p){
		node.x = node.p.x + (Math.cos(node.a * rtod) * node.l);
		node.y = node.p.y + (Math.sin(node.a * rtod) * node.l);
		
		if(node.head){
			ctx.moveTo(node.x + node.l, node.y);
			ctx.arc(node.x, node.y, node.l, 0, 2 * Math.PI);
		}else{
			ctx.lineTo(node.x, node.y);
		}
	}else{
		ctx.beginPath();
	}

	if(node.c){
		var first = true;
		node.c.forEach(c => {
			if(!first || !node.p){
				ctx.moveTo(node.x, node.y);
			}
			first = false;
			renderNode(c)
		});
	}

	if(node.p){
		ctx.stroke();
	}
}

function getAngle(s, e, d, o = 0){
	var frame = (Date.now() + o) % d;
	var r = (Math.sin(frame * (Math.PI * 2 / d)) + 1) / 2;
	return (e - s) * r + s;
}

function getRunningState(o = 0){
	
	var d = 1000;
	return {
		lt: getAngle(30, 130, d, o),
		la: getAngle(150, 45, d, o),
		lf: getAngle(55, -45, d, o + d / 20),
		ll: getAngle(60, 180, d, o + -d / 10),
		rt: getAngle(30, 130, d, o + d / 2),
		ra: getAngle(150, 45, d, o + d / 2),
		rf: getAngle(55, -45, d, o + d / 2 + d / 20),
		rl: getAngle(60, 180, d, o + d / 2 + -d / 10),
		head: -65,
		neck: -65,
		ab: 100
	}
}

function getCurrentState(guy){
	return  {
		lt: guy.state.lt.a, la: guy.state.la.a, lf: guy.state.lf.a, ll: guy.state.ll.a,
		rt: guy.state.rt.a, ra: guy.state.ra.a, rf: guy.state.rf.a, rl: guy.state.rl.a, 
		ab: guy.state.ab.a, head: guy.state.head.a, neck: guy.state.neck.a,
	}
}

function getLeftRunningState(o = 0){
	
	var d = 1000;
	return {
		lt: getAngle(150, 50, d, o),
		la: getAngle(30, 135, d, o),
		lf: getAngle(125, 225, d, o + d / 20),
		ll: getAngle(120, 0, d, o + -d / 10),
		rt: getAngle(150, 50, d, o + d / 2),
		ra: getAngle(30, 135, d, o + d / 2),
		rf: getAngle(125, 225, d, o + d / 2 + d / 20),
		rl: getAngle(120, 0, d, o + d / 2 + -d / 10),
		head: -115,
		neck: -115,
		ab: 80
	}
}

function setState(state, guy){
	Object.keys(state).forEach(k => guy.state[k].a = state[k]);
}

function runFrame(){
	ctx.clearRect(0, 0, canvas.width, canvas.height);

	guys.forEach(guy => {
		
		if(guy.y > canvas.height + 1000){
			guy.y = -100;
			guy.dead = false;
		}

		ccw = (A, B, C) => (C.y-A.y) * (B.x-A.x) > (B.y-A.y) * (C.x-A.x);
		
		if(bullets.some(p => {
			var A = {x: p.x, y: p.y}
			var B = {x: p.x + (p.xV * 2), y: p.y + (p.yV * 2)}
			var C = {x: guy.x, y: guy.y};
			var D = {x: guy.state.ab.x, y: guy.state.ab.y};

			return ccw(A,C,D) != ccw(B,C,D) && ccw(A,B,C) != ccw(A,B,D)
		})){
			guy.dead = true;
		};

		if(guy.running){
			setState(guy.running == 1 ? getRunningState() : getLeftRunningState(), guy);
		}else{
			setState(guy.last == 1 ? standing : reflect(standing), guy);
		}

		guy.x = (guy.x + (scale * 2 * guy.running)) % canvas.width;
		if(guy.x < 0){
			guy.x = canvas.width + guy.x;
		}

		guy.y -= guy.NYV / 4 * scale;
		
		var p = onPlatform(guy)
		if(!p){
			guy.NYV -= scale / 2;
			
			setState(direction(guy) == -1 ? reflect(jumping) : jumping, guy);
		}else{			
			if(guy.falling){
				guy.transition = {
					startState: direction(guy) == -1 ? reflect(jumping) : jumping, guy,
					start: Date.now(),
					end: Date.now() + 100
				}

				if(guy.running){
					guy.transition.endState = guy.running == 1 ? getRunningState(100) : getLeftRunningState(100);
				}else{
					guy.transition.endState = guy.last == 1 ? standing : reflect(standing);
				}
			}

			guy.NYV = 0;
			guy.y = p.y - (scale * 50);
		}
		
		guy.falling = !p;
		
		if(guy.transition.end && Date.now() < guy.transition.end){
			var frame = Date.now() - guy.transition.start;
			var d = guy.transition.end - guy.transition.start;
			var r = Math.sin(frame * Math.PI / 2 / d);

			var coolState = {};

			Object.keys(guy.transition.startState).forEach(k => {
				if(guy.transition.endState[k])
					coolState[k] = (guy.transition.endState[k] - guy.transition.startState[k])
						* r + guy.transition.startState[k];
			});

			setState(coolState, guy);
		}	

		if(guy.punching.end && Date.now() < guy.punching.end){
			setState(guy.running == 1 || (!guy.running && guy.last == 1) ? punch : reflect(punch), guy);
		}
		ctx.shadowColor = ctx.strokeStyle = guy.color;
		
		renderNode(guy);
		ctx.translate(guy.state.rf.x, guy.state.rf.y);
		ctx.rotate(guy.state.rf.a * rtod); 
		if(guy.state.rf.a > 90 ) ctx.scale(1, -1);
		drawHandgun(0, 0);
		if(guy.state.rf.a > 90 ) ctx.scale(1, -1);
		ctx.rotate(-guy.state.rf.a * rtod); 
		ctx.translate(-guy.state.rf.x, -guy.state.rf.y);
	});

	renderPlatforms();
	renderBullets();
}

function reflect(state){
	var coolState = {}
	Object.keys(state).forEach(k => {
		coolState[k] = 180 - state[k];
		if(coolState[k] > 180){
			coolState[k] = coolState[k] - 360;
		}
	});
	return coolState
}

function onPlatform(guy){
	if(guy.dead) return null;

	if(guy.NYV > 0) return null;
	ccw = (A, B, C) => (C.y-A.y) * (B.x-A.x) > (B.y-A.y) * (C.x-A.x);

	return platforms.find(p => {
		var A = {x: p.sx, y: p.y}
		var B = {x: p.ex, y: p.y}
		var C = {x: guy.x, y: guy.y + (scale * 50) - 1};
		var D = {x: guy.x, y: guy.y + (scale * 50) - guy.NYV + 1};

		return ccw(A,C,D) != ccw(B,C,D) && ccw(A,B,C) != ccw(A,B,D)
	});
}

function direction(guy){
	return guy.running ? guy.running : guy.last;
}