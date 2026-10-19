"""Generates the narration with Microsoft's Costa Rican neural voice.

Needs `pip install edge-tts`. Writes one MP3 and one subtitle file per line
of scripts/narracion.json into public/voz/. Run from src/innobus-video.
"""
import asyncio
import json

import edge_tts

VOICE = "es-CR-JuanNeural"
RATE = "+6%"


async def main() -> None:
    with open("scripts/narracion.json", encoding="utf-8") as f:
        lines = json.load(f)
    for line in lines:
        communicate = edge_tts.Communicate(line["text"], VOICE, rate=RATE)
        submaker = edge_tts.SubMaker()
        with open(f"public/voz/{line['id']}.mp3", "wb") as audio:
            async for chunk in communicate.stream():
                if chunk["type"] == "audio":
                    audio.write(chunk["data"])
                elif chunk["type"] in ("WordBoundary", "SentenceBoundary"):
                    submaker.feed(chunk)
        with open(f"public/voz/{line['id']}.srt", "w", encoding="utf-8") as srt:
            srt.write(submaker.get_srt())
        print(line["id"])


asyncio.run(main())
