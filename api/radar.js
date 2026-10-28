const slugs=['lilpudgys','mutant-ape-yacht-club','azuki','milady','nakamigos','doodles-official','moonbirds','opepen-edition','pudgypenguins','boredapeyachtclub'];
const names=['Lil Pudgys','Mutant Ape Yacht Club','Azuki','Milady Maker','Nakamigos','Doodles','Moonbirds','Opepen Edition','Pudgy Penguins','Bored Ape Yacht Club'];
export default async function handler(req,res){
 res.setHeader('Cache-Control','s-maxage=180, stale-while-revalidate=60');
 if(req.method!=='GET')return res.status(405).json({error:'Method not allowed'});
 const key=process.env.OPENSEA_API_KEY;
 if(!key)return res.status(503).json({error:'OpenSea API key not configured',code:'NOT_CONFIGURED'});
 const results=await Promise.all(slugs.map(async(slug,i)=>{
  try{
   const response=await fetch('https://api.opensea.io/api/v2/collections/'+encodeURIComponent(slug)+'/stats',{headers:{'x-api-key':key,'accept':'application/json'},signal:AbortSignal.timeout(8500)});
   if(!response.ok)return {slug,name:names[i],error:response.status===429?'RATE_LIMITED':'HTTP_'+response.status};
   const json=await response.json();
   const total=json.total||{},intervals=json.intervals||[];
   const daily=intervals.find(x=>x.interval==='one_day')||intervals.find(x=>x.interval==='1d')||{};
   const floor=Number(total.floor_price??total.floorPrice);
   return {slug,name:names[i],floor:Number.isFinite(floor)?floor:null,volume24h:Number.isFinite(Number(daily.volume))?Number(daily.volume):null,sales24h:Number.isFinite(Number(daily.sales))?Number(daily.sales):null,volumeAll:Number.isFinite(Number(total.volume))?Number(total.volume):null,source:'OpenSea',asOf:new Date().toISOString()};
  }catch{return {slug,name:names[i],error:'UPSTREAM_UNAVAILABLE'}}
 }));
 const ok=results.filter(x=>!x.error).length;
 return res.status(ok?200:502).json({mode:'live',provider:'OpenSea',asOf:new Date().toISOString(),collections:results,successful:ok,total:slugs.length});
}
