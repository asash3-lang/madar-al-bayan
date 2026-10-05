"""Import official publisher downloads, retaining notices and versions verbatim."""
import concurrent.futures, json, pathlib, re, sqlite3, subprocess, datetime, unicodedata, sys
import openpyxl
ROOT=pathlib.Path(__file__).resolve().parents[1]
TEMP=pathlib.Path('/tmp/madar-publisher'); TEMP.mkdir(exist_ok=True)
OUT=ROOT/'public'/'sources'; OUT.mkdir(parents=True,exist_ok=True)
LANGS=['ar','en','fr','es','zh','hi','fa']
REFRESH='--refresh' in sys.argv
stamp=datetime.datetime.now(datetime.timezone.utc).isoformat()
def download(url,path):
    subprocess.run(['curl','-fsSL','--retry','1','--max-time','90',url,'-o',str(path)],check=True)
def save(path,value):
    path.parent.mkdir(parents=True,exist_ok=True)
    path.write_text(json.dumps(value,ensure_ascii=False,separators=(',',':')))
def hadith(lang):
    path=TEMP/(lang+'.xlsx')
    if REFRESH or not path.exists() or path.stat().st_size<100: download('https://hadeethenc.com/browse/download/'+lang,path)
    rows=iter(openpyxl.load_workbook(path,read_only=True,data_only=True).active.values)
    notice=next(rows)[0]; headers=next(rows); records=[]; buckets={}
    version=re.search(r'\(v([^\)]+)\)',notice).group(1)
    for row in rows:
        data=dict(zip(headers,row)); ident=str(data['id'])
        if not ident.isdigit(): continue
        buckets.setdefault(str(int(ident)//100),{})[ident]=data
        records.append(ident)
    for bucket,data in buckets.items(): save(OUT/'hadith'/lang/(bucket+'.json'),{'notice':notice,'version':version,'retrievedAt':stamp,'records':data})
    print('Hadith',lang,len(records),flush=True)
    return lang,{'count':len(records),'version':version,'notice':notice,'ids':records}
with concurrent.futures.ThreadPoolExecutor(max_workers=3) as pool:
    hadith_meta=dict(pool.map(hadith,LANGS))
save(OUT/'hadith'/'manifest.json',{'retrievedAt':stamp,'languages':hadith_meta})
download('https://quranenc.com/api/v1/translations/list',TEMP/'translations.json')
catalog=json.loads((TEMP/'translations.json').read_text())['translations']
keys={'en':'english_rwwad','fr':'french_rashid','es':'spanish_garcia','zh':'chinese_suliman','hi':'hindi_omari','fa':'persian_ih'}
def quran(pair):
    lang,key=pair;meta=next(item for item in catalog if item['key']==key)
    path=TEMP/(key+'.sqlite')
    if REFRESH or not path.exists(): download(meta['database_uncompressed_url'],path)
    con=sqlite3.connect(path);con.row_factory=sqlite3.Row
    tables=[r[0] for r in con.execute("SELECT name FROM sqlite_master WHERE type='table'")]
    print('Quran schema',lang,tables,flush=True)
    for table in tables:
        columns=[r[1] for r in con.execute('PRAGMA table_info("'+table+'")')]
        print(lang,table,columns,flush=True)
    return lang,meta
with concurrent.futures.ThreadPoolExecutor(max_workers=3) as pool:
    quran_meta=dict(pool.map(quran,keys.items()))
save(TEMP/'quran-meta.json',quran_meta)
def arabic(sura):
    path=TEMP/('sura-'+str(sura)+'.json')
    if REFRESH or not path.exists(): download('https://quranenc.com/api/v1/translation/sura/english_rwwad/'+str(sura),path)
    data=json.loads(path.read_text())['result']
    if not all(row.get('arabic_text') for row in data): raise ValueError('Missing original Quran text')
    if sura%20==0: print('Arabic Quran sura',sura,flush=True)
    return data
with concurrent.futures.ThreadPoolExecutor(max_workers=6) as pool:
    originals=[row for sura in pool.map(arabic,range(1,115)) for row in sura]
save(TEMP/'quran-arabic.json',originals)
def normalize(text):
    text=unicodedata.normalize('NFD',unicodedata.normalize('NFKC',text).lower())
    text=re.sub('[\u0300-\u036f\u0610-\u061a\u064b-\u065f\u0670\u06d6-\u06ed]','',text)
    return unicodedata.normalize('NFC',text.translate(str.maketrans({'أ':'ا','إ':'ا','آ':'ا','ٱ':'ا','ى':'ي','ة':'ه','ـ':None})))
def terms(text):
    clean=normalize(text)
    words=set(''.join(char if unicodedata.category(char)[0] in 'LM' else ' ' for char in clean).split())
    for run in re.findall('[\u4e00-\u9fff]+',clean):
        words.update(run[i:i+2] for i in range(len(run)-1))
    return words
original_map={str(r['sura'])+':'+str(r['aya']):r['arabic_text'] for r in originals}
quran_meta['ar']={'key':'arabic_text','version':quran_meta['en']['version'],'title':'النص القرآني العربي — QuranEnc.com','description':'النص العربي المرفق بواجهة موسوعة القرآن الكريم'}
for lang in LANGS:
    meta=quran_meta[lang]; records={}; inverted={}; suras={}
    if lang=='ar': rows=[{'sura':r['sura'],'aya':r['aya'],'translation':r['arabic_text'],'footnotes':''} for r in originals]
    else:
        con=sqlite3.connect(TEMP/(meta['key']+'.sqlite'));con.row_factory=sqlite3.Row
        rows=[dict(r) for r in con.execute('SELECT * FROM translations')];con.close()
    if len(rows)!=6236: raise ValueError('Incomplete Quran edition: '+lang)
    for row in rows:
        sura=int(row['sura']);aya=int(row['aya']);ident=str(sura)+':'+str(aya)
        record={'sura':sura,'aya':aya,'translation':row['translation'],'footnotes':row['footnotes'] or '', 'arabic_text':original_map[ident]}
        suras.setdefault(sura,{})[ident]=record
        for term in terms(row['translation']):inverted.setdefault(term,[]).append(ident)
    for sura,data in suras.items(): save(OUT/'quran'/lang/(str(sura)+'.json'),{'meta':meta,'retrievedAt':stamp,'records':data})
    save(OUT/'quran'/lang/'index.json',{'terms':inverted,'meta':meta,'retrievedAt':stamp,'count':len(rows)})
    print('Quran indexed',lang,len(rows),flush=True)
save(OUT/'quran'/'manifest.json',{'retrievedAt':stamp,'languages':quran_meta,'versesPerEdition':6236})
