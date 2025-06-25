let localStream;
let socket;
let userId;
let bubbleId;
const peers = {}; // peerId => RTCPeerConnection

function initVoiceChat(signalingUrl, generatedUserId, generatedBubbleId) {
  userId = generatedUserId;
  bubbleId = generatedBubbleId;

  console.log("VoiceChat init:", userId, bubbleId);

  socket = new WebSocket(signalingUrl);

  socket.onopen = async () => {
    try {
      localStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      socket.send(JSON.stringify({ type: 'register', id: userId, bubbleId }));
    } catch (err) {
      console.error("Microphone access error:", err);
    }
  };

  socket.onmessage = async (event) => {
    const msg = JSON.parse(event.data);

    if (msg.type === 'user-list') {
      msg.users.forEach((id) => {
        if (id !== userId && !peers[id]) {
          const initiator = userId.localeCompare(id) > 0;
          createPeer(id, initiator);
        }
      });
    }

    if (msg.type === 'user-joined') {
      if (msg.id !== userId && !peers[msg.id]) {
        const initiator = userId.localeCompare(msg.id) > 0;
        createPeer(msg.id, initiator);
      }
    }

    if (msg.type === 'user-left') {
      const id = msg.id;
      if (peers[id]) {
        peers[id].close();
        delete peers[id];
      }
    }

    const from = msg.from;
    if (!peers[from]) createPeer(from, false);
    const peer = peers[from];

    if (msg.offer) {
      try {
        await peer.setRemoteDescription(new RTCSessionDescription(msg.offer));
        const answer = await peer.createAnswer();
        await peer.setLocalDescription(answer);
        sendTo(from, { type: 'answer', answer });
      } catch (err) {
        console.warn("Failed to handle offer from", from, err);
      }

    } else if (msg.answer) {
      await peer.setRemoteDescription(new RTCSessionDescription(msg.answer));
    } else if (msg.ice) {
      try {
        await peer.addIceCandidate(new RTCIceCandidate(msg.ice));
      } catch (e) {
        console.warn("ICE error", e);
      }
    }
  };

  socket.onerror = (err) => console.error("WebSocket error:", err);
}

function createPeer(peerId, initiator) {
    if (peers[peerId]) return; // Avoid duplicate peers

  const peer = new RTCPeerConnection({
    iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
  });

  peers[peerId] = peer;

  peer.onicecandidate = ({ candidate }) => {
    if (candidate) sendTo(peerId, { type: 'ice', ice: candidate });
  };

  peer.ontrack = ({ streams: [stream] }) => {
    const audio = new Audio();
    audio.srcObject = stream;
    audio.autoplay = true;
    audio.play();
  };

  localStream.getTracks().forEach((track) => {
    peer.addTrack(track, localStream);
  });

  if (initiator) {
    peer.createOffer()
      .then(offer => peer.setLocalDescription(offer))
      .then(() => {
        sendTo(peerId, { type: 'offer', offer: peer.localDescription });
      })
      .catch((err) => console.error('Offer error:', err));
  }
}

function sendTo(to, msg) {
  socket.send(JSON.stringify({ ...msg, to }));
}

function disableVoiceChat() {
  console.log("Disabling voice chat...");

  // Stop mic tracks
  if (localStream) {
    localStream.getTracks().forEach((track) => {
      track.stop();
    });
    localStream = null;
  }

  // Close and clean up all peer connections
  for (const peerId in peers) {
    try {
      peers[peerId].close();
    } catch (err) {
      console.warn("Error closing peer", peerId, err);
    }
    delete peers[peerId];
  }

  // Optionally notify server you left (optional cleanup)
  if (socket && socket.readyState === WebSocket.OPEN) {
    socket.send(JSON.stringify({ type: "leave", id: userId }));
  }
}

window.initVoiceChat = initVoiceChat;
window.disableVoiceChat = disableVoiceChat;
