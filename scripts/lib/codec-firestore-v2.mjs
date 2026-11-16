export function criarCodecFirestore({Timestamp,GeoPoint,db,projectId}){
  function encode(v){
   if(v instanceof Timestamp)return{$cmappTipo:'timestamp',seconds:v.seconds,nanos:v.nanoseconds};
   if(v instanceof GeoPoint)return{$cmappTipo:'geopoint',latitude:v.latitude,longitude:v.longitude};
   if(Buffer.isBuffer(v)||v instanceof Uint8Array)return{$cmappTipo:'bytes',base64:Buffer.from(v).toString('base64')};
   if(v===null||typeof v!=='object'){if(typeof v==='number'&&!Number.isFinite(v))throw Error('Número não finito no snapshot.');return v;}
   if(v instanceof Date)return{$cmappTipo:'date',iso:v.toISOString()};
   if(v.path&&v.firestore){if(v.firestore.projectId!==projectId)throw Error('Referência a outro projeto no snapshot.');return{$cmappTipo:'reference',path:v.path};}
   if(Array.isArray(v))return v.map(encode);
   if(Object.hasOwn(v,'$cmappTipo'))throw Error('Campo reservado no documento; revisão de codec necessária.');
   return Object.fromEntries(Object.entries(v).map(([k,x])=>[k,encode(x)]));
  }
  function decode(v){if(v===null||typeof v!=='object')return v;if(Array.isArray(v))return v.map(decode);if(v.$cmappTipo==='timestamp')return new Timestamp(v.seconds,v.nanos);if(v.$cmappTipo==='geopoint')return new GeoPoint(v.latitude,v.longitude);if(v.$cmappTipo==='bytes')return Buffer.from(v.base64,'base64');if(v.$cmappTipo==='date')return new Date(v.iso);if(v.$cmappTipo==='reference')return db.doc(v.path);return Object.fromEntries(Object.entries(v).map(([k,x])=>[k,decode(x)]));}
 return{encode,decode};
}
