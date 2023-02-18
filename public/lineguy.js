var scale = 1;
var ctx = canvas.getContext("2d");
var rtod = Math.PI / 180;
var ccw = (A, B, C) => (C.y-A.y) * (B.x-A.x) > (B.y-A.y) * (C.x-A.x);
var socket = io("/view");
const maxHealth = 10;
const shieldRadius = 50;

var grd = ctx.createRadialGradient(canvas.width / 2, canvas.height / 2, 0, canvas.width / 2, canvas.height / 2, 1000);
grd.addColorStop(0, "white");
grd.addColorStop(1, "gray");

var platforms = [
	{ y: canvas.height - 200, sx: 0, ex: canvas.width },
	{ y: canvas.height - 300, sx: 400, ex: 600 },
	{ y: canvas.height - 400, sx: 600, ex: 800 },
	{ y: canvas.height - 400, sx: 1200, ex: 1300 },
	{ y: canvas.height - 500, sx: 800, ex: 1200 },
	{ y: canvas.height - 500, sx: 300, ex: 500 },
	{ y: canvas.height - 600, sx: 100, ex: 300 },
	{ y: canvas.height - 600, sx: 1150, ex: 1500 },
	{ y: canvas.height - 700, sx: 450, ex: 1000 },
];

var joinPlatforms = [
	{ y: canvas.height - 150, sx: 0, ex: canvas.width },
	{ y: canvas.height - 300, sx: 400, ex: 600 },
	{ y: canvas.height - 300, sx: 1300, ex: 1500 },
	{ y: canvas.height - 400, sx: 200, ex: 400 },
	{ y: canvas.height - 400, sx: 1600, ex: 1800 },
	{ y: canvas.height - 500, sx: 1500, ex: 1700 },
	{ y: canvas.height - 500, sx: 300, ex: 500 },
	{ y: canvas.height - 600, sx: 100, ex: 300 },
	{ y: canvas.height - 600, sx: 1250, ex: 1500 },
	{ y: canvas.height / 4, sx: canvas.width / 2 - canvas.height / 4, ex: canvas.width /2 + canvas.height / 4 },
];

var standing = {
	lt: 100, la: 135, lf: 90, ll: 110, rt: 60, ra: 95, rf: 35,
	rl: 95, ab: 100, head: -65, neck: -65,
}

var jumping = {
	lt: 60, la: 145, lf: 85, ll: 135, rt: 20, ra: 35, rf: -35,
	rl: 100, ab: 100, head: -65, neck: -65,
}

var dead = {
	lt: -80, la: -85, lf: -120, ll: -55, rt: -35, ra: -40, rf: -110,
	rl: -10, ab: 25, head: -130, neck: -140,
}

var punch = {
	la: 10, lf: -10, ra: 140, rf: 35
}

var guns = [
	{ draw: drawHandgun, wait: 400, damage: 4, speed: 8, ammo: 1 },
	{ draw: drawBurst, wait: 2000, damage: 2, speed: 8, ammo: 5 },
	{ draw: drawSniper, wait: 4000, damage: 10, speed: 16, ammo: 1 },
];

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
	guy.aim = event.radians ? event.radians : guy.aim;

	newTransition = {
		startState: getCurrentState(guy),
		start: Date.now(),
		end: Date.now() + 200
	}
	if(event.vector.x < -0.2){
		if(guy.running != -1){
			newTransition.endState = guy.falling ? reflect(jumping) : getLeftRunningState(200);
			guy.running = -1;
		}
	}else if(event.vector.x > 0.2){
		if(guy.running != 1){
			newTransition.endState = guy.falling ? jumping : getRunningState(200);
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

	if(guy.dead) return;

	if(msg.action == 0){
		if(guy.falling) return;
		guy.NYV = 25 * scale;
	}else if(msg.action == 2){
		guy.gun = (guy.gun + 1) % guns.length;
	}else{

		if(Date.now() > guy.nextBullet){
			var coolGun = guns[guy.gun];

			if(!guy.ammo)
				guy.ammo = coolGun.ammo

			var angle = guy.aim / rtod;
			bullets.push({
				x: guy.state.rf.x + (Math.sin(guy.aim) * 3 * ((angle > 90 && angle < 270) ? 1 : -1)), 
				y: guy.state.rf.y + (Math.cos(guy.aim) * 3 * ((angle > 90 && angle < 270) ? 1 : -1)), 
				xV: Math.cos(guy.aim) * coolGun.speed, 
				yV: Math.sin(guy.aim) * -coolGun.speed,
				dmg: coolGun.damage,
			});
			guy.ammo--;
			if(!guy.ammo){
				guy.nextBullet = Date.now() + coolGun.wait;
			}
		}

	}
});

