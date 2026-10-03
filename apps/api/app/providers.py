"""External provider boundaries: timeouts, bounded retries, DB cache, deduplication."""
import asyncio,calendar,time,logging
from datetime import datetime,timezone,timedelta
from collections import defaultdict,deque
from typing import Protocol
import httpx
from psycopg import sql
from psycopg.types.json import Jsonb
from . import db

log=logging.getLogger(__name__)
_locks=defaultdict(asyncio.Lock)
_soil_slots=deque()
_nominatim_lock=asyncio.Lock()
_nominatim_last=0.
_negative={}

class WeatherProvider(Protocol):
    async def fetch(self,lat:float,lon:float)->dict: ...
class SoilProvider(Protocol):
    async def fetch(self,lat:float,lon:float)->dict: ...
class GeocodingProvider(Protocol):
    async def search(self,query:str)->dict: ...

async def request_json(url,params=None,timeout=18,retries=1):
    async with httpx.AsyncClient(timeout=httpx.Timeout(timeout,connect=6),headers={'User-Agent':'EGIN-local-MVP/0.1 (Kazakhstan agricultural research)'},follow_redirects=True) as client:
        for attempt in range(retries+1):
            try:
                r=await client.get(url,params=params)
                if r.status_code in (429,502,503,504) and attempt<retries:
                    await asyncio.sleep(1+attempt);continue
                r.raise_for_status()
                return r.json()
            except (httpx.TimeoutException,httpx.ConnectError):
                if attempt==retries:raise
                await asyncio.sleep(1)
    raise RuntimeError('Provider unavailable')

async def cached(table,key,ttl,fetch,source):
    if table not in {'weather_cache','soil_cache','climate_cache','geocode_cache'}:raise ValueError('Invalid cache')
    async with _locks[table+key]:
        rec=db.one(sql.SQL('SELECT * FROM {} WHERE cache_key=%s').format(sql.Identifier(table)),(key,))
        now=datetime.now(timezone.utc)
        if rec and rec['expires_at']>now:
            return {**rec['payload'],'status':'cached','fetched_at':rec['fetched_at'].isoformat()}
        if _negative.get(table+key,0)>time.monotonic():
            return {**rec['payload'],'status':'stale','fetched_at':rec['fetched_at'].isoformat()} if rec else {'status':'unavailable','source':source,'fetched_at':None,'message':'Источник временно недоступен; повторная попытка через минуту.'}
        try:
            payload=await fetch()
            stamp=datetime.now(timezone.utc)
            db.execute(sql.SQL('INSERT INTO {}(cache_key,payload,fetched_at,expires_at) VALUES(%s,%s,%s,%s) ON CONFLICT(cache_key) DO UPDATE SET payload=EXCLUDED.payload,fetched_at=EXCLUDED.fetched_at,expires_at=EXCLUDED.expires_at').format(sql.Identifier(table)),(key,Jsonb(payload),stamp,stamp+timedelta(seconds=ttl)))
            return {**payload,'status':'fresh','fetched_at':stamp.isoformat()}
        except Exception as e:
            log.warning('%s unavailable: %s',source,type(e).__name__)
            _negative[table+key]=time.monotonic()+60
            if rec:return {**rec['payload'],'status':'stale','fetched_at':rec['fetched_at'].isoformat(),'message':'Последняя сохранённая оценка. Источник временно недоступен.'}
            return {'status':'unavailable','source':source,'fetched_at':None,'message':'Источник временно недоступен. Данных в кэше пока нет.'}

class OpenMeteoWeatherProvider:
    async def fetch(self,lat,lon):
        params={'latitude':lat,'longitude':lon,'timezone':'Asia/Almaty','forecast_days':7,
          'current':'temperature_2m,relative_humidity_2m,precipitation,weather_code,wind_speed_10m',
          'daily':'temperature_2m_max,temperature_2m_min,precipitation_sum,precipitation_probability_max,wind_speed_10m_max,weather_code,et0_fao_evapotranspiration,shortwave_radiation_sum',
          'hourly':'relative_humidity_2m,soil_temperature_0cm,soil_moisture_0_to_1cm'}
        d=await request_json('https://api.open-meteo.com/v1/forecast',params)
        daily=d['daily'];days=[{'date':t,**{k:v[i] for k,v in daily.items() if k!='time'}} for i,t in enumerate(daily['time'])]
        return {'source':'Open-Meteo','source_url':'https://open-meteo.com/','license':'CC BY 4.0','current':d.get('current',{}),'days':days,'units':d.get('daily_units',{}),'hourly':d.get('hourly',{}),'timezone':d['timezone'],'coordinates':{'lat':d['latitude'],'lon':d['longitude']}}

