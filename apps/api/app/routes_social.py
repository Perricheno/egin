import json,asyncio,os
from uuid import UUID
from fastapi import APIRouter,Depends,HTTPException,Query,UploadFile,Request
from fastapi.responses import StreamingResponse
from psycopg.types.json import Jsonb
from . import db,gis,providers
from .auth import current_user,conversation_access,rate_limit,field_access
from .schemas import ListingInput,ConversationInput,MessageInput,ReadInput,AssistantInput,InterestsInput
from .storage import storage
from .realtime import broker

router=APIRouter()
LISTING_SELECT='''SELECT l.*,ST_X(l.location) AS lon,ST_Y(l.location) AS lat,p.name AS seller_name,
 COALESCE((SELECT json_agg(json_build_object('id',i.id,'path',i.path) ORDER BY i.position) FROM listing_images i WHERE i.listing_id=l.id),'[]'::json) AS images,
 EXISTS(SELECT 1 FROM favorites fav WHERE fav.listing_id=l.id AND fav.user_id=%s) AS is_favorite
 FROM listings l JOIN profiles p ON p.user_id=l.user_id'''

def listing(id,user):
    r=db.one(LISTING_SELECT+' WHERE l.id=%s',(user['id'],id))
    if not r:raise HTTPException(404,'Объявление не найдено')
    r.pop('location',None);return r

def listing_owner(id,user):
    r=listing(id,user)
    if r['user_id']!=user['id']:raise HTTPException(403,'Редактировать может только автор')
    return r

@router.get('/listings')
def listings(type:str=Query('',max_length=30),q:str=Query('',max_length=100),region:str=Query('',max_length=120),favorites:bool=False,mine:bool=False,lat:float|None=Query(None,ge=40,le=56),lon:float|None=Query(None,ge=45,le=88),radius_km:float=Query(50,ge=.1,le=1000),user=Depends(current_user)):
    query=LISTING_SELECT+" WHERE (l.status='active' OR (l.user_id=%s AND %s))";args=[user['id'],user['id'],mine]
    for val,fragment in [(type,'l.type=%s'),(q,"l.title ILIKE %s"),(region,'l.region=%s')]:
        if val:query+=' AND '+fragment;args.append('%'+val+'%' if val==q and fragment.startswith('l.title') else val)
    if favorites:query+=' AND EXISTS(SELECT 1 FROM favorites fv WHERE fv.listing_id=l.id AND fv.user_id=%s)';args.append(user['id'])
    if mine:query+=' AND l.user_id=%s';args.append(user['id'])
    if lat is not None and lon is not None:query+=' AND ST_DWithin(l.location::geography,ST_SetSRID(ST_MakePoint(%s,%s),4326)::geography,%s)';args.extend([lon,lat,radius_km*1000])
    result=db.rows(query+' ORDER BY l.created_at DESC LIMIT 100',args)
    for r in result:r.pop('location',None)
    return result

@router.post('/listings',status_code=201)
def create_listing(data:ListingInput,user=Depends(current_user)):
    rate_limit('listing:'+str(user['id']),20,300)
    r=db.one('''INSERT INTO listings(user_id,type,title,description,price,unit,region,location) VALUES(%s,%s,%s,%s,%s,%s,%s,CASE WHEN %s::float IS NOT NULL AND %s::float IS NOT NULL THEN ST_SetSRID(ST_MakePoint(%s,%s),4326) END) RETURNING id''',(user['id'],data.type,data.title,data.description,data.price,data.unit,data.region,data.lon,data.lat,data.lon,data.lat))
    return listing(r['id'],user)

@router.get('/listings/{id}')
def get_listing(id:UUID,user=Depends(current_user)):return listing(id,user)
@router.put('/listings/{id}')
def update_listing(id:UUID,data:ListingInput,user=Depends(current_user)):
    listing_owner(id,user)
    db.execute('''UPDATE listings SET type=%s,title=%s,description=%s,price=%s,unit=%s,region=%s,location=CASE WHEN %s::float IS NOT NULL AND %s::float IS NOT NULL THEN ST_SetSRID(ST_MakePoint(%s,%s),4326) END,updated_at=now() WHERE id=%s''',(data.type,data.title,data.description,data.price,data.unit,data.region,data.lon,data.lat,data.lon,data.lat,id))
    return listing(id,user)
