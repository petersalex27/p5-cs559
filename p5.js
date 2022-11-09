let t_ = 0;
const tInc = Math.PI / 180;
let lookAt = {
	camera		:undefined,
	observer	:undefined,
};
let isCamView = true;
let lookAtMat;

let updateLookAtCam = function() {};

function toggleView() {
	isCamView = !isCamView;
	if (isCamView) lookAtMat = lookAt.camera;
	else lookAtMat = lookAt.observer;
}

function getProj() {
	let proj = mat4.create();
	if (isCamView) mat4.perspective(proj, Math.PI / 3, 1, -1, 1);
	else mat4.perspective(proj, Math.PI/3, 1, -1, 1);
	return proj;
}

const proj = getProj();

const viewPort = mat4.create();
mat4.fromTranslation(viewPort, [200, 300, 0]);
mat4.scale(viewPort, viewPort, [200, -200, 1]);

function moveToTx(loc,Tx) {
	let res = vec3.create();
	vec3.transformMat4(res,loc,Tx);
	cxt.moveTo(res[0],res[1]);
}

function lineToTx(loc,Tx) {
	let res = vec3.create();
	vec3.transformMat4(res,loc,Tx);
	cxt.lineTo(res[0],res[1]);
}

function draw3DAxes(color,TxU,scale) {
	let Tx = mat4.clone(TxU);
	mat4.scale(Tx,Tx,[scale,scale,scale]);

	cxt.strokeStyle=color;
	cxt.beginPath();
	// Axes
	moveToTx([1.2,0,0],Tx);lineToTx([0,0,0],Tx);lineToTx([0,1.2,0],Tx);
	moveToTx([0,0,0],Tx);lineToTx([0,0,1.2],Tx);
	// Arrowheads
	moveToTx([1.1,.05,0],Tx);lineToTx([1.2,0,0],Tx);lineToTx([1.1,-.05,0],Tx);
	moveToTx([.05,1.1,0],Tx);lineToTx([0,1.2,0],Tx);lineToTx([-.05,1.1,0],Tx);
	moveToTx([.05,0,1.1],Tx);lineToTx([0,0,1.2],Tx);lineToTx([-.05,0,1.1],Tx);
	// X-label
	moveToTx([1.3,-.05,0],Tx);lineToTx([1.4,.05,0],Tx);
	moveToTx([1.3,.05,0],Tx);lineToTx([1.4,-.05,0],Tx);
	// Y-label
	moveToTx([-.05,1.4,0],Tx);lineToTx([0,1.35,0],Tx);lineToTx([.05,1.4,0],Tx);
	moveToTx([0,1.35,0],Tx);lineToTx([0,1.28,0],Tx);
	// Z-label
	moveToTx([-.05,0,1.3],Tx);
	lineToTx([.05,0,1.3],Tx);
	lineToTx([-.05,0,1.4],Tx);
	lineToTx([.05,0,1.4],Tx);

	cxt.stroke();
}

const alpha = 2;
const waveFn = (x, z) => cos(x/alpha) + cos(z/alpha);
const dxWaveFn = (x, z) => -(1/alpha) * sin(x/alpha);
const dzWaveFn = (x, z) => -(1/alpha) * sin(z/alpha);

function drawWaves(TxU, scale) {
	let Tx = mat4.clone(TxU);
	mat4.scale(Tx,Tx,[scale,scale,scale]);
	cxt.fillStyle = 'rgb(68,212,231)';
	const f = waveFn;
	const dist = 3 - -3;
	const scaling = 10;
	const step = dist / scaling;

	for (let x = -10 + step; x < 10; x += step) {
		let res;
		let res2;
		let res3;
		let res4;
		for (let z = -10 + step; z < 10; z += step) {
			cxt.beginPath();
			res = vec3.create();
			res2 = vec3.create();
			res3 = vec3.create();
			res4 = vec3.create();
			let locs = [
				[x, f(x + t_, z + t_), z],
				[x, f(x + t_, z - step + t_), z - step],
				[x - step, f(x - step + t_, z - step + t_), z - step],
				[x - step, f(x - step + t_, z + t_), z],
			];
			vec3.transformMat4(res, locs[0], Tx);
			vec3.transformMat4(res2, locs[1], Tx);
			vec3.transformMat4(res3, locs[2], Tx);
			vec3.transformMat4(res4, locs[3], Tx);
			cxt.moveTo(res[0], res[1]);
			cxt.lineTo(res2[0], res2[1]);
			cxt.lineTo(res3[0], res3[1]);
			cxt.lineTo(res4[0], res4[1]);
			cxt.lineTo(res[0], res[1]);
			cxt.fill();
		}
	}
}