socket.on('remove player', id => guys = guys.filter(g => id != g.id));

var opts = {
	errorCorrectionLevel: 'H',
	type: 'image/png',
	scale : 10,
	margin: 1,
	color: {
		dark:"#2c2c2c",
		light:"#ededed"
	}
}

var img = new Image();
QRCode.toDataURL(window.location.href.replace('/screen.html', ''), opts, (err, url) => {
	if (err) throw err
	img.src = url
	img.onload = window.setInterval(gameLogic, 10);
	runFrame();
});

function drawHealthbar(guy){
	ctx.shadowColor = ctx.strokeStyle = "red";
	ctx.lineWidth = 8;
	ctx.beginPath();
	ctx.moveTo(guy.x - 20, guy.y - 25);
	ctx.lineTo(guy.x + 20, guy.y - 25);
	ctx.stroke();
	
	if(!guy.health) return;

	ctx.shadowColor = ctx.strokeStyle = "green";
	ctx.beginPath();
	ctx.moveTo(guy.x - 20, guy.y - 25);
	ctx.lineTo(guy.x - 20 + (40 * (guy.health-1) / (maxHealth - 1)), guy.y - 25);
	ctx.stroke();
}

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

function drawBurst(x, y){
	
	ctx.shadowColor = ctx.strokeStyle = "black";
	ctx.lineWidth = 1;
	ctx.beginPath();
	ctx.moveTo(x, y);
	ctx.lineTo(x + 5, y);
	ctx.lineTo(x + 5, y - 3);
	ctx.moveTo(x + 10, y - 3);
	ctx.lineTo(x + 10, y + 3);
	ctx.moveTo(x + 2, y - 3);
	ctx.lineTo(x - 12, y + 3);
	ctx.lineTo(x - 10, y - 3);
	ctx.stroke();

	ctx.lineWidth = 3;
	ctx.beginPath();
	ctx.moveTo(x + 20, y - 3);
	ctx.lineTo(x - 10, y - 3);
	ctx.moveTo(x + 2, y - 3);
	ctx.lineTo(x - 1, y + 3);
	
	ctx.stroke();
	ctx.lineWidth = 2;
}

function drawSniper(x, y){
	
	ctx.shadowColor = ctx.strokeStyle = "black";
	ctx.lineWidth = 1;
	ctx.beginPath();
	ctx.moveTo(x, y);
	ctx.lineTo(x + 5, y);
	ctx.lineTo(x + 5, y - 3);
	ctx.moveTo(x + 20, y - 3);
	ctx.lineTo(x + 35, y - 3);
	ctx.moveTo(x + 2, y - 3);
	ctx.lineTo(x - 12, y + 3);
	ctx.lineTo(x - 10, y - 3);
	
	ctx.moveTo(x, y - 6);
	ctx.lineTo(x + 15, y - 6);
	ctx.stroke();

	ctx.lineWidth = 2;
	ctx.beginPath();
	ctx.moveTo(x + 20, y - 3);
	ctx.lineTo(x - 10, y - 3);
	ctx.moveTo(x + 2, y - 3);
	ctx.lineTo(x - 1, y + 3);
	ctx.moveTo(x + 5, y - 3);
	ctx.lineTo(x + 5, y - 6);
	ctx.moveTo(x + 35, y - 3);
	ctx.lineTo(x + 40, y - 3);
	
	ctx.stroke();
}

function getGuy(id){
	return guys.find(g => g.id == id) ?? addGuy(id);
}

function addGuy(id){
	var guy = {y: -100, x: Math.random() * canvas.width};

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
	guy.running = 0;
	guy.last = 1;
	guy.falling = false;
	guy.color = playerColors.find(c => !guys.some(g => g.color == c));
	guy.health = maxHealth;
	guy.aim = 0;
	guy.gun = 0;
	guy.nextBullet = 0;
	guy.ammo = 0;

	guys.push(guy);

	return guy;
}

function renderShield(guy){
	ctx.lineWidth = 4;
	ctx.beginPath();
	ctx.arc(guy.x, guy.y, shieldRadius * scale, -guy.aim - 1, -guy.aim + 1);
	ctx.stroke();
}

