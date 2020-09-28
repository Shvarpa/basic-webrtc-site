import "webrtc-adapter";

let ws: WebSocket;
let pc: RTCPeerConnection;

const send = (ws: WebSocket, data: Object) => ws.send(JSON.stringify(data));

function playStream(videoElement: HTMLVideoElement, wsUrl: string, config: RTCConfiguration, reportError: (err: Error) => void = (err: Error) => console.error(err.message)) {
	let mediaStream = new MediaStream();
	videoElement.srcObject = mediaStream;

	if (ws && ws.readyState == WebSocket.OPEN) ws.close();
	ws = new WebSocket(wsUrl);

	const onsdp = async (sdp: RTCSessionDescriptionInit) => {
		if (pc) pc.close();
		pc = new RTCPeerConnection(config);
		pc.addEventListener("track", ({ track }) => {
			mediaStream.addTrack(track);
			track.addEventListener("unmute", () => mediaStream.addTrack(track));
			track.addEventListener("mute", () => mediaStream.removeTrack(track));
		});
		pc.addEventListener("icecandidate", ({ candidate: data }) => {
			if (data) send(ws, { type: "ice", data });
		});
		try {
			await pc.setRemoteDescription(sdp);
			let data = await pc.createAnswer();
			await pc.setLocalDescription(data);
			send(ws, { type: "sdp", data });
		} catch (err) {
			if (reportError) reportError(err);
		}
	};
	const onice = async (ice?: RTCIceCandidateInit) => {
		try {
			pc.addIceCandidate(new RTCIceCandidate(ice));
		} catch (err) {
			if (reportError) reportError(err);
		}
	};
	ws.addEventListener("message", (ev) => {
		try {
			let { type, data } = JSON.parse(ev.data);
			if (type == "sdp") onsdp(data);
			else if (type == "ice") onice(data);
			else throw new Error(`received unrecognized message type: ${type}`);
		} catch (err) {
			if (reportError) reportError(err);
		}
	});
}

window.onload = () => {
	let videoElement = document.getElementById("stream") as HTMLVideoElement;
	var config: RTCConfiguration = { iceServers: [{ urls: "stun:stun.l.google.com:19302" }] };
	videoElement.autoplay = true;
	videoElement.muted = true;
	playStream(videoElement, `ws://${window.location.host}/ws`, config);
	// playStream(videoElement, `ws://localhost:1234/ws`, config);
};
