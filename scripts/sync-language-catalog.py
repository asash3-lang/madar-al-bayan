"""Publisher language registry and compact title indexes; no generated translations."""
import pathlib,json,subprocess,concurrent.futures,openpyxl,datetime
root=pathlib.Path(__file__).resolve().parents[1]
tmp=pathlib.Path('/tmp/madar-publisher');tmp.mkdir(exist_ok=True)
def get(url,path):
 subprocess.run(['curl','-fsSL','--retry','1','--max-time','90',url,'-o',str(path)],check=True)
def save(path,data):
 path.parent.mkdir(parents=True,exist_ok=True);path.write_text(json.dumps(data,ensure_ascii=False,separators=(',',':')))
get('https://hadeethenc.com/api/v1/languages',tmp/'languages.json')
langs=json.loads((tmp/'languages.json').read_text())
def index(item):
 code=item['code'];path=tmp/(code+'.xlsx')
 try:
  if not path.exists():get('https://hadeethenc.com/browse/download/'+code,path)
  rows=iter(openpyxl.load_workbook(path,read_only=True,data_only=True).active.values)
  notice=next(rows)[0];headers=next(rows);records=[]
  for row in rows:
   r=dict(zip(headers,row))
   if str(r.get('id','')).isdigit() and r.get('title'):records.append({'id':str(r['id']),'title':r['title']})
  if not records:raise ValueError('Empty index')
  save(root/'public/sources/titles'/(code+'.json'),{'records':records,'notice':notice,'retrievedAt':datetime.datetime.now(datetime.timezone.utc).isoformat()})
  print(code,len(records),flush=True)
  return {'code':code,'name':item['native'],'count':len(records)}
 except Exception as e:
  print('UNAVAILABLE',code,type(e).__name__,flush=True);return None
with concurrent.futures.ThreadPoolExecutor(max_workers=6) as pool:available=[x for x in pool.map(index,langs) if x]
save(root/'lib/publisher-languages.json',available)
