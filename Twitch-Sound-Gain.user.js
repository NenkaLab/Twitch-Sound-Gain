// ==UserScript==
// @name        Twitch-Sound-Gain
// @namespace   Twitch-Sound-Gain
// @version     0.3.0
// @author      NenkaLab
// @description 트위치 비디오 사운드를 증폭 시킵니다. / Amplifies the twitch video sound(?).
// @icon         https://www.google.com/s2/favicons?domain=twitch.tv
// @supportURL  https://github.com/NenkaLab/Twitch-Sound-Gain/issues
// @homepageURL https://github.com/NenkaLab/Twitch-Sound-Gain/
// @downloadURL https://raw.githubusercontent.com/NenkaLab/Twitch-Sound-Gain/main/Twitch-Sound-Gain.user.js
// @updateURL   https://raw.githubusercontent.com/NenkaLab/Twitch-Sound-Gain/main/Twitch-Sound-Gain.user.js
// @match       *://*.twitch.tv/*
// @require     https://greasemonkey.github.io/gm4-polyfill/gm4-polyfill.js
// @run-at      document-start
// @grant       GM_addStyle
// @grant       GM.addStyle
// @grant       GM_setValue
// @grant       GM.setValue
// @grant       GM_getValue
// @grant       GM.getValue
// @grant       GM_registerMenuCommand
// @grant       GM.registerMenuCommand
// @grant       unsafeWindow
// ==/UserScript==
/* eslint-disable no-undef */
if (window.TWITCH_SOUND_GAIN === undefined) {
    if (HTMLMediaElement.prototype.playing === undefined) {
        Object.defineProperty(HTMLMediaElement.prototype, 'playing', {
            get: function(){
                return !!(this.currentTime > 0 && !this.paused && !this.ended && this.readyState > 2);
            }
        });
    }

    function abToast(value, color = {back:null, text:null}) {
        color = {back:color.back??"#767676", text:color.text??"#FFFFFF"};
        let body = document.getElementsByTagName("body")[0];
        let toast = document.createElement("div");
        toast.innerText = "[TSG]  " + value;
        document.querySelectorAll(".ab-toast").forEach(function(e, i, a) {
            e.style.marginBottom = (e.style.height*(a.length-i))+"px";
        })
        toast.className = "ab-toast";
        toast.addEventListener('click', function() {
            body.removeChild(toast);
        });
        toast.style.background = color.back;
        toast.style.color = color.text;
        body.appendChild(toast);
        setTimeout(function(b, e) {
            b.removeChild(e);
        }, 5000, body, toast);
    }

    function abConsole(value, force = false) {
        if (force || unsafeWindow.SHOW_LOG) {
            console.log("[TSG]  "+value.toString());
        }
    }
    (async () => {
        unsafeWindow.TWITCH_SOUND_GAIN = true;
        unsafeWindow.AUDIO_BOOSTER_ELEMENT = "audioBoosterElement";
        unsafeWindow.AUDIO_BOOSTER_VALUE_ELEMENT = "audioBoosterValueElement";
        unsafeWindow.SHOW_LOG = false;

        var getData = async function (name, val) {
            return (typeof GM.getValue === "function" ? await GM.getValue(name, val) : val);
        };
        var saveData = async function (name, val) {
            return (typeof GM.setValue === "function" ? await GM.setValue(name, val) : val);
        };

        if (typeof GM.registerMenuCommand === "function") {
            await GM.registerMenuCommand("Show Logs", async function () {
                unsafeWindow.SHOW_LOG = !unsafeWindow.SHOW_LOG;
                await saveData("show_log_ab", unsafeWindow.SHOW_LOG);
                if(unsafeWindow.SHOW_LOG){
                    abConsole("Enable Logs", true);
                }
                else {
                    abConsole("Disable Logs", true);
                }
            });
        }

        unsafeWindow.SHOW_LOG = await getData("show_log_ab", false);

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
        .ab-toast {
            position: fixed;
            left: 24px;
            bottom: 24px;
            z-index: 9999999;
            text-align: center;
            padding: 8px 8px;
        }
        `;

        if (typeof GM.addStyle === "function") {
            GM.addStyle(audioBoosterStyle);
            abConsole("ADD_STYLE");
        } else {
            abConsole("FAIL_ADD_STYLE");
        }

        var controlGroupStart;
        var audioBoosterValueElement;
        var audioBoosterElement;
        var audioBoosterCtx;
        var abSource;
        var abGainNode;
        var targetVideo;
        var room;

        var noCRetry = 0;

        async function aBoosterInit() {
            noCRetry = 0;
            try {
                let roomName = window.location.pathname.split("/");
                let host = location.hostname;
                switch(roomName[1]) {
                    case 'video':
                    case 'videos':
                        room = "=" + document.querySelector(".channel-info-content div[aria-label] a").getAttribute("href").substring(1);
                        break;
                    default:
                        if (roomName[2] == "clip" || host.startsWith("clip")) {
                            abConsole("NOT_WORK_CLIP_PAGE", true);
                            abToast("Not work on clip page", {back:"#992828"});
                            return;
                        }
                        room = "=" + roomName[1];
                }
                abConsole("ROOM" + room);
                nextInit();
            } catch(e) {
                if (e.message.indexOf("getAttribute")!=-1) {
                    abConsole("FAIL_GET_ROOM_NAME", true);
                    abToast("Fail get room name... RETRY (delay 3s)", {back:"#c99a22"});
                    setTimeout(async function() {
                        await aBoosterInit();
                    }, 3000);
                } else {
                    throw e;
                }
            }
        }

        async function nextInit() {
            abConsole("START_INIT");

            //targetVideo.crossOrigin = "anonymous";

            controlGroupStart = document.querySelectorAll(".player-controls__left-control-group")[1] ?? document.querySelectorAll(".player-controls__left-control-group")[0];
            if (controlGroupStart == null) {
                if (noCRetry >= 5) {
                    abConsole("NO_CONTROLLER", true);
                    abToast("No controller found 5 times. \nPlease refresh the page.", {back:"#992828"});
                    return;
                }
                let re = 4-noCRetry;
                let ti = 4*noCRetry;
                abConsole("NO_CONTROLLER RETRY "+ti+"S. "+(re>0?"("+re+" times remaining)":""), true);
                abToast("The controller cannot be found. Retry after "+ti+" seconds. "+(re>0?"("+re+" times remaining)":""), {back:"#c99a22"});
                setTimeout(async function() {
                    noCRetry++;
                    await nextInit();
                }, 5000*noCRetry);
                return;
            }

            if (controlGroupStart.children[unsafeWindow.AUDIO_BOOSTER_ELEMENT] == undefined) {
                abConsole("INIT_ABE");
                if (controlGroupStart.children[unsafeWindow.AUDIO_BOOSTER_VALUE_ELEMENT] == undefined) {
                    abConsole("INIT_ABVE");
                    audioBoosterValueElement = document.createElement("span");
                    audioBoosterValueElement.id = unsafeWindow.AUDIO_BOOSTER_VALUE_ELEMENT;
                    audioBoosterValueElement.innerText = await getData("booster_value"+room, 1)+"%";
                    controlGroupStart.appendChild(audioBoosterValueElement)
                }
                audioBoosterElement = document.createElement("input");
                audioBoosterElement.id = unsafeWindow.AUDIO_BOOSTER_ELEMENT;
                audioBoosterElement.type = "range";
                audioBoosterElement.value = await getData("booster_value"+room, 1)*10;
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

            abGainNode.gain.value = await getData("booster_value"+room, 1);
            abConsole("GAIN_VALUE="+abGainNode.gain.value.toString());
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
                    await saveData("booster_value"+room, value);
                }, 500);
            }

            audioBoosterElement.addEventListener("input", boosterUpdate);
            abConsole("END_INIT");
        }

        async function checkVideo() {
            targetVideo = document.getElementsByTagName("video")[0];
            if (targetVideo != null) {
                await aBoosterInit();
            } else abConsole("NO_VIDEO");
        }

        window.addEventListener("load", async function() {
            await checkVideo();
        });

        var pushState = history.pushState;
        history.pushState = async function () {
            pushState.apply(history, arguments);
            await checkVideo();
        };

        abConsole("END");
        if (unsafeWindow) unsafeWindow.checkVideoAG = checkVideo;
        else if (window) window.checkVideoAG = checkVideo;
    })();
}
