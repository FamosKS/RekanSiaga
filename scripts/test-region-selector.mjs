// Focused UI/service regression tests. Tiny synthetic fixtures, never a seed,
// live Supabase query, report submission or repeat of the regions import audit.
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import vm from 'node:vm'
import test from 'node:test'
import ts from 'typescript'
const require = createRequire(import.meta.url)
function load(file, mocks) {
  const output = ts.transpileModule(readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX } }).outputText
  const exports = {}
  vm.runInNewContext(output, { exports, require: name => name in mocks ? mocks[name] : require(name), AbortController, Promise, Set }, { filename: file })
  return exports
}
const id = n => `00000000-0000-4000-8000-${String(n).padStart(12,'0')}`
const row = (n,parent,code,name,region_type) => ({id:id(n),parent_id:parent===null?null:id(parent),code,name,region_type})
const fixtures = [
  row(1,null,'13','Sumatera Barat','province'), row(2,null,'32','Provinsi lain (fixture)','province'),
  row(3,1,'13.71','Kota Padang','city'), row(4,1,'13.06','Kabupaten Agam','regency'), row(5,2,'32.71','Kota lain (fixture)','city'),
  row(6,3,'13.71.01','Kecamatan kota (fixture)','district'), row(7,4,'13.06.01','Kecamatan kabupaten (fixture)','district'),
  row(8,6,'13.71.01.1001','Kelurahan kota (fixture)','village'), row(9,7,'13.06.01.2001','Desa kabupaten (fixture)','village'),
]
function serviceFixture(rows=fixtures) {
  const calls=[], failures=new Set()
  const publicSupabase = { from(table) {
    assert.equal(table,'regions')
    const call={filters:[],types:[],signal:null}; calls.push(call)
    const q={
      select(){return q}, eq(key,value){call.filters.push([key,value]);if(key==='region_type')call.types=[value];return q},
      in(key,values){assert.equal(key,'region_type');call.types=Array.from(values);return q},
      is(key,value){call.filters.push([key,value]);return q}, order(key){call.order=key;return q}, limit(){return q},
      abortSignal(signal){call.signal=signal;return q},
      async result(single=false){
        if(call.types.some(type=>failures.has(type)))return {data:null,error:new Error('Local directory failure')}
        let data=rows.filter(r=>call.filters.every(([key,value])=>r[key]===value)&&(!call.types.length||call.types.includes(r.region_type)))
        if(call.order)data=data.toSorted((a,b)=>a[call.order].localeCompare(b[call.order],'id'))
        return {data:single?(data[0]??null):data,error:null}
      }, then(resolve,reject){return q.result().then(resolve,reject)}, maybeSingle(){return q.result(true)},
    }; return q
  }}
  return {service:load('src/features/regions/regionService.ts',{'../../lib/supabase':{publicSupabase}}),calls,failures}
}
const Select=()=>null, Button=()=>null
function find(node,predicate){
  if(!node||typeof node!=='object')return null
  if(Array.isArray(node)){for(const child of node){const found=find(child,predicate);if(found)return found}return null}
  return predicate(node)?node:find(node.props?.children,predicate)
}
function selectors(node){const result=[];function visit(n){if(!n||typeof n!=='object')return;if(Array.isArray(n)){n.forEach(visit);return}if(n.type===Select)result.push(n);visit(n.props?.children)}visit(node);return result}
function harness(initial={}) {
  const data=serviceFixture(), queries=new Map(), changes=[]
  const props={...initial,onChange:region=>{changes.push(region);if(initial.controlled)props.value=region?.id}}
  let state,initialized=false,changed=false,tree,heldKey,releaseHeld
  function run(record,options){
    record.isFetching=true;record.isError=false
    const invoke=()=>options.queryFn({signal:new AbortController().signal})
    const promise=heldKey===JSON.stringify(options.queryKey)?new Promise(resolve=>{releaseHeld=()=>{heldKey=undefined;resolve(invoke())}}):Promise.resolve().then(invoke)
    record.pending=promise.then(value=>{record.data=value;record.isFetching=false;record.pending=null},()=>{record.data=undefined;record.isFetching=false;record.isError=true;record.pending=null})
    return record.pending
  }
  const useQuery=options=>{
    const key=JSON.stringify(options.queryKey)
    if(!queries.has(key))queries.set(key,{data:undefined,isFetching:false,isError:false,pending:null,started:false})
    const record=queries.get(key)
    record.refetch=()=>run(record,options)
    if(options.enabled!==false&&!record.started){record.started=true;run(record,options)}
    return record
  }
  const {RegionSelector}=load('src/features/regions/RegionSelector.tsx',{
    react:{useState:initialValue=>{if(!initialized){state=initialValue;initialized=true}return[state,next=>{state=next;changed=true}]}},
    'react/jsx-runtime':{jsx:(type,props)=>({type,props}),jsxs:(type,props)=>({type,props}),Fragment:'Fragment'},
    '@tanstack/react-query':{useQuery},'../../components/ui/Button':{Button},'../../components/ui/Select':{Select},
    '../content/contracts':{contentError:()=> 'Directory error'},'./regionService':data.service,
  })
  function render(patch){Object.assign(props,patch);let n=0;do{changed=false;tree=RegionSelector(props);assert.ok(++n<10,'Render loop')}while(changed);return tree}
  async function settle(){for(let n=0;n<12;n++){render();const pending=Array.from(queries.values()).flatMap(q=>q.pending?[q.pending]:[]);if(!pending.length)return tree;await Promise.all(pending)}throw Error('Queries did not settle')}
  function field(label){const control=selectors(tree).find(n=>n.props.label===label);assert.ok(control,`Missing field ${label}`);return control.props}
  const optionIds=label=>Array.from(field(label).children[1]??[],n=>n.props.value)
  function choose(label,value){assert.ok(!field(label).disabled,`Field disabled: ${label}`);field(label).onChange({target:{value}});render()}
  render()
  return {render,settle,field,optionIds,choose,changes,queries,...data,get tree(){return tree},hold(step,parent){heldKey=JSON.stringify(['regions',step,parent])},release(){assert.ok(releaseHeld);releaseHeld()}}
}
async function cityPath(h){await h.settle();h.choose('Provinsi',id(1));await h.settle();h.choose('Kabupaten / Kota',id(3));await h.settle();h.choose('Kecamatan',id(6));await h.settle();h.choose('Desa / Kelurahan',id(8));await h.settle()}

