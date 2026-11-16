"""
Speech normalisation for the Solar System narration: turns the caption text (what visitors read) into the
text the voice speaks. Numbers become words, mission codes and acronyms are spelled the way a narrator
says them, and words the voice (Kokoro-82M, hf_alpha) gets wrong are respelled. Every entry here was
checked by generating it in a sentence and transcribing it back (tools/narration/README.md).
"""
import re

from num2words import num2words

# Respellings and expansions, applied in order (case-sensitive unless the pattern says otherwise).
LEXICON = [
    (r'\bRSC-1\b', 'R S C one'),
    (r'\bRLV-1\b', 'R L V one'),
    (r'\bSOL-1\b', 'Sol one'),
    (r'\bC3\b', 'C three'),
    (r'\bRTGs\b', 'R T Gs'),
    (r'\bRTG\b', 'R T G'),
    (r'v∞', 'v infinity'),
    (r'\bAU\b', 'astronomical units'),
    (r'\bMax Q\b', 'Max Q'),
    (r'\bplutonium-238\b', 'plutonium two thirty-eight'),
    (r'\bPu-238\b', 'plutonium two thirty-eight'),
    (r'\biTelematics®', 'iTelematics'),
    # Respellings verified for hf_alpha (the default spelling was misheard).
    (r'\bSputnik Planitia\b', 'Sputnik Planeeshia'),
    (r'\bArrokoth\b', 'Arro-koth'),
    (r'\bValles Marineris\b', 'Val-eez Marineris'),
]

UNITS = [
    (r'\bkm/s\b', 'kilometres per second'),
    (r'\bkm²/s²', 'square kilometres per second squared'),
    (r'\bkm\b', 'kilometres'),
    (r'\bkPa\b', 'kilopascals'),
    (r'\bkN\b', 'kilonewtons'),
    (r'\bW\b', 'watts'),
    (r'\bkg\b', 'kilograms'),
    (r' ?%', ' per cent'),
    (r'°', ' degrees'),
]


def _number(m: re.Match) -> str:
    s = m.group(0).replace(',', '')
    if '.' in s:
        whole, frac = s.split('.')
        return num2words(int(whole), lang='en_GB') + ' point ' + ' '.join(num2words(int(d)) for d in frac)
    n = int(s)
    # Years read as years ("twenty thirty-seven").
    if 1900 <= n <= 2099 and len(s) == 4:
        return num2words(n, to='year')
    return num2words(n, lang='en_GB')


MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']


def _date(day: int, month: str, year: int) -> str:
    """'3 July 2037' as a narrator says it: 'the third of July, twenty thirty-seven'."""
    return f"the {num2words(day, to='ordinal')} of {month}, {num2words(year, to='year')}"


def speak(text: str, extra: list[tuple[str, str]] | None = None) -> str:
    """The spoken form of a caption line."""
    s = text
    s = re.sub(r'\b(\d{4})-(\d{2})-(\d{2})\b', lambda m: _date(int(m.group(3)), MONTHS[int(m.group(2)) - 1], int(m.group(1))), s)
    s = re.sub(r'\b(\d{1,2}) (' + '|'.join(MONTHS) + r') (\d{4})\b', lambda m: _date(int(m.group(1)), m.group(2), int(m.group(3))), s)
    for pat, rep in (extra or []) + LEXICON + UNITS:
        s = re.sub(pat, rep, s)
    s = re.sub(r'(?<![\w.])\d[\d,]*(?:\.\d+)?', _number, s)
    s = s.replace('—', ', ').replace('–', ' to ').replace('→', ' to ')
    return re.sub(r'\s+', ' ', s).strip()
