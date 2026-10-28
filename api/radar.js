const slugs=['lilpudgys','mutant-ape-yacht-club','azuki','milady','nakamigos','doodles-official','moonbirds','opepen-edition','pudgypenguins','boredapeyachtclub'];
const names=['Lil Pudgys','Mutant Ape Yacht Club','Azuki','Milady Maker','Nakamigos','Doodles','Moonbirds','Opepen Edition','Pudgy Penguins','Bored Ape Yacht Club'];
let cachedKey=null;
let keyExpiresAt=0;
let keyPromise=null;
let retryAfter=0;
async function getApiKey(){
 if(process.env.OPENSEA_API_KEY)return process.env.OPENSEA_API_KEY;
 if(cachedKey && Date.now()<keyExpiresAt-3600000)return cachedKey;
 if(Date.now()<retryAfter)throw new Error('KEY_CREATION_BACKOFF');
 if(keyPromise)return keyPromise;
 keyPromise=(async()=>{
  const response=await fetch('https://api.opensea.io/api/v2/auth/keys',{method:'POST',headers:{accept:'application/json'},signal:AbortSignal.timeout(8000)});
  if(!response.ok){retryAfter=Date.now()+(response.status===429?60000:15000);throw new Error('KEY_CREATION_HTTP_'+response.status);}
  const data=await response.json();
  if(typeof data.api_key!=='string'||!data.api_key)throw new Error('INVALID_KEY_RESPONSE');
  cachedKey=data.api_key;
  keyExpiresAt=Date.parse(data.expires_at)||Date.now()+6*86400000;
  return cachedKey;
 })().finally(()=>{keyPromise=null});
 return keyPromise;
}
export default async function handler(req,res){
 res.setHeader('Cache-Control','s-maxage=180, stale-while-revalidate=60');
 if(req.method!=='GET')return res.status(405).json({error:'Method not allowed'});
 let key;
 try{key=await getApiKey()}catch(e){return res.status(503).json({error:'OpenSea temporary access unavailable',code:e.message});}
 const results=await Promise.all(slugs.map(async(slug,i)=>{
  try{
   const response=await fetch('https://api.opensea.io/api/v2/collections/'+encodeURIComponent(slug)+'/stats',{headers:{'x-api-key':key,'accept':'application/json'},signal:AbortSignal.timeout(8500)});
   if(!response.ok)return {slug,name:names[i],error:response.status===429?'RATE_LIMITED':'HTTP_'+response.status};
   const json=await response.json();
   const total=json.total||{},intervals=json.intervals||[];
   const daily=intervals.find(x=>x.interval==='one_day')||intervals.find(x=>x.interval==='1d')||{};
   const floor=Number(total.floor_price??total.floorPrice);
   let bestBid=null,bidStatus='NO_OFFERS',bidCurrency='WETH',bidDiagnostics=null;
   try{
    const bidResponse=await fetch('https://api.opensea.io/api/v2/offers/collection/'+encodeURIComponent(slug)+'?limit=100',{headers:{'x-api-key':key,'accept':'application/json'},signal:AbortSignal.timeout(8500)});
    if(!bidResponse.ok)bidStatus='HTTP_'+bidResponse.status;
    else{
     const bidData=await bidResponse.json();
     const offers=Array.isArray(bidData.offers)?bidData.offers:[];
     const now=Math.floor(Date.now()/1000);
     bidDiagnostics={total:offers.length,active:offers.filter(o=>o.status==='ACTIVE').length,positiveQuantity:offers.filter(o=>Number(o.remaining_quantity)>0).length,currencies:[...new Set(offers.map(o=>String((o.price_per_item||o.price||{}).currency||'missing')))].slice(0,8),hasNext:Boolean(bidData.next)};
     const valid=offers.filter(o=>{
      const p=o.price_per_item||o.price||{};
      const currency=String(p.currency||'').toUpperCase();
      const end=Number(o.protocol_data?.parameters?.endTime||0);
      return o.status==='ACTIVE' && Number(o.remaining_quantity)>0 && (!end||end>now) && (currency==='WETH'||currency==='ETH') && !o.asset && !o.criteria?.traits?.length && !o.criteria?.numeric_traits?.length;
     }).map(o=>{const p=o.price_per_item||o.price;const decimals=Number(p.decimals??18);const n=Number(p.value)/10**decimals;return Number.isFinite(n)&&n>0?n:null}).filter(n=>n!==null);
     bestBid=valid.length?Math.max(...valid):null;
     bidStatus=valid.length?'AVAILABLE':bidData.next?'PARTIAL_NO_MATCH':'NO_ELIGIBLE_OFFERS';
    }
   }catch{bidStatus='UPSTREAM_UNAVAILABLE';}
   return {slug,name:names[i],floor:Number.isFinite(floor)?floor:null,bestBid,bidCurrency,bidStatus,bidDiagnostics,volume24h:Number.isFinite(Number(daily.volume))?Number(daily.volume):null,sales24h:Number.isFinite(Number(daily.sales))?Number(daily.sales):null,volumeAll:Number.isFinite(Number(total.volume))?Number(total.volume):null,source:'OpenSea',asOf:new Date().toISOString()};
  }catch{return {slug,name:names[i],error:'UPSTREAM_UNAVAILABLE'}}
 }));
 const ok=results.filter(x=>!x.error).length;
 return res.status(ok?200:502).json({mode:'live',provider:'OpenSea',asOf:new Date().toISOString(),collections:results,successful:ok,total:slugs.length});
}
