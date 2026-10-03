import io,secrets
from pathlib import Path
from typing import Protocol
from PIL import Image,UnidentifiedImageError
from fastapi import HTTPException

ROOT=Path('/workspace/uploads')
class StorageAdapter(Protocol):
    def save_image(self,data:bytes)->str: ...

class LocalStorage:
    def save_image(self,data):
        if len(data)>5*1024*1024:raise HTTPException(413,'Фото не должно превышать 5 МБ')
        Image.MAX_IMAGE_PIXELS=20000000
        try:
            im=Image.open(io.BytesIO(data))
            if im.format not in ('JPEG','PNG','WEBP'):raise HTTPException(415,'Поддерживаются JPEG, PNG, WebP')
            if im.width*im.height>20000000:raise HTTPException(413,'Слишком большое разрешение изображения')
            im.load();im=im.convert('RGB');im.thumbnail((1600,1600))
            ROOT.mkdir(exist_ok=True,parents=True);name=secrets.token_hex(20)+'.jpg'
            im.save(ROOT/name,'JPEG',quality=85,optimize=True)
            return '/uploads/'+name
        except (UnidentifiedImageError,OSError,Image.DecompressionBombError,Image.DecompressionBombWarning):raise HTTPException(415,'Невозможно прочитать изображение')

storage=LocalStorage()
