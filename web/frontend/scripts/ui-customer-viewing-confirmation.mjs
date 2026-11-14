import assert from 'node:assert/strict';
import { chromium } from 'playwright-core';
import { mkdir, writeFile } from 'node:fs/promises';
const base=process.env.UI_BASE_URL||'http://localhost:5199',folder='.ui-screens/customer-viewing-confirmation';
await mkdir(folder,{recursive:true});
const browser=await chromium.launch({executablePath:process.env.CHROME_PATH||'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
const report=[];
try{
  for(const width of [1440,390]){
    const user={maNguoiDung:'KH0001',maKhachHang:'KH0001',hoTen:'Khách kiểm thử lịch',vaiTro:'KhachHang'};
    const rows=[{id:'DK0001-1',maDangKy:'DK0001',maPhong:'P202',phongXem:'Phòng kiểm thử 202',danhSachPhong:'Phòng kiểm thử 202',tenChiNhanh:'Chi nhánh kiểm thử',tenNhanVienSale:'Sale kiểm thử',sdtNhanVienSale:'0900000000',thoiGianHen:'2026-11-15T09:00:00+07:00',trangThai:'Chờ xem',phienBanLich:1,xacNhanLichSanSang:true,khachDaXacNhanLich:false,coTheGhiNhanKetQua:false},
      {id:'DK0002-1',maDangKy:'DK0002',phongXem:'Phòng đã xem',thoiGianHen:'2026-11-10T09:00:00+07:00',trangThai:'Đã xem',phienBanLich:1,xacNhanLichSanSang:true,khachDaXacNhanLich:false}];
    let conflict=true;const writes=[],errors=[];
    const ctx=await browser.newContext({viewport:{width,height:1100},timezoneId:'Asia/Ho_Chi_Minh',reducedMotion:'reduce'});
    await ctx.addInitScript(user=>localStorage.setItem('happyroom_session',JSON.stringify({_v:2,token:'fixture-only',user})),user);
    await ctx.route('**/api/**',route=>{
      const req=route.request(),path=new URL(req.url()).pathname;
      if(!path.startsWith('/api/'))return route.fallback();
      if(path.endsWith('/auth/toi'))return route.fulfill({json:user});
      if(path.endsWith('/avalanche/config'))return route.fulfill({json:{enabled:false}});
      if(path.endsWith('/khach-moi/tong-quan'))return route.fulfill({json:{trangThai:{soLichXem:2,soHoSo:1},hoSo:[{maDangKy:'DK0001',trangThai:'Đã tiếp nhận'}],lichXem:rows,phongGoiY:[]}});
      if(path==='/api/lich-xem-phong')return route.fulfill({json:rows});
      if(req.method()==='PUT'&&path.endsWith('/xac-nhan')){
        const data=req.postDataJSON();writes.push({path,data});assert.deepEqual(Object.keys(data),['phienBanLich']);
        if(conflict){conflict=false;rows[0].phienBanLich=2;rows[0].thoiGianHen='2026-11-15T10:00:00+07:00';return route.fulfill({status:409,json:{message:'Lịch đã thay đổi. Vui lòng tải lại và xác nhận ngày giờ mới.'}});}
        assert.equal(data.phienBanLich,rows[0].phienBanLich);rows[0].khachDaXacNhanLich=true;rows[0].thoiGianKhachXacNhan='2026-11-14T01:00:00.000Z';
        return route.fulfill({json:{...rows[0]}});
      }
      if(req.method()==='PUT'&&path.endsWith('/yeu-cau-dieu-chinh')){
        const data=req.postDataJSON();writes.push({path,data});rows[0].trangThai=data.thaoTac==='Hủy'?'Yêu cầu hủy':'Yêu cầu đổi lịch';return route.fulfill({json:rows[0]});
      }
      if(!['GET','OPTIONS'].includes(req.method()))throw new Error(`Unexpected mutation ${path}`);
      return route.fulfill({json:[]});
    });
    const page=await ctx.newPage();page.on('pageerror',e=>errors.push(e.message));await page.clock.setFixedTime(new Date('2026-11-14T08:00:00+07:00'));
    await page.goto(`${base}/khach-hang?tab=lich-xem`,{waitUntil:'domcontentloaded'});
    const card=page.getByRole('article',{name:'Lịch DK0001-1',exact:true});await card.waitFor();
    const shot=async name=>{await page.evaluate(()=>document.fonts.ready);assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth),width);assert.deepEqual(errors,[]);await page.screenshot({path:`${folder}/${name}-${width}.png`,fullPage:true});};
    await shot('pending');await card.getByRole('button',{name:'Xác nhận lịch',exact:true}).click();
    await page.getByRole('alertdialog').getByText('Chưa thể xác nhận lịch',{exact:true}).waitFor();await shot('stale-version');
    await page.getByRole('alertdialog').getByRole('button',{name:'Đã hiểu',exact:true}).click();assert.match(await card.innerText(),/10:00/);
    await card.getByRole('button',{name:'Xác nhận lịch',exact:true}).evaluate(button=>{button.click();button.click();});
    await page.getByRole('alertdialog').getByText('Đã xác nhận lịch xem phòng',{exact:true}).waitFor();await page.getByRole('alertdialog').getByRole('button',{name:'Đã hiểu',exact:true}).click();
    assert.equal(writes.length,2,'rapid repeated click makes only one additional request');assert.equal(await card.getByRole('button',{name:'Đã xác nhận',exact:true}).isDisabled(),true);await shot('confirmed');
    await page.reload({waitUntil:'domcontentloaded'});await card.getByRole('button',{name:'Đã xác nhận',exact:true}).waitFor();
    rows[0].phienBanLich=3;rows[0].khachDaXacNhanLich=false;rows[0].thoiGianKhachXacNhan=null;rows[0].thoiGianHen='2026-11-16T10:00:00+07:00';
    await page.getByRole('button',{name:'Làm mới',exact:true}).click();await card.getByRole('button',{name:'Xác nhận lịch',exact:true}).waitFor();await shot('changed-time-needs-confirmation');
    await card.getByRole('button',{name:'Xác nhận lịch',exact:true}).click();await page.getByRole('alertdialog').getByRole('button',{name:'Đã hiểu',exact:true}).click();assert.equal(writes.at(-1).data.phienBanLich,3);
    await card.getByRole('button',{name:'Đổi lịch hẹn',exact:true}).click();const modal=page.getByRole('dialog');await modal.waitFor();
    await modal.getByLabel('Ngày xem đề xuất 1',{exact:true}).fill('2026-11-17');await modal.getByLabel('Giờ xem đề xuất 1',{exact:true}).fill('11:00');await modal.locator('textarea').fill('Kiểm tra yêu cầu đổi lịch');await shot('reschedule-form');
    await modal.getByRole('button',{name:'Gửi yêu cầu',exact:true}).click();await modal.waitFor({state:'detached'});
    assert.equal(writes.at(-1).data.thaoTac,'Đổi lịch');assert.match(writes.at(-1).data.thoiGianMoi,/17\/11\/2026 11:00/);
    await card.getByRole('button',{name:'Hủy lịch',exact:true}).click();await modal.locator('textarea').fill('Kiểm tra yêu cầu hủy');await modal.getByRole('button',{name:'Gửi yêu cầu hủy',exact:true}).click();await modal.waitFor({state:'detached'});assert.equal(writes.at(-1).data.thaoTac,'Hủy');
    assert.equal(await page.locator('.kh-toast').evaluate(el=>getComputedStyle(el).backgroundColor),'rgb(25, 28, 26)','request feedback has a readable background');await shot('cancel-request');
    await page.getByRole('button',{name:/Đã qua \(1\)/}).click();const historical=page.getByRole('article',{name:'Lịch DK0002-1',exact:true});await historical.waitFor();assert.equal(await historical.locator('.customer-viewing-steps li').nth(1).getAttribute('class'),'');assert.match(await historical.innerText(),/Chưa có thông tin xác nhận/);await shot('historical');
    await page.getByRole('button',{name:/Sắp tới \(1\)/}).click();await page.getByLabel('Tra cứu theo mã lịch, phòng, email hoặc số điện thoại').fill('không tồn tại');await page.getByRole('button',{name:'Tìm kiếm lịch hẹn',exact:true}).click();await page.getByText('Không có lịch hẹn trong mục này.',{exact:true}).waitFor();await shot('empty-search');
    await page.getByRole('button',{name:'Xóa lọc',exact:true}).click();rows[0].trangThai='Chờ xem';rows[0].khachDaXacNhanLich=false;rows[0].xacNhanLichSanSang=false;rows[0].phienBanLich=null;
    await page.getByRole('button',{name:'Làm mới',exact:true}).click();await card.getByText('Chức năng xác nhận lịch chưa sẵn sàng. Vui lòng liên hệ nhân viên để được hỗ trợ.',{exact:true}).waitFor();assert.equal(await card.getByRole('button',{name:'Xác nhận lịch',exact:true}).isDisabled(),true);await shot('confirmation-unavailable');
    assert.deepEqual(writes.filter(w=>w.path.endsWith('/xac-nhan')).map(w=>w.data.phienBanLich),[1,2,3]);assert.deepEqual(errors,[]);report.push({width,confirmationVersions:[1,2,3],replayGuard:true,refresh:true,reschedule:true,cancelRequest:true,historicalConsentNotInvented:true,migrationUnavailable:true,errors});await ctx.close();
  }
}finally{await browser.close();}
await writeFile(`${folder}/report.json`,JSON.stringify(report,null,2));console.log(JSON.stringify(report));console.log('PASS customer viewing confirmation and layout; all APIs intercepted, no production writes.');