function renderPlatforms(){
	ctx.shadowColor = ctx.strokeStyle = "black";

	ctx.beginPath();
	joinPlatforms.forEach(p => {
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

function getCurrentState(guy){
	return  {
		lt: guy.state.lt.a, la: guy.state.la.a, lf: guy.state.lf.a, ll: guy.state.ll.a,
		rt: guy.state.rt.a, ra: guy.state.ra.a, rf: guy.state.rf.a, rl: guy.state.rl.a, 
		ab: guy.state.ab.a, head: guy.state.head.a, neck: guy.state.neck.a,
	}
}

function setState(state, guy){
	Object.keys(state).forEach(k => guy.state[k].a = state[k]);
}

function gameLogic(){
	
	bullets = bullets.filter(b => {
		b.x += b.xV;
		b.y += b.yV;
		return !(b.y > canvas.height || b.y < 0 || b.x > canvas.width || b.x < 0)
		/*	return true;

		return guys.some(g => Math.pow(g.x - b.x, 2) + Math.pow(g.y - b.y, 2) < Math.pow(shieldRadius, 2))
		*/
	});

	guys.forEach(guy => {
		if(guy.y > canvas.height + 1000){
			guy.y = -100;
			guy.dead = false;
			guy.health = maxHealth;
		}
		
		if(!guy.dead){
			var bullet = bullets.find(p => {
				var A = {x: p.x, y: p.y}
				var B = {x: p.x + (p.xV * 2), y: p.y + (p.yV * 2)}
				var C = {x: guy.state.head.x, y: guy.state.head.y};
				var D = {x: guy.state.rl.x, y: guy.state.rl.y};

				return ccw(A,C,D) != ccw(B,C,D) && ccw(A,B,C) != ccw(A,B,D)
			});

			if(bullet){
				guy.health = guy.health > bullet.dmg ? guy.health - bullet.dmg : 0;
				bullets = bullets.filter(b => b != bullet);
				if(!guy.health){
					guy.dead = true;
					guy.transition = {
						startState: getCurrentState(guy),
						endState: dead,
						start: Date.now(),
						end: Date.now() + 400
					}
				}
			}
		}

		guy.x = (guy.x + (scale * 2 * guy.running)) % canvas.width;
		if(guy.x < 0){
			guy.x = canvas.width + guy.x;
		}

		guy.y -= guy.NYV / 4 * scale;
		
		var p = onPlatform(guy)
		if(!p){
			guy.NYV -= scale / 2;
			if(!guy.falling && !guy.dead){
				guy.transition = {
					startState: getCurrentState(guy),
					endState: direction(guy) == 1 ? jumping : reflect(jumping),
					start: Date.now(),
					end: Date.now() + 200
				}
			}
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
	});
}

function runFrame(){
	
	ctx.fillStyle = grd;
	ctx.fillRect(0, 0, canvas.width, canvas.height);
	ctx.drawImage(img, canvas.width / 2 - canvas.height / 4, canvas.height / 4, canvas.height / 2, canvas.height / 2);

	guys.forEach(guy => {
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
		}else if(guy.dead){
			setState(dead, guy)
		}else if(guy.falling){
			setState(direction(guy) == -1 ? reflect(jumping) : jumping, guy);
		}else if(guy.running){
			setState(guy.running == 1 ? getRunningState() : getLeftRunningState(), guy);
		}else{
			setState(guy.last == 1 ? standing : reflect(standing), guy);
		}

		if(guy.punching.end && Date.now() < guy.punching.end){
			setState(guy.running == 1 || (!guy.running && guy.last == 1) ? punch : reflect(punch), guy);
		}

		ctx.shadowColor = ctx.strokeStyle = guy.color;

		//Holding gun
		setState({rf: -guy.aim / rtod, ra: direction(guy) == 1 ? 50 : 120 }, guy)

		renderNode(guy);
		//renderShield(guy);

		if(maxHealth > 1) drawHealthbar(guy);

		ctx.translate(guy.state.rf.x, guy.state.rf.y);
		ctx.rotate(-guy.aim); 
		if(guy.state.rf.a < -90 && guy.state.rf.a > -270) ctx.scale(1, -1);
		guns[guy.gun].draw(0, 0)
		if(guy.state.rf.a < -90 && guy.state.rf.a > -270) ctx.scale(1, -1);
		ctx.rotate(guy.aim); 
		ctx.translate(-guy.state.rf.x, -guy.state.rf.y);
	});

	renderPlatforms();
	renderBullets();

	requestAnimationFrame(runFrame);
}

function reflect(state){
	var coolState = {}
	Object.keys(state).forEach(k => {
		coolState[k] = 180 - state[k];
		if(coolState[k] > 180){
			coolState[k] = coolState[k] - 360;
		}
	});
	return coolState;
}

function onPlatform(guy){
	if(guy.dead || guy.NYV > 0) return null;

	return joinPlatforms.find(p => {
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