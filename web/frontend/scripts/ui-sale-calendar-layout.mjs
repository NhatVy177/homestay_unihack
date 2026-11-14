import assert from 'node:assert/strict';
import { chromium } from 'playwright-core';
import { mkdir, writeFile } from 'node:fs/promises';
const base=process.env.UI_BASE_URL||'http://127.0.0.1:5199',folder='.ui-screens/sale-appointment-layout';
await mkdir(folder,{recursive:true});
const browser=await chromium.launch({executablePath:process.env.CHROME_PATH||'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
const report=[];
try{
  for(const width of [1440,1024,390]){
    const user={maNguoiDung:'NV-UI',hoTen:'Sale kiểm tra giao diện',vaiTro:'NhanVien',chucVu:'Sale',maChiNhanh:'CN-UI'};
    const rows=[['NEAR','2026-11-14T09:00:00+07:00','Chờ xem'],['NEXT','2026-11-15T07:59:00+07:00','Chờ xem'],['LATER','2026-11-15T08:01:00+07:00','Chờ xem'],['CANCEL','2026-11-14T12:00:00+07:00','Đã hủy'],['VIEWED','2026-11-13T09:00:00+07:00','Đã xem']].map(([id,thoiGianHen,trangThai])=>({id,maDangKy:`DK-${id}`,hoTenKhach:`Khách thử ${id}`,danhSachPhong:'Phòng kiểm tra',tenChiNhanh:'Chi nhánh kiểm tra',thoiGianHen,trangThai,coTheHuy:trangThai==='Chờ xem',coTheGhiNhanKetQua:false,daGuiYeuCauDatCoc:false}));
    const ctx=await browser.newContext({viewport:{width,height:1100},timezoneId:'Asia/Ho_Chi_Minh',reducedMotion:'reduce'});
    await ctx.addInitScript(user=>localStorage.setItem('happyroom_session',JSON.stringify({_v:2,token:'fixture-only',user})),user);
    let mode='rows';const writes=[],errors=[];
    await ctx.route('**/api/**',route=>{
      const req=route.request(),path=new URL(req.url()).pathname;
      if(!path.startsWith('/api/'))return route.fallback();
      if(!['GET','OPTIONS'].includes(req.method()))writes.push({path,method:req.method()});
      if(path.endsWith('/auth/toi'))return route.fulfill({json:user});
      if(path.endsWith('/avalanche/config'))return route.fulfill({json:{enabled:false}});
      if(path.endsWith('/lich-xem-phong'))return mode==='error'?route.fulfill({status:503,json:{message:'Không tải được lịch kiểm thử.'}}):route.fulfill({json:mode==='empty'?[]:rows});
      return route.fulfill({json:[]});
    });
    const page=await ctx.newPage();page.on('pageerror',error=>errors.push(error.message));
    await page.clock.setFixedTime(new Date('2026-11-14T08:00:00+07:00'));
    await page.goto(`${base}/nhan-vien-sale`,{waitUntil:'domcontentloaded'});
    if(width===390)await page.getByRole('button',{name:'Mở menu',exact:true}).click();
    await page.locator('aside nav').getByRole('button',{name:'Lịch hẹn xem phòng',exact:true}).click();
    await page.locator('.sale-appointments-table tbody tr').first().waitFor();
    const upcoming=page.getByRole('region',{name:'Lịch hẹn 24 giờ tới',exact:true});
    assert.equal(await upcoming.getByRole('button').count(),2,'only active appointments in the next 24 hours');
    assert.match(await upcoming.innerText(),/Khách thử NEAR/);assert.match(await upcoming.innerText(),/Khách thử NEXT/);
    for(const id of ['LATER','CANCEL','VIEWED'])assert.doesNotMatch(await upcoming.innerText(),new RegExp(`Khách thử ${id}`));
    const shot=async name=>{await page.evaluate(()=>document.fonts.ready);assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth),width);assert.deepEqual(errors,[]);await page.screenshot({path:`${folder}/${name}-${width}.png`,fullPage:true});};
    await upcoming.getByRole('button').filter({hasText:'Khách thử NEAR'}).click();
    await page.locator('.sale-progress-card').getByRole('heading',{name:'NEAR',exact:true}).waitFor();
    await shot('calendar-and-list');
    await page.getByRole('button',{name:'CANCEL · Khách thử CANCEL',exact:true}).click();
    assert.equal(await page.getByRole('button',{name:'Đổi lịch',exact:true}).isDisabled(),true);
    assert.equal(await page.getByRole('button',{name:'Hủy lịch',exact:true}).isDisabled(),true);
    assert.equal(await page.locator('.sale-appointment-progress .is-stopped').count(),1,'cancelled viewing is not shown as completed');
    await page.locator('#schedule-search').fill('Khách thử NEAR');assert.equal(await page.locator('.sale-schedule-item').count(),1);
    await page.getByRole('button',{name:'Xóa lọc',exact:true}).click();assert.equal(await page.locator('.sale-schedule-item').count(),5);
    mode='empty';await page.getByRole('button',{name:'Làm mới',exact:true}).click();
    await upcoming.getByText('Không có lịch hẹn sắp tới',{exact:true}).waitFor();
    await page.getByText('Chọn một lịch hẹn trong danh sách để xem tiến trình và thao tác.',{exact:true}).waitFor();await shot('empty');
    mode='error';await page.getByRole('button',{name:'Làm mới',exact:true}).click();
    await page.getByRole('alert').filter({hasText:'Không tải được lịch kiểm thử.'}).waitFor();
    await upcoming.getByText('Chưa tải được lịch hẹn. Vui lòng bấm Làm mới.',{exact:true}).waitFor();await shot('load-error');
    assert.deepEqual(writes,[]);report.push({width,next24Hours:2,selection:true,filters:true,empty:true,error:true,writes:0,errors});await ctx.close();
  }
}finally{await browser.close();}
await writeFile(`${folder}/report.json`,JSON.stringify(report,null,2));
console.log(JSON.stringify(report));console.log('PASS calendar layout: next 24h, selection, filtering, cancellation display, empty/error; fixture APIs only.');