@router.delete('/listings/{id}')
def archive_listing(id:UUID,user=Depends(current_user)):
    listing_owner(id,user);db.execute("UPDATE listings SET status='archived',updated_at=now() WHERE id=%s",(id,));return {'ok':True}
@router.post('/listings/{id}/favorite')
def favorite(id:UUID,user=Depends(current_user)):
    listing(id,user);db.execute('INSERT INTO favorites VALUES(%s,%s) ON CONFLICT DO NOTHING',(user['id'],id));return {'ok':True}
@router.delete('/listings/{id}/favorite')
def unfavorite(id:UUID,user=Depends(current_user)):
    db.execute('DELETE FROM favorites WHERE user_id=%s AND listing_id=%s',(user['id'],id));return {'ok':True}
@router.post('/listings/{id}/images',status_code=201)
async def upload(id:UUID,file:UploadFile,user=Depends(current_user)):
    listing_owner(id,user)
    if db.one('SELECT count(*) AS n FROM listing_images WHERE listing_id=%s',(id,))['n']>=6:raise HTTPException(422,'Не больше 6 фото')
    data=await file.read(5*1024*1024+1);path=await asyncio.to_thread(storage.save_image,data)
    return db.one('INSERT INTO listing_images(listing_id,path,position) VALUES(%s,%s,(SELECT count(*) FROM listing_images WHERE listing_id=%s)) RETURNING id,path',(id,path,id))
@router.delete('/listings/{id}/images/{image_id}')
def delete_image(id:UUID,image_id:UUID,user=Depends(current_user)):
    listing_owner(id,user);db.execute('DELETE FROM listing_images WHERE id=%s AND listing_id=%s',(image_id,id));return {'ok':True}

@router.get('/users/search')
def users_search(q:str=Query(min_length=2,max_length=100),user=Depends(current_user)):
    return db.rows('SELECT p.user_id AS id,p.name FROM profiles p JOIN users u ON u.id=p.user_id WHERE p.user_id<>%s AND (p.name ILIKE %s OR u.email=%s) LIMIT 15',(user['id'],'%'+q+'%',q.lower()))

@router.get('/conversations')
def conversations(user=Depends(current_user)):
    return db.rows('''SELECT c.*,last.body AS last_message,last.created_at AS last_message_at,
    (SELECT count(*) FROM messages m WHERE m.conversation_id=c.id AND m.user_id<>%s AND m.id>COALESCE(mr.last_read_id,0)) AS unread_count
    FROM conversations c JOIN conversation_members cm ON cm.conversation_id=c.id AND cm.user_id=%s
    LEFT JOIN message_reads mr ON mr.conversation_id=c.id AND mr.user_id=%s
    LEFT JOIN LATERAL (SELECT body,created_at FROM messages WHERE conversation_id=c.id ORDER BY id DESC LIMIT 1) last ON true
    ORDER BY COALESCE(last.created_at,c.created_at) DESC''',(user['id'],user['id'],user['id']))

@router.post('/conversations',status_code=201)
def create_conversation(data:ConversationInput,user=Depends(current_user)):
    ids=set(data.member_ids)|{user['id']}
    if data.kind=='direct' and len(ids)!=2:raise HTTPException(422,'Для личного чата выберите одного собеседника')
    key=':'.join(sorted(str(i) for i in ids)) if data.kind=='direct' else None
    if key:
        existing=db.one('SELECT * FROM conversations WHERE direct_key=%s',(key,))
        if existing:return existing
    with db.connection() as c:
        r=c.execute('INSERT INTO conversations(title,kind,created_by,direct_key) VALUES(%s,%s,%s,%s) RETURNING *',(data.title,data.kind,user['id'],key)).fetchone()
        for id in ids:c.execute('INSERT INTO conversation_members(conversation_id,user_id) VALUES(%s,%s)',(r['id'],id))
    return r