await test('Municipal service query returns cities and regencies of the selected province in one sorted list',async()=>{
  const {service,calls}=serviceFixture();const signal=new AbortController().signal
  const rows=await service.listRegions(id(1),'regency_city',signal)
  assert.deepEqual(rows.map(r=>r.id),[id(4),id(3)])
  assert.deepEqual(calls[0].types,['regency','city']);assert.ok(calls[0].filters.some(([key,value])=>key==='parent_id'&&value===id(1)));assert.equal(calls[0].signal,signal)
  assert.deepEqual((await service.listRegions(id(2),'regency_city')).map(r=>r.id),[id(5)])
})
await test('Both city and regency children use their actual municipality UUID',async()=>{
  const {service}=serviceFixture()
  assert.deepEqual((await service.listRegions(id(3),'district')).map(r=>r.id),[id(6)])
  assert.deepEqual((await service.listRegions(id(4),'district')).map(r=>r.id),[id(7)])
})
await test('Selector renders four levels and lets Kota Padang reach its district and village',async()=>{
  const h=harness({required:true});await h.settle()
  assert.deepEqual(selectors(h.tree).map(n=>n.props.label),['Provinsi','Kabupaten / Kota','Kecamatan','Desa / Kelurahan'])
  assert.equal(h.field('Kabupaten / Kota').disabled,true)
  await cityPath(h)
  assert.equal(h.field('Kabupaten / Kota').value,id(3));assert.equal(h.field('Desa / Kelurahan').value,id(8));assert.equal(h.changes.at(-1).id,id(8))
  assert.ok(h.optionIds('Kabupaten / Kota').includes(id(4)));assert.equal(h.changes[1].region_type,'city')
})
await test('Switching city to regency clears descendants and enables the regency district without a city intermediate',async()=>{
  const h=harness();await cityPath(h);h.choose('Kabupaten / Kota',id(4))
  assert.equal(h.field('Kecamatan').value,'');assert.equal(h.field('Desa / Kelurahan').value,'');assert.equal(h.field('Desa / Kelurahan').disabled,true)
  await h.settle();assert.deepEqual(h.optionIds('Kecamatan'),[id(7)])
  h.choose('Kecamatan',id(7));await h.settle();h.choose('Desa / Kelurahan',id(9));assert.equal(h.changes.at(-1).id,id(9))
})
await test('Changing or clearing province never retains a municipality, district or village from the old province',async()=>{
  const h=harness();await cityPath(h);h.choose('Provinsi',id(2));await h.settle()
  for(const label of ['Kabupaten / Kota','Kecamatan','Desa / Kelurahan'])assert.equal(h.field(label).value,'')
  assert.deepEqual(h.optionIds('Kabupaten / Kota'),[id(5)])
  h.choose('Provinsi','');await h.settle();assert.equal(h.changes.at(-1),null)
  for(const label of ['Kabupaten / Kota','Kecamatan','Desa / Kelurahan'])assert.equal(h.field(label).disabled,true)
})
await test('Clearing municipality retains province but clears all descendants and notifies parent with null',async()=>{
  const h=harness();await cityPath(h);h.choose('Kabupaten / Kota','');await h.settle()
  assert.equal(h.field('Provinsi').value,id(1));assert.equal(h.field('Kecamatan').value,'');assert.equal(h.field('Kecamatan').disabled,true);assert.equal(h.field('Desa / Kelurahan').value,'');assert.equal(h.changes.at(-1),null)
})
await test('Late response for an old village query cannot repopulate a newly selected municipality',async()=>{
  const h=harness();await h.settle();h.choose('Provinsi',id(1));await h.settle();h.choose('Kabupaten / Kota',id(3));await h.settle()
  h.hold('village',id(6));h.choose('Kecamatan',id(6))
  assert.equal(h.field('Desa / Kelurahan').disabled,true);assert.equal(h.field('Kabupaten / Kota').disabled,false)
  h.choose('Kabupaten / Kota',id(4));h.release();await h.settle()
  assert.equal(h.field('Kecamatan').value,'');assert.deepEqual(h.optionIds('Kecamatan'),[id(7)]);assert.deepEqual(h.optionIds('Desa / Kelurahan'),[])
})
await test('Controlled Admin values hydrate both paths, preserve acknowledged choices, and respond to external record/reset changes',async()=>{
  const h=harness({value:id(8),controlled:true});await h.settle();assert.equal(h.field('Kabupaten / Kota').value,id(3))
  h.choose('Kabupaten / Kota',id(4));await h.settle();assert.equal(h.field('Provinsi').value,id(1));assert.equal(h.field('Kecamatan').value,'')
  h.render({value:id(9)});await h.settle();assert.equal(h.field('Kabupaten / Kota').value,id(4));assert.equal(h.field('Desa / Kelurahan').value,id(9))
  h.render({value:id(8)});await h.settle();assert.equal(h.field('Kabupaten / Kota').value,id(3));assert.equal(h.field('Desa / Kelurahan').value,id(8))
  h.render({value:undefined});await h.settle();for(const select of selectors(h.tree))assert.equal(select.props.value,'')
})
await test('Legacy maxLevel city/regency both end at the combined field; disabled and validation props remain supported',async()=>{
  for(const maxLevel of ['regency','city']){const h=harness({maxLevel,required:true,error:'Required municipality',hint:'Pick one'});await h.settle();assert.equal(selectors(h.tree).length,2);assert.equal(h.field('Kabupaten / Kota').required,true);assert.equal(h.field('Kabupaten / Kota').error,'Required municipality');assert.equal(h.field('Kabupaten / Kota').hint,'Pick one')}
  const disabled=harness({disabled:true,value:id(8)});await disabled.settle();assert.ok(selectors(disabled.tree).every(n=>n.props.disabled))
})
await test('Directory error/retry only refetches current active levels; disabled descendants never query null parents',async()=>{
  const h=harness();await h.settle();h.failures.add('city');h.choose('Provinsi',id(1));await h.settle()
  assert.ok(find(h.tree,n=>n.type==='p'&&n.props.role==='alert'));h.failures.clear()
  find(h.tree,n=>n.type===Button).props.onClick();await h.settle();assert.ok(h.optionIds('Kabupaten / Kota').includes(id(3)))
  assert.ok(!h.calls.some(c=>c.types.some(t=>t==='district'||t==='village')&&c.filters.some(([k,v])=>k==='parent_id'&&v===null)))
})
await test('Existing paths stay four levels and cyclic or missing-parent paths fail without looping',async()=>{
  const {service}=serviceFixture();assert.deepEqual(Array.from(await service.getRegionPath(id(8)),r=>r.id),[id(1),id(3),id(6),id(8)])
  assert.deepEqual(Array.from(await service.getRegionPath(id(9)),r=>r.id),[id(1),id(4),id(7),id(9)])
  const cyclic=serviceFixture([row(20,21,'x','Cycle A','district'),row(21,20,'y','Cycle B','village')]);await assert.rejects(cyclic.service.getRegionPath(id(20)));assert.equal(cyclic.calls.length,2)
  await assert.rejects(serviceFixture([row(20,21,'x','Missing parent','village')]).service.getRegionPath(id(20)))
})
