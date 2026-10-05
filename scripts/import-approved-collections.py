"""Import verified original publisher exports; never generates answer text."""
import json, pathlib, sys, hashlib

root = pathlib.Path(__file__).resolve().parents[1]
inputs = pathlib.Path(sys.argv[1])
output = root / 'public/sources/collections/ar'
output.mkdir(parents=True, exist_ok=True)
counts = {}
provenance = []

def save(name, records):
    assert len({r['id'] for r in records}) == len(records)
    assert all(r['hadith'].strip() and r['language'] == 'ar' for r in records)
    for i in range(0, len(records), 25):
        batch = records[i:i+25]
        (output / f'{name}-{i//25:03}.json').write_text(json.dumps({'records': {r['id']: r for r in batch}}, ensure_ascii=False))
    counts[name] = len(records)

for encyclopedia in [102, 110, 105]:
    path = inputs / f'icadb-{encyclopedia}-approved.json'
    raw = json.loads(path.read_text())
    assert raw['approved_only'] is True
    records = []
    for card in raw['cards']:
        version = card['latest_version']
        assert version['is_approved'] and version['is_latest_approved']
        fields = {x['field_name']: x['text'] for x in card['sentences']}
        answer = fields.get('الجواب') or fields.get('التعريف الشرعي', '')
        explanation = '\n\n'.join(fields[k] for k in ['الشرح الإجمالي', 'التعريف اللغوي المختصر'] if fields.get(k))
        source_url = f"https://icadb.com/api/encyclopedias/cards/{card['external_id']}/version/{version['version_str']}/sentences/"
        records.append(dict(id=f"icadb-card:{card['external_id']}:{version['version_str']}", title=card['name'],
          hadith=answer, explanation=explanation, grade='', attribution=raw['encyclopedia']['name'],
          references=[raw['encyclopedia']['name']] + ([fields['المصدر']] if fields.get('المصدر') else []),
          canonicalUrl=source_url, apiUrl=source_url, publisher='ICADB.com', language='ar',
          retrievedAt=raw['generated_at'], contentVersion=version['version_str'], accessMode='snapshot', sourceType='text',
          publisherNotice='ICADB — approved publisher export', originalQuestion=fields.get('السؤال', card['name']),
          approvalStatus=version['status']))
    save(f'icadb-{encyclopedia}', records)
    provenance.append({'file':path.name,'sha256':hashlib.sha256(path.read_bytes()).hexdigest(),'records':len(records),'encyclopedia':raw['encyclopedia'],'approvedOnly':True,'retrievedAt':raw['generated_at']})

path = inputs / 'binbaz-curated-101.json'
raw = json.loads(path.read_text())
records = []
for r in raw:
    assert r['valid'] and str(r['httpStatus']) == '200' and r['attributionRequired']
    assert r['sourceUrl'].startswith(f"https://binbaz.org.sa/fatwas/{r['reference']}/")
    records.append(dict(id=f"binbaz:{r['reference']}", title=r['title'], hadith=r['answer'], explanation='',
      grade='', attribution=r['author'], references=[r['publisher']], canonicalUrl=r['sourceUrl'],
      apiUrl=r['requestUrl'], publisher='BinBaz.org.sa', language='ar', retrievedAt=r['retrievedAt'],
      contentVersion=r['contentSha256'], accessMode='snapshot', sourceType='text', publisherNotice=r['rightsStatement'], originalQuestion=r['question']))
save('binbaz', records)
provenance.append({'file':path.name,'sha256':hashlib.sha256(path.read_bytes()).hexdigest(),'records':len(records),'attributionRequired':True,'rights':raw[0]['rightsStatement']})
(root / 'docs/collection-provenance.json').write_text(json.dumps({'counts':counts,'inputs':provenance},ensure_ascii=False,indent=2)+'\n')
print(json.dumps(counts))
