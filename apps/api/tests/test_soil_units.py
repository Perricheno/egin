import asyncio
import pytest

@pytest.mark.parametrize('unit,factor,raw', [('%',10,270),('g/kg',1,270)])
def test_soil_texture_percent_converted_exactly_once(monkeypatch,unit,factor,raw):
    from app import providers
    async def source(*args,**kwargs):
        return {'properties':{'layers':[{'name':'clay','unit_measure':{'d_factor':factor,'target_units':unit},'depths':[{'range':{'top_depth':a,'bottom_depth':b},'values':{'mean':raw}} for a,b in [(0,5),(5,15),(15,30)]]}]}}
    monkeypatch.setattr(providers,'request_json',source)
    providers._soil_slots.clear()
    result=asyncio.run(providers.SoilGridsProvider().fetch(52.4,69.4))
    assert result['topsoil']['clay']==27
    assert result['units']['clay']=='%'
    assert result['uncertainty']=={}
