"""Refresh seven publisher translations of one selected introductory work.
This is a bounded official API import, not a mirror of the Byenah corpus.
"""
import concurrent.futures, datetime, json, pathlib, urllib.request

OUT = pathlib.Path(__file__).resolve().parents[1] / 'public/sources/byenah'
LANGUAGES = ['ar', 'en', 'fr', 'es', 'zh', 'hi', 'fa']

def get(url):
    with urllib.request.urlopen(urllib.request.Request(url, headers={'Accept': 'application/json'}), timeout=20) as response:
        data = response.read(2000001)
    if len(data) > 2000000:
        raise ValueError('Response too large')
    return json.loads(data)

def sync(language):
    translation = get(f'https://byenah.com/{language}/Api/content_translation/25146?language={language}')
    ident = int(translation['id'])
    url = f'https://byenah.com/{language}/Api/single-content?id={ident}'
    payload = get(url)
    row = payload['content']
    if row['id'] != ident or row['locale'] != language or not row.get('full_description'):
        raise ValueError('Identity, language or full text missing')
    fields = ['id', 'name', 'locale', 'full_description', 'version', 'version_info']
    record = {key: row.get(key) for key in fields}
    record['authors'] = [{'name': author['name']} for author in row.get('authors', [])]
    record['apiUrl'] = url
    record['sources'] = [{'name': source.get('name', '')} for source in payload.get('sources', [])]
    data = {'publisher': 'Byenah.com', 'retrievedAt': datetime.datetime.now(datetime.timezone.utc).isoformat(),
            'scope': 'One selected publisher work. Not a complete corpus.', 'records': {str(ident): record}}
    path = OUT / language / 'index.json'
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(data, ensure_ascii=False), encoding='utf-8')
    return {'language': language, 'id': ident, 'characters': len(row['full_description'])}

if __name__ == '__main__':
    with concurrent.futures.ThreadPoolExecutor(max_workers=3) as pool:
        for result in pool.map(sync, LANGUAGES):
            print(json.dumps(result), flush=True)
