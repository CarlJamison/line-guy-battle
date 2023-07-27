var scale = 1;
var ctx = canvas.getContext("2d", { alpha: false });
ctx.shadowBlur = 2;
ctx.shadowColor = ctx.strokeStyle = "black";
ctx.lineJoin = ctx.lineCap = "round";
ctx.font = '40px segoe ui black';

var rtod = Math.PI / 180;
var ccw = (A, B, C) => (C.y-A.y) * (B.x-A.x) > (B.y-A.y) * (C.x-A.x);
var randomVector = radius => {
	var x = Math.random() * 2 - 1;
	var maxY = Math.sqrt(1 - Math.pow(x, 2));
	return { xV: x * radius, yV:(Math.random() * 2 * maxY - maxY) * radius }
}
var reqVotes = () => guys.length > 2 ? Math.ceil(guys.length / 2) : 2;

var socket = io("/view");
const maxHealth = 10;
const shieldRadius = 50;
const START_LIVES = 5;
const CAN_START_GAME = false;

var exp = ctx.createRadialGradient(canvas.width / 2, canvas.height / 2, 0, canvas.width / 2, canvas.height / 2, scale * 100);
exp.addColorStop(0, "#ffdf6f");
exp.addColorStop(1, "#ff000000");

var platforms = [
	{ y: canvas.height - 150, sx: 0, ex: canvas.width },
	{ y: canvas.height - 300, sx: 400, ex: 600 },
	{ y: canvas.height - 400, sx: 600, ex: 800 },
	{ y: canvas.height - 400, sx: 1200, ex: 1300 },
	{ y: canvas.height - 500, sx: 800, ex: 1200 },
	{ y: canvas.height - 500, sx: 300, ex: 500 },
	{ y: canvas.height - 600, sx: 100, ex: 350 },
	{ y: canvas.height - 600, sx: 1100, ex: 1500 },
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

var startCount = 0;
var startArea = {
	r: 150,
	x: canvas.width / 2,
	y: canvas.height - 150
}

var game = null;

var barriers = [
	{ x: canvas.width / 2, sy: canvas.height - 300, ey: canvas.height - 150 },
]

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
	{ draw: drawHandgun, wait: 400, damage: 4, speed: 12, ammo: 1 },
	{ draw: drawBurst, wait: 2000, damage: 2, speed: 8, ammo: 8 },
	{ draw: drawSniper, wait: 4000, damage: 10, speed: 16, ammo: 1 },
	{ draw: drawLauncher, wait: 1000, damage: 2, speed: 9, ammo: 1, gravity: 0.1, contact: (x, y) => explosions.push({
			particles: [], createTime: Date.now(), x, y, dmg: 1, range: 100 })},
];

var explosions = [];

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

var guys = [];
var bullets = [];

var opts = {
	errorCorrectionLevel: 'H',
	scale : 10,
	margin: 0,
	color: { dark:"#2c2c2c", light:"#ededed" }
}
var bgCanvas = document.createElement("canvas");
var gameCanvas = document.createElement("canvas");
socket.on('register', id => {
	QRCode.toDataURL(window.location.href.replace('/screen.html', '/?id=' + id), opts, (err, url) => {
		var img = new Image();
		img.src = url;
		img.onload = () => {
			bgCanvas.width = canvas.width;
			bgCanvas.height = canvas.height;
			gameCanvas.width = canvas.width;
			gameCanvas.height = canvas.height;
			var bgCtx = bgCanvas.getContext("2d");
			var gameCtx = gameCanvas.getContext("2d");
			var grd = bgCtx.createRadialGradient(canvas.width / 2, canvas.height / 2, 0, canvas.width / 2, canvas.height / 2, 1000);
			grd.addColorStop(0, "white");
			grd.addColorStop(1, "gray");
			bgCtx.fillStyle = grd;
			bgCtx.fillRect(0, 0, canvas.width, canvas.height);
			gameCtx.fillStyle = grd;
			gameCtx.fillRect(0, 0, canvas.width, canvas.height);
			bgCtx.drawImage(img, canvas.width / 2 - canvas.height / 6, canvas.height / 4, canvas.height / 3, canvas.height / 3);
			window.setInterval(gameLogic, 10);
			runFrame();
		}
	});
});

