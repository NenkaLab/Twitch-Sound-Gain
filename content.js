var audioBoosterStyle = audioBoosterStyle || `.audio-booster[type=range] {
	margin-left: 16px;
	margin-right: 16px;
    -webkit-appearance: none;
    width: 100px;
    height: 2px;
    background: #8e8e8e;
    cursor: pointer;
    border-radius: 0;
}

.audio-booster[type=range]:focus {
    outline: none;
}

.audio-booster[type=range]::-webkit-slider-thumb {
    -webkit-appearance: none;
    width: 16px;
    height: 16px;
    background: #fff;
    border-radius:50%;
    cursor: pointer;
}

.audio-booster[type=range]::-moz-range-thumb {
    -webkit-appearance: none;
    width: 16px;
    height: 16px;
    background: #fff;
    border-radius:50%;
    cursor: pointer;
}`;

function saveBoosterData(value) {
    if (localStorage != undefined) {
		localStorage.setItem('audioBooster', value);
	}
}

function getBoosterData() {
    if (localStorage != undefined) {
		let value = localStorage.getItem('audioBooster');
		if (value == null || value <= 0 || value >= 11) {
			return 1;
		}
		return value;
	}
	return 1;
}

var controlGroupStart = controlGroupStart || document.querySelector(".player-controls__left-control-group.tw-justify-content-start");
var headDDDDDD = headDDDDDD || document.getElementsByTagName("head")[0];
var audioBoosterStyleElement = audioBoosterStyleElement || document.createElement("style");
var audioBoosterValueElement = audioBoosterValueElement || document.createElement("span");
var audioBoosterElement = audioBoosterElement || document.createElement("input");

if (headDDDDDD.children["audioBoosterStyleElement"] == undefined) {
    audioBoosterStyleElement.id = "audioBoosterStyleElement";
    audioBoosterStyleElement.innerText += audioBoosterStyle;
    headDDDDDD.appendChild(audioBoosterStyleElement);
}
if (controlGroupStart.children["audioBoosterElement"] == undefined) {
    if (controlGroupStart.children["audioBoosterValueElement"] == undefined) {
        audioBoosterValueElement.id = "audioBoosterValueElement";
        controlGroupStart.appendChild(audioBoosterValueElement)
    }
    audioBoosterElement.id = "audioBoosterElement";
    audioBoosterElement.className = "audio-booster";
    audioBoosterElement.type = "range";
    audioBoosterElement.value = getBoosterData();
    audioBoosterElement.min = "1";
    audioBoosterElement.max = "1000";
    controlGroupStart.appendChild(audioBoosterElement);
} else {
    audioBoosterElement.removeEventListener("input", boosterUpdate);
}

var audioBoosterCtx = audioBoosterCtx || new AudioContext();
var abSource = abSource || audioBoosterCtx.createMediaElementSource(document.getElementsByTagName("video")[0]);
var abGainNode = abGainNode || audioBoosterCtx.createGain();
var abSTimer = null;

abGainNode.gain.value = Number(getBoosterData());
try{abSource.connect(abGainNode);}catch(e){}
try{abGainNode.connect(audioBoosterCtx.destination);}catch(e){}

function boosterUpdate(e) {
	let value = e.target.value/10;
    let slideValue = Math.trunc(value);
	abGainNode.gain.value = value;
    audioBoosterElement.style.background = `linear-gradient(to right, white 0%, white ${slideValue}%, #8e8e8e ${slideValue}%, #8e8e8e 100%)`;
	if (abSTimer != null) clearTimeout(abSTimer);
	abSTimer = setTimeout(function() {
		saveBoosterData(value);
	}, 500);
}

audioBoosterElement.addEventListener("input", boosterUpdate);
