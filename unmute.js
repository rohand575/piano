"use strict";
/**
 * unmute.js by Spencer Evans (swevans/unmute on GitHub)
 * MIT License
 *
 * Enables web audio playback with the iOS mute switch on.
 * Forces WebAudio onto the media channel (speaker) instead of the ringer channel (earpiece).
 * Automatically resumes/suspends audio context on page visibility changes.
 */
function unmute(context, allowBackgroundPlayback, forceIOSBehavior) {
    if (allowBackgroundPlayback === void 0) { allowBackgroundPlayback = false; }
    if (forceIOSBehavior === void 0) { forceIOSBehavior = false; }

    // Determine the page visibility api
    var pageVisibilityAPI;
    if (document.hidden !== undefined)
        pageVisibilityAPI = { hidden: "hidden", visibilitychange: "visibilitychange" };
    else if (document.webkitHidden !== undefined)
        pageVisibilityAPI = { hidden: "webkitHidden", visibilitychange: "webkitvisibilitychange" };
    else if (document.mozHidden !== undefined)
        pageVisibilityAPI = { hidden: "mozHidden", visibilitychange: "mozvisibilitychange" };
    else if (document.msHidden !== undefined)
        pageVisibilityAPI = { hidden: "msHidden", visibilitychange: "msvisibilitychange" };

    function addEventListeners(target, events, handler, capture, passive) {
        for (var i = 0; i < events.length; ++i)
            target.addEventListener(events[i], handler, { capture: capture, passive: passive });
    }
    function removeEventListeners(target, events, handler, capture, passive) {
        for (var i = 0; i < events.length; ++i)
            target.removeEventListener(events[i], handler, { capture: capture, passive: passive });
    }
    function noop() { }

    // iOS Detection
    var ua = navigator.userAgent.toLowerCase();
    var isIOS = (forceIOSBehavior ||
        (ua.indexOf("iphone") >= 0 && ua.indexOf("like iphone") < 0) ||
        (ua.indexOf("ipad") >= 0 && ua.indexOf("like ipad") < 0) ||
        (ua.indexOf("ipod") >= 0 && ua.indexOf("like ipod") < 0) ||
        (ua.indexOf("mac os x") >= 0 && navigator.maxTouchPoints > 0)
    );

    // Playback Allowed State
    var allowPlayback = true;

    function updatePlaybackState() {
        var shouldAllowPlayback = (allowBackgroundPlayback || (
            (!pageVisibilityAPI || !document[pageVisibilityAPI.hidden]) &&
            (!isIOS || document.hasFocus())
        ) ? true : false);
        if (shouldAllowPlayback !== allowPlayback) {
            allowPlayback = shouldAllowPlayback;
            updateChannelState(false);
            updateContextState();
        }
    }

    function doc_visChange() { updatePlaybackState(); }
    if (pageVisibilityAPI)
        addEventListeners(document, [pageVisibilityAPI.visibilitychange], doc_visChange, true, true);

    function win_focusChange(evt) {
        if (evt && evt.target !== window) return;
        updatePlaybackState();
    }
    if (isIOS)
        addEventListeners(window, ["focus", "blur"], win_focusChange, true, true);

    // WebAudio Context State
    function updateContextState() {
        if (allowPlayback) {
            if (context.state !== "running" && context.state !== "closed") {
                if (hasMediaPlaybackEventOccurred) {
                    var p = context.resume();
                    if (p) p.then(noop, noop).catch(noop);
                }
            }
        } else {
            if (context.state === "running") {
                var p = context.suspend();
                if (p) p.then(noop, noop).catch(noop);
            }
        }
    }

    function context_statechange(evt) {
        if (!evt || !evt.unmute_handled) {
            evt.unmute_handled = true;
            updateContextState();
        }
    }
    addEventListeners(context, ["statechange"], context_statechange, true, true);
    if (!context.onstatechange)
        context.onstatechange = context_statechange;

    // HTML Audio Channel State
    var channelTag = null;

    function huffman(count, repeatStr) {
        var e = repeatStr;
        for (; count > 1; count--) e += repeatStr;
        return e;
    }

    // Silent MP3: 0.01 seconds of silence VBR220-260 Joint Stereo 859B
    // Must be high quality - web audio sound is mixed to match the bitrate of the html sound
    var silence = "data:audio/mpeg;base64,//uQx" + huffman(23, "A") +
        "WGluZwAAAA8AAAACAAACcQCA" + huffman(16, "gICA") + huffman(66, "/") +
        "8AAABhTEFNRTMuMTAwA8MAAAAAAAAAABQgJAUHQQAB9AAAAnGMHkkI" + huffman(320, "A") +
        "//sQxAADgnABGiAAQBCqgCRMAAgEAH" + huffman(15, "/") +
        "7+n/9FTuQsQH//////2NG0jWUGlio5gLQTOtIoeR2WX////X4s9Atb/JRCbBUpeRUq" + huffman(18, "/") +
        "9RUi0f2jn/+xDECgPCjAEQAABN4AAANIAAAAQVTEFNRTMuMTAw" + huffman(97, "V") + "Q==";

    function updateChannelState(isMediaPlaybackEvent) {
        if (isIOS) {
            if (allowPlayback) {
                if (isMediaPlaybackEvent) {
                    if (!channelTag) {
                        var tmp = document.createElement("div");
                        tmp.innerHTML = "<audio x-webkit-airplay='deny'></audio>";
                        channelTag = tmp.children.item(0);
                        channelTag.controls = false;
                        channelTag.disableRemotePlayback = true;
                        channelTag.preload = "auto";
                        channelTag.src = silence;
                        channelTag.loop = true;
                        channelTag.load();
                    }
                    if (channelTag.paused) {
                        var p = channelTag.play();
                        if (p) p.then(noop, destroyChannelTag).catch(destroyChannelTag);
                    }
                }
            } else {
                destroyChannelTag();
            }
        }
    }

    function destroyChannelTag() {
        if (channelTag) {
            channelTag.src = "about:blank";
            channelTag.load();
            channelTag = null;
        }
    }

    // Input - media playback events
    var mediaPlaybackEvents = ["click", "contextmenu", "auxclick", "dblclick", "mousedown", "mouseup", "touchend", "keydown", "keyup"];
    var hasMediaPlaybackEventOccurred = false;

    function win_mediaPlaybackEvent() {
        hasMediaPlaybackEventOccurred = true;
        updateChannelState(true);
        updateContextState();
    }
    addEventListeners(window, mediaPlaybackEvents, win_mediaPlaybackEvent, true, true);

    return {
        dispose: function () {
            destroyChannelTag();
            if (pageVisibilityAPI)
                removeEventListeners(document, [pageVisibilityAPI.visibilitychange], doc_visChange, true, true);
            if (isIOS)
                removeEventListeners(window, ["focus", "blur"], win_focusChange, true, true);
            removeEventListeners(window, mediaPlaybackEvents, win_mediaPlaybackEvent, true, true);
            removeEventListeners(context, ["statechange"], context_statechange, true, true);
            if (context.onstatechange === context_statechange)
                context.onstatechange = null;
        }
    };
}
