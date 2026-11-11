import { query } from "@/lib/db";

export interface ResolvedAddress {latitude:number;longitude:number;streetAddress:string;provinceCityDistrict:string}
export class GeocodingError extends Error {constructor(message:string,public status=400){super(message);}}
export function validCoordinates(latitude:unknown,longitude:unknown){
 return typeof latitude==='number'&&typeof longitude==='number'&&Number.isFinite(latitude)&&Number.isFinite(longitude)&&Math.abs(latitude)<=90&&Math.abs(longitude)<=180;
}
export function formatGeocodedAddress(data:any,latitude:number,longitude:number):ResolvedAddress{
 const a=data?.address||{};
 const street=a.road||a.pedestrian||a.residential||a.footway||a.path;
 const district=a.city_district||a.district||a.suburb||a.town||a.village;
 const city=a.county||a.regency||a.city||a.municipality;
 const region=[district,city,a.state,a.postcode].filter(Boolean).filter((value,index,all)=>all.indexOf(value)===index).join(', ');
 if(!region)throw new GeocodingError('Wilayah alamat belum ditemukan. Coba pilih titik lain.');
 return {latitude,longitude,streetAddress:street?[street,a.house_number].filter(Boolean).join(' '):'',provinceCityDistrict:region};
}
export function sameAddress(left:unknown,right:unknown){return typeof left==='string'&&typeof right==='string'&&left.trim().replace(/\s+/g,' ').toLocaleLowerCase('id-ID')===right.trim().replace(/\s+/g,' ').toLocaleLowerCase('id-ID');}

async function lookup(key:string,endpoint:string,params:Record<string,string>){
 const [cached]=await query('SELECT result FROM address_geocoding_cache WHERE cache_key=$1 AND expires_at>NOW()',[key]);
 if(cached)return cached.result;
 // One shared slot across Node processes: the public provider permits at most one request/second.
 const slot=await query(`INSERT INTO address_geocoding_cache(cache_key,result,expires_at) VALUES('_provider_rate','{}',NOW()+INTERVAL '1100 milliseconds')
 ON CONFLICT(cache_key) DO UPDATE SET expires_at=EXCLUDED.expires_at WHERE address_geocoding_cache.expires_at<=NOW() RETURNING cache_key`);
 if(!slot.length)throw new GeocodingError('Pencarian lokasi sedang berjalan. Coba lagi sebentar.',429);
 const base=(process.env.NOMINATIM_BASE_URL||'https://nominatim.openstreetmap.org').replace(/\/$/,'');
 const url=new URL(base+'/'+endpoint);for(const [name,value] of Object.entries({...params,format:'jsonv2',addressdetails:'1','accept-language':'id,en'}))url.searchParams.set(name,value);
 let response:Response;
 try{response=await fetch(url,{headers:{'User-Agent':'TryPedia-Marketplace/1.0 (address lookup)','Accept-Language':'id,en'},signal:AbortSignal.timeout(8000),cache:'no-store'});}
 catch{throw new GeocodingError('Alamat belum berhasil dibaca. Silakan coba lagi.',503);}
 if(!response.ok)throw new GeocodingError('Pencarian alamat belum tersedia. Silakan coba lagi.',response.status===429?429:503);
 const data=await response.json();
 const result=Array.isArray(data)?data[0]:data;
 if(!result||result.error)throw new GeocodingError('Alamat tidak ditemukan. Pilih titik di peta atau perjelas nama jalan.');
 await query(`INSERT INTO address_geocoding_cache(cache_key,result,expires_at) VALUES($1,$2,NOW()+INTERVAL '7 days') ON CONFLICT(cache_key) DO UPDATE SET result=EXCLUDED.result,expires_at=EXCLUDED.expires_at`,[key,JSON.stringify(result)]);
 return result;
}
export async function reverseAddress(latitude:number,longitude:number){
 if(!validCoordinates(latitude,longitude))throw new GeocodingError('Pilih titik lokasi yang valid.');
 const key=`reverse:${latitude.toFixed(5)}:${longitude.toFixed(5)}`;
 const data=await lookup(key,'reverse',{lat:String(latitude),lon:String(longitude),zoom:'18'});
 // Keep the selected pin, not the nearest OSM object's coordinates.
 return formatGeocodedAddress(data,latitude,longitude);
}
export async function searchAddress(streetAddress:string,provinceCityDistrict:string){
 if(!streetAddress.trim())throw new GeocodingError('Isi nama jalan terlebih dahulu.');
 const text=`${streetAddress.trim()}, ${provinceCityDistrict.trim()}, Indonesia`;
 const data=await lookup('search:'+text.toLowerCase(),'search',{q:text,countrycodes:'id',limit:'1'});
 const latitude=Number(data.lat),longitude=Number(data.lon);
 if(!validCoordinates(latitude,longitude))throw new GeocodingError('Titik alamat tidak ditemukan.');
 // A forward result already contains address details; seed reverse cache for this exact pin.
 const result=formatGeocodedAddress(data,latitude,longitude);
 if(!result.streetAddress)throw new GeocodingError('Nama jalan belum ditemukan. Perjelas pencarian atau pilih pin di jalan yang bernama.');
 await query(`INSERT INTO address_geocoding_cache(cache_key,result,expires_at) VALUES($1,$2,NOW()+INTERVAL '7 days') ON CONFLICT(cache_key) DO UPDATE SET result=EXCLUDED.result,expires_at=EXCLUDED.expires_at`,[`reverse:${latitude.toFixed(5)}:${longitude.toFixed(5)}`,JSON.stringify(data)]);
 return result;
}
