"""Fixed Urdu voice, JSON stdin and MP3 stdout; no shell interpolation or files."""
import asyncio
import json
import sys
import re
import edge_tts

async def main():
    text = json.load(sys.stdin).get('text', '')
    if not isinstance(text, str) or not 1 <= len(text) <= 1600:
        raise ValueError('Invalid speech text')
    semaphore = asyncio.Semaphore(4)
    async def synthesize(part):
        async with semaphore:
            audio = []
            async for chunk in edge_tts.Communicate(part, voice='ur-PK-AsadNeural', connect_timeout=6, receive_timeout=8).stream():
                if chunk['type'] == 'audio':
                    audio.append(chunk['data'])
            if not audio:
                raise edge_tts.exceptions.NoAudioReceived('No audio')
            return b''.join(audio)
    async def render(part):
        words = part.split()
        if len(words) > 4:
            pieces = await asyncio.gather(*(render(' '.join(words[i:i + 4])) for i in range(0, len(words), 4)))
            return b''.join(pieces)
        try:
            return await synthesize(part)
        except edge_tts.exceptions.NoAudioReceived:
            if len(words) <= 1:
                # Pronunciation-only spelling compatibility for unsupported hamza/nasal ligatures.
                compatible = part.replace('ئ', 'ی').replace('ں', 'ن')
                if compatible == part:
                    raise
                return await synthesize(compatible)
            middle = len(words) // 2
            pieces = await asyncio.gather(render(' '.join(words[:middle])), render(' '.join(words[middle:])))
            return b''.join(pieces)
    audio = await render(re.sub(r'\s+', ' ', text).strip())
    sys.stdout.buffer.write(audio)
    sys.stdout.buffer.flush()

if __name__ == '__main__':
    asyncio.run(main())