const {cos, sin, PI} = Math;

function drawLineSeq(seq, doMove=false, cxtfn=()=>cxt.fill()) {
	cxt.beginPath();
	if (doMove && seq.length > 0) cxt.moveTo(seq[0][0], seq[0][1]);
	for (let i = (doMove ? 1 : 0); i < seq.length; ++i) cxt.lineTo(seq[i][0], seq[i][1]);
	cxtfn();
}

class Booey {
	cospi2 = cos(PI / 2);
	sinpi2 = sin(PI / 2);

	color = {
		main 	: 'rgb(239,62,62)',
		mainh	: 'rgb(250,118,110)',
		mainl	: 'rgb(176,85,97)',
		base 	: 'rgb(63,55,55)',
		light 	: 'rgb(255,252,218)',
		bar		: 0,
	};

	dims = {
		height : 0,
		base : {
			height	: 0,
			top		: [0, 0, 0],
			bottom	: [0, 0, 0],
		},
		top : {
			height	: 0,
			base 	: [0, 0, 0],
			rim 	: [0, 0, 0],
			light   : [0, 0, 0],
		},
		// x and z values only
		bars : {
			height	: 0,
			main 	: [0, 0],
			support : [0, 0],
		}
	};

	locs = {
		base 	: [0, 0],
		mid		: [0, 0],
		top 	: [0, 0],
		light	: [0, 0],
	};

	constructor (cmain='rgb(239,62,62)', cbase='rgb(63,55,55)',
				 clight='rgb(255,252,218)', cbar='rgb(199,192,192)',
				 height=50, baseW=10, topW=8, baseHPer=0.25, topHPer=0.3, barMainW=10/8, barSupW=10/9) {
		// set-up for dims
		this.dims.base.top = [baseW, height * (baseHPer * 5 / 8), baseW];
		this.dims.base.bottom = [baseW, height * (baseHPer * 3 / 8), baseW];
		this.dims.top.base = [topW - 1, height * topHPer * (3 / 8), topW - 1];
		this.dims.top.rim = [topW, height * topHPer / 8, topW];
		this.dims.top.light = [topW / 3, height * topHPer / 2, topW / 3];
		this.dims.bars.main = [barMainW, barMainW];
		this.dims.bars.support = [barSupW, barSupW];
		this.dims.base.height = height * baseHPer;
		this.dims.base.height = height * topHPer;
		this.dims.bars.height = height - height * (baseHPer + topHPer);
		// set-up for colors
		this.color.base = cbase;
		this.color.main = cmain;
		this.color.light = clight;
		this.color.bar = cbar;
		// set-up for locs
		this.locs.base = [0, height * baseHPer];
		this.locs.mid = [this.locs.base[1], this.locs.base[1] + this.dims.bars.height];
		this.locs.top = [this.locs.mid[1], this.locs.mid[1] + this.dims.top.height / 2];
		this.locs.light = [this.locs.top[1], height];
	}

	drawBase(TxU, scale=[10,10,10], color='red', loc=[0,0,0], res=15) {
		let bDraw = [];
		let tDraw = [];
		let Tx = mat4.clone(TxU);
		mat4.translate(Tx, Tx, [loc[0], loc[1], loc[2]]);
		mat4.scale(Tx, Tx, scale);
		cxt.fillStyle = color;
		let first = [cos(0), waveFn(cos(t_), sin(t_)), sin(0)];
		let second = [first[0], 1, first[2]];
		let firstNext;
		let secondNext;
		const step = (PI * 2 / res);
		const lines = [vec3.create(), vec3.create(), vec3.create(), vec3.create()];
		vec3.transformMat4(lines[0], first, Tx);
		vec3.transformMat4(lines[1], second, Tx);
		for (let t = 0; t < 2 * PI; t += step) {
			firstNext = [
				cos(t + step),
				waveFn(cos(t + t_) * 10, sin(t + t_) * 10) / 10,
				sin(t + step)];
			secondNext = [firstNext[0], 1, firstNext[2]];
			vec3.transformMat4(lines[2], firstNext, Tx);
			vec3.transformMat4(lines[3], secondNext, Tx);

			drawLineSeq([lines[2], lines[0], lines[1], lines[3], lines[2]], true);

			first = structuredClone(firstNext);
			second = structuredClone(secondNext);
			lines[0] = structuredClone(lines[2]);
			lines[1] = structuredClone(lines[3]);
		}
	}

