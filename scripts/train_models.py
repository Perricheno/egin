"""Reproducible DEMO_SYNTHETIC crop classifier. Never evidence of field accuracy."""
import json,hashlib
from pathlib import Path
from datetime import datetime,timezone
import joblib,numpy as np,sklearn
from sklearn.ensemble import ExtraTreesClassifier
from sklearn.model_selection import train_test_split
from sklearn.metrics import balanced_accuracy_score,f1_score,confusion_matrix

ROOT=Path(__file__).resolve().parents[1]
FEATURES=['ph','growing_temperature','growing_precipitation','clay','soc']
# Deliberately overlapping synthetic distributions. These are illustrative assumptions,
# not published observations or prescriptions. Temperature and water ranges are inspired
# by FAO background material; all exact means/sigmas below are EGIN demo assumptions.
# Rainfall is not equal to crop water need. No irrigation or water balance is modelled.
PROFILES={
 'wheat':([6.6,18,360,25,20],[.7,3.8,120,10,10]),
 'barley':([7.1,16,280,23,17],[.8,3.5,100,10,9]),
 'sunflower':([6.8,22,430,28,20],[.7,3.5,130,11,10]),
 'maize':([6.5,25,640,30,24],[.6,3.2,150,10,10]),
 'lentil':([6.9,18,320,20,17],[.65,3.3,100,9,8]),
 'flax':([6.4,17,420,28,25],[.6,3.0,110,10,10]),
}

def train():
    rng=np.random.default_rng(42);X=[];y=[]
    for crop,(mean,std) in PROFILES.items():
        x=rng.normal(mean,std,size=(650,5));x=np.clip(x,[4,5,40,1,1],[9,35,1100,70,70]);X.extend(x);y.extend([crop]*len(x))
    X=np.asarray(X);y=np.asarray(y)
    x_train,x_test,y_train,y_test=train_test_split(X,y,test_size=.25,random_state=42,stratify=y)
    model=ExtraTreesClassifier(n_estimators=96,max_depth=10,min_samples_leaf=6,random_state=42,n_jobs=1,class_weight='balanced')
    model.fit(x_train,y_train);pred=model.predict(x_test)
    out=ROOT/'artifacts';out.mkdir(exist_ok=True)
    joblib.dump(model,out/'crop-suitability.joblib',compress=3)
    metadata={
      'model_version':'egin-extra-trees-demo-v1','model':'ExtraTreesClassifier','dataset_kind':'DEMO_SYNTHETIC',
      'trained_at':datetime.now(timezone.utc).isoformat(),'features':FEATURES,'training_samples':len(x_train),'validation_samples':len(x_test),'sample_size':len(X),'random_seed':42,
      'dataset_source':'EGIN synthetic generator, scripts/train_models.py; no Kazakhstan field labels',
      'dataset_license':'CC0-1.0 (generated data only)',
      'source_urls':['https://www.fao.org/4/s2022e/s2022e02.htm','https://www.fao.org/4/y4011e/y4011e06.htm','https://ecocrop.apps.fao.org/ecocrop/srv/en/cropView?id=2114'],
      'assumptions':PROFILES,'processing':'Seeded normal distributions, clipping, stratified 75/25 split; no imputation at inference.',
      'metrics':{'synthetic_holdout_balanced_accuracy':round(balanced_accuracy_score(y_test,pred),4),'synthetic_holdout_macro_f1':round(f1_score(y_test,pred,average='macro'),4)},
      'classes':model.classes_.tolist(),'confusion_matrix':confusion_matrix(y_test,pred,labels=model.classes_).tolist(),
      'feature_importance':dict(zip(FEATURES,model.feature_importances_.tolist())),
      'sklearn_version':sklearn.__version__,
      'warning':'Демонстрационная ML-модель. Метрики синтетической выборки не доказывают агрономическую точность. Баллы — сходство с демо-профилями, не вероятность урожая.',
      'artifact_sha256':hashlib.sha256((out/'crop-suitability.joblib').read_bytes()).hexdigest()
    }
    (out/'model-metadata.json').write_text(json.dumps(metadata,ensure_ascii=False,indent=2))
    np.savetxt(out/'training_data.csv',np.column_stack([X,y]),fmt='%s',delimiter=',',header=','.join(FEATURES+['crop']),comments='')
    print(json.dumps({'model':metadata['model_version'],'dataset':metadata['dataset_kind'],'metrics':metadata['metrics']}))
    return metadata
if __name__=='__main__':train()