@router.get('/conversations/{id}/messages')
def messages(id:UUID,before:int=Query(9223372036854775807,ge=1),limit:int=Query(50,ge=1,le=100),user=Depends(current_user)):
    conversation_access(user['id'],id)
    return list(reversed(db.rows('SELECT m.id,m.user_id,m.body,m.client_id,m.created_at,p.name FROM messages m JOIN profiles p ON p.user_id=m.user_id WHERE m.conversation_id=%s AND m.id<%s ORDER BY m.id DESC LIMIT %s',(id,before,limit))))

@router.post('/conversations/{id}/messages',status_code=201)
async def send_message(id:UUID,data:MessageInput,user=Depends(current_user)):
    conversation_access(user['id'],id);rate_limit('message:'+str(user['id']),60)
    with db.connection() as c:
        r=c.execute('INSERT INTO messages(conversation_id,user_id,body,client_id) VALUES(%s,%s,%s,%s) ON CONFLICT(user_id,client_id) DO NOTHING RETURNING *',(id,user['id'],data.body,data.client_id)).fetchone()
        if not r:r=c.execute('SELECT * FROM messages WHERE user_id=%s AND client_id=%s AND conversation_id=%s',(user['id'],data.client_id,id)).fetchone()
        if not r:raise HTTPException(409,'Идентификатор сообщения уже использован')
    broker.publish(id);return {**r,'name':user['name']}

@router.post('/conversations/{id}/read')
def mark_read(id:UUID,data:ReadInput,user=Depends(current_user)):
    conversation_access(user['id'],id)
    top=db.one('SELECT COALESCE(max(id),0) AS n FROM messages WHERE conversation_id=%s',(id,))['n']
    db.execute('INSERT INTO message_reads(conversation_id,user_id,last_read_id) VALUES(%s,%s,%s) ON CONFLICT(conversation_id,user_id) DO UPDATE SET last_read_id=GREATEST(message_reads.last_read_id,EXCLUDED.last_read_id),updated_at=now()',(id,user['id'],min(data.last_read_id,top)));return {'ok':True}

@router.get('/conversations/{id}/events')
async def events(id:UUID,request:Request,after:int=Query(0,ge=0),user=Depends(current_user)):
    conversation_access(user['id'],id)
    try:after=max(after,int(request.headers.get('last-event-id','0')))
    except ValueError:pass
    return StreamingResponse(broker.stream(id,user['id'],after,request),media_type='text/event-stream',headers={'X-Accel-Buffering':'no','Cache-Control':'no-cache'})

@router.get('/interests')
def interests(user=Depends(current_user)):return db.rows('SELECT kind,value FROM user_interests WHERE user_id=%s',(user['id'],))
@router.put('/interests')
def update_interests(data:InterestsInput,user=Depends(current_user)):
    with db.connection() as c:
        c.execute('DELETE FROM user_interests WHERE user_id=%s',(user['id'],))
        for i in data.interests:c.execute('INSERT INTO user_interests VALUES(%s,%s,%s) ON CONFLICT DO NOTHING',(user['id'],i.kind,i.value))
    return {'ok':True}
@router.get('/news')
def news(user=Depends(current_user)):
    return db.rows('''SELECT n.*,(SELECT count(*) FROM user_interests i WHERE i.user_id=%s AND ((i.kind='region' AND i.value=ANY(n.regions)) OR (i.kind='crop' AND i.value=ANY(n.crop_tags)) OR (i.kind='topic' AND i.value=ANY(n.tags)))) AS relevance FROM news_items n ORDER BY relevance DESC,published_at DESC NULLS LAST LIMIT 50''',(user['id'],))

@router.get('/assistant/history')
def assistant_history(user=Depends(current_user)):
    return list(reversed(db.rows('SELECT * FROM assistant_history WHERE user_id=%s ORDER BY id DESC LIMIT 30',(user['id'],))))