class SoilGridsProvider:
    async def fetch(self,lat,lon):
        async with _locks['soil-provider-rate']:
            now=time.monotonic()
            while _soil_slots and _soil_slots[0]<now-60:_soil_slots.popleft()
            if len(_soil_slots)>=5:raise RuntimeError('SoilGrids fair-use budget (5/min)')
            _soil_slots.append(now)
        params=[('lon',lon),('lat',lat)]+[('property',k) for k in ('phh2o','soc','clay','silt','sand','bdod','cec')]+[('depth',k) for k in ('0-5cm','5-15cm','15-30cm')]+[('value','mean')]
        # A single attempt preserves the provider's strict 5 requests/minute budget.
        raw=await request_json('https://rest.isric.org/soilgrids/v2.0/properties/query',params,timeout=40,retries=0)
        layers=raw['properties']['layers'];top={};uncertainty={};units={}
        for layer in layers:
            name=layer['name'];factor=layer['unit_measure']['d_factor'];depths=layer['depths']
            for stat in ('mean','Q0.05','Q0.95'):
                parts=[(d['range']['bottom_depth']-d['range']['top_depth'],d['values'].get(stat)) for d in depths]
                if all(v is not None for _,v in parts) and sum(w for w,_ in parts)==30:
                    value=sum(w*v/factor for w,v in parts)/30
                    if name in ('clay','silt','sand') and layer['unit_measure']['target_units']=='g/kg':value/=10 # Only convert if provider has not already returned percent
                    if stat=='mean':top[name]=round(value,3)
                    else:uncertainty.setdefault(name,{})[stat]=round(value,3)
            units[name]='%' if name in ('clay','sand','silt') else layer['unit_measure']['target_units']
        if not top:raise RuntimeError('No soil predictions at location')
        clay=top.get('clay',0);sand=top.get('sand',0)
        texture='глинистая' if clay>=40 else 'песчаная' if sand>=70 else 'суглинистая / переходная'
        return {'source':'ISRIC SoilGrids v2','source_url':'https://soilgrids.org/','license':'CC BY 4.0','depth':'0–30 cm','topsoil':top,'units':units,'uncertainty':uncertainty,'uncertainty_note':'В этом запросе получены средние оценки; квантили неопределённости не запрашивались.','texture':texture,'raw_layers':layers,'resolution_m':250,'warning':'Глобальная модель почвы, не лабораторный анализ поля.'}

class OpenLandMapProvider:
    async def fetch(self,lat,lon):
        import sys,json
        proc=await asyncio.create_subprocess_exec(sys.executable,'-m','app.soil_raster',str(lat),str(lon),stdout=asyncio.subprocess.PIPE,stderr=asyncio.subprocess.DEVNULL)
        try:
            out,_=await asyncio.wait_for(proc.communicate(),timeout=28)
            if proc.returncode!=0:raise RuntimeError('OpenLandMap COG unavailable')
            return json.loads(out)
        except BaseException:
            if proc.returncode is None:
                proc.kill();await proc.wait()
            raise

class NASAPowerProvider:
    async def fetch(self,lat,lon):
        year=datetime.now(timezone.utc).year-1
        raw=await request_json('https://power.larc.nasa.gov/api/temporal/monthly/point',{'latitude':lat,'longitude':lon,'start':year-2,'end':year,'community':'AG','parameters':'T2M,PRECTOTCORR,ALLSKY_SFC_SW_DWN,WS2M','format':'JSON'},timeout=25)
        p=raw['properties']['parameter'];months=[]
        for key,temp in p['T2M'].items():
            if len(key)!=6 or not 1<=int(key[4:])<=12 or temp<=-990:continue
            y=int(key[:4]);m=int(key[4:]);rain=p['PRECTOTCORR'].get(key,-999)
            months.append({'month':key,'temperature':temp,'precipitation':round(rain*calendar.monthrange(y,m)[1],2) if rain>-990 else None,'solar_radiation':p.get('ALLSKY_SFC_SW_DWN',{}).get(key),'wind':p.get('WS2M',{}).get(key)})
        growing=[m for m in months if 5<=int(m['month'][4:])<=8 and m['precipitation'] is not None]
        if len(growing)!=12:raise RuntimeError('Incomplete NASA POWER growing seasons')
        return {'source':'NASA POWER','source_url':'https://power.larc.nasa.gov/','period':f'{year-2}–{year}','months':months,'growing_temperature':round(sum(m['temperature'] for m in growing)/len(growing),2),'growing_precipitation':round(sum(m['precipitation'] for m in growing)/3,2),'definition':'Среднее за май–август трёх полных лет; осадки — средняя сезонная сумма. Это не климатическая норма за 30 лет.'}

class NominatimProvider:
    async def search(self,query):
        global _nominatim_last
        async with _nominatim_lock:
            wait=1.1-(time.monotonic()-_nominatim_last)
            if wait>0:await asyncio.sleep(wait)
            _nominatim_last=time.monotonic()
            raw=await request_json('https://nominatim.openstreetmap.org/search',{'q':query,'format':'jsonv2','countrycodes':'kz','limit':5,'accept-language':'ru'},timeout=10,retries=0)
        return {'source':'Nominatim / © OpenStreetMap contributors','results':[{'name':r['display_name'],'lat':float(r['lat']),'lon':float(r['lon'])} for r in raw]}

async def weather(lat,lon):
    return await cached('weather_cache',f'{lat:.3f}:{lon:.3f}',1800,lambda:OpenMeteoWeatherProvider().fetch(lat,lon),'Open-Meteo')
async def soil(lat,lon):
    async def fetch():
        try:return await SoilGridsProvider().fetch(lat,lon)
        except Exception as e:
            log.warning('SoilGrids primary failed: %s',str(e)[:200])
            return await OpenLandMapProvider().fetch(lat,lon)
    return await cached('soil_cache',f'{lat:.3f}:{lon:.3f}',30*86400,fetch,'SoilGrids / OpenLandMap')
async def climate(lat,lon):
    return await cached('climate_cache',f'{lat:.2f}:{lon:.2f}:{datetime.now().year}',30*86400,lambda:NASAPowerProvider().fetch(lat,lon),'NASA POWER')
async def geocode(query):
    return await cached('geocode_cache',query.lower().strip(),7*86400,lambda:NominatimProvider().search(query),'Nominatim')
