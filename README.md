# webrtc-voice-chat

# Unity WebGL Voice Chat (WebRTC + Node.js Signaling)

This project enables **real-time voice chat** for **Unity WebGL builds** using **WebRTC** and a custom **Node.js WebSocket signaling server**.

---

## Features

- Peer-to-peer audio communication via WebRTC.
- Bubble-based voice scoping (users only hear others in their "bubble").
- Easy integration with Unity WebGL via a `.jslib` plugin.
- Minimal signaling server in Node.js for managing connections.

## Project Structure

- `voice.chat.server.js`: Node.js WebSocket signaling server.
- `voiceChat.js`: WebRTC handling code included in Unity WebGL build.
- `VoiceChat.jslib`: Unity WebGL plugin for interfacing with the JS voice logic.
- Unity C# example: Shows how to call into the voice system.

---

## 🔧 Setup Instructions

### 1. Clone or Download

```bash
git clone https://github.com/yourusername/unity-webgl-voicechat.git
cd unity-webgl-voicechat
```

### 2. Install and Run the Signaling Server

npm install ws
node voice.chat.server.js

By default, the signaling server runs on ws://localhost:8080.

### 3. Unity Integration

3.1 Include voiceChat.js in Unity WebGL Build
  3.1.1 Place voiceChat.js in your Unity project under: Assets/Plugins/WebGL/voiceChat.js
  3.1.2 Modify your Unity WebGL template (if needed) to ensure it's loaded, or Unity will auto-bundle it.

3.2 Add the VoiceChat.jslib
Place this in: Assets/Plugins/WebGL/VoiceChat.jslib

```
mergeInto(LibraryManager.library, {
  InitVoiceChat: function (urlPtr, idPtr, bubblePtr) {
    const signalingUrl = UTF8ToString(urlPtr);
    const generatedUserId = UTF8ToString(idPtr);
    const generatedBubbleId = UTF8ToString(bubblePtr);
    initVoiceChat(signalingUrl, generatedUserId, generatedBubbleId);
  },
  DisableVoiceChat: function () {
    disableVoiceChat();
  }
});
```

3.3 C# Interop
Create a script like VoiceChatManager.cs:

```
using System.Runtime.InteropServices;
using UnityEngine;

public class VoiceChatManager : MonoBehaviour
{
#if UNITY_WEBGL && !UNITY_EDITOR
    [DllImport("__Internal")]
    private static extern void InitVoiceChat(string signalingUrl, string userId, string bubbleId);

    [DllImport("__Internal")]
    private static extern void DisableVoiceChat();
#endif

    public void StartVoiceChat(string signalingUrl, string userId, string bubbleId)
    {
#if UNITY_WEBGL && !UNITY_EDITOR
        InitVoiceChat(signalingUrl, userId, bubbleId);
#endif
    }

    public void StopVoiceChat()
    {
#if UNITY_WEBGL && !UNITY_EDITOR
        DisableVoiceChat();
#endif
    }
}
```

3.4 Usage Example
```
void Start()
{
    string signalingUrl = "ws://localhost:8080";
    string userId = System.Guid.NewGuid().ToString();
    string bubbleId = "room1";

    VoiceChatManager vc = gameObject.AddComponent<VoiceChatManager>();
    vc.StartVoiceChat(signalingUrl, userId, bubbleId);
}
```

### 4. Permissions

Make sure your Unity WebGL build requests microphone access. This happens automatically on getUserMedia, but browser permissions must be allowed by the user.


