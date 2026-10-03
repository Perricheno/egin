"""Single-process wakeups + durable PostgreSQL replay. Replace wakeups for scaling."""
import asyncio
from collections import defaultdict
from fastapi.encoders import jsonable_encoder
import json
from . import db

class RealtimeBroker:
    def __init__(self):self.events=defaultdict(asyncio.Event)
    def publish(self,conversation_id):
        key=str(conversation_id);self.events[key].set();self.events[key]=asyncio.Event()
    async def stream(self,conversation_id,user_id,after,request):
        key=str(conversation_id)
        yield 'retry: 2000\n\n'
        while not await request.is_disconnected():
            # Recheck membership/session on each heartbeat, including logout/revocation.
            from .auth import current_user
            try:
                current_user(request)
                if not db.one('SELECT 1 FROM conversation_members WHERE conversation_id=%s AND user_id=%s',(conversation_id,user_id)):return
            except Exception:return
            event=self.events[key]
            messages=db.rows('''SELECT m.id,m.user_id,m.body,m.client_id,m.created_at,p.name FROM messages m JOIN profiles p ON p.user_id=m.user_id WHERE m.conversation_id=%s AND m.id>%s ORDER BY m.id LIMIT 100''',(conversation_id,after))
            for m in messages:
                after=m['id'];yield f'id: {after}\ndata: {json.dumps(jsonable_encoder(m),ensure_ascii=False)}\n\n'
            if len(messages)==100:continue
            try:await asyncio.wait_for(event.wait(),timeout=10)
            except asyncio.TimeoutError:yield ': heartbeat\n\n'

broker=RealtimeBroker()
