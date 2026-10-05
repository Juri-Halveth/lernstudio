(function(root){
  'use strict';
  const KEY='lernstudio.eltern.progress.v1',FORMAT='lernstudio.eltern.progress';
  const empty=()=>({format:FORMAT,version:1,done:[],cursor:null,theme:'light',large:false});
  function validate(input,catalog){
    if(!input||typeof input!=='object'||Array.isArray(input)||input.format!==FORMAT||input.version!==1)throw Error('Это другой файл. Нужен файл прогресса этого учебника.');
    if(Object.keys(input).some(key=>!['format','version','done','cursor','theme','large'].includes(key)))throw Error('В файле есть неизвестные поля. Текущий прогресс сохранён.');
    if(!Array.isArray(input.done)||input.done.some(id=>typeof id!=='string'||!/^[a-z0-9-]{1,80}$/.test(id))||new Set(input.done).size!==input.done.length)throw Error('Список занятий в файле повреждён.');
    if(!['light','dark'].includes(input.theme)||typeof input.large!=='boolean')throw Error('Настройки в файле повреждены.');
    const ids=new Set(catalog.lessons.map(l=>l.id)),done=input.done.filter(id=>ids.has(id)),unknown=input.done.filter(id=>!ids.has(id));
    let cursor=null;
    if(input.cursor!==null){
      const c=input.cursor;
      if(!c||Object.keys(c).sort().join(',')!=='id,step'||typeof c.id!=='string'||!Number.isInteger(c.step)||c.step<0)throw Error('Место продолжения в файле повреждено.');
      const lesson=catalog.lessons.find(l=>l.id===c.id);
      if(!lesson)unknown.push(c.id);else if(c.step>lesson.steps.length)throw Error('Номер шага не подходит этому занятию.');else cursor={id:c.id,step:c.step};
    }
    return {state:{...empty(),done,cursor,theme:input.theme,large:input.large},unknown:[...new Set(unknown)]};
  }
  const merge=(current,incoming)=>({...incoming,done:[...new Set([...current.done,...incoming.done])]});
  const next=(state,catalog)=>state.cursor||((lesson)=>lesson?{id:lesson.id,step:0}:null)(catalog.lessons.find(l=>!state.done.includes(l.id)));
  const summary=(state,catalog)=>({completed:catalog.lessons.filter(l=>state.done.includes(l.id)).length,total:catalog.lessons.length});
  const api={KEY,FORMAT,empty,validate,merge,next,summary};
  if(typeof module==='object'&&module.exports)module.exports=api;else root.ParentProgress=api;
})(typeof window==='object'?window:globalThis);
