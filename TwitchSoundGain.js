
// ==UserScript==
// @name        TwitchSoundGain
// @namespace   TwitchSoundGain
// @version     0.0.2
// @author      NenkaLab
// @description 트위치 비디오 사운드를 증폭 시킵니다. / Amplifies the twitch video sound(?).
// @icon        https://www.twitch.tv/favicon.ico
// @supportURL  https://github.com/NenkaLab/TwitchSoundGain/issues
// @homepageURL https://github.com/NenkaLab/TwitchSoundGain/
// @downloadURL https://raw.githubusercontent.com/NenkaLab/TwitchSoundGain/main/TwitchSoundGain.js
// @updateURL   https://raw.githubusercontent.com/NenkaLab/TwitchSoundGain/main/TwitchSoundGain.js
// @include     *://*.twitch.tv/*
// @require     https://greasemonkey.github.io/gm4-polyfill/gm4-polyfill.js
// @run-at      document-start
// @grant       GM_addStyle
// @grant       GM.addStyle
// @grant       GM_setValue
// @grant       GM.setValue
// @grant       GM_getValue
// @grant       GM.getValue
// @grant       unsafeWindow
// ==/UserScript==
/* eslint-disable no-undef */
if (window.TWITCH_SOUND_GAIN === undefined) {
    function abConsole(value) {
        console.log("[TSG]  "+value.toString());
    }
    (async () => {
        unsafeWindow.TWITCH_SOUND_GAIN = true;
        abConsole("START");
        var audioBoosterStyle = `#audioBoosterElement[type=range] {
            margin-left: 2px;
            margin-right: 16px;
            -webkit-appearance: none;
            width: 100px;
            height: 2px;
            background: #8e8e8e;
            cursor: pointer;
            border-radius: 0;
        }
        #audioBoosterElement[type=range]:focus {
            outline: none;
        }
        #audioBoosterElement[type=range]::-webkit-slider-thumb {
            -webkit-appearance: none;
            width: 16px;
            height: 16px;
            background: #fff;
            border-radius:50%;
            cursor: pointer;
        }
        #audioBoosterElement[type=range]::-moz-range-thumb {
            -webkit-appearance: none;
            width: 16px;
            height: 16px;
            background: #fff;
            border-radius:50%;
            cursor: pointer;
        }
        #audioBoosterValueElement {
            width: 50px;
            text-align: center;
        }
        `;

        if (typeof GM.addStyle === "function") {
            GM.addStyle(audioBoosterStyle);
            abConsole("ADD_STYLE");
        } else {
            abConsole("FAIL_ADD_STYLE");
        }

        var getData = async function (name, val) {
            return (typeof GM.getValue === "function" ? await GM.getValue(name, val) : val);
        };
        var saveData = async function (name, val) {
            return (typeof GM.setValue === "function" ? await GM.setValue(name, val) : val);
        };

        var controlGroupStart;
        var headDDDDDD;
        var audioBoosterValueElement;
        var audioBoosterElement;
        var audioBoosterCtx;
        var abSource;
        var abGainNode;
        var targetVideo;

        async function aBoosterInit() {
            abConsole("START_INIT");
            controlGroupStart = controlGroupStart || document.querySelector(".player-controls__left-control-group.tw-justify-content-start");
            headDDDDDD = headDDDDDD || document.getElementsByTagName("head")[0];
            audioBoosterValueElement = audioBoosterValueElement || document.createElement("span");
            audioBoosterElement = audioBoosterElement || document.createElement("input");

            if (controlGroupStart.children["audioBoosterElement"] == undefined) {
                abConsole("INIT_ABE");
                if (controlGroupStart.children["audioBoosterValueElement"] == undefined) {
                    abConsole("INIT_ABVE");
                    audioBoosterValueElement.id = "audioBoosterValueElement";
                    audioBoosterValueElement.innerText = await getData("booster_value", 1)+"%";
                    controlGroupStart.appendChild(audioBoosterValueElement)
                }
                audioBoosterElement.id = "audioBoosterElement";
                audioBoosterElement.type = "range";
                audioBoosterElement.value = await getData("booster_value", 1)*10;
                audioBoosterElement.min = "1";
                audioBoosterElement.max = "1000";
                controlGroupStart.appendChild(audioBoosterElement);
            } else {
                audioBoosterElement.removeEventListener("input", boosterUpdate);
            }

            audioBoosterCtx = audioBoosterCtx || new (window.AudioContext || window.webkitAudioContext)();
            abSource = abSource || audioBoosterCtx.createMediaElementSource(targetVideo);
            abGainNode = abGainNode || audioBoosterCtx.createGain();
            var abSTimer = null;

            abGainNode.gain.value = await getData("booster_value", 1);
            try{abSource.connect(abGainNode);}catch(e){}
            try{abGainNode.connect(audioBoosterCtx.destination);}catch(e){}

            function boosterUpdate(e) {
                let value = e.target.value/10;
                let slideValue = Math.trunc(value);
                abGainNode.gain.value = value;
                audioBoosterValueElement.innerText = value.toString()+"%";
                audioBoosterElement.style.background = `linear-gradient(to right, white 0%, white ${slideValue}%, #8e8e8e ${slideValue}%, #8e8e8e 100%)`;
                if (abSTimer != null) clearTimeout(abSTimer);
                abSTimer = setTimeout(async function() {
                    await saveData("booster_value", value);
                }, 500);
            }

            audioBoosterElement.addEventListener("input", boosterUpdate);
            abConsole("END_INIT");
        }

        window.addEventListener ("load", async function() {
            targetVideo = document.getElementsByTagName("video")[0];
            if (targetVideo != null) await aBoosterInit();
        });

        abConsole("END");
    })();
}