socket.on('ping', msg => {
	var guy = guys.find(g => g.id == msg.id);

	if(guy){
		guy.lastPing = Date.now();
		socket.emit('pong', msg.socketId)
	}
});

socket.on('direction change', event => {
	var guy = getGuy(event.id);
	if(!guy) return;

	guy.aim = event.radians ? event.radians : guy.aim;

	newTransition = {
		startState: getCurrentState(guy),
		start: Date.now(),
		end: Date.now() + 200
	}
	if(event.vector.x < -0.5){
		if(guy.running != -1){
			newTransition.endState = guy.falling ? reflect(jumping) : getLeftRunningState(200);
			guy.running = -1;
		}
	}else if(event.vector.x > 0.5){
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
	var time = Date.now();
	if(guy.dead) return;

	if(msg.action == 0){
		if(guy.falling) return;
		guy.NYV = 25 * scale;
	}else if(msg.action == 2){
		guy.gun = (guy.gun + 1) % guns.length;
	}else if(msg.action == 3){
		if(time > guy.nextShield){
			guy.shield = time + 500;
			guy.nextShield = guy.shield + 5000;
		}
	}else{
		
		if(time > guy.nextBullet && time > guy.shield){
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
				contact: coolGun.contact,
				gravity: coolGun.gravity,
			});
			guy.ammo--;
			if(!guy.ammo){
				guy.nextBullet = Date.now() + coolGun.wait;
			}
		}

	}
});

function getGuy(id){
	return guys.find(g => g.id == id) ?? addGuy(id);
}

function addGuy(id){
	if(game && Date.now() > game) return null;

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
	var head =  {l: 5 * scale, a: -65, p: neck};
	guy.state = { la, lf, ra, rf, ab, lt, ll, rt, rl, neck, head }
	guy.id = id;
	guy.punching = { start: 0, end: 0 }
	guy.transition = { end: 0 };
	guy.NYV = 0;
	guy.running = 0;
	guy.last = 1;
	guy.falling = false;
	guy.color = playerColors.find(c => !guys.some(g => g.color == c));
	guy.health = maxHealth;
	guy.aim = guy.gun = guy.nextBullet = guy.ammo = guy.nextShield = guy.shield = 0;
	guy.canvas = document.createElement("canvas");
	guy.canvas.width = canvas.width;
	guy.canvas.height = canvas.height;
	guy.ctx = guy.canvas.getContext("2d");
	guy.ctx.shadowBlur = 2;
	guy.ctx.fillStyle = guy.ctx.shadowColor = guy.ctx.strokeStyle = guy.color;
	guy.ctx.lineWidth = 3 * scale;
	guy.ctx.lineJoin = guy.ctx.lineCap = "round";
	guy.ctx.font = '50px segoe ui black';
	guy.lastPing = Date.now();
	guys.push(guy);

	return guy;
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
	//Expensive
	Object.keys(state).forEach(k => guy.state[k].a = state[k]);
}