	drawCyl(TxU, scale=[10,10,10], color='red', loc=[0, 0, 0], topClosed=false, botClosed=false, res=15) {
		let bDraw = [];
		let tDraw = [];
		let Tx = mat4.clone(TxU);
		mat4.translate(Tx, Tx, [loc[0], loc[1], loc[2]]);
		mat4.scale(Tx, Tx, scale);
		cxt.fillStyle = color;
		let first = [cos(0), 0, sin(0)];
		let second = [first[0], 1, first[2]];
		let firstNext;
		let secondNext;
		const step = (PI * 2 / res);
		const lines = [vec3.create(), vec3.create(), vec3.create(), vec3.create()];
		vec3.transformMat4(lines[0], first, Tx);
		vec3.transformMat4(lines[1], second, Tx);
		for (let t = 0; t < 2 * PI; t += step) {
			firstNext = [cos(t + step), 0, sin(t + step)];
			secondNext = [firstNext[0], 1, firstNext[2]];
			vec3.transformMat4(lines[2], firstNext, Tx);
			vec3.transformMat4(lines[3], secondNext, Tx);

			drawLineSeq([lines[2], lines[0], lines[1], lines[3], lines[2]], true);

			if (botClosed) bDraw.push(structuredClone(lines[0]));
			else if (topClosed) tDraw.push(structuredClone(lines[1]));
			first = structuredClone(firstNext);
			second = structuredClone(secondNext);
			lines[0] = structuredClone(lines[2]);
			lines[1] = structuredClone(lines[3]);
		}

		if (topClosed) drawLineSeq(tDraw, true);
		if (botClosed) drawLineSeq(bDraw, true);
	}

	drawBar(TxU, range, fromXZ, rot) {
		let Tx = mat4.clone(TxU);
		mat4.translate(Tx, Tx, [fromXZ[0], range[0], fromXZ[1]]);
		mat4.rotate(Tx, Tx, rot, [0, 1, 0]);
		//mat4.scale(Tx,Tx,[scale,scale,scale]);

		cxt.fillStyle = this.color.bar;

		let lines = [vec3.create(), vec3.create(), vec3. create(), vec3.create()];
		let firstNext, secondNext;
		const initFirst = [fromXZ[0] * this.dims.base.top[0], 0, fromXZ[1] * this.dims.base.top[1]];
		const initSecond = [fromXZ[0] * this.dims.top.base[0], this.dims.bars.height, fromXZ[1] * this.dims.top.base[1]];
		let first = structuredClone(initFirst);
		let second = structuredClone(initSecond);
		vec3.transformMat4(lines[0], first, Tx);
		vec3.transformMat4(lines[1], second, Tx);
		for (let i = 0; i < 2; ++i) {
			firstNext = [
				initFirst[0] + this.dims.bars.main[0] * (i ? 1 : -1) * cos(PI/6),
				0,
				initFirst[2] + this.dims.bars.main[0] * cos(PI/6)];
			secondNext = [
				initSecond[0] + this.dims.bars.main[0] * (i ? 1 : -1) * cos(PI/6),
				initSecond[1],
				initSecond[2] + this.dims.bars.main[0] * cos(PI/6)];
			vec3.transformMat4(lines[2], firstNext, Tx);
			vec3.transformMat4(lines[3], secondNext, Tx);
			drawLineSeq([lines[2], lines[0], lines[1], lines[3], lines[2]], true);
		}
	}

	draw(TxU0) {
		let TxU = mat4.clone(TxU0);
		mat4.rotateX(TxU, TxU, Math.atan(dxWaveFn(t_, t_)));
		mat4.rotateZ(TxU, TxU, Math.atan(dzWaveFn(t_, t_)));
		mat4.translate(TxU, TxU, [0, 10 * waveFn(t_, t_), 0]);
		this.drawBase(TxU, this.dims.base.bottom, this.color.base, [0, 0, 0]);
		this.drawCyl(TxU, this.dims.base.top, this.color.main, [0, this.dims.base.bottom[1], 0], true, false);
		let arr = [0, 1];
		this.drawBar(TxU, this.locs.mid, arr, 0);
		this.drawBar(TxU, this.locs.mid, arr, PI / 2);
		this.drawBar(TxU, this.locs.mid, arr, PI);
		this.drawBar(TxU, this.locs.mid, arr, 3 * PI / 2);
		this.drawCyl(TxU, this.dims.top.base, this.color.main, [0, this.locs.top[1], 0], false, true);
		this.drawCyl(TxU, this.dims.top.rim, this.color.main, [0, this.locs.top[1] + this.dims.top.base[1], 0], true, false);
	}
}

