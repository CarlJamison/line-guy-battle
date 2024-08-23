function renderShield(guy){
	guy.ctx.lineWidth = 4;
	guy.ctx.beginPath();
	guy.ctx.arc(guy.x, guy.y, shieldRadius * scale, 0, 2 * Math.PI);
	//ctx.arc(guy.x, guy.y, shieldRadius * scale, -guy.aim - 1, -guy.aim + 1);
	guy.ctx.stroke();
}

function renderHat(guy){
	ctx.lineWidth = 4;
	ctx.beginPath();
	ctx.moveTo(guy.state.head.x - 10, guy.state.head.y - 5);
	ctx.lineTo(guy.state.head.x + 10, guy.state.head.y - 5);
	ctx.fillRect(guy.state.head.x - 7, guy.state.head.y - 5, 14, -8);
	ctx.stroke();
}

function renderPlatforms(time){
	ctx.beginPath();
	(game && time > game ? platforms : joinPlatforms).forEach(p => {
		ctx.moveTo(p.sx, p.y);
		ctx.lineTo(p.ex, p.y);
	});

	barriers.forEach(b => {
		ctx.moveTo(b.x, b.sy);
		ctx.lineTo(b.x, b.ey);
	});
	
	ctx.stroke();
}

function renderBullets(){
	ctx.beginPath();
	bullets.forEach(b => {
		ctx.moveTo(b.x, b.y);
		ctx.lineTo(b.x + (b.xV / 2), b.y + (b.yV / 2));
	});
	
	ctx.stroke();
}

function genXY(node){
	node.x = node.p.x + (Math.cos(node.a * rtod) * node.l);
	node.y = node.p.y + (Math.sin(node.a * rtod) * node.l);
	return [node.x, node.y];
}

function renderJetpack(guy){

	var s = guy.state;

	ctx.lineWidth = 4;
	ctx.beginPath();
	ctx.moveTo(s.lt.x, s.lt.y);
	ctx.lineTo(s.ll.x, s.ll.y);

	ctx.moveTo(s.rt.x, s.rt.y);
	ctx.lineTo(s.rl.x, s.rl.y);

	ctx.stroke();
}

function renderNode(guy){
	
	var s = guy.state;
	var c = guy.ctx;

	c.clearRect(0, 0, canvas.width, canvas.height);

	c.beginPath();
	c.moveTo(guy.x, guy.y);
	c.lineTo(...genXY(s.ab));
	c.lineTo(...genXY(s.lt));
	c.lineTo(...genXY(s.ll));
	c.moveTo(s.ab.x, s.ab.y);
	c.lineTo(...genXY(s.rt));
	c.lineTo(...genXY(s.rl));
	c.moveTo(guy.x, guy.y);
	c.lineTo(...genXY(s.la));
	c.lineTo(...genXY(s.lf));
	c.moveTo(guy.x, guy.y);
	c.lineTo(...genXY(s.ra));
	c.lineTo(...genXY(s.rf));
	c.moveTo(guy.x, guy.y);
	c.lineTo(...genXY(s.neck));
	genXY(s.head);
	c.moveTo(s.head.x + s.head.l, s.head.y);
	c.arc(s.head.x, s.head.y, s.head.l, 0, 2 * Math.PI);
	c.stroke();
}

function drawHealthbars(){
	ctx.shadowColor = ctx.strokeStyle = "red";
	ctx.lineWidth = 8;
	ctx.beginPath();

	guys.forEach(guy => {
		ctx.moveTo(guy.x - 20, guy.y - 25);
		ctx.lineTo(guy.x + 20, guy.y - 25);
	});
	ctx.stroke();

	ctx.shadowColor = ctx.strokeStyle = "green";
	ctx.beginPath();
	guys.forEach(guy => {
		if(!guy.health) return;
		ctx.moveTo(guy.x - 20, guy.y - 25);
		ctx.lineTo(guy.x - 20 + (40 * (guy.health-1) / (maxHealth - 1)), guy.y - 25);
	});
	ctx.stroke();
}

function drawGuns(){
	guys.forEach(guy => {
		var location = guy.state.rf;
		ctx.translate(location.x, location.y);
		ctx.rotate(-guy.aim); 
		if(location.a < -90 && location.a > -270) ctx.scale(1, -1);
		guns[guy.gun].draw()
		if(location.a < -90 && location.a > -270) ctx.scale(1, -1);
		ctx.rotate(guy.aim); 
		ctx.translate(-location.x, -location.y);
	})
}

