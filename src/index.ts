import "webrtc-adapter";

const retries = 3;
class WebRTCStream {
	mediaStream: MediaStream;
	ws?: WebSocket;
	peer?: RTCPeerConnection;
	config?: RTCConfiguration;
	wsUrl?: string;
	_retry: number;
	reportError?: (err: Error) => void;

	send: (data: Object) => void;
	connect: (wsUrl?: string) => void;
	onsdp: (sdp: RTCSessionDescriptionInit) => Promise<void>;
	onice: (ice?: RTCIceCandidateInit) => Promise<void>;
	onmessage: (ev: MessageEvent) => void;
	play: (videoElement: HTMLVideoElement) => void;

	constructor() {
		this.mediaStream = new MediaStream();
		this._retry = 1;
		this.send = (data: Object) => {
			// console.log(`sending: ${JSON.stringify(data)}`);
			if (this.ws) {
				this.ws.send(JSON.stringify(data));
			}
		};
		this.connect = (wsUrl?: string) => {
			if (this.ws) this.ws.close();
			let url = wsUrl || this.wsUrl || "";
			if (url != "") {
				console.log(`connecting to ${url}`);
				this.ws = new WebSocket(url);
				this.wsUrl = url;
				this.ws.addEventListener("message", this.onmessage);
			}
		};
		this.onsdp = async (sdp: RTCSessionDescriptionInit) => {
			if (this.peer) this.peer.close();
			this.peer = new RTCPeerConnection(this.config || {});
			this.peer.addEventListener("track", ({ track }) => {
				this.mediaStream.addTrack(track);
				track.addEventListener("unmute", () => this.mediaStream.addTrack(track));
				track.addEventListener("mute", () => this.mediaStream.removeTrack(track));
			});
			this.peer.addEventListener("icecandidate", ({ candidate: data }) => {
				if (data) this.send({ type: "ice", data });
			});
			try {
				await this.peer.setRemoteDescription(sdp);
				let data = await this.peer.createAnswer();
				await this.peer.setLocalDescription(data);
				this.send({ type: "sdp", data });
			} catch (err) {
				if (this.reportError) this.reportError(err);
				if (this._retry <= retries) {
					console.log(`reconnection retry ${this._retry}/${retries}`);
					this._retry += 1;
					this.connect();
				} else {
					console.log(`stopping reconnection`);
				}
			}
		};
		this.onice = async (ice?: RTCIceCandidateInit) => {
			try {
				if (this.peer) this.peer.addIceCandidate(new RTCIceCandidate(ice));
			} catch (err) {
				if (this.reportError) this.reportError(err);
			}
		};
		this.onmessage = (ev: MessageEvent) => {
			try {
				let { type, data } = JSON.parse(ev.data);
				if (type == "sdp") this.onsdp(data);
				else if (type == "ice") this.onice(data);
				else throw new Error(`received unrecognized message type: ${type}`);
			} catch (err) {
				if (this.reportError) this.reportError(err);
			}
		};
		this.play = (videoElement: HTMLVideoElement) => {
			videoElement.srcObject = this.mediaStream;
		};
	}
}

function playStream(videoElement: HTMLVideoElement, wsUrl: string, config: RTCConfiguration, reportError: (err: Error) => void = (err: Error) => console.error(err.message)) {
	var webrtcStream = new WebRTCStream();
	webrtcStream.config = config;
	webrtcStream.reportError = reportError;
	webrtcStream.play(videoElement);
	webrtcStream.connect(wsUrl);
}

window.onload = () => {
	let videoElement = document.getElementById("stream") as HTMLVideoElement;
	var config: RTCConfiguration = { iceServers: [{ urls: "stun:stun.l.google.com:19302" }] };
	videoElement.autoplay = true;
	videoElement.muted = true;
	// playStream(videoElement, `ws://${window.location.host}/ws`, config);
	playStream(videoElement, `ws://localhost:57778/ws`, config);
};
