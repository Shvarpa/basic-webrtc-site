let ws: WebSocket;
let pc: RTCPeerConnection;

const createWsURL = (wsHost: string, wsPort: number, wsPath?: string) => `ws://${wsHost}${wsPort ? `:${wsPort}` : ""}/${wsPath}`;

const send = (ws: WebSocket, data: Object) => ws.send(JSON.stringify(data));

function playStream(videoElement: HTMLVideoElement, wsUrl: string, config: RTCConfiguration, reportError: (err: Error) => void = (err: Error) => console.error(err.message)) {
	let mediaStream = new MediaStream();
	videoElement.srcObject = mediaStream;

	if (ws && ws.readyState == WebSocket.OPEN) ws.close();
	ws = new WebSocket(wsUrl);

	if (pc) pc.close();
	pc = new RTCPeerConnection(config);
	const onsdp = async (sdp) => {
		try {
			await pc.setRemoteDescription(sdp);
			let data = await pc.createAnswer();
			await pc.setLocalDescription(data);
			send(ws, { type: "sdp", data });
		} catch (err) {
			if (reportError) reportError(err);
		}
	};
	const onice = async (ice) => {
		try {
			pc.addIceCandidate(new RTCIceCandidate(ice));
		} catch (err) {
			if (reportError) reportError(err);
		}
	};

	pc.addEventListener("track", ({ track }) => {
		mediaStream.addTrack(track);
		track.addEventListener("mute", () => {
			mediaStream.removeTrack(track);
		});
	});
	pc.addEventListener("icecandidate", ({ candidate: data }) => {
		if (data) send(ws, { type: "ice", data });
	});
	ws.addEventListener("message", (ev) => {
		try {
			let { type, data } = JSON.parse(ev.data);
			if (type == "sdp") onsdp(data);
			else if (type == "ice") onice(data);
		} catch (err) {
			if (reportError) reportError(err);
		}
	});
}

window.onload = () => {
	let videoElement = document.getElementById("stream") as HTMLVideoElement;
	var config: RTCConfiguration = {
		iceServers: [
			{
				urls: "stun:stun.l.google.com:19302",
			},
		],
	};
	videoElement.autoplay = true;
	videoElement.muted = true;
	playStream(videoElement, "ws://127.0.0.1:57778/ws", config);
};
