"""Fixed Urdu voice, JSON stdin and MP3 stdout; no shell interpolation or files."""
import asyncio
import json
import sys
import edge_tts

async def main():
    text = json.load(sys.stdin).get('text', '')
    if not isinstance(text, str) or not 1 <= len(text) <= 1600:
        raise ValueError('Invalid speech text')
    voice = edge_tts.Communicate(text, voice='ur-PK-AsadNeural', rate='-5%', connect_timeout=10, receive_timeout=20)
    async for chunk in voice.stream():
        if chunk['type'] == 'audio':
            sys.stdout.buffer.write(chunk['data'])
    sys.stdout.buffer.flush()

if __name__ == '__main__':
    asyncio.run(main())