@router.post('/assistant')
async def assistant(data:AssistantInput,user=Depends(current_user)):
    rate_limit('assistant:'+str(user['id']),15,60)
    q=data.question.lower();tools=[];result=None;text='';f=None
    if data.field_id:
        field_access(user['id'],data.field_id);f=gis.get_field(data.field_id)
    if any(k in q for k in ['аренд','трактор','услуг','работник','объявлен','техник']):
        kind='machinery_rental' if any(k in q for k in ['аренд','трактор','техник']) else 'job' if 'работник' in q else 'service'
        result=listings(type=kind,q='',region='',favorites=False,mine=False,lat=f['lat'] if f else None,lon=f['lon'] if f else None,radius_km=100,user=user)
        tools=['searchMarketplace'];text=f'Найдено объявлений: {len(result)}'+(' в радиусе 100 км от поля.' if f else '.')+'\n'+'\n'.join(f"{r['title']} — {r['price']} {r['unit']}" for r in result[:5])
    elif any(k in q for k in ['новост','нового']):
        result=news(user);tools=['getPersonalizedNews'];text='Материалы с учётом ваших интересов:\n'+'\n'.join(r['title']+(' [демо]' if r['is_demo'] else '') for r in result[:5])
    elif any(k in q for k in ['мои поля','покажи поля','список пол']):
        result=gis.get_fields(user['id']);tools=['getUserFields'];text='Ваши поля:\n'+'\n'.join(f"{r['name']} · {r['area_ha']:.1f} га · {r['region'] or 'регион не определён'}" for r in result)
    elif not f:
        tools=['getUserFields'];result=gis.get_fields(user['id']);text='Выберите поле вверху, чтобы получить погоду, почву, риски и рекомендации. Доступно полей: '+str(len(result))+'.'
    elif any(k in q for k in ['погод','осадк','ветер']):
        result=await providers.weather(f['lat'],f['lon']);tools=['getFieldWeather']
        if result.get('days'):
            d=result['days'][0];text=f"Поле «{f['name']}»: {d['date']}, {d['temperature_2m_min']}…{d['temperature_2m_max']} °C; осадки {d['precipitation_sum']} мм; ветер до {d['wind_speed_10m_max']} км/ч. Источник: {result['source']} ({result['status']})."
        else:text=result['message']
    elif any(k in q for k in ['почв','ph','глин']):
        result=await providers.soil(f['lat'],f['lon']);tools=['getFieldSoil'];t=result.get('topsoil',{})
        text=f"Поле «{f['name']}», слой 0–30 см: pH {t.get('phh2o','нет данных')}, органический углерод {t.get('soc','нет данных')} г/кг, глина {t.get('clay','нет данных')}%. Источник: {result['source']}. Это глобальная оценка, не лабораторный анализ."
    else:
        from .routes_core import analyze
        result=await analyze(data.field_id,user);tools=['analyzeField'];r=result['recommendation'];names={x['id']:x['name_ru'] for x in db.rows('SELECT * FROM crop_catalog')}
        text=f"Поле «{f['name']}», {f['area_ha']:.1f} га.\n"
        if r.get('candidates'):text+='Демонстрационные кандидаты: '+', '.join(names.get(x['crop'],x['crop']) for x in r['candidates'])+'.\n'+'; '.join(r['reasons'])+'.\n'
        text+=r['warning']+'\n'+'\n'.join(x['text'] for x in result['risk']['flags'])
        if not result['risk']['flags']:text+='Погодные сигналы: '+('данных недостаточно.' if result['risk']['level']=='unknown' else 'заданные пороги не превышены; это не гарантия отсутствия рисков.')
    # Explicit structured tool mode works offline without an LLM key. No fabricated prose.
    answer={'text':text,'mode':'structured','tools':tools,'data':json.loads(json.dumps(result,default=str))}
    db.execute('INSERT INTO assistant_history(user_id,field_id,question,answer) VALUES(%s,%s,%s,%s)',(user['id'],data.field_id,data.question,Jsonb(answer)))
    return answer
