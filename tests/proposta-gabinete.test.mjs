import test from 'node:test';import assert from 'node:assert/strict';import {readFile} from 'node:fs/promises';import {JSDOM} from 'jsdom';
const html=await readFile(new URL('../propostas/gabinete/index.html',import.meta.url),'utf8');
function setup(){const dom=new JSDOM(html,{url:'https://example.invalid/propostas/gabinete/',runScripts:'dangerously',beforeParse(w){w.matchMedia=()=>({matches:false,addEventListener(){}});w.HTMLDialogElement.prototype.showModal=function(){this.setAttribute('open','')};w.HTMLDialogElement.prototype.close=function(){this.removeAttribute('open')}}});const d=dom.window.document,id=x=>d.getElementById(x), event=(x,e)=>x.dispatchEvent(new dom.window.Event(e,{bubbles:true})), select=(x,v)=>{id(x).value=v;event(id(x),'change')};return{dom,d,id,event,select,click:s=>d.querySelector(s).click(),close:()=>dom.window.close()}}
test('GAB-00 consulta autorizada pesquisa e alterna visualização',()=>{const f=setup();try{f.click('[data-page=agenda]');assert.equal(f.id('results').querySelectorAll('[data-contact]').length,6);f.id('search').value='Unidade Alfa';f.event(f.id('search'),'input');assert.equal(f.id('results').querySelectorAll('[data-contact]').length,3);f.click('[data-mode=cards]');assert.ok(f.id('results').classList.contains('cards'));f.click('[data-mode=unidades]');assert.match(f.id('results').textContent,/Unidade Alfa/)}finally{f.close()}});
test('GAB-00 perfil comum não consulta telefone particular, nem por busca ou prévia',()=>{const f=setup();try{f.click('[data-page=agenda]');assert.doesNotMatch(f.id('results').textContent,/9XXXX/);f.id('search').value='9XXXX';f.event(f.id('search'),'input');assert.equal(f.id('results').querySelectorAll('[data-contact]').length,0);f.id('search').value='';f.event(f.id('search'),'input');f.click('#export');assert.doesNotMatch(f.id('detail-body').textContent,/9XXXX/);f.click('#close');f.click('[data-contact=p1] .actions button:last-child');assert.doesNotMatch(f.id('detail-body').textContent,/Telefone particular/);assert.doesNotMatch(f.id('detail-actions').textContent,/WhatsApp/)}finally{f.close()}});
test('GAB-00 Gabinete autorizado e troca de perfil descartam contato privado',()=>{const f=setup();try{f.select('role','gabinete');assert.equal(f.id('admin-nav').hidden,false);f.click('[data-page=agenda]');f.click('[data-contact=p1] .actions button:last-child');assert.match(f.id('detail-body').textContent,/9XXXX-0001/);f.select('role','consulta');assert.equal(f.id('admin-nav').hidden,true);assert.equal(f.id('detail').open,false);assert.doesNotMatch(f.id('detail-body').textContent,/9XXXX/);f.select('role','negado');assert.equal(f.id('denied').hidden,false);assert.equal(f.id('nav').hidden,true);assert.equal(f.id('results').querySelectorAll('[data-contact]').length,0)}finally{f.close()}});
test('GAB-00 favoritos e ramais acionáveis',()=>{const f=setup();try{f.click('[data-page=agenda]');f.click('[data-contact=p1] .star');f.select('type','favorito');assert.equal(f.id('results').querySelectorAll('[data-contact]').length,1);f.click('[data-page=ramais]');assert.equal(f.id('extensions').querySelectorAll('[data-contact]').length,2)}finally{f.close()}});
test('GAB-00 aniversários e preferência de push são simulação',()=>{const f=setup();try{f.click('[data-page=aniversarios]');assert.equal(f.id('birthdays').querySelectorAll('[data-contact]').length,1);f.click('[data-period=semana]');assert.equal(f.id('birthdays').querySelectorAll('[data-contact]').length,3);f.id('push').click();assert.match(f.id('status').textContent,/demonstrativa ativada/);f.select('theme','dark');assert.equal(f.d.documentElement.dataset.theme,'dark')}finally{f.close()}});
test('GAB-00 não tem integração externa, dados persistidos ou SDK',()=>assert.doesNotMatch(html,/firebasejs|httpsCallable|fetch\s*\(|XMLHttpRequest|localStorage|indexedDB|Notification\.requestPermission|<script[^>]+src=/));

test('GAB-02 pesquisa rápida e exportação usam os filtros e o perfil atuais', () => {
  const f = setup();
  try {
    f.id('quick').value = 'Unidade Alfa';
    f.event(f.id('quick-search'), 'submit');
    assert.equal(f.id('agenda').hidden, false);
    assert.equal(f.id('results').querySelectorAll('[data-contact]').length, 3);
    f.dom.window.print = () => {
      const sheet = f.id('print-agenda');
      assert.equal(sheet.hidden, false);
      assert.equal(sheet.querySelectorAll('article').length, 3);
      assert.doesNotMatch(sheet.textContent, /9XXXX|Unidade Beta/);
      f.dom.window.dispatchEvent(new f.dom.window.Event('afterprint'));
    };
    f.click('#export');
    f.click('#detail-actions button');
    assert.equal(f.id('print-agenda').hidden, true);
    assert.equal(f.id('print-agenda').textContent, '');
    f.click('#close');
    f.id('search').value = 'Sem resultados';
    f.event(f.id('search'), 'input');
    f.click('#export');
    assert.match(f.id('detail-body').textContent, /Nenhum contato/);
    assert.equal(f.id('detail-actions').children.length, 0);
  } finally {
    f.close();
  }
});

test('GAB-03 pesquisa e copia ramal pelo diretório', async () => {
  const f = setup();
  try {
    const copied = [];
    Object.defineProperty(f.dom.window.navigator, 'clipboard', {
      value: { async writeText(value) { copied.push(value); } }
    });
    f.click('[data-go=ramais]');
    f.id('extension-search').value = 'recepcao';
    f.event(f.id('extension-search'), 'input');
    assert.equal(f.id('extension-count').textContent, '1 ramal');
    assert.ok(f.id('extensions').querySelector('[data-contact=r1]'));
    assert.equal(f.id('extensions').querySelector('[data-contact=r2]'), null);
    f.click('#extensions [data-contact=r1] .actions button:nth-child(2)');
    await new Promise(resolve => setImmediate(resolve));
    assert.deepEqual(copied, ['0001']);
    assert.match(f.id('status').textContent, /0001 copiado/);
    f.select('role', 'negado');
    assert.equal(f.id('extension-search').value, '');
    assert.equal(f.id('extensions').querySelectorAll('[data-contact]').length, 0);
  } finally {
    f.close();
  }
});
