import assert from 'node:assert/strict';
import { chromium } from 'playwright-core';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
const base=process.env.UI_BASE_URL||'http://127.0.0.1:5199',folder=resolve('.ui-screens/sale-schedule-modal');
await mkdir(folder,{recursive:true});
const browser=await chromium.launch({executablePath:process.env.CHROME_PATH||'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
const user={maNguoiDung:'NV0009',hoTen:'Sale kiểm thử',vaiTro:'NhanVien',chucVu:'Sale',maChiNhanh:'CN0003',tenChiNhanh:'Chi nhánh thử'};
const accepted={maDangKy:'DK-UI1',maKhachHang:'KH-UI1',hoTenKhach:'Khách kiểm thử',trangThai:'Đã tiếp nhận',maNhanVienSale:'NV0009',khuVucMongMuon:'Quận 9',soNguoiO:1,soNam:0,soNu:1,gioiTinh:'Nữ',loaiPhongYeuCau:'Phòng 2 người',mucGiaToiDa:4000000};
const pending={...accepted,maDangKy:'DK-UI2',hoTenKhach:'Hồ sơ chờ tiếp nhận',trangThai:'Chờ tiếp nhận'};
const rooms=[{maPhong:'P-UI1',tenPhong:'Phòng kiểm thử 1',sucChua:2,soGiuongTrong:2,gioiTinhChoPhep:'Nữ',giaThue:1500000},{maPhong:'P-UI2',tenPhong:'Phòng kiểm thử 2',sucChua:2,soGiuongTrong:2,gioiTinhChoPhep:'Nữ',giaThue:1500000}];
const report=[];
try {
  for(const width of [1440,390]){
    let profiles=[pending],schedules=[],writes=[];
    const context=await browser.newContext({viewport:{width,height:1000},reducedMotion:'reduce'});
    await context.addInitScript(user=>localStorage.setItem('happyroom_session',JSON.stringify({_v:2,token:'fixture-only',user})),user);
    await context.route('**/api/**',route=>{
      const request=route.request(),path=new URL(request.url()).pathname;
      if(!path.startsWith('/api/'))return route.fallback();
      if(path.endsWith('/auth/toi'))return route.fulfill({json:user});
      if(path.endsWith('/avalanche/config'))return route.fulfill({json:{enabled:false}});
      if(path.endsWith('/dang-ky-thue'))return route.fulfill({json:profiles});
      if(path.endsWith('/phong-phu-hop'))return route.fulfill({json:{rooms,isRegionValid:true}});
      if(path.endsWith('/lich-xem-phong')){
        if(request.method()==='POST'){writes.push(request.postDataJSON());return route.fulfill({json:{id:'LX-UI'}});}
        return route.fulfill({json:schedules});
      }
      return route.fulfill({json:[]});
    });
    const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
    const nav=async label=>{if(width===390)await page.getByRole('button',{name:'Mở menu',exact:true}).click();await page.locator('aside nav').getByRole('button',{name:label,exact:true}).click();};
    const shot=async name=>{await page.evaluate(()=>document.fonts.ready);assert.deepEqual(errors,[]);assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth),width);await page.screenshot({path:resolve(folder,`${name}-${width}.png`),fullPage:true});};
    await page.goto(base+'/nhan-vien-sale');await nav('Lịch hẹn xem phòng');
    const launch=page.getByRole('button',{name:'Lập lịch hẹn',exact:true});
    await launch.click();let modal=page.getByRole('dialog',{name:'Lập lịch hẹn xem phòng',exact:true});await modal.waitFor();
    await modal.getByText('Chưa có hồ sơ đã tiếp nhận', {exact:false}).waitFor();
    assert.equal(await page.locator('aside nav button:disabled').count(),0);
    assert.equal(await launch.count(),1,'calendar page remains mounted behind dialog');
    await shot('pending-needs-receiving');
    await modal.getByRole('button',{name:'Tiếp nhận hồ sơ đăng ký',exact:true}).click();
    assert.equal(await modal.count(),0);await page.getByText('Hồ sơ chờ tiếp nhận',{exact:true}).waitFor();
    assert.equal(writes.length,0,'opening reception does not mutate a real registration');
    await nav('Lịch hẹn xem phòng');profiles=[accepted,pending];await launch.click();await modal.getByRole('button',{name:/Khách kiểm thử/}).waitFor();
    await shot('choose-profile');await modal.getByRole('button',{name:/Khách kiểm thử/}).click();
    await modal.getByRole('checkbox',{name:'Chọn Phòng kiểm thử 1',exact:true}).check();
    await modal.getByRole('checkbox',{name:'Chọn Phòng kiểm thử 2',exact:true}).check();
    assert.equal(await modal.locator('.sale-booking-summary').evaluate(el=>getComputedStyle(el).backgroundColor),'rgb(232, 237, 231)','portal retains the sage theme');
    await shot('choose-rooms');await modal.getByRole('button',{name:'Tiếp tục',exact:true}).click();
    const date=modal.getByLabel('Ngày xem phòng');const tomorrow=await date.getAttribute('min');
    const localTomorrow=await page.evaluate(()=>{const d=new Date();d.setDate(d.getDate()+1);return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;});
    assert.equal(tomorrow,localTomorrow,'date limit uses local tomorrow, including before 07:00 Vietnam time');
    await date.fill(tomorrow);await modal.getByLabel('Giờ hẹn').fill('10:00');
    await shot('choose-time');await modal.getByRole('button',{name:'Lưu lịch hẹn',exact:true}).click();
    await page.getByRole('heading',{name:'Đã lập lịch xem phòng',exact:true}).waitFor();
    assert.equal(writes.length,1);assert.deepEqual(writes[0].rooms,[{maPhong:'P-UI1'},{maPhong:'P-UI2'}]);assert.equal(writes[0].maDangKy,'DK-UI1');assert.equal(writes[0].thoiGianXem,`${tomorrow}T10:00:00`);
    await page.getByRole('button',{name:'Hoàn tất',exact:true}).click();await modal.waitFor({state:'detached'});
    await launch.click();await modal.waitFor();await page.keyboard.press('Escape');await modal.waitFor({state:'detached'});
    await launch.click();await modal.getByRole('button',{name:'Đóng form lập lịch',exact:true}).click();await modal.waitFor({state:'detached'});
    await nav('Hồ sơ cá nhân');await page.getByRole('heading',{name:'Hồ sơ cá nhân',exact:true}).first().waitFor();
    assert.equal(await page.locator('aside nav button:disabled').count(),0);assert.deepEqual(errors,[]);
    report.push({width,emptyState:true,receptionLink:true,calendarPreserved:true,tabsDisabled:0,multipleRooms:true,writes:1,closeAndEscape:true,fixtures:true,errors});
    await context.close();
  }
  await writeFile(resolve(folder,'report.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report));console.log('PASS Sale schedule modal at 1440/390: reception path, unchanged booking payload, closing and enabled tabs; fixture APIs only.');
}finally{await browser.close();}