function setup() {
	let spinVal = 0;
	let distVal = 0;
	let yLookVal = 0;
	let hCamVal = 100;

	let switchView = document.getElementById('switchView');
	switchView.value = "Fixed-View";
	let distSlider = document.getElementById('distSlider');
	distSlider.value = 120;
	let spin = document.getElementById('xz-spin');
	spin.value = 0;
	let yLookSlider = document.getElementById('yLook');
	yLookSlider.value = 0;
	let camHSlider = document.getElementById('camY');
	camHSlider.value = 100;

	const booey = new Booey();

	const CameraCurve = (angle) => {
		let dist = distSlider.value;
		let eye = vec3.create();
		eye[0] = dist * Math.sin(angle);
		eye[1] = camHSlider.value;
		eye[2] = dist * Math.cos(angle);
		return [eye[0], eye[1], eye[2]];
	}

	const upCoords = vec3.fromValues(0, 1, 0);	// same for both observer and camera view

	// updated when spin or yLookSlider change
	updateLookAtCam = function() {
		let eye = CameraCurve(spin.value * Math.PI / 180);
		let targ = vec3.fromValues(0, yLookSlider.value, 0); // Aim at the origin of the world coords
		let lookAtCam = mat4.create();
		mat4.lookAt(lookAtCam, eye, targ, upCoords);

		lookAt.camera = lookAtCam;
		lookAtMat = lookAt.camera;
	}

	updateLookAtCam();

	// Create Observer (lookAt) transform
	let eyeObserver = vec3.fromValues(500,300,500);
	let targetObserver = vec3.fromValues(0,50,0); // Observer still looks at origin
	lookAt.observer = mat4.create();
	mat4.lookAt(lookAt.observer, eyeObserver, targetObserver, upCoords);

	lookAtMat = lookAt.camera; // start at camera view

	function draw() {
		canvas.width = canvas.width;

		let vpProj = mat4.create();
		mat4.multiply(vpProj, viewPort, proj);
		mat4.multiply(vpProj, vpProj, lookAtMat);

		draw3DAxes("grey", vpProj, 100.0);
		drawWaves(vpProj, 10);
		booey.draw(vpProj);


		t_ += tInc;
		window.requestAnimationFrame(draw);
	}

	switchView.addEventListener("click", () => {
		switchView.value = (isCamView ? "Free-View" : "Fixed-View");
		toggleView();
		draw();
	});

	distSlider.addEventListener("input", () => {
		if (!isCamView) {
			distSlider.value = distVal;
			return;
		}

		distVal = distSlider.value;
		updateLookAtCam();
		draw();
	});

	spin.addEventListener("input", () => {
		if (!isCamView) {
			spin.value = spinVal;
			return;
		}

		spinVal = spin.value;
		updateLookAtCam();
		draw();
	});

	window.addEventListener("keypress", (ev) => {
		if (!isCamView) return;

		if (ev.key === 'a') {
			spinVal--;
			spinVal = (spinVal >= 0 ? spinVal : spin.max);
		} else if (ev.key === 'd') {
			spinVal++;
			spinVal = spinVal % spin.max;
		} else if (ev.key === 'w' && camHSlider.value < camHSlider.max.valueOf()) {
			camHSlider.value++;
		} else if (ev.key === 's' && camHSlider.value > camHSlider.min) {
			camHSlider.value--;
		}

		hCamVal = camHSlider.value;
		spin.value = spinVal;

		updateLookAtCam();
		draw();
	});

	yLookSlider.addEventListener("input", () => {
		if (!isCamView) {
			yLookSlider.value = yLookVal;
			return;
		}

		yLookVal = yLookSlider.value;
		updateLookAtCam();
		draw();
	});

	camHSlider.addEventListener("input", () => {
		if (!isCamView) {
			camHSlider.value = hCamVal;
			return;
		}

		hCamVal = camHSlider.value;
		updateLookAtCam();
		draw();
	});

	window.requestAnimationFrame(draw);
}
window.onload = setup;