function drawHandgun(){
	ctx.lineWidth = 1;
	ctx.beginPath();
	ctx.moveTo(0, 0);
	ctx.lineTo(5, 0);
	ctx.lineTo(5, -3);
	ctx.stroke();

	ctx.lineWidth = 2;
	ctx.beginPath();
	ctx.moveTo(10, -3);
	ctx.lineTo(0, -3);
	ctx.moveTo(2, -3);
	ctx.lineTo(-1, 3);
	
	ctx.stroke();
}

function drawBurst(x, y){
	ctx.lineWidth = 1;
	ctx.beginPath();
	ctx.moveTo(0, 0);
	ctx.lineTo(5, 0);
	ctx.lineTo(5, -3);
	ctx.moveTo(10, -3);
	ctx.lineTo(10, 3);
	ctx.moveTo(2, -3);
	ctx.lineTo(-12, 3);
	ctx.lineTo(-10, -3);
	ctx.stroke();

	ctx.lineWidth = 3;
	ctx.beginPath();
	ctx.moveTo(20, -3);
	ctx.lineTo(-10, -3);
	ctx.moveTo(2, -3);
	ctx.lineTo(-1, 3);
	
	ctx.stroke();
}

function drawLauncher(x, y){
	ctx.lineWidth = 1;
	ctx.beginPath();
	ctx.moveTo(0, 0);
	ctx.lineTo(5, 0);
	ctx.lineTo(5, -3);
	ctx.moveTo(2, -3);
	ctx.lineTo(-12, 3);
	ctx.lineTo(-10, -3);
	ctx.stroke();

	ctx.lineWidth = 3;
	ctx.beginPath();
	ctx.moveTo(20, -3);
	ctx.lineTo(-10, -3);
	ctx.moveTo(2, -3);
	ctx.lineTo(-1, 3);
	ctx.moveTo(10, -5);
	ctx.lineTo(10, 3);
	ctx.lineTo(14, 3);
	ctx.lineTo(14, -5);
	
	ctx.stroke();
}

function drawSuperLauncher(){
	ctx.lineWidth = 8;
	ctx.beginPath();
	ctx.moveTo(20, 5);
	ctx.lineTo(-30, 5);
	ctx.stroke();

	ctx.lineWidth = 3;
	ctx.beginPath();
	ctx.moveTo(20, -3);
	ctx.lineTo(-10, -3);
	ctx.moveTo(2, -3);
	ctx.lineTo(-1, 3);
	ctx.moveTo(10, -5);
	ctx.lineTo(10, 3);
	ctx.lineTo(14, 3);
	ctx.lineTo(14, -5);
	
	ctx.stroke();
}

function drawSniper(x, y){
	ctx.lineWidth = 1;
	ctx.beginPath();
	ctx.moveTo(0, 0);
	ctx.lineTo(5, 0);
	ctx.lineTo(5, -3);
	ctx.moveTo(20, -3);
	ctx.lineTo(35, -3);
	ctx.moveTo(2, -3);
	ctx.lineTo(-12, 3);
	ctx.lineTo(-10, -3);
	
	ctx.moveTo(0, -6);
	ctx.lineTo(15, -6);
	ctx.stroke();

	ctx.lineWidth = 2;
	ctx.beginPath();
	ctx.moveTo(20, -3);
	ctx.lineTo(-10, -3);
	ctx.moveTo(2, -3);
	ctx.lineTo(-1, 3);
	ctx.moveTo(5, -3);
	ctx.lineTo(5, -6);
	ctx.moveTo(35, -3);
	ctx.lineTo(40, -3);
	
	ctx.stroke();
}

function drawHat(x, y){
	ctx.lineWidth = 4;
	ctx.beginPath();
	ctx.moveTo(x - 10, y - 5);
	ctx.lineTo(x + 10, y - 5);
	ctx.fillRect(x - 7, y - 5, 14, -8);
	ctx.stroke();
}

function drawHealth(x, y){
	ctx.fillRect(x - 20 / 2, y - 8 / 2, 20, 8);
	ctx.fillRect(x - 8 / 2, y - 20 / 2, 8, 20);
}

function drawSuperJump(x, y){
	ctx.lineWidth = 4;
	ctx.beginPath();
	ctx.moveTo(x, y + 10);
	ctx.lineTo(x, y - 10);
	ctx.lineTo(x - 10, y);
	ctx.moveTo(x, y - 10);
	ctx.lineTo(x + 10, y);

	ctx.stroke();
}

function drawSuperLauncherPickup(x, y){
	ctx.translate(x, y);
	drawSuperLauncher();
	ctx.translate(-x, -y);
}