function gameLogic(){
	var time = Date.now();
	var isGame = game && time > game;
	guys = guys.filter(g => time - g.lastPing < 5000);

	explosions = explosions.filter(e => {
		if(time < e.createTime + 100)
		guys.forEach(g => {
			var distance = Math.pow(g.x - e.x, 2) + Math.pow(g.y - e.y, 2)
			var maxDist = Math.pow(e.range, 2);
			if(distance < maxDist){
				damageGuy(g, (maxDist - distance) / maxDist * e.dmg, time);
			}
		})

		return e.createTime + 1000 > time;
	});

	if(!game && CAN_START_GAME){
		startCount = guys.filter(g => Math.pow(g.x - startArea.x, 2) + Math.pow(g.y - startArea.y, 2) < Math.pow(startArea.r, 2)).length;
		if(startCount >= reqVotes()){
			game = time + 4000;
			guys.forEach(g => g.lives = START_LIVES)
		}
	}

	bullets = bullets.filter(b => {
		b.x += b.xV;
		b.y += b.yV;
		if(b.gravity) b.yV += b.gravity;
		if(b.y > canvas.height || (b.y < 0 && !b.gravity) || b.x > canvas.width || b.x < 0)
			return false;

		if((!isGame && CAN_START_GAME) &&
			Math.pow(b.x - startArea.x, 2) + Math.pow(b.y - startArea.y, 2) < Math.pow(startArea.r, 2)){
			return false
		}

		if(collision(
			{s: {x: b.x, y: b.y}, e: {x: b.x - b.xV, y: b.y - b.yV}},
			isGame ? platforms : joinPlatforms, p => ({s: {x: p.sx, y: p.y}, e: {x: p.ex, y: p.y}}))){
			if(b.contact) b.contact(b.x, b.y)
			return false;
		}

		if(collision(
			{s: {x: b.x, y: b.y}, e: {x: b.x - b.xV, y: b.y - b.yV}},
			barriers, b => ({s: {x: b.x, y: b.sy}, e: {x: b.x, y: b.ey}}))){
			if(b.contact) b.contact(b.x, b.y)
			return false;
		}

		return !guys.some(g => time < g.shield && Math.pow(g.x - b.x, 2) + Math.pow(g.y - b.y, 2) < Math.pow(shieldRadius, 2))
	});

	var alive = guys.filter(g => !g.gameOver);
	if(isGame && alive.length <= 1){
		game = null;
		alive.forEach(g => g.winner = true);
		guys.forEach(g => g.gameOver = false);
	}

	alive.forEach(guy => {
		if(guy.y > canvas.height + 1000){
			if(isGame){
				guy.lives--;
				if(!guy.lives){
					guy.gameOver = true;
				}
			}
			guy.x = Math.random() * canvas.width;
			guy.y = -100;
			guy.dead = false;
			guy.health = maxHealth;
		}
		
		if(!guy.dead){
			var bullet = collision(
				{s: {x: guy.state.head.x, y: guy.state.head.y}, e: {x: guy.state.rl.x, y: guy.state.rl.y} },
				bullets, b => ({s: {x: b.x, y: b.y}, e: {x: b.x - b.xV, y: b.y - b.yV}}));

			/*bullet = bullet ?? collision(
					{s: {x: guy.state.rf.x, y: guy.state.rf.y}, e: {x: guy.state.lf.x, y: guy.state.lf.y} },
					bullets, b => ({s: {x: b.x, y: b.y}, e: {x: b.x - b.xV, y: b.y - b.yV}}));*/

			if(bullet){
				if(bullet.contact) bullet.contact(bullet.x, bullet.y);
				damageGuy(guy, bullet.dmg, time);
				bullets = bullets.filter(b => b != bullet);
			}
		}

		var newX = guy.x + (scale * 2 * guy.running)
		if(!collision({ s: { y: guy.y, x: guy.x }, e: { y: guy.y, x: newX + (scale * 30 * guy.running)}},
			barriers, b => ({s: {x: b.x, y: b.sy}, e: {x: b.x, y: b.ey}}))){
			guy.x = newX % canvas.width;
		}

		if(guy.x < 0){
			guy.x = canvas.width + guy.x;
		}

		guy.y -= guy.NYV / 4 * scale;
		
		var p = onPlatform(guy, time)
		if(!p){
			guy.NYV -= scale / 2;
			if(!guy.falling && !guy.dead){
				guy.transition = {
					startState: getCurrentState(guy),
					endState: direction(guy) == 1 ? jumping : reflect(jumping),
					start: time,
					end: time + 200
				}
			}
		}else{			
			if(guy.falling){
				guy.transition = {
					startState: direction(guy) == -1 ? reflect(jumping) : jumping, guy,
					start: time,
					end: time + 100
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
	var time = Date.now();
	var xO = Math.random() * 10 - 5;
	var yO = Math.random() * 10 - 5;
	if(explosions.some(e => time < e.createTime + 100)) ctx.translate(-xO, -yO);

	if((!game || time < game) && CAN_START_GAME){
		ctx.drawImage(bgCanvas, 0, 0);
		ctx.beginPath();
		ctx.arc(startArea.x, startArea.y, startArea.r, 0, Math.PI*2);
		ctx.fillStyle = "#0095DD";
		ctx.fill();
		if(!game){
			ctx.fillText(`${startCount} / ${reqVotes()}`, 50, 75, 1000);
		}else{
			ctx.fillText(`Game starting in ${Math.floor((game - time) / 1000)} . . .`, 50, 75, 1000);
		}
		ctx.closePath();
	}else if(!CAN_START_GAME){
		ctx.drawImage(bgCanvas, 0, 0);
	}else{
		ctx.drawImage(gameCanvas, 0, 0);
	}

	ctx.shadowBlur = 0;
	if(explosions.length){
		ctx.fillStyle = exp;
		explosions.forEach(e => {
			if(time < e.createTime + 100){
				for(var i = 0; i < 100; i++){
					e.particles.push({
						...randomVector(5),
						size: Math.random() * 5,
						x: canvas.width / 2, y: canvas.height / 2
					})
				}
			}
			
			ctx.translate(e.x - canvas.width / 2, e.y - canvas.height / 2);
			ctx.beginPath();
			e.particles.forEach(p => {
				p.x += p.xV;
				p.y += p.yV;
				ctx.moveTo(p.x, p.y)
				ctx.arc(p.x, p.y, p.size, 0, 2 * Math.PI);
			})
			ctx.fill();
			
			ctx.translate(canvas.width / 2 - e.x, canvas.height / 2- e.y);
		});
	}
	ctx.fillStyle = "black";

	guys.forEach((guy, index) => {
		if(guy.transition.end && time < guy.transition.end){
			var frame = time - guy.transition.start;
			var d = guy.transition.end - guy.transition.start;
			var r = Math.sin(frame * Math.PI / 2 / d);

			var coolState = {};

			//Expensive
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

		if(guy.punching.end && time < guy.punching.end){
			setState(guy.running == 1 || (!guy.running && guy.last == 1) ? punch : reflect(punch), guy);
		}

		//Holding gun
		setState({rf: -guy.aim / rtod, ra: direction(guy) == 1 ? 50 : 120 }, guy)
		
		renderNode(guy);
		if(time < guy.shield)
			renderShield(guy);
		
		if(game && time > game) guy.ctx.fillText(guy.lives, canvas.width / guys.length * index + 50, 75, 50);
		ctx.drawImage(guy.canvas, 0, 0);
		
		if(guy.winner)
			renderHat(guy);
	});
	
	ctx.shadowBlur = 2;
	if(maxHealth > 1) drawHealthbars();

	ctx.shadowColor = ctx.strokeStyle = "black";
	drawGuns();
	ctx.lineWidth = 2;
	renderPlatforms(time);
	renderBullets();
	if(explosions.some(e => time < e.createTime + 100)) ctx.translate(xO, yO);
	requestAnimationFrame(runFrame);
}

function reflect(state){
	var coolState = {}
	//Expensive
	Object.keys(state).forEach(k => {
		coolState[k] = 180 - state[k];
		if(coolState[k] > 180){
			coolState[k] = coolState[k] - 360;
		}
	});
	return coolState;
}

function onPlatform(guy, time){
	if(guy.dead || guy.NYV > 0) return null;

	return collision(
		{s: {x: guy.x, y: guy.y + (scale * 50) - 1}, e: {x: guy.x, y: guy.y + (scale * 50) - guy.NYV + 1}},
		game && time > game ? platforms : joinPlatforms, p => ({s: {x: p.sx, y: p.y}, e: {x: p.ex, y: p.y}}));
}

function direction(guy){
	return guy.running ? guy.running : guy.last;
}

function collision(c, lines, map){
	return lines.find(ls => {
		var l = map ? map(ls) : ls;
		return ccw(c.s,l.s,l.e) != ccw(c.e,l.s,l.e) && ccw(c.s,c.e,l.s) != ccw(c.s,c.e,l.e)
	});
}

function damageGuy(guy, dmg, time){
	guy.health = guy.health > dmg ? guy.health - dmg : 0;
	if(!guy.health){
		guy.dead = true;
		guy.transition = {
			startState: getCurrentState(guy),
			endState: dead,
			start: time,
			end: time + 400
		}
	}
}