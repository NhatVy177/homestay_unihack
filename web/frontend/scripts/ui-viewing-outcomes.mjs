import assert from 'node:assert/strict';
import { chromium } from 'playwright-core';
import { spawn } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const base='http://127.0.0.1:5200', directory=resolve('.ui-screens/c5a-viewing-status');
const server=spawn(process.execPath,['node_modules/vite/bin/vite.js','preview','--host','127.0.0.1','--port','5200','--strictPort'],{stdio:'ignore',windowsHide:true});
let browser;
try {
  for(let i=0;;i++) {
    try {if((await fetch(base)).ok) break;} catch {}
    if(i>60) throw new Error('Preview did not start');
    await new Promise(r=>setTimeout(r,500));
  }
  await mkdir(directory,{recursive:true});
  browser=await chromium.launch({executablePath:process.env.CHROME_PATH||'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
  const report=[];
  for(const width of [1440,390]) {
    const user={maNguoiDung:'NV0001',vaiTro:'NhanVien',chucVu:'Sale',hoTen:'Sale kiểm thử',maChiNhanh:'CN0001'};
    const past=new Date(Date.now()-3600000).toISOString(), future=new Date(Date.now()+86400000).toISOString();
    const schedules=[1,2,3,4].map(n=>({id:`DK000${n}-1`,maDangKy:`DK000${n}`,hoTenKhach:`Khách thử ${n}`,danhSachPhong:'Phòng thử',
      thoiGianHen:n===3?future:past,trangThai:'Chờ xem',coTheHuy:false,coTheGhiNhanKetQua:[1,4].includes(n)}));
    let fail=true; const writes=[],errors=[];
    const context=await browser.newContext({viewport:{width,height:1000}});
    await context.addInitScript(user=>localStorage.setItem('happyroom_session',JSON.stringify({_v:2,token:'fixture-only',user})),user);
    await context.route('**/api/**',async route=>{
      const req=route.request(),path=new URL(req.url()).pathname;
      if(path.endsWith('/auth/toi')) return route.fulfill({json:user});
      if(path.endsWith('/avalanche/config')) return route.fulfill({json:{enabled:false}});
      if(req.method()==='PUT'&&path.endsWith('/cap-nhat')) {
        const data=req.postDataJSON(); writes.push({path,...data});
        if(fail) {fail=false;return route.fulfill({status:409,json:{message:'Buổi xem vừa thay đổi. Vui lòng kiểm tra lại.'}});}
        const id=path.split('/').at(-2),row=schedules.find(s=>s.id===id);
        assert.ok(row?.coTheGhiNhanKetQua);
        row.trangThai=data.thaoTac==='da-xem'?'Đã xem':'Khách không đến';row.coTheGhiNhanKetQua=false;
        return route.fulfill({json:{trangThai:row.trangThai}});
      }
      return route.fulfill({json:path==='/api/lich-xem-phong'?schedules:[]});
    });
    const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
    await page.goto(base+'/nhan-vien-sale');
    if(width===390) await page.getByRole('button',{name:'Mở menu',exact:true}).click();
    await page.locator('aside nav').getByRole('button',{name:'Lịch hẹn xem phòng',exact:true}).click();
    const choose=async n=>page.getByRole('button',{name:`DK000${n}-1 · Khách thử ${n}`,exact:true}).click();
    const shot=async name=>{
      await page.evaluate(()=>document.fonts.ready);
      const scroll=await page.evaluate(()=>document.documentElement.scrollWidth);
      assert.equal(scroll,width,`${name}: no horizontal page overflow`);
      assert.deepEqual(errors,[]);
      await page.screenshot({path:resolve(directory,`${name}-${width}.png`),fullPage:true});
    };
    for(const n of [2,3]) {
      await choose(n);
      assert.equal(await page.getByRole('button',{name:'Đã xem',exact:true}).isDisabled(),true);
      assert.equal(await page.getByRole('button',{name:'Khách không đến',exact:true}).isDisabled(),true);
    }
    await choose(1);await page.getByRole('button',{name:'Đã xem',exact:true}).click();
    await page.getByLabel('Ghi chú buổi xem').fill('Đã thực hiện buổi xem thử.');
    await page.getByRole('button',{name:'Xác nhận Đã xem',exact:true}).click();
    await page.getByRole('alert').filter({hasText:'Buổi xem vừa thay đổi'}).waitFor();
    await shot('outcome-conflict');
    assert.equal(await page.getByRole('dialog').count(),1);
    await page.getByRole('button',{name:'Xác nhận Đã xem',exact:true}).click();
    await page.getByRole('status').filter({hasText:'Đã ghi nhận DK0001-1: Đã xem.'}).waitFor();
    assert.equal(await page.getByRole('button',{name:'Đã xem',exact:true}).isDisabled(),true);
    await shot('viewed');
    await choose(4);await page.getByRole('button',{name:'Khách không đến',exact:true}).click();
    await page.getByRole('button',{name:'Xác nhận Khách không đến',exact:true}).click();
    await page.getByRole('status').filter({hasText:'Đã ghi nhận DK0004-1: Khách không đến.'}).waitFor();
    await page.locator('#schedule-status').selectOption('Khách không đến');
    assert.equal(await page.locator('.sale-schedule-item').count(),1);
    assert.equal(await page.getByRole('button',{name:'Khách không đến',exact:true}).isDisabled(),true);
    await shot('no-show');
    assert.deepEqual(writes.map(w=>w.thaoTac),['da-xem','da-xem','khach-khong-den']);
    assert.ok(writes.every(w=>Object.keys(w).sort().join(',')==='ghiChuXuLy,path,thaoTac'));
    report.push({width,errors,writes:3,fixtures:true});await context.close();
  }
  await writeFile(resolve(directory,'report.json'),JSON.stringify(report,null,2));
  console.log('PASS C5-a: outcomes, permissions shown, conflict retry and filtering at 1440/390; API fixtures only.');
} finally {if(browser) await browser.close();server.kill();}
