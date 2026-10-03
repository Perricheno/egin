import json
from pathlib import Path
import joblib,numpy as np

ARTIFACTS=Path('/workspace/artifacts')
_model=None
_metadata=None

def load():
    global _model,_metadata
    _metadata=json.loads((ARTIFACTS/'model-metadata.json').read_text())
    _model=joblib.load(ARTIFACTS/'crop-suitability.joblib')
    return _metadata

def metadata():return _metadata or load()

def infer(features):
    if _model is None:load()
    x=np.asarray([[features[k] for k in _metadata['features']]],dtype=float)
    if not np.isfinite(x).all():raise ValueError('Для ML требуются реальные численные признаки')
    probabilities=_model.predict_proba(x)[0]
    candidates=sorted([{'crop':str(c),'score':round(float(p),4)} for c,p in zip(_model.classes_,probabilities)],key=lambda a:a['score'],reverse=True)[:3]
    return {'candidates':candidates,'model_version':_metadata['model_version'],'dataset_kind':'DEMO_SYNTHETIC','warning':_metadata['warning'],'features':features,'feature_importance':_metadata['feature_importance'],'score_meaning':'Сходство с синтетическими профилями, не прогноз урожайности','reasons':[f"pH: {features['ph']:.1f}",f"Средняя температура мая–августа: {features['growing_temperature']:.1f} °C",f"Осадки мая–августа: {features['growing_precipitation']:.0f} мм",f"Глина: {features['clay']:.1f} %; органический углерод: {features['soc']:.1f} г/кг"]}

def risk(values):
    flags=[]
    if values['min_temperature']<0:flags.append({'code':'frost','level':'high','text':'Прогнозируются заморозки. Проверьте чувствительные культуры.'})
    if values['max_temperature']>=32:flags.append({'code':'heat','level':'high','text':'Высокая температура. Проверьте водообеспеченность.'})
    if values['max_wind']>=35:flags.append({'code':'wind','level':'medium','text':'Сильный ветер. Учитывайте ограничения полевых обработок.'})
    if values['precipitation']>=40:flags.append({'code':'rain','level':'medium','text':'Значительные осадки. Проверьте доступность полей для техники.'})
    return {'level':'high' if any(x['level']=='high' for x in flags) else 'medium' if flags else 'low','flags':flags,'method':'Прозрачные погодные правила; это не ML-модель риска.'